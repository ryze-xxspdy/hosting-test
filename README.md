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
  screen mirrors those choices automatically. Any layout works — there's no
  even/odd restriction any more.
- Only the host's **Take the photos** button starts the countdown; it fires
  for both people at once. Each shot merges both cameras into **one**
  side-by-side photo (host on the left, guest on the right) — one countdown
  gives one combined picture, not two separate ones.
- Matchmaking (turning a 6-character code into a live connection) runs on
  PeerJS's free public broker (`peerjs.com`), so no signaling server of ours
  is required. That works over the open internet, not just a shared Wi-Fi —
  the two people can be anywhere, any time, as long as both have an internet
  connection. That broker is fine for casual/demo use, but it's a shared
  third-party service with no uptime guarantee — for production traffic,
  run your own [PeerServer](https://github.com/peers/peerjs-server) and
  point `CONFIG.duoPeerPrefix`/the `new Peer(...)` calls in `app.js` at it.
- `CONFIG.duoIceServers` in `app.js` lists the public STUN servers used to
  help two devices find a direct path to each other, which is most of what
  makes nationwide connections work. A small number of very restrictive
  networks (locked-down corporate/school firewalls, some mobile carriers)
  block peer-to-peer video outright and need a **TURN** relay to work around
  — that requires a paid or self-hosted TURN server and isn't configured
  here. If a connection's data channel succeeds but video never appears,
  that's usually why.

## Light / dark theme

The ☾/☀ button in the top bar switches between dark and light. It follows
the visitor's system preference the first time, then remembers whatever they
picked (stored in that browser's `localStorage`).

## GitHub link

The header also has a GitHub icon (`#githubLink` in `index.html`). It ships
pointing at a placeholder — open `index.html` and change its `href` to your
own repo URL before deploying:

```html
<a class="iconbtn" id="githubLink" href="https://github.com/your-username/your-repo" ...>
```

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
device** does both things: the strip is saved, and the exact same PNG is
posted to your Discord channel.

On phones with a native share sheet (most iOS and Android browsers), **Save**
opens that sheet so the person explicitly taps "Save Image" — this fixed a
bug where, on iOS Safari especially, the old download-link trick just opened
the image in a new tab instead of saving it, while the app still claimed
"Saved to your device." Now the toast only says "Saved" once a save actually
happened, and says "Not saved — tap Save again" if the person backs out of
the share sheet or nothing was saved. Desktop browsers keep using the plain
download link, which works reliably there.

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
