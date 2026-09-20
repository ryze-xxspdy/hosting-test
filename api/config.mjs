/* ══════════════════════════════════════════════════════════════
   api/config.mjs — booth-wide settings
   ──────────────────────────────────────────────────────────────
   GET          → { db, hiddenPapers }               (public, no auth — every
                                                        visitor reads this on load)
   PUT (admin)  → { hiddenPapers } saved, echoed back  (needs x-admin-pass)

   "hiddenPapers" is the list of built-in paper colours the admin has
   removed from the picker for everyone. Visitors can still ADD their
   own colours/blends — that always happens locally in their own
   browser (see app.js addPaper / addPaperPhoto), no server needed.

   Needs a database connected (see _store.mjs). Without one, GET
   answers { db:false, hiddenPapers:[] } and PUT answers 501
   "no-database" — the app then falls back to remembering the choice
   on that one device only, which is exactly what the client already
   expects (see loadConfig / paperSave in app.js).
   ══════════════════════════════════════════════════════════════ */
import { redis, dbReady, sameOrigin, limited, clientIp, adminCheck, send, readJson } from "./_store.mjs";

const KEY = "ryzebooth:hiddenPapers";
const MAX_ITEMS = 200;

export default async function handler(req, res){
  if(req.method === "GET"){
    if(!dbReady()) return send(res, 200, { db: false, hiddenPapers: [] });
    try{
      const raw = await redis("GET", KEY);
      const hiddenPapers = raw ? JSON.parse(raw) : [];
      return send(res, 200, { db: true, hiddenPapers: Array.isArray(hiddenPapers) ? hiddenPapers : [] });
    }catch(e){
      return send(res, 200, { db: false, hiddenPapers: [] });
    }
  }

  if(req.method === "PUT"){
    if(!sameOrigin(req)) return send(res, 403, { error: "cross-origin" });
    if(limited("config-put:" + clientIp(req), 20, 60 * 1000))
      return send(res, 429, { error: "too many requests" });

    const check = adminCheck(req);
    if(!check.ok) return send(res, check.status, { error: check.error });
    if(!dbReady()) return send(res, 501, { error: "no-database" });

    const body = readJson(req);
    const list = Array.isArray(body && body.hiddenPapers)
      ? body.hiddenPapers.filter(x => typeof x === "string" && x.length < 80).slice(0, MAX_ITEMS)
      : [];
    try{
      await redis("SET", KEY, JSON.stringify(list));
      return send(res, 200, { hiddenPapers: list });
    }catch(e){
      return send(res, 500, { error: "save failed" });
    }
  }

  return send(res, 405, { error: "method not allowed" });
}
