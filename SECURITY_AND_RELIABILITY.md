# RyzeBooth — always-connect + security upgrade

## Where files go

```
your-repo/
├─ index.html          (changed)  loads ice.js, 8-char code placeholder
├─ app.js              (changed)  see "What changed in app.js"
├─ ice.js              (NEW)      TURN loader, relay-only switch, network probe
├─ vercel.json         (changed)  CSP + security headers
├─ strips.json         (same)
├─ .vercelignore       (NEW)
├─ api/
│  ├─ discord.js       (changed)  same-origin, rate limit, PNG check
│  ├─ ice.js           (NEW)      issues short-lived TURN credentials
│  ├─ admin.js         (NEW)      passcode check moved off the client
│  └─ _guard.js        (NEW)      shared helpers (not an endpoint)
└─ peer-server/        (NEW, optional)  your own signalling server
```

`discord.js` must sit in `api/` (that's what `/api/discord` maps to).

## Setup (about 10 minutes)

**1. Get a TURN provider** — this is the part that fixes the black screen. Pick one:

| Provider | Vercel env vars |
|---|---|
| Cloudflare Realtime TURN (anycast, good for Asia) | `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` |
| Metered.ca | `METERED_APP` (the part before `.metered.live`), `METERED_API_KEY` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |

**2. Set the admin passcode:** `ADMIN_PASS` = something new. The old `ryze2026` was
readable by anyone via View Source; it's gone from `app.js`. If `ADMIN_PASS` is unset,
the strip manager stays locked (fails closed).

**3. Keep `DISCORD_WEBHOOK` as before.** Redeploy after adding env vars.

**4. Check it works.** Open `https://YOUR-SITE/api/ice` in a browser tab.
`"provider":"cloudflare"` (or metered/twilio) = good. `"provider":"public-fallback"`
means no provider is configured yet — it still runs, but on a free community relay
that can be slow or vanish.

## Why this stops the black screen — and what it can't promise

Mobile carriers (Globe, Smart, most worldwide) put phones behind carrier-grade NAT, so
two phones often can't reach each other directly. Video then needs a relay (TURN).
The booth now: gets fresh TURN credentials → tries a direct path → after 2 failed dials
switches to **relay-only** mode → keeps re-dialling every 6 s → re-dials automatically
when you come back online, unlock the phone, or switch Wi-Fi ↔ data → keeps the screen
awake during a call → caps video bitrate so a weak mobile link doesn't stall.

It can't promise literally 100%: if a network blocks *all* outbound TLS on port 443
(some strict corporate/school firewalls), nothing browser-based gets through. The
booth detects a fully blocked network up front and says so.

Console lines to look for (F12): `[duo] video path: relay` = it used the relay;
`[duo] network probe:` shows whether the relay was reachable.

## Security summary

Enforced now:
- **Codes** are 8 characters from a cryptographic RNG (were 6, from `Math.random`).
- **The 5-minute expiry is real.** Before, the countdown was cosmetic — the room stayed
  open. Now the room closes at 0:00.
- **One guest per room**, decided at the first knock (the old check let two people in
  during the same half-second).
- **Everything your partner's browser sends is validated** (message types, values, step
  numbers, chat flood limit). A malicious partner can't crash or reconfigure your booth.
- **CSP, HSTS, no-framing, COOP** headers in `vercel.json`.
- **API functions** reject other websites, rate-limit per IP, and Discord uploads must
  be a genuine PNG.
- Video/audio is end-to-end encrypted by WebRTC (DTLS-SRTP). A TURN relay only sees
  encrypted packets.

Known limits (honest list):
- Anyone holding the code/link can join within the 5 minutes. There is no host
  "let them in?" prompt yet — say so if you want one added.
- API rate limits are per server instance (a speed bump, not a wall). For a hard limit,
  add a Vercel WAF rate-limit rule on `/api/*`.
- No Subresource Integrity on the PeerJS/QR scripts (couldn't fetch them to hash them
  from here). Pinned versions, and CSP only allows those two hosts.
- The strip manager only edits layouts in the visitor's own browser. The passcode is a
  courtesy gate, not protection for anything server-side.

## Optional: your own signalling server (`peer-server/`)

The free public PeerJS broker is shared by everybody with no uptime promise. If it's down,
nobody can start a call. To remove that: deploy `peer-server/` to an always-on Node host
with WebSockets (Render, Railway, Fly.io, VPS — **not** Vercel), region Singapore for PH
users. Set `ALLOWED_ORIGIN` and `PEER_KEY`, then in `app.js`:

```js
peerServer: { host: "your-peer.onrender.com", port: 443, path: "/ryzebooth", secure: true, key: "your PEER_KEY" },
```

and add `https://your-peer.onrender.com wss://your-peer.onrender.com` to `connect-src`
in `vercel.json`. Free tiers that sleep add many seconds to the first call.

## What changed in app.js

`adminPass` removed (server-checked) · `genCode` crypto RNG, 8 chars · host/join wait for
ICE servers, cancellable · relay-only escalation · 4 s drop → auto re-dial · online /
visibility recovery · wake lock · bitrate caps · expiry enforced · single-guest lock ·
validated partner messages. New `CONFIG` keys: `codeLength`, `relayAfterAttempts`,
`bitrateDirectKbps`, `bitrateRelayKbps`, `chatBurst`, `chatBurstMs`, `peerServer`.

## Things to know before deploying

- **CSP is the riskiest change and I couldn't run it in a real browser.** After deploying,
  open F12 → Console, load the page, open Duo Booth, and look for "Refused to …". If
  something legitimate is blocked, add its host to the matching directive. Emergency
  rollback: rename the `Content-Security-Policy` key to `Content-Security-Policy-Report-Only`.
- Old 6-character codes/links stop working (expected — they were the weak ones).
- `CHANGES_SUMMARY.md`, `IMPROVEMENTS.md` and `VERCEL_DEPLOY.md` describe an earlier
  build (12-char link tokens, `S.duo.linkToken`, "no TURN needed", default admin
  password). They no longer match the code — delete them.

## What was tested

Ran against mocked upstreams in Node: all three API functions (origin blocking, rate
limits, fallback when a provider errors, Cloudflare/Metered response shapes, PNG
validation, admin fails-closed), `ice.js` (hostile payload sanitising, cache, fallback,
relay switch), the code generator (20 000 codes, no collisions, even distribution), and
partner-message validation (23 cases). **Not tested:** live WebRTC calls and the real
TURN providers — I had no browser or network here. Do the two-device test from
`UPGRADE_NOTES.md` (Wi-Fi + mobile data, then two different carriers) before relying on it.
