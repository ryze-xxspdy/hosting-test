/* ══════════════════════════════════════════════════════════════
   api/_store.mjs — helpers shared by /api/photos and /api/config
   ──────────────────────────────────────────────────────────────
   The leading underscore keeps Vercel from turning this into an
   endpoint. It is .mjs on purpose: it works whether or not your
   project's package.json says "type": "module".

   Database: any Upstash Redis. On Vercel that is Storage →
   Marketplace → "Upstash for Redis" → connect to this project.
   It injects these env vars (either naming works):
     KV_REST_API_URL + KV_REST_API_TOKEN          (Vercel KV naming)
     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
   Nothing else to install — we talk to it with plain fetch().
   ══════════════════════════════════════════════════════════════ */
import { createHash, timingSafeEqual } from "node:crypto";

const env = () => ({
  url:   (process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || "").replace(/\/+$/, ""),
  token:  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ""
});
export const dbReady = () => { const e = env(); return !!(e.url && e.token); };

async function call(path, body){
  const { url, token } = env();
  const r = await fetch(url + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error("redis " + r.status + " " + (j && j.error || ""));
  return j;
}
/* one command:  await redis("GET", "key") */
export async function redis(...cmd){
  const j = await call("", cmd);
  if(j.error) throw new Error(j.error);
  return j.result;
}
/* several commands in one round trip: await pipeline([["SET","a","1"],["GET","a"]]) */
export async function pipeline(cmds){
  const j = await call("/pipeline", cmds);
  return j.map(x => { if(x && x.error) throw new Error(x.error); return x && x.result; });
}

/* ─── request guards ──────────────────────────────────────── */
export function send(res, status, obj){
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(obj);
}
export const clientIp = req =>
  String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "?";

/* Browsers always send Origin on a cross-origin or POST request.
   Anything from another site (or a bare script with no Origin) is refused. */
export function sameOrigin(req){
  const o = req.headers.origin;
  if(!o) return false;
  let host; try{ host = new URL(o).host; }catch(e){ return false; }
  if(host === (req.headers["x-forwarded-host"] || req.headers.host)) return true;
  const extra = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  return extra.some(e => { try{ return new URL(e).host === host; }catch(_){ return false; } });
}

/* Per-instance counter — a speed bump, not a wall (same caveat as the
   other endpoints; add a Vercel WAF rule for a hard limit). */
const hits = new Map();
export function limited(key, max, windowMs){
  const now = Date.now();
  if(hits.size > 5000) for(const [k, v] of hits) if(v.reset < now) hits.delete(k);
  let h = hits.get(key);
  if(!h || h.reset < now){ h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
  h.n++;
  return h.n > max;
}

/* Admin check: the passcode arrives in the x-admin-pass header
   (URL-encoded so any character survives). Fails closed when
   ADMIN_PASS is not set; wrong guesses are rate limited per IP. */
export function adminCheck(req){
  const real = process.env.ADMIN_PASS;
  if(!real) return { ok: false, status: 501, error: "ADMIN_PASS is not set" };
  const key = "adm-fail:" + clientIp(req);
  const rec = hits.get(key);
  if(rec && rec.reset > Date.now() && rec.n >= 10)
    return { ok: false, status: 429, error: "too many tries" };
  let given = "";
  try{ given = decodeURIComponent(String(req.headers["x-admin-pass"] || "")); }catch(e){}
  const h = s => createHash("sha256").update(String(s)).digest();   // equal length → timingSafeEqual is safe
  if(timingSafeEqual(h(given), h(real))){ hits.delete(key); return { ok: true }; }
  limited(key, 10, 10 * 60 * 1000);                                 // only wrong guesses count
  return { ok: false, status: 401, error: "wrong passcode" };
}

export function readJson(req){
  const b = req.body;
  if(b && typeof b === "object" && !Buffer.isBuffer(b)) return b;
  if(typeof b === "string"){ try{ return JSON.parse(b); }catch(e){ return null; } }
  return null;
}
