# RyzeBooth — photo booth

A single-page photo booth. Camera runs entirely in the browser; nothing is
uploaded unless someone presses **Save to my device**. Duo Booth lets two
browsers connect their cameras live, straight to each other.

## Files

| File | What it is |
|---|---|
| `index.html` | The page and all styling |
| `app.js` | Booth logic — camera, strip drawing, stickers, Duo Booth, admin |
| `api/discord.js` | Vercel function that forwards a saved strip to Discord |
| `strips.json` | Extra strip layouts that ship with the site (starts empty) |
| `vercel.json` | Security headers |

## Duo Booth

On Step 1, one person taps **Duo Booth → Host a session** and gets a
six-character code. The other person taps **Duo Booth → Join a session** and
enters that code. Once connected, both cameras stream directly to each other
(peer-to-peer WebRTC) — video never passes through our server.

- Only the host picks the strip layout, look and countdown; the guest's
  screen mirrors those choices automatically.
- Duo layouts must have an even number of photos (the built-in **Duo**
  layout is 1 you + 1 partner); the layout picker filters to those
  automatically while in Duo Booth.
- Only the host's **Take the photos** button starts the countdown; it fires
  for both people at once. Each shot alternates between the host's camera
  and the guest's camera.
- Matchmaking (turning a 6-character code into a live connection) runs on
  PeerJS's free public broker (`peerjs.com`), so no signaling server of ours
  is required. That broker is fine for casual/demo use, but it's a shared
  third-party service with no uptime guarantee — for production traffic,
  run your own [PeerServer](https://github.com/peers/peerjs-server) and
  point `CONFIG.duoPeerPrefix`/the `new Peer(...)` calls in `app.js` at it.
- Very restrictive corporate/school networks can block the peer-to-peer
  video itself (no TURN relay is configured here); if a connection data
  channel succeeds but video never appears, that's usually why.

## Design your own strip

Step 2 has a **+ Design your own strip** button open to every visitor — no
passcode needed. It sets columns, rows, photo size, border, gap, footer,
corner radius and an optional overlay image, with a live preview, and the
result is usable immediately for that visitor's own strips (saved to their
browser only). The 5-tap-the-logo admin panel (below) is the same tool,
kept around so the site owner can also export a layout to ship to everyone.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework preset: **Other**. Deploy.
3. Open **Project → Settings → Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DISCORD_WEBHOOK` | your webhook URL |

   Apply it to Production, Preview and Development, then **Redeploy**.

Get the webhook from Discord: *Server Settings → Integrations → Webhooks → New
Webhook → Copy Webhook URL*.

The webhook stays on the server. It is never in the page source, so nobody can
copy it out of your site.

If you skip step 3 the booth still works — saving just writes the file to the
device and nothing goes to Discord.

## How saving works

There is no separate "send to Discord" button any more. Pressing **Save to my
device** does both things: the PNG downloads, and the exact same PNG is posted
to your Discord channel.

## Adding strip layouts

Tap the **RyzeBooth** logo five times (or open `/?admin=1`), enter the passcode, and
the strip manager opens.

- Set columns, rows, photo size, border, gap, footer and corner radius. The
  preview updates live.
- Optionally upload a transparent PNG **overlay** — drawn over the whole strip,
  for borders, doodles or a logo. Keep it the same proportions as the preview.
- **Add this strip** saves it to the browser you are using.

To give every visitor your layouts, press **Export as file**, then replace
`strips.json` in the repo with the downloaded file and redeploy.

Change the passcode in `app.js`:

```js
const CONFIG = {
  name: "RyzeBooth",
  adminPass: "ryze2026",   // ← change this
  ...
};
```

The passcode only keeps guests out of the panel on a shared booth device. It is
in the client code, so treat it as a soft lock, not real security.

## Local preview

```bash
npx serve .
```

Then open the printed URL. Cameras need `https://` or `localhost`, so opening
`index.html` by double-clicking will not give you a camera. The Discord relay
only runs on Vercel (or via `vercel dev`).
