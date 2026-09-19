/* ══════════════════════════════════════════════════════════════
   smora photo booth
   ──────────────────────────────────────────────────────────────
   SETTINGS you may want to change are all in CONFIG below.
   The Discord webhook is NOT here on purpose — it lives in a
   Vercel environment variable so nobody can read it from the page.
   See README.md.
   ══════════════════════════════════════════════════════════════ */

const CONFIG = {
  name: "RyzeBooth",
  adminPass: "ryze2026",        // change this
  discordEndpoint: "/api/discord", // Vercel function; leave as is
  defaultCaption: "",
  maxShots: 8,
  duoPeerPrefix: "ryzebooth-",   // namespaces our codes on the shared PeerJS broker
  // Additional STUN servers + basic TURN support for restrictive networks
  duoIceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" }
    // For production, add TURN servers:
    // { urls: "turn:your-turn-server.com:3478", username: "user", credential: "pass" }
  ],
  // Connection timeout in milliseconds for long-distance connections
  connectionTimeout: 15000
};

/* ─── built-in strips ─────────────────────────────────────── */
const BUILTIN = {
  strip4:  {label:"Classic strip", cols:1, rows:4, cw:560, ch:420, pad:30, gap:16, foot:110, rad:10},
  strip3:  {label:"Mini strip",    cols:1, rows:3, cw:560, ch:420, pad:30, gap:16, foot:100, rad:10},
  grid4:   {label:"Grid",          cols:2, rows:2, cw:460, ch:460, pad:28, gap:16, foot:96,  rad:10},
  duo:     {label:"Duo",           cols:1, rows:2, cw:620, ch:430, pad:28, gap:16, foot:96,  rad:10},
  wide6:   {label:"Contact sheet", cols:2, rows:3, cw:440, ch:330, pad:26, gap:12, foot:92,  rad:8},
  polaroid:{label:"Polaroid",      cols:1, rows:1, cw:640, ch:560, pad:34, gap:0,  foot:160, rad:8},
  single:  {label:"Big one",       cols:1, rows:1, cw:760, ch:560, pad:20, gap:0,  foot:70,  rad:12}
};

const LOOKS = {
  none:  {label:"None",  css:"none"},
  warm:  {label:"Warm",  css:"saturate(1.25) sepia(.18) brightness(1.06) contrast(1.02)"},
  film:  {label:"Film",  css:"sepia(.35) contrast(1.12) brightness(.97) saturate(1.15)"},
  mono:  {label:"Mono",  css:"grayscale(1) contrast(1.25) brightness(1.05)"},
  candy: {label:"Candy", css:"saturate(1.5) brightness(1.1) contrast(.92) hue-rotate(-8deg)"},
  cool:  {label:"Cool",  css:"hue-rotate(178deg) saturate(1.15) brightness(1.04)"},
  neon:  {label:"Neon",  css:"saturate(2.1) contrast(1.22) hue-rotate(160deg)"},
  dream: {label:"Dream", css:"brightness(1.12) contrast(.88) saturate(1.3)"},
  noir:  {label:"Noir",  css:"grayscale(1) contrast(1.6) brightness(.9)"},
  faded: {label:"Faded", css:"saturate(.72) brightness(1.1) contrast(.9) sepia(.12)"}
};

const COLORS = ["#FFFFFF","#FFF4E4","#F2A0BC","#141013","#231A2B","#7BD9A8","#FFC24B","#C9A7E8","#7FB3FF","#E23E57"];

const EMOJI = {
  "😀":"😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😜 🤪 😎 🥸 🤓 🧐 😏 😴 🥳 🤠 😭 😱 🤯 🥺 🤗 🤭 🫠",
  "❤️":"❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💖 💗 💓 💞 💕 💘 💝 💟 ❣️ 💔 😻 💋 🫶 💌",
  "🎉":"🎉 🎊 🎈 🎁 🎂 🍰 🪅 🎆 🎇 ✨ 🌟 ⭐ 💫 🔥 💥 🎵 🎶 🎤 🎧 🕺 💃 🪩 🍾 🥂 🎺 🥁",
  "🌸":"🌸 🌺 🌻 🌷 🌹 🌼 💐 🍀 🍄 🌈 ☀️ 🌤️ ⛅ 🌙 🌊 🍁 🍂 🌴 🌵 🦋 🐝 ❄️ ⚡",
  "🐶":"🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🦄 🐢 🐙 🦖 🐳",
  "🍕":"🍕 🍔 🍟 🌭 🍿 🧁 🍩 🍪 🍫 🍬 🍭 🍦 🍨 🍉 🍓 🍒 🥑 🌮 🍜 🍣 🧋 ☕ 🥤",
  "👋":"👋 🤚 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 👈 👉 👆 👇 👍 ✊ 👊 🙌 👏 🙏 💪 🫵",
  "💯":"💯 ✅ ⚡ 🚀 👑 💎 🎯 🏆 🥇 🔮 🪄 💸 🎮 📸 🎬 🎨 ♾️ 💤 🔔 🎀 🪞 🕯️"
};

/* ─── state ───────────────────────────────────────────────── */
const S = {
  step: 1, frame: "strip4", look: "warm", timer: 3,
  bg: "#FFFFFF", caption: CONFIG.defaultCaption, date: true,
  mirror: true, facing: "user", sound: true,
  shots: [], stickers: [], sel: null, cat: "😀",
  busy: false, gallery: [], custom: {},
  duo: emptyDuo(), theme: "dark",
  duoConnectionMode: "code" // 'code' or 'link'
};
function emptyDuo(){
  return {
    active: false, role: null, peer: null, conn: null, call: null,
    pendingCall: null, code: null, hostId: null, remoteStream: null,
    linkToken: null, linkExpiry: null, cameraReady: false
  };
}

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const FRAMES = () => ({ ...BUILTIN, ...S.custom });
const F = () => FRAMES()[S.frame] || BUILTIN.strip4;
const shotsOf = f => f.cols * f.rows;

