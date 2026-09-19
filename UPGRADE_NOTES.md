# RyzeBooth — what changed and what to do next

Replace `app.js` and `index.html`. `discord.js`, `vercel.json` and `strips.json` are untouched.

## 1. The app was not running at all

`app.js` line 377 had broken quotes inside a `toast(...)` call:

```js
toast("Use "Shoot again" to redo a Duo strip", "")
```

That is a syntax error, so the browser refused to parse the whole file — no camera,
no buttons, no Duo Booth. Fixed. If the previous version looked completely dead,
this was why, not the network.

## 2. Black screen when the partner is far away

The real cause was **no TURN server**. STUN only works when at least one side is
behind a simple NAT. Mobile carriers and many home ISPs use carrier-grade or
symmetric NAT, where STUN can never find a path — the text/data channel connects
(so it *looks* connected) but the video has nowhere to go. Adding a seventh Google
STUN server could not have fixed that.

What's in now:

- Three TURN entries (UDP 80, UDP 443, TCP 443 — the TCP one gets through
  firewalls that block UDP entirely).
- **One shared camera stream.** The old build opened a second `getUserMedia` for the
  modal preview. Many phones only hand out one camera stream at a time, so the
  second one came back black. Everything now reuses one stream.
- **A watchdog.** If no video has arrived, it re-dials every 6 seconds, up to 6 times,
  then tells the user to try mobile data. Plus a manual "Retry video" button.
- **ICE state is shown**, not swallowed — "Finding a path between you…",
  "Video connected", "Direct path failed — retrying through the relay…".
- Leaving step 3 no longer closes the call (`stopCam()` used to kill it).
- Both sides now listen for incoming calls, so whoever is ready first can dial.
- Camera flip swaps the track inside the live call instead of dropping it.

### ⚠️ Change the TURN credentials before you rely on this

`CONFIG.duoIceServers` uses **openrelay.metered.ca**, a free public TURN service.
It works, but it is rate limited and has no uptime guarantee — if it goes down,
hard-NAT users go back to a black screen. Swap in your own:

- Metered.ca — free tier ~50 GB/month, then cheap
- Cloudflare Calls TURN — pay per GB, very cheap
- Twilio — pricier, enterprise reliability
- Self-hosted coturn — free if you have a VPS

Relayed video costs bandwidth, which is why nobody gives it away forever.

To check which path a connection used, open the console: it logs
`[duo] video path: relay udp` or `host` / `srflx`.

## 3. Both screens open on connect

The moment the data channel opens, both sides request the camera and dial. The
modal shows **both feeds side by side** right there — no "Start camera" tap. When
the host moves to step 2 or 3, the guest is pulled along automatically.

## 4. Code, link and QR are the same thing

The old build had a separate 12-character link token *and* a 6-character code, and
they were derived from each other in ways that did not always match. Now there is
one 6-character code, and the link is just `?duo=CODE`. The QR encodes that link.

- The join box accepts a bare code **or** a full pasted link.
- QR uses `qrcodejs` from cdnjs (added to `index.html`). If it fails to load, the QR
  block hides itself and code/link still work.
- The code stays valid for 5 minutes with a live countdown; "New code" regenerates.
- Opening a `?duo=` link auto-joins and cleans the URL.

## 5. Duo chat

Text chat over the same data channel — in the modal and in a panel beside the camera
on step 3. Quick-reply chips, unread badge, messages escaped before rendering,
capped at 200. Nothing goes to a server; it dies with the connection.

Note: `vercel.json` sets `Permissions-Policy: microphone=()`, so voice is blocked by
your own header. Text chat is unaffected. If you ever want voice, change that to
`microphone=(self)` and request audio in `ensureStream()`.

## 6. Filters and paper

- **24 filters** (was 10): Rose, Sunset, Honey, Ember, VHS, Cyber, Mint, Lilac,
  Frost, Glow, Bubble, Deep, Silver, Sketch added.
- **28 preset papers** (was 10), including 8 two-colour blends.
- **Custom paper**: two colour pickers plus an angle — "Add colour" for a solid,
  "Add blend" for a gradient. Saved to `localStorage` (max 24), removable with the
  ✕ on the swatch. Canvas and swatch read the same value, so the PNG matches exactly.

## Testing it properly

One device cannot test this. You need two, and ideally:

1. Same Wi-Fi — should connect directly (console shows `host` or `srflx`).
2. One on Wi-Fi, one on mobile data — the realistic far-apart case.
3. Both on different mobile carriers — this is the one that used to fail; console
   should show `relay`.

Also worth checking: the countdown hitting 0:00, joining by QR from a cold tab,
flipping the camera mid-call, and one side closing the tab (the other should see
"Your partner left").
