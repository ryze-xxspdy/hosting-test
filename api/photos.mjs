/* ══════════════════════════════════════════════════════════════
   api/photos.mjs — saved-strip database (admin gallery)
   ──────────────────────────────────────────────────────────────
   POST            → anyone who saves a strip; stores a small thumb
                      (for the grid) and a full-size copy (for the
                      admin's full-screen view), each with a date.
   GET  (admin)    → ?offset&limit  → { items:[{id,at,mode,frame,thumb}], total, next }
                      ?id=...       → { id, at, mode, frame, img }   (full-size)
   DELETE (admin)  → ?id=...        → removes it from the database
                      (does NOT touch the copy already posted to Discord)

   Storage shape (Upstash Redis):
     ryzebooth:photos:index         sorted set, score = saved-at (ms), member = id
     ryzebooth:photos:meta:{id}     JSON: {id, at, mode, frame, w, h, thumb}
     ryzebooth:photos:img:{id}      the full-size data URL, fetched only on open

   Needs a database connected (see _store.mjs / SECURITY_AND_RELIABILITY.md).
   Without one: POST/GET/DELETE all answer 501 "no-database" and the app
   keeps working — strips just don't collect in the gallery.
   ══════════════════════════════════════════════════════════════ */
import { randomUUID } from "node:crypto";
import { redis, pipeline, dbReady, sameOrigin, limited, clientIp, adminCheck, send, readJson } from "./_store.mjs";

const IDX = "ryzebooth:photos:index";
const meta = id => "ryzebooth:photos:meta:" + id;
const img  = id => "ryzebooth:photos:img:" + id;
const MAX_KEPT = 300;                 // oldest strips roll off past this so the database can't grow forever
const isJpegUrl = u => typeof u === "string" && u.startsWith("data:image/jpeg;base64,") && u.length < 900000;

export default async function handler(req, res){
  if(req.method === "POST") return handlePost(req, res);
  if(req.method === "GET")  return handleGet(req, res);
  if(req.method === "DELETE") return handleDelete(req, res);
  return send(res, 405, { error: "method not allowed" });
}

async function handlePost(req, res){
  if(!sameOrigin(req)) return send(res, 403, { error: "cross-origin" });
  if(limited("photos-post:" + clientIp(req), 20, 60 * 1000))
    return send(res, 429, { error: "too many requests" });
  if(!dbReady()) return send(res, 501, { error: "no-database" });

  const body = readJson(req);
  if(!body || !isJpegUrl(body.thumb) || !isJpegUrl(body.img))
    return send(res, 400, { error: "bad photo" });

  const id = Date.now().toString(36) + "-" + randomUUID().slice(0, 8);
  const at = Date.now();
  const record = {
    id, at,
    mode:  body.mode === "duo" ? "duo" : "solo",
    frame: typeof body.frame === "string" ? body.frame.slice(0, 40) : "",
    w: Number(body.w) || 0, h: Number(body.h) || 0,
    thumb: body.thumb
  };

  try{
    await pipeline([
      ["SET", meta(id), JSON.stringify(record)],
      ["SET", img(id), body.img],
      ["ZADD", IDX, at, id]
    ]);
    trimOld().catch(() => {});     // best-effort housekeeping, never blocks the save
    return send(res, 200, { ok: true, id });
  }catch(e){
    return send(res, 500, { error: "save failed" });
  }
}

async function trimOld(){
  const count = await redis("ZCARD", IDX);
  if(!count || count <= MAX_KEPT) return;
  const extra = count - MAX_KEPT;
  const old = await redis("ZRANGE", IDX, 0, extra - 1);
  if(!old || !old.length) return;
  const cmds = [["ZREM", IDX, ...old]];
  for(const id of old) cmds.push(["DEL", meta(id)], ["DEL", img(id)]);
  await pipeline(cmds);
}

async function handleGet(req, res){
  if(limited("photos-get:" + clientIp(req), 60, 60 * 1000))
    return send(res, 429, { error: "too many requests" });
  const check = adminCheck(req);
  if(!check.ok) return send(res, check.status, { error: check.error });
  if(!dbReady()) return send(res, 501, { error: "no-database" });

  const url = new URL(req.url, "http://x");
  const id = url.searchParams.get("id");

  if(id){
    try{
      const [m, i] = await pipeline([["GET", meta(id)], ["GET", img(id)]]);
      if(!m) return send(res, 404, { error: "not found" });
      const rec = JSON.parse(m);
      return send(res, 200, { ...rec, img: i || rec.thumb });
    }catch(e){
      return send(res, 500, { error: "load failed" });
    }
  }

  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit  = Math.min(60, Math.max(1, Number(url.searchParams.get("limit")) || 24));
  try{
    const total = (await redis("ZCARD", IDX)) || 0;
    if(!total) return send(res, 200, { items: [], total: 0, next: null });
    const ids = await redis("ZREVRANGE", IDX, offset, offset + limit - 1);
    const rows = ids && ids.length ? await pipeline(ids.map(id => ["GET", meta(id)])) : [];
    const items = rows.filter(Boolean).map(r => { try{ return JSON.parse(r); }catch(e){ return null; } }).filter(Boolean);
    const next = offset + limit < total ? offset + limit : null;
    return send(res, 200, { items, total, next });
  }catch(e){
    return send(res, 500, { error: "load failed" });
  }
}

async function handleDelete(req, res){
  if(!sameOrigin(req)) return send(res, 403, { error: "cross-origin" });
  const check = adminCheck(req);
  if(!check.ok) return send(res, check.status, { error: check.error });
  if(!dbReady()) return send(res, 501, { error: "no-database" });

  const url = new URL(req.url, "http://x");
  const id = url.searchParams.get("id");
  if(!id) return send(res, 400, { error: "missing id" });

  try{
    await pipeline([["ZREM", IDX, id], ["DEL", meta(id)], ["DEL", img(id)]]);
    return send(res, 200, { ok: true });
  }catch(e){
    return send(res, 500, { error: "delete failed" });
  }
}