/* ─── sound ───────────────────────────────────────────────── */
let AC;
function beep(freq = 760, dur = .09, vol = .2){
  if(!S.sound) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  }catch(e){}
}
const shutter = () => { beep(1100,.05,.18); setTimeout(()=>beep(520,.09,.16), 55); };

/* ─── toast ───────────────────────────────────────────────── */
let toastT;
function toast(msg, kind = ""){
  const el = $("#toast");
  el.textContent = msg; el.className = "on " + kind;
  clearTimeout(toastT);
  toastT = setTimeout(() => el.className = kind, 3000);
}

/* ─── steps ───────────────────────────────────────────────── */
function go(n){
  if(n === 3 && S.step !== 3) prepShots();
  if(n !== 3) stopCam();
  S.step = n;
  $$(".step").forEach((el, i) => el.classList.toggle("on", i + 1 === n));
  $("#fill").style.width = (n / 4 * 100) + "%";
  $("#count").textContent = n + " of 4";
  if(n === 2) applyDuoStep2UI();
  if(n === 3) applyDuoStep3UI();
  if(n === 4){ drawPreview(); toast("Thank you for using RyzeBooth ✨", "good"); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
$("#toStep4").onclick = () => go(4);
$("#soloCard").onclick = () => { teardownDuo(); markCardSelected("solo"); go(2); };
$("#duoCard").onclick = () => openDuoModal();

function markCardSelected(mode){
  $("#soloCard").classList.toggle("sel", mode === "solo");
  $("#duoCard").classList.toggle("sel", mode === "duo");
}
function layoutFilter(){
  return null; // any layout works in Duo Booth — each shot already combines both cameras
}
function applyDuoStep2UI(){
  const guest = S.duo.active && S.duo.role === "guest";
  $("#layoutPanel").hidden = guest;
  $("#step2Controls").hidden = guest;
  $("#step2Waiting").hidden = !guest;
  $("#duoLayoutNote").hidden = !(S.duo.active && S.duo.role === "host");
  if(!guest){
    buildLayouts($("#layouts"), false, layoutFilter());
  }
}
function applyDuoStep3UI(){
  const active = S.duo.active;
  $("#stageRemote").hidden = !active;
  $("#camLabelYou").hidden = !active;
  if(active && !S.duo.remoteStream){
    $("#camRemote").srcObject = null;
    $("#remoteMsg").style.display = "grid";
  }
  $("#camHint").textContent = !active
    ? "Your camera never leaves this device. Photos are only saved when you choose to save them."
    : (S.duo.role === "host"
        ? "Once you both have a camera on, you control the countdown for both of you."
        : "Once you both have a camera on, your host starts the countdown for both of you.");
}

$("#soundBtn").onclick = e => {
  S.sound = !S.sound;
  e.currentTarget.classList.toggle("on", S.sound);
  if(S.sound) beep(900, .07);
};

/* ─── light / dark theme ──────────────────────────────────── */
const THEME_KEY = "smora_theme_v1";
function applyTheme(t){
  S.theme = t;
  document.documentElement.setAttribute("data-theme", t);
  $("#themeBtn").textContent = t === "light" ? "☀" : "☾";
  $("#themeBtn").classList.toggle("on", t === "light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", t === "light" ? "#FDF7F4" : "#141013");
}
function loadTheme(){
  let t = null;
  try{ t = localStorage.getItem(THEME_KEY); }catch(e){}
  if(!t) t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
  applyTheme(t);
}
$("#themeBtn").onclick = () => {
  applyTheme(S.theme === "light" ? "dark" : "light");
  try{ localStorage.setItem(THEME_KEY, S.theme); }catch(e){}
  if(S.step === 4) drawPreview();
};

/* ─── builders ────────────────────────────────────────────── */
function buildLayouts(host, showDelete = false, filterFn = null){
  const all = FRAMES();
  const entries = Object.entries(all).filter(([, f]) => !filterFn || filterFn(f));
  host.innerHTML = entries.map(([k, f]) => {
    const cells = Array(Math.min(shotsOf(f), 12)).fill('<i></i>').join("");
    return `<button class="lay ${k === S.frame && !showDelete ? "on" : ""}" data-f="${k}">
      ${showDelete && S.custom[k] ? `<span class="del" data-del="${k}" title="Delete">✕</span>` : ""}
      <span class="mini" style="grid-template-columns:repeat(${f.cols},1fr)">${cells}</span>
      <b>${esc(f.label)}</b><small>${shotsOf(f)} photo${shotsOf(f) > 1 ? "s" : ""}</small>
    </button>`;
  }).join("");
  host.querySelectorAll("[data-f]").forEach(b => b.onclick = e => {
    if(e.target.closest("[data-del]")) return;
    if(showDelete) return;
    S.frame = b.dataset.f;
    S.shots = []; S.stickers = []; S.sel = null;
    $("#toStep4").disabled = true; setShoot("start");
    buildLayouts($("#layouts"), false, layoutFilter());
    prepShots();
    if(S.duo.active && S.duo.role === "host") sendDuo({ type: "config", frame: S.frame, look: S.look, timer: S.timer });
  });
  host.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if(!confirm("Delete this strip layout?")) return;
    delete S.custom[b.dataset.del];
    saveCustom(); buildLayouts($("#adminList"), true); buildLayouts($("#layouts"), false, layoutFilter());
  });
}

function buildChips(host, obj, key, after){
  host.innerHTML = Object.entries(obj).map(([k, v]) =>
    `<button class="chip ${S[key] === k ? "on" : ""}" data-k="${k}">${v.label}</button>`).join("");
  host.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    S[key] = b.dataset.k;
    buildChips($("#looks2"), LOOKS, "look");
    buildChips($("#looks3"), LOOKS, "look");
    applyCamFilter(); renderShots(); if(after) after();
    if(key === "look" && S.duo.active && S.duo.role === "host") sendDuo({ type: "config", frame: S.frame, look: S.look, timer: S.timer });
  });
}

