/* ══════════════════════════════════════════════════════════════
   /api/photos — the booth's photo database
   ──────────────────────────────────────────────────────────────
   POST    (visitors)  store a small JPEG preview of a saved strip.
                       The full-quality PNG still goes to Discord via
                       /api/discord — this is the copy the admin panel
                       can browse.
   GET     (admin)     ?offset=0&limit=24  → thumbnails + metadata
                       ?id=…               → the larger preview image
   DELETE  (admin)     ?id=…

   Layout in Redis
     ryze:photos     list of ids, newest first (capped at KEEP)
     ryze:m:<id>     JSON meta + tiny thumbnail   (fast to list)
     ryze:i:<id>     the larger preview data-URL  (fetched on click)
   Records expire on their own after PHOTO_TTL_DAYS (default 30).
   ══════════════════════════════════════════════════════════════ */
import { randomBytes } from "node:crypto";
import { dbReady, redis, pipeline, send, sameOrigin, limited, clientIp, adminCheck, readJson } from "./_store.mjs";

const TTL  = Math.max(1, Number(process.env.PHOTO_TTL_DAYS) || 30) * 86400;
const KEEP = 500;
const JPEG_HEAD = "data:image/jpeg;base64,/9j/";          // real JPEGs start with /9j/ in base64
const B64_URL   = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_THUMB = 60_000;                                   // characters, ≈ 45 KB
const MAX_IMG   = 900_000;                                  // characters, ≈ 675 KB
const ID_RE     = /^[a-z0-9]{6,32}$/;

export default async function handler(req, res){
  try{
    if(!dbReady()) return send(res, 501, { error: "no-database" });
    if(req.method === "POST")   return await save(req, res);
    if(req.method === "GET")    return await read(req, res);
    if(req.method === "DELETE") return await remove(req, res);
    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "method" });
  }catch(e){
    console.error("[photos]", e && e.message);
    return send(res, 500, { error: "server" });
  }
}

async function save(req, res){
  if(!sameOrigin(req)) return send(res, 403, { error: "origin" });
  if(limited("photo:" + clientIp(req), 10, 60_000)) return send(res, 429, { error: "slow-down" });

  const b = readJson(req);
  if(!b) return send(res, 400, { error: "json" });

  const ok = (s, max) => typeof s === "string" && s.length <= max && s.startsWith(JPEG_HEAD) && B64_URL.test(s);
  if(!ok(b.thumb, MAX_THUMB) || !ok(b.img, MAX_IMG)) return send(res, 400, { error: "image" });

  const int = (n, lo, hi) => { n = Math.round(Number(n)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };
  const id = Date.now().toString(36) + randomBytes(4).toString("hex");
  const meta = {
    id, at: Date.now(),
    mode:  b.mode === "duo" ? "duo" : "solo",
    frame: String(b.frame || "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 40),
    w: int(b.w, 0, 8000), h: int(b.h, 0, 8000),
    thumb: b.thumb
  };

  await pipeline([
    ["SET", "ryze:m:" + id, JSON.stringify(meta), "EX", TTL],
    ["SET", "ryze:i:" + id, b.img, "EX", TTL],
    ["LPUSH", "ryze:photos", id],
    ["LTRIM", "ryze:photos", 0, KEEP - 1]
  ]);
  return send(res, 200, { ok: true, id });
}

async function read(req, res){
  const a = adminCheck(req);
  if(!a.ok) return send(res, a.status, { error: a.error });

  const q = req.query || {};
  if(q.id){
    const id = String(q.id);
    if(!ID_RE.test(id)) return send(res, 400, { error: "id" });
    const img = await redis("GET", "ryze:i:" + id);
    return img ? send(res, 200, { img }) : send(res, 404, { error: "gone" });
  }

  const limit  = Math.min(48, Math.max(1, parseInt(q.limit, 10) || 24));
  const offset = Math.max(0, parseInt(q.offset, 10) || 0);
  const [ids, total] = await pipeline([
    ["LRANGE", "ryze:photos", offset, offset + limit - 1],
    ["LLEN", "ryze:photos"]
  ]);
  let items = [];
  if(ids && ids.length){
    const rows = await redis("MGET", ...ids.map(i => "ryze:m:" + i));
    items = rows.map(r => { try{ return r ? JSON.parse(r) : null; }catch(e){ return null; } }).filter(Boolean);
  }
  const next = offset + (ids ? ids.length : 0);
  return send(res, 200, { items, total: total || 0, next: next < (total || 0) ? next : null });
}

async function remove(req, res){
  const a = adminCheck(req);
  if(!a.ok) return send(res, a.status, { error: a.error });
  const id = String((req.query && req.query.id) || "");
  if(!ID_RE.test(id)) return send(res, 400, { error: "id" });
  await pipeline([
    ["DEL", "ryze:m:" + id],
    ["DEL", "ryze:i:" + id],
    ["LREM", "ryze:photos", 0, id]
  ]);
  return send(res, 200, { ok: true });
}
