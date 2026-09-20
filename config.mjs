/* ══════════════════════════════════════════════════════════════
   /api/config — booth-wide settings the admin controls
   ──────────────────────────────────────────────────────────────
   GET  (public)  → { db, hiddenPapers }   every visitor's page reads this
   PUT  (admin)   ← { hiddenPapers: [...] }  paper colours to remove

   Stored as one JSON string at ryze:config. If no database is
   connected, GET answers { db:false } and the page falls back to
   remembering the admin's choice on that one device.
   ══════════════════════════════════════════════════════════════ */
import { dbReady, redis, send, adminCheck, readJson } from "./_store.mjs";

/* Only the shapes the booth actually uses: "#RRGGBB" or "grad:#A,#B,angle".
   (Photo papers live on each visitor's device, so they never appear here.) */
const HEX   = "#[0-9A-Fa-f]{3,8}";
const PAPER = new RegExp(`^(${HEX}|grad:${HEX},${HEX},\\d{1,3})$`);

const clean = list => Array.isArray(list)
  ? [...new Set(list.filter(p => typeof p === "string" && p.length <= 60 && PAPER.test(p)))].slice(0, 100)
  : [];

export default async function handler(req, res){
  try{
    if(req.method === "GET"){
      if(!dbReady()) return send(res, 200, { db: false, hiddenPapers: [] });
      const raw = await redis("GET", "ryze:config");
      let cfg = {}; try{ cfg = raw ? JSON.parse(raw) : {}; }catch(e){}
      return send(res, 200, { db: true, hiddenPapers: clean(cfg.hiddenPapers) });
    }

    if(req.method === "PUT"){
      const a = adminCheck(req);
      if(!a.ok) return send(res, a.status, { error: a.error });
      if(!dbReady()) return send(res, 501, { error: "no-database" });
      const b = readJson(req);
      if(!b) return send(res, 400, { error: "json" });
      const hiddenPapers = clean(b.hiddenPapers);
      await redis("SET", "ryze:config", JSON.stringify({ hiddenPapers }));
      return send(res, 200, { ok: true, hiddenPapers });
    }

    res.setHeader("Allow", "GET, PUT");
    return send(res, 405, { error: "method" });
  }catch(e){
    console.error("[config]", e && e.message);
    return send(res, 500, { error: "server" });
  }
}