function buildTimers(){
  const opts = [0, 3, 5, 10];
  $("#timers").innerHTML = opts.map(n =>
    `<button class="chip ${S.timer === n ? "on" : ""}" data-n="${n}">${n === 0 ? "Instant" : n + "s"}</button>`).join("");
  $("#timers").querySelectorAll("[data-n]").forEach(b => b.onclick = () => {
    S.timer = +b.dataset.n; buildTimers();
    if(S.duo.active && S.duo.role === "host") sendDuo({ type: "config", frame: S.frame, look: S.look, timer: S.timer });
  });
}

function buildSwatches(){
  $("#swatches").innerHTML = COLORS.map(c =>
    `<button class="sw ${S.bg === c ? "on" : ""}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("");
  $("#swatches").querySelectorAll("[data-c]").forEach(b => b.onclick = () => { S.bg = b.dataset.c; buildSwatches(); drawPreview(); });
}

function buildEmoji(){
  $("#tabs").innerHTML = Object.keys(EMOJI).map(k =>
    `<button class="${k === S.cat ? "on" : ""}" data-t="${k}">${k}</button>`).join("");
  $("#tabs").querySelectorAll("[data-t]").forEach(b => b.onclick = () => { S.cat = b.dataset.t; buildEmoji(); });
  $("#emoji").innerHTML = EMOJI[S.cat].split(" ").filter(Boolean).map(e =>
    `<button data-e="${e}">${e}</button>`).join("");
  $("#emoji").querySelectorAll("[data-e]").forEach(b => b.onclick = () => addSticker(b.dataset.e));
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

/* ─── camera ──────────────────────────────────────────────── */
let stream = null;
function applyCamFilter(){
  $("#cam").style.filter = LOOKS[S.look].css;
}
function prepShots(){
  const n = shotsOf(F());
  if(S.shots.length !== n) S.shots = new Array(n).fill(null);
  renderShots();
  $("#shotLine").textContent = S.duo.active
    ? `${n} shot${n > 1 ? "s" : ""} — each one a single photo with you both in it.`
    : `${n} shot${n > 1 ? "s" : ""}, one after another. Tap any photo to retake it.`;
}
async function startCam(){
  try{
    stopCam();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: S.facing, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    const v = $("#cam");
    v.srcObject = stream; await v.play();
    $("#camMsg").style.display = "none";
    applyCamFilter(); applyMirror();
    if(S.duo.active) handleDuoCamReady();
    return true;
  }catch(err){
    console.error(err);
    $("#camMsg").style.display = "grid";
    $("#camMsg").textContent = err.name === "NotAllowedError"
      ? "Camera access was blocked. Allow it in your browser's site settings, then tap Start camera again."
      : "No camera found on this device.";
    toast("Camera did not start", "bad");
    return false;
  }
}
function stopCam(){
  if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  const v = $("#cam"); if(v) v.srcObject = null;
  if(S.duo.call){ try{ S.duo.call.close(); }catch(e){} S.duo.call = null; }
}
function applyMirror(){
  const on = S.mirror && S.facing === "user";
  $("#cam").classList.toggle("mir", on);
  $("#mirBtn").classList.toggle("on", S.mirror);
  $("#mirTog").classList.toggle("on", S.mirror);
  $("#mirTog").setAttribute("aria-checked", S.mirror);
}
$("#mirBtn").onclick = () => { S.mirror = !S.mirror; applyMirror(); };
$("#mirTog").onclick = () => { S.mirror = !S.mirror; applyMirror(); };
$("#flipBtn").onclick = async () => {
  S.facing = S.facing === "user" ? "environment" : "user";
  if(stream) await startCam(); else applyMirror();
};

/* ─── capture ─────────────────────────────────────────────── */
function setShoot(mode){
  const b = $("#shoot");
  b.dataset.mode = mode;
  const guestWaits = S.duo.active && S.duo.role === "guest" && (mode === "shoot" || mode === "redo");
  b.textContent = guestWaits
    ? "Waiting for host…"
    : { start:"Start camera", shoot:"Take the photos", busy:"Hold still…", redo:"Shoot again" }[mode];
  b.disabled = mode === "busy" || guestWaits;
}
$("#shoot").onclick = async () => {
  const m = $("#shoot").dataset.mode;
  if(m === "start"){ if(await startCam()) setShoot("shoot"); return; }
  if(m === "busy") return;
  runSequence();
};

async function runSequence(remote = false){
  if(S.busy) return;
  if(S.duo.active){
    if(!remote && S.duo.role !== "host") return;
    if(!stream && !(await startCam())) return;
    if(!remote) sendDuo({ type: "shoot", timer: S.timer });
  }else if(!stream && !(await startCam())) return;

  S.busy = true; setShoot("busy");
  const n = shotsOf(F());
  S.shots = new Array(n).fill(null); renderShots();

  if(S.duo.active){
    for(let i = 0; i < n; i++){
      await countdown(S.timer);
      flash(); shutter();
      const [left, right] = duoPair(grab(), grabFrom($("#camRemote"), false));
      S.shots[i] = combineDuo(left, right);
      renderShots();
      await wait(520);
    }
  }else{
    for(let i = 0; i < n; i++){
      await countdown(S.timer);
      flash(); shutter();
      S.shots[i] = grab();
      renderShots();
      await wait(520);
    }
  }
  S.busy = false; setShoot("redo");
  $("#toStep4").disabled = false;
  beep(760, .1); setTimeout(() => beep(1020, .14), 110);
  toast("Strip ready", "good");
}
function duoPair(local, remote){
  return S.duo.role === "guest" ? [remote, local] : [local, remote];
}

async function retakeOne(i){
  if(S.busy) return;
  if(S.duo.active){ toast("Use "Shoot again" to redo a Duo strip", ""); return; }
  if(!stream && !(await startCam())) return;
  setShoot("busy"); S.busy = true;
  await countdown(S.timer);
  flash(); shutter();
  S.shots[i] = grab();
  renderShots();
  S.busy = false;
  setShoot(S.shots.every(Boolean) ? "redo" : "shoot");
  if(S.shots.every(Boolean)) $("#toStep4").disabled = false;
}

async function countdown(secs){
  const el = $("#cdown");
  if(!secs){ await wait(180); return; }
  for(let i = secs; i > 0; i--){
    el.textContent = i; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    beep(i === 1 ? 980 : 680, .07, .16);
    await wait(1000);
  }
  el.classList.remove("on"); el.textContent = "";
}
function flash(){ const f = $("#flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }

function grab(){
  return grabFrom($("#cam"), S.mirror && S.facing === "user");
}
function grabFrom(v, mirror){
  const c = document.createElement("canvas");
  c.width = v.videoWidth || 1280; c.height = v.videoHeight || 960;
  const x = c.getContext("2d");
  if(mirror){ x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(v, 0, 0, c.width, c.height);
  return c;
}

// Merges two camera captures into a single side-by-side photo — the host
// always on the left half, the guest always on the right half — so one
// Duo Booth shot produces exactly one combined picture, not two.
function combineDuo(left, right){
  const c = document.createElement("canvas");
  c.width = left.width; c.height = left.height;
  const x = c.getContext("2d");
  const halfW = c.width / 2;
  drawCover(x, left, 0, 0, halfW, c.height);
  drawCover(x, right, halfW, 0, halfW, c.height);
  x.fillStyle = "rgba(255,255,255,.85)";
  x.fillRect(halfW - 1.5, 0, 3, c.height);
  return c;
}
function drawCover(ctx, src, dx, dy, dw, dh){
  const sr = src.width / src.height, dr = dw / dh;
  let sw, sh, sx, sy;
  if(sr > dr){ sh = src.height; sw = sh * dr; sx = (src.width - sw) / 2; sy = 0; }
  else       { sw = src.width;  sh = sw / dr; sx = 0; sy = (src.height - sh) / 2; }
  ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
}

function renderShots(){
  const n = shotsOf(F());
  $("#shots").innerHTML = Array.from({ length: n }, (_, i) => {
    const s = S.shots[i];
    return `<button class="shot" data-i="${i}">${
      s ? `<img src="${s.toDataURL("image/jpeg", .55)}" alt="Photo ${i+1}" style="filter:${LOOKS[S.look].css}"><span class="re">Retake</span>`
        : (i + 1)
    }</button>`;
  }).join("");
  $("#shots").querySelectorAll("[data-i]").forEach(b => b.onclick = () => retakeOne(+b.dataset.i));
}

/* ─── strip drawing ───────────────────────────────────────── */
const overlayCache = {};
function overlayFor(f){
  if(!f.overlay) return null;
  if(overlayCache[f.overlay]) return overlayCache[f.overlay];
  const img = new Image();
  img.onload = () => { drawPreview(); };
  img.src = f.overlay;
  overlayCache[f.overlay] = img;
  return img;
}
function stripSize(f){
  return {
    w: f.pad * 2 + f.cols * f.cw + f.gap * (f.cols - 1),
    h: f.pad * 2 + f.rows * f.ch + f.gap * (f.rows - 1) + f.foot
  };
}
function isDark(hex){
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16);
  return (0.2126 * ((n>>16)&255) + 0.7152 * ((n>>8)&255) + 0.0722 * (n&255)) < 140;
}
function roundRect(x, a, b, w, h, r){
  x.beginPath();
  if(x.roundRect) x.roundRect(a, b, w, h, r);
  else{ x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }
}

function drawStrip(canvas, { withStickers = false, frame = null, shots = null } = {}){
  const f = frame || F();
  const src = shots || S.shots;
  const { w, h } = stripSize(f);
  canvas.width = w; canvas.height = h;
  const x = canvas.getContext("2d");
  x.fillStyle = S.bg; x.fillRect(0, 0, w, h);

  let i = 0;
  for(let r = 0; r < f.rows; r++) for(let c = 0; c < f.cols; c++, i++){
    const px = f.pad + c * (f.cw + f.gap), py = f.pad + r * (f.ch + f.gap);
    x.save(); roundRect(x, px, py, f.cw, f.ch, f.rad ?? 10); x.clip();
    const s = src[i];
    if(s){
      const sr = s.width / s.height, dr = f.cw / f.ch;
      let sw, sh, sx, sy;
      if(sr > dr){ sh = s.height; sw = sh * dr; sx = (s.width - sw) / 2; sy = 0; }
      else       { sw = s.width;  sh = sw / dr; sx = 0; sy = (s.height - sh) / 2; }
      x.filter = LOOKS[S.look].css;
      x.drawImage(s, sx, sy, sw, sh, px, py, f.cw, f.ch);
      x.filter = "none";
    }else{
      x.fillStyle = isDark(S.bg) ? "rgba(255,255,255,.07)" : "rgba(20,16,19,.07)";
      x.fillRect(px, py, f.cw, f.ch);
    }
    x.restore();
  }

  if(f.foot > 0){
    const ink = isDark(S.bg) ? "#FFF4E4" : "#231A2B";
    const cap = (S.caption || "").trim();
    const baseY = h - f.foot / 2 + f.pad / 3;
    x.textAlign = "center"; x.fillStyle = ink;
    let lastY = baseY;
    if(cap){
      x.font = `700 ${Math.round(f.foot * .34)}px 'Plus Jakarta Sans', sans-serif`;
      x.fillText(cap, w / 2, baseY, w - f.pad * 2);
    }
    if(S.date){
      const d = new Date(), p = n => String(n).padStart(2, "0");
      const dateY = cap ? baseY + f.foot * .3 : baseY;
      x.globalAlpha = .55;
      x.font = `500 ${Math.round(f.foot * .2)}px Inter, sans-serif`;
      x.fillText(`${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`, w / 2, dateY);
      x.globalAlpha = 1;
      lastY = dateY;
    }
    x.textAlign = "center";
    x.globalAlpha = .6;
    x.font = `800 ${Math.round(f.foot * .19)}px 'Plus Jakarta Sans', sans-serif`;
    const brandY = Math.min(lastY + f.foot * .28, h - f.pad * .35);
    x.fillText(CONFIG.name, w / 2, brandY, w - f.pad * 2);
    x.globalAlpha = 1;
  }

  const ov = overlayFor(f);
  if(ov && ov.complete && ov.naturalWidth) x.drawImage(ov, 0, 0, w, h);

  if(withStickers){
    S.stickers.forEach(s => {
      x.save();
      x.translate(s.x * w, s.y * h); x.rotate(s.rot * Math.PI / 180);
      x.font = `${s.size * w}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(s.emoji, 0, 0);
      x.restore();
    });
  }
  return canvas;
}

function drawPreview(){
  const f = F(), { w, h } = stripSize(f);
  drawStrip($("#preview"));
  const stage = $("#stage");
  const maxH = Math.max(320, window.innerHeight * .62);
  stage.style.width = Math.round(Math.min(w, maxH * (w / h))) + "px";
  stage.style.maxWidth = "100%";
  layoutStickers();
}
window.addEventListener("resize", () => { if(S.step === 4) drawPreview(); });

/* ─── stickers ────────────────────────────────────────────── */
function addSticker(emoji){
  const s = { id: Date.now() + Math.random(), emoji, x: .5, y: .4, size: .12, rot: 0 };
  S.stickers.push(s); S.sel = s.id;
  layoutStickers(); renderStkBar();
}
function layoutStickers(){
  const stage = $("#stage");
  stage.querySelectorAll(".stk").forEach(e => e.remove());
  const rect = $("#preview").getBoundingClientRect();
  S.stickers.forEach(s => {
    const el = document.createElement("div");
    el.className = "stk" + (S.sel === s.id ? " sel" : "");
    el.textContent = s.emoji;
    el.style.fontSize = (s.size * rect.width) + "px";
    place(el, s, rect);
    el.addEventListener("pointerdown", ev => dragStart(ev, s, el));
    stage.appendChild(el);
  });
}
function place(el, s, rect){
  const r = rect || $("#preview").getBoundingClientRect();
  el.style.left = (s.x * r.width) + "px";
  el.style.top = (s.y * r.height) + "px";
  el.style.transform = `translate(-50%,-50%) rotate(${s.rot}deg)`;
}
let drag = null;
function dragStart(ev, s, el){
  ev.preventDefault();
  S.sel = s.id; renderStkBar();
  $$(".stk").forEach(e => e.classList.remove("sel")); el.classList.add("sel");
  const r = $("#preview").getBoundingClientRect();
  drag = { s, el, r };
  el.setPointerCapture(ev.pointerId);
  el.style.cursor = "grabbing";
}
document.addEventListener("pointermove", ev => {
  if(!drag) return;
  const { s, el, r } = drag;
  s.x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  s.y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
  place(el, s, r);
});
document.addEventListener("pointerup", () => { if(drag){ drag.el.style.cursor = "grab"; drag = null; } });

function renderStkBar(){
  const s = S.stickers.find(k => k.id === S.sel);
  const bar = $("#stkBar");
  if(!s){ bar.innerHTML = `<span class="hint" style="margin:0">Tap a sticker to add it, then drag it onto the strip.</span>`; return; }
  bar.innerHTML = `
    <button class="chip" data-a="small">– size</button>
    <button class="chip" data-a="big">+ size</button>
    <button class="chip" data-a="left">↺</button>
    <button class="chip" data-a="right">↻</button>
    <button class="chip" data-a="del">Remove</button>`;
  bar.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if(a === "small") s.size = Math.max(.04, s.size - .02);
    if(a === "big")   s.size = Math.min(.5, s.size + .02);
    if(a === "left")  s.rot -= 15;
    if(a === "right") s.rot += 15;
    if(a === "del"){ S.stickers = S.stickers.filter(k => k.id !== s.id); S.sel = null; }
    layoutStickers(); renderStkBar();
  });
}

/* ─── caption / toggles ───────────────────────────────────── */
$("#caption").addEventListener("input", e => { S.caption = e.target.value; drawPreview(); });
$("#dateTog").onclick = e => {
  S.date = !S.date;
  e.currentTarget.classList.toggle("on", S.date);
  e.currentTarget.setAttribute("aria-checked", S.date);
  drawPreview();
};

/* ══════════════════════════════════════════════════════════
   DUO BOOTH — Enhanced with link-based connection & camera preview
   ══════════════════════════════════════════════════════════ */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(){
  let s = ""; for(let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

// Generate a time-limited link token
function genLinkToken(){
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}

function openDuoModal(){
  if(typeof Peer === "undefined"){
    toast("Duo Booth couldn't load — check your connection and reload", "bad");
    return;
  }
  teardownDuo();
  $("#duoCodeIn").value = ""; 
  $("#duoHostStatus").textContent = ""; 
  $("#duoJoinStatus").textContent = "";
  $("#duoLinkInput").value = "";
  showDuoView("choice");
  $("#duoModal").classList.add("on");
  
  // Start camera preview in modal after a short delay
  setTimeout(() => startDuoPreviewCam(), 100);
}

// Auto-start camera preview when modal opens
async function startDuoPreviewCam(){
  if($("#duoModalCam") && !$("#duoModalCam").srcObject){
    try{
      const previewStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: S.facing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      $("#duoModalCam").srcObject = previewStream;
      await $("#duoModalCam").play();
    }catch(err){
      console.error("Could not start duo preview camera:", err);
    }
  }
}

function closeDuoModal(){ 
  $("#duoModal").classList.remove("on");
  stopDuoPreviewCam();
}

function stopDuoPreviewCam(){
  const cam = $("#duoModalCam");
  if(cam && cam.srcObject){
    cam.srcObject.getTracks().forEach(t => t.stop());
    cam.srcObject = null;
  }
}

function showDuoView(view){
  $("#duoChoice").hidden = view !== "choice";
  $("#duoHostView").hidden = view !== "host";
  $("#duoJoinView").hidden = view !== "join";
  $("#duoLinkHostView").hidden = view !== "linkhost";
  $("#duoLinkJoinView").hidden = view !== "linkjoin";
  $("#duoConnectedView").hidden = view !== "connected";
  $("#duoBackBtn").hidden = view === "choice" || view === "connected";
}

$("#duoClose").onclick = () => { teardownDuo(); closeDuoModal(); };
$("#duoCancelBtn").onclick = () => { teardownDuo(); closeDuoModal(); };
$("#duoModal").addEventListener("click", e => { if(e.target.id === "duoModal"){ teardownDuo(); closeDuoModal(); } });
$("#duoBackBtn").onclick = () => { teardownDuo(); showDuoView("choice"); };

// Code-based connection
$("#duoHostBtn").onclick = () => duoHost();
$("#duoJoinBtn").onclick = () => { showDuoView("join"); $("#duoCodeIn").focus(); };
$("#duoConnectBtn").onclick = () => duoJoin($("#duoCodeIn").value);
$("#duoCodeIn").addEventListener("keydown", e => { if(e.key === "Enter") $("#duoConnectBtn").click(); });
$("#duoCopyBtn").onclick = async () => {
  try{ await navigator.clipboard.writeText(S.duo.code || ""); toast("Code copied", "good"); }
  catch(e){ toast("Couldn't copy — select and copy it manually", "bad"); }
};

// Link-based connection (5-minute expiry)
$("#duoLinkHostBtn").onclick = () => duoLinkHost();
$("#duoLinkJoinBtn").onclick = () => { showDuoView("linkjoin"); $("#duoLinkInput").focus(); };
$("#duoLinkConnectBtn").onclick = () => duoLinkJoin($("#duoLinkInput").value);
$("#duoLinkInput").addEventListener("keydown", e => { if(e.key === "Enter") $("#duoLinkConnectBtn").click(); });
$("#duoLinkCopyBtn").onclick = async () => {
  try{ 
    const link = `${window.location.origin}?duo=${S.duo.linkToken}`;
    await navigator.clipboard.writeText(link); 
    toast("Link copied", "good"); 
  }
  catch(e){ toast("Couldn't copy — select and copy it manually", "bad"); }
};

$("#duoContinueBtn").onclick = () => {
  closeDuoModal();
  markCardSelected("duo");
  S.shots = []; S.stickers = []; S.sel = null;
  buildLayouts($("#layouts"), false, layoutFilter());
  go(2);
};

function duoHost(){
  showDuoView("host");
  $("#duoCodeOut").textContent = "••••••";
  $("#duoHostStatus").textContent = "Connecting…";
  S.duo.role = "host";
  S.duo.connectionMode = "code";
  const code = genCode();
  S.duo.code = code;
  const peer = new Peer(CONFIG.duoPeerPrefix + code.toLowerCase(), { 
    config: { iceServers: CONFIG.duoIceServers }
  });
  S.duo.peer = peer;
  
  const connTimeout = setTimeout(() => {
    if(!S.duo.peer) return;
    $("#duoHostStatus").textContent = "Connection timeout. Make sure the code is correct.";
  }, CONFIG.connectionTimeout);
  
  peer.on("open", () => {
    clearTimeout(connTimeout);
    $("#duoCodeOut").textContent = code;
    $("#duoHostStatus").textContent = "Share this code — waiting for your partner to join…";
  });
  peer.on("connection", conn => { S.duo.conn = conn; wireDuoData(conn); });
  peer.on("call", call => {
    if(stream){ call.answer(stream); wireCall(call); }
    else S.duo.pendingCall = call;
  });
  peer.on("error", err => {
    clearTimeout(connTimeout);
    console.error(err);
    $("#duoHostStatus").textContent = "Connection problem — close this and try again.";
  });
}

function duoLinkHost(){
  showDuoView("linkhost");
  $("#duoLinkHostStatus").textContent = "Generating link…";
  S.duo.role = "host";
  S.duo.connectionMode = "link";
  const token = genLinkToken();
  S.duo.linkToken = token;
  S.duo.linkExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes
  
  const code = token.substring(0, 6).toUpperCase();
  S.duo.code = code;
  
  const peer = new Peer(CONFIG.duoPeerPrefix + code.toLowerCase(), { 
    config: { iceServers: CONFIG.duoIceServers }
  });
  S.duo.peer = peer;
  
  const connTimeout = setTimeout(() => {
    if(!S.duo.peer) return;
    $("#duoLinkHostStatus").textContent = "Link expired. Generate a new one.";
  }, CONFIG.connectionTimeout);
  
  peer.on("open", () => {
    clearTimeout(connTimeout);
    updateLinkExpiry();
    $("#duoLinkHostStatus").textContent = "Link ready — waiting for your partner to join…";
  });
  peer.on("connection", conn => { S.duo.conn = conn; wireDuoData(conn); });
  peer.on("call", call => {
    if(stream){ call.answer(stream); wireCall(call); }
    else S.duo.pendingCall = call;
  });
  peer.on("error", err => {
    clearTimeout(connTimeout);
    console.error(err);
    $("#duoLinkHostStatus").textContent = "Connection problem — close this and try again.";
  });
}

function updateLinkExpiry(){
  if(!S.duo.linkExpiry) return;
  const remaining = Math.max(0, Math.floor((S.duo.linkExpiry - Date.now()) / 1000));
  const el = $("#duoLinkExpiry");
  if(el) el.textContent = `expires in ${remaining}s`;
  if(remaining > 0){
    setTimeout(updateLinkExpiry, 1000);
  } else {
    if(el) el.textContent = "expired";
    if(S.duo.active === false) teardownDuo();
  }
}

function duoJoin(codeRaw){
  const code = (codeRaw || "").trim().toUpperCase();
  if(!code){ $("#duoJoinStatus").textContent = "Enter a code first."; return; }
  $("#duoJoinStatus").textContent = "Connecting…";
  S.duo.role = "guest";
  S.duo.hostId = CONFIG.duoPeerPrefix + code.toLowerCase();
  const peer = new Peer({ config: { iceServers: CONFIG.duoIceServers } });
  S.duo.peer = peer;
  
  const connTimeout = setTimeout(() => {
    if(!S.duo.peer) return;
    $("#duoJoinStatus").textContent = "Couldn't find that code — check it and try again.";
  }, CONFIG.connectionTimeout);
  
  peer.on("open", () => {
    clearTimeout(connTimeout);
    const conn = peer.connect(S.duo.hostId, { reliable: true });
    S.duo.conn = conn;
    wireDuoData(conn);
  });
  peer.on("error", err => {
    clearTimeout(connTimeout);
    console.error(err);
    $("#duoJoinStatus").textContent = "Couldn't find that code — check it and try again.";
  });
}

function duoLinkJoin(token){
  const t = (token || "").trim().toUpperCase();
  if(!t){ $("#duoLinkJoinStatus").textContent = "Enter a link or code first."; return; }
  $("#duoLinkJoinStatus").textContent = "Connecting…";
  S.duo.role = "guest";
  const code = t.substring(0, 6);
  S.duo.hostId = CONFIG.duoPeerPrefix + code.toLowerCase();
  const peer = new Peer({ config: { iceServers: CONFIG.duoIceServers } });
  S.duo.peer = peer;
  
  const connTimeout = setTimeout(() => {
    if(!S.duo.peer) return;
    $("#duoLinkJoinStatus").textContent = "Couldn't connect — link may have expired.";
  }, CONFIG.connectionTimeout);
  
  peer.on("open", () => {
    clearTimeout(connTimeout);
    const conn = peer.connect(S.duo.hostId, { reliable: true });
    S.duo.conn = conn;
    wireDuoData(conn);
  });
  peer.on("error", err => {
    clearTimeout(connTimeout);
    console.error(err);
    $("#duoLinkJoinStatus").textContent = "Couldn't connect — link may have expired.";
  });
}

function wireDuoData(conn){
  conn.on("open", () => {
    S.duo.active = true;
    showDuoView("connected");
    if(S.duo.role === "host") sendDuo({ type: "config", frame: S.frame, look: S.look, timer: S.timer });
  });
  conn.on("data", handleDuoData);
  conn.on("close", () => {
    if(S.duo.active) toast("Your partner disconnected", "bad");
    teardownDuo();
    applyDuoStep2UI(); applyDuoStep3UI();
  });
  conn.on("error", e => console.error(e));
}
function sendDuo(msg){ if(S.duo.conn && S.duo.conn.open) S.duo.conn.send(msg); }
function handleDuoData(msg){
  if(!msg || !msg.type) return;
  if(msg.type === "config"){
    S.frame = msg.frame; S.look = msg.look; S.timer = msg.timer;
    buildChips($("#looks2"), LOOKS, "look"); buildChips($("#looks3"), LOOKS, "look");
    buildTimers(); prepShots();
  }
  if(msg.type === "shoot") runSequence(true);
}

function wireCall(call){
  S.duo.call = call;
  call.on("stream", remote => {
    S.duo.remoteStream = remote;
    S.duo.cameraReady = true;
    $("#camRemote").srcObject = remote;
    $("#stageRemote").hidden = false;
    $("#remoteMsg").style.display = "none";
  });
  call.on("close", teardownRemoteVideo);
  call.on("error", teardownRemoteVideo);
}
function teardownRemoteVideo(){
  S.duo.remoteStream = null;
  S.duo.cameraReady = false;
  $("#camRemote").srcObject = null;
  $("#remoteMsg").style.display = "grid";
}
function handleDuoCamReady(){
  if(S.duo.role === "host" && S.duo.pendingCall){
    try{ S.duo.pendingCall.answer(stream); wireCall(S.duo.pendingCall); }catch(e){}
    S.duo.pendingCall = null;
  }else if(S.duo.role === "guest" && S.duo.peer && S.duo.hostId){
    if(S.duo.call){ try{ S.duo.call.close(); }catch(e){} }
    try{ wireCall(S.duo.peer.call(S.duo.hostId, stream)); }catch(e){ console.error(e); }
  }
}
function teardownDuo(){
  try{ S.duo.call && S.duo.call.close(); }catch(e){}
  try{ S.duo.conn && S.duo.conn.close(); }catch(e){}
  try{ S.duo.peer && S.duo.peer.destroy(); }catch(e){}
  S.duo = emptyDuo();
  teardownRemoteVideo();
  $("#stageRemote").hidden = true;
  $("#camLabelYou").hidden = true;
}

/* ─── save (device + Discord) ─────────────────────────────── */
async function postToDiscord(blob){
  try{
    const fd = new FormData();
    fd.append("file", blob, `${CONFIG.name}-${Date.now()}.png`);
    const res = await fetch(CONFIG.discordEndpoint, { method: "POST", body: fd });
    return res.ok;
  }catch(e){ return false; }
}

async function saveToDevice(blob){
  const file = new File([blob], `${CONFIG.name}-strip.png`, { type: "image/png" });
  if(navigator.canShare && navigator.canShare({ files: [file] })){
    try{
      await navigator.share({ files: [file], title: CONFIG.name });
      return true;
    }catch(err){
      if(err && err.name === "AbortError") return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${CONFIG.name}-strip.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

$("#saveBtn").onclick = async () => {
  const btn = $("#saveBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  const c = drawStrip(document.createElement("canvas"), { withStickers: true });
  const blob = await new Promise(r => c.toBlob(r, "image/png"));

  const saved = await saveToDevice(blob);
  if(saved){
    pushGallery(c);
    beep(880, .1); setTimeout(() => beep(1180, .13), 110);
  }

  const ok = saved ? await postToDiscord(blob) : false;
  toast(
    saved ? (ok ? "Saved to your device and to Discord" : "Saved to your device") : "Not saved — tap Save again",
    saved ? "good" : "bad"
  );
  btn.disabled = false; btn.textContent = "Save to my device";
};

function pushGallery(canvas){
  const u = canvas.toDataURL("image/jpeg", .5);
  if(S.gallery.includes(u)) return;
  S.gallery.unshift(u); S.gallery = S.gallery.slice(0, 8);
  $("#galWrap").hidden = false;
  $("#gal").innerHTML = S.gallery.map(x => `<img src="${x}" alt="Saved strip">`).join("");
}
$("#gal").onclick = e => { if(e.target.tagName === "IMG") window.open(e.target.src, "_blank"); };

$("#againBtn").onclick = () => {
  S.shots = []; S.stickers = []; S.sel = null;
  S.caption = CONFIG.defaultCaption; $("#caption").value = S.caption;
  $("#toStep4").disabled = true; setShoot("start");
  go(2);
};

/* ══════════════════════════════════════════════════════════
   ADMIN — add strip layouts
   ══════════════════════════════════════════════════════════ */
const KEY = "smora_strips_v1";
function loadCustom(){
  try{ S.custom = JSON.parse(localStorage.getItem(KEY) || "{}"); }catch(e){ S.custom = {}; }
}
function saveCustom(){
  try{ localStorage.setItem(KEY, JSON.stringify(S.custom)); }
  catch(e){ toast("Storage is full — remove an overlay image", "bad"); }
}

let tapCount = 0, tapT;
$("#brandBtn").onclick = () => {
  tapCount++; clearTimeout(tapT);
  tapT = setTimeout(() => tapCount = 0, 900);
  if(tapCount >= 5){ tapCount = 0; openAdmin(); }
};
function openAdmin(skipLock = false){
  $("#adminModal").classList.add("on");
  if(skipLock){
    $("#adminLock").hidden = true; $("#adminBody").hidden = false;
    buildLayouts($("#adminList"), true); drawFormPreview();
  }else{
    $("#adminLock").hidden = false; $("#adminBody").hidden = true; $("#adminPass").value = "";
  }
}
$("#adminClose").onclick = () => $("#adminModal").classList.remove("on");
$("#adminModal").addEventListener("click", e => { if(e.target.id === "adminModal") $("#adminModal").classList.remove("on"); });
$("#designBtn").onclick = () => openAdmin(true);

$("#adminGo").onclick = () => {
  if($("#adminPass").value !== CONFIG.adminPass){ toast("Wrong passcode", "bad"); return; }
  $("#adminLock").hidden = true; $("#adminBody").hidden = false;
  buildLayouts($("#adminList"), true); drawFormPreview();
};
$("#adminPass").addEventListener("keydown", e => { if(e.key === "Enter") $("#adminGo").click(); });

let formOverlay = null;
const formFields = ["fName","fCols","fRows","fCw","fCh","fPad","fGap","fFoot","fRad"];
formFields.forEach(id => $("#" + id).addEventListener("input", drawFormPreview));

function readForm(){
  return {
    label: ($("#fName").value || "Custom strip").slice(0, 26),
    cols: clamp(+$("#fCols").value, 1, 6),
    rows: clamp(+$("#fRows").value, 1, 8),
    cw:   clamp(+$("#fCw").value, 120, 2000),
    ch:   clamp(+$("#fCh").value, 120, 2000),
    pad:  clamp(+$("#fPad").value, 0, 200),
    gap:  clamp(+$("#fGap").value, 0, 200),
    foot: clamp(+$("#fFoot").value, 0, 400),
    rad:  clamp(+$("#fRad").value, 0, 120),
    overlay: formOverlay || null
  };
}
const clamp = (n, a, b) => Math.min(b, Math.max(a, isNaN(n) ? a : n));

function drawFormPreview(){
  const f = readForm();
  const blanks = new Array(shotsOf(f)).fill(null);
  const c = $("#fPrev");
  const keepBg = S.bg; S.bg = "#FFFFFF";
  drawStrip(c, { frame: f, shots: blanks });
  S.bg = keepBg;
}

$("#fOver").addEventListener("change", async e => {
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 2.5 * 1024 * 1024){ toast("Overlay must be under 2.5 MB", "bad"); e.target.value = ""; return; }
  formOverlay = await downscale(file, 1400);
  delete overlayCache[formOverlay];
  drawFormPreview();
  toast("Overlay loaded", "good");
});

function downscale(file, max){
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/png"));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

$("#fSave").onclick = () => {
  const f = readForm();
  if(shotsOf(f) > CONFIG.maxShots){ toast(`That is ${shotsOf(f)} photos — the limit is ${CONFIG.maxShots}`, "bad"); return; }
  const key = "c_" + Date.now().toString(36);
  S.custom[key] = f;
  saveCustom();
  formOverlay = null; $("#fOver").value = ""; $("#fName").value = "";
  buildLayouts($("#adminList"), true); buildLayouts($("#layouts"), false, layoutFilter());
  drawFormPreview();
  toast(`"${f.label}" added`, "good");
};

$("#fExport").onclick = () => {
  const blob = new Blob([JSON.stringify(S.custom, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "strips.json";
  a.click(); URL.revokeObjectURL(a.href);
};
$("#fImportBtn").onclick = () => $("#fImport").click();
$("#fImport").addEventListener("change", e => {
  const file = e.target.files[0]; if(!file) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const data = JSON.parse(r.result);
      Object.assign(S.custom, data); saveCustom();
      buildLayouts($("#adminList"), true); buildLayouts($("#layouts"), false, layoutFilter());
      toast("Strips imported", "good");
    }catch(err){ toast("That file is not valid JSON", "bad"); }
  };
  r.readAsText(file);
});

/* ─── boot ────────────────────────────────────────────────── */
(async function init(){
  $("#brandName").textContent = CONFIG.name;
  loadTheme();
  loadCustom();

  try{
    const res = await fetch("strips.json", { cache: "no-store" });
    if(res.ok) S.custom = { ...(await res.json()), ...S.custom };
  }catch(e){}

  buildLayouts($("#layouts"), false, layoutFilter());
  buildChips($("#looks2"), LOOKS, "look");
  buildChips($("#looks3"), LOOKS, "look");
  buildTimers(); buildSwatches(); buildEmoji();
  renderStkBar(); setShoot("start"); prepShots();
  $("#caption").value = S.caption;
  go(1);

  // Check for link-based duo invite in URL
  const params = new URLSearchParams(location.search);
  if(params.has("duo")){ 
    const token = params.get("duo");
    openDuoModal();
    setTimeout(() => { showDuoView("linkjoin"); $("#duoLinkInput").value = token; }, 300);
  }
  
  if(params.has("admin")) openAdmin();
})();
