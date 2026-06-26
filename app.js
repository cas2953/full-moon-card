/* ============================================================
   app.js — Baby Full-Month Card · "Moonlit"
   Screen 1 (賀卡): shake → 3 moods  哭 → 不哭 → 笑
   Screen 2 (紀念小卡): open keepsake → full-screen close-up
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 0. config ---------- */
  const IMAGES = {
    babyCalm:  ["assets/images/baby-card.webp",  "assets/images/baby-card.png"],
    babySmile: ["assets/images/baby-smile.webp", "assets/images/baby-smile.png"],
    babyCry:   ["assets/images/baby-cry.webp",   "assets/images/baby-cry.png"],
    cardOg:    ["assets/images/card-og.webp",    "assets/images/card-og.png"],
    cardOgFg:  ["assets/images/card-og-fg.webp", "assets/images/card-og-fg.png"],
    cardZh:    ["assets/images/card-cn.webp",    "assets/images/card-cn.png"],      // 傳說 legendary
    cardEn:    ["assets/images/card-en.webp",    "assets/images/card-en.png"],
    cardNormalZh: ["assets/images/card-normal-cn.webp", "assets/images/card-normal-cn.png"], // 普通 normal
    cardNormalEn: ["assets/images/card-normal-en.webp", "assets/images/card-normal-en.png"],
    cardRareZh:   ["assets/images/card-rare-cn.webp",   "assets/images/card-rare-cn.png"],   // 精良 rare (blue)
    cardRareEn:   ["assets/images/card-rare-en.webp",   "assets/images/card-rare-en.png"],
    cardEpicZh:   ["assets/images/card-epic-cn.webp",   "assets/images/card-epic-cn.png"],   // 史詩 epic
    cardEpicEn:   ["assets/images/card-epic-en.webp",   "assets/images/card-epic-en.png"],
    cardBack:  ["assets/images/card-back.webp"],
  };
  // full-res photo to save, per current mood (download grabs the CURRENT stage)
  const DOWNLOAD_IMG  = { cry: "assets/images/baby-cry.png", calm: "assets/images/baby-card.png", smile: "assets/images/baby-smile.png" };
  const DOWNLOAD_NAME = { cry: "滿月賀卡-寶寶哭臉.png", calm: "滿月賀卡-寶寶熟睡.png", smile: "滿月賀卡-寶寶笑臉.png" };

  // 紀念小卡稀有度 — 抽中機率：普通 > 精良 > 史詩 > 傳說 (40 / 30 / 20 / 10)
  // 四張卡中央的寶寶照片相同，差別在外框寶石；翻卡特效與特寫光效會依稀有度分級。
  const RARITY = {
    normal:    { p: 0.40, zh: IMAGES.cardNormalZh, en: IMAGES.cardNormalEn, dl: { zh: "assets/images/card-normal-cn.png", en: "assets/images/card-normal-en.png" } },
    rare:      { p: 0.30, zh: IMAGES.cardRareZh,   en: IMAGES.cardRareEn,   dl: { zh: "assets/images/card-rare-cn.png",   en: "assets/images/card-rare-en.png" } },
    epic:      { p: 0.20, zh: IMAGES.cardEpicZh,   en: IMAGES.cardEpicEn,   dl: { zh: "assets/images/card-epic-cn.png",   en: "assets/images/card-epic-en.png" } },
    legendary: { p: 0.10, zh: IMAGES.cardZh,       en: IMAGES.cardEn,       dl: { zh: "assets/images/card-cn.png",        en: "assets/images/card-en.png" } },
  };
  const RARITY_ORDER = ["normal", "rare", "epic", "legendary"];
  function rollRarity() {
    const r = Math.random(); let acc = 0;
    for (let i = 0; i < RARITY_ORDER.length; i++) { acc += RARITY[RARITY_ORDER[i]].p; if (r < acc) return RARITY_ORDER[i]; }
    return "legendary";
  }
  // particle density + parallax depth multipliers per rarity (close-up FX grading)
  const RARITY_FX = {
    normal:    { particles: 0,    depth: 0.40 },
    rare:      { particles: 0.5,  depth: 0.70 },
    epic:      { particles: 0.85, depth: 0.95 },
    legendary: { particles: 1.25, depth: 1.20 },
  };

  // Shake → a single "soothe level" (0–1). Rocking raises it; stopping drains it.
  // The mood is read DIRECTLY from the level, so the progress bar (= level) and the
  // active 哭/不哭/笑 node ALWAYS agree. Motion is detected on ALL axes — left/right
  // (x), front/back (y), toward-screen (z) AND twisting (rotationRate) all count.
  // Deliberately WEIGHTY & SLOW: raw motion feeds a damped "drive" (DAMP) before the
  // level moves; when you stop, the level HOLDS for HOLD_MS then decays gently (DRAIN
  // eased in over DRAIN_RAMP_MS) so each stage lingers. ── Too sensitive? raise
  // NOISE_FLOOR. Stages too short? lower DRAIN or raise HOLD_MS. (use ?debug) ──
  const SHAKE = {
    NOISE_FLOOR: 2.6,    // combined motion below this is ignored (raise = less sensitive)
    ROT_K: 0.025,        // rotationRate (deg/s) → accel-equivalent (so twist/wave also triggers)
    MOTION_CAP: 6,       // clamp big spikes so one jolt can't fill the bar
    DAMP: 0.10,          // how fast the drive eases toward raw motion (lower = more inertia)
    RISE: 0.00078,       // soothe gained per unit of damped drive each frame (rise speed; was 0.0026 → 30%)
    DRAIN: 0.07,         // soothe lost per second once decaying (lower = stages linger longer)
    HOLD_MS: 1500,       // after you stop rocking, hold the level this long before any decay
    DRAIN_RAMP_MS: 1200, // then ease the decay in over this long (gentle, not a cliff)
    CRY_MAX: 0.34,       // level below → 哭
    SMILE_MIN: 0.66,     // level above → 笑   (in between → 不哭)
    HYST: 0.05,          // hysteresis so the boundary doesn't flicker
    POINTER_K: 0.40,     // pointer move (px above 4) → motion (desktop fallback)
    START_LEVEL: 0.5,    // initial calm (sleeping) sits mid-bar
    GRACE_MS: 400,       // min time on a mood before it can flip (debounce)
  };

  const REDUCE_MOTION = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- 1. resilient image loading ---------- */
  // Images are served with a 1-year immutable cache (filenames are stable), so
  // bump ASSET_V whenever you replace an image in assets/images/ — it appends
  // ?v=… so browsers/CDN fetch the new file instead of a stale cached copy.
  const ASSET_V = "2";
  const withV = (u) => (/^data:/.test(u) ? u : u + (u.indexOf("?") < 0 ? "?" : "&") + "v=" + ASSET_V);

  const PLACEHOLDER =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600">' +
        '<rect width="100%" height="100%" fill="#241a45"/></svg>'
    );
  function setImg(el, candidates) {
    if (!el) return;
    const list = candidates.slice();
    let i = 0;
    const next = () => {
      if (i >= list.length) { el.onerror = null; el.src = PLACEHOLDER; return; }
      el.src = withV(list[i++]);
    };
    el.onerror = next; next();
  }
  function preload(candidates) { setImg(new Image(), candidates); }

  /* ---------- 2. navigation (floating tabs) ---------- */
  const tabs = document.querySelectorAll(".tab");
  const tabPill = $(".tab__pill");
  const screens = { card: $("#screen-card"), draw: $("#screen-draw") };

  function movePill() {
    const active = document.querySelector(".tab.is-active");
    if (!active || !tabPill) return;
    tabPill.style.width = active.offsetWidth + "px";
    tabPill.style.transform = "translateX(" + (active.offsetLeft - 6) + "px)";
  }
  function setScreen(name) {
    if (!screens[name]) return;
    document.body.setAttribute("data-screen", name);
    Object.keys(screens).forEach((k) => screens[k].classList.toggle("is-active", k === name));
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.screen === name));
    movePill();
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => setScreen(tab.dataset.screen)));

  /* ---------- 3. language toggle ---------- */
  const langToggle = $("#lang-toggle");
  if (langToggle) langToggle.addEventListener("click", () => window.I18N.toggle());

  /* ============================================================
     4. SCREEN 1 — 賀卡 : 3-mood shake machine
     ============================================================ */
  const stage = $("#photo-stage");
  const layerCalm = $('.photo-layer[data-state="calm"]');
  const layerSmile = $('.photo-layer[data-state="smile"]');
  const layerCry = $('.photo-layer[data-state="cry"]');
  const shakeHintText = $(".shake-hint__text");
  const moodFill = $("#mood-fill");
  const gate = $("#motion-gate");
  const startBtn = $("#motion-start");
  const motionNote = $("#motion-note");
  const downloadBtn = $("#download-smile");

  setImg(layerCalm, IMAGES.babyCalm);
  setImg(layerSmile, IMAGES.babySmile);
  setImg(layerCry, IMAGES.babyCry);

  /* ---- mood-change transition FX : rain on 哭, stars/starlight on 笑 ---- */
  const fxRain = $("#fx-rain");
  const fxStars = $("#fx-stars");
  let fxTimer = 0;
  function buildFx() {
    if (fxRain) {
      let r = "";
      for (let i = 0; i < 16; i++) {
        const left = (Math.random() * 100).toFixed(1);
        const h = (12 + Math.random() * 12).toFixed(0);
        const dur = (0.62 + Math.random() * 0.5).toFixed(2);
        const del = (Math.random() * 0.55).toFixed(2);
        r += '<span class="drop" style="left:' + left + '%;height:' + h + 'px;animation-duration:' + dur + 's;animation-delay:' + del + 's"></span>';
      }
      fxRain.innerHTML = r;
    }
    if (fxStars) {
      let s = "";
      for (let i = 0; i < 14; i++) {
        const left = (Math.random() * 88 + 6).toFixed(1);
        const top = (Math.random() * 80 + 8).toFixed(1);
        const sz = (8 + Math.random() * 13).toFixed(0);
        const dur = (1.0 + Math.random() * 0.7).toFixed(2);
        const del = (Math.random() * 0.6).toFixed(2);
        s += '<span class="star" style="left:' + left + '%;top:' + top + '%;width:' + sz + 'px;height:' + sz + 'px;animation-duration:' + dur + 's;animation-delay:' + del + 's"></span>';
      }
      fxStars.innerHTML = s;
    }
  }
  function playMoodFx(mood) {
    if (REDUCE_MOTION) return;
    if (fxRain) fxRain.classList.remove("is-on");
    if (fxStars) fxStars.classList.remove("is-on");
    const el = mood === "cry" ? fxRain : mood === "smile" ? fxStars : null;
    if (!el) return;
    void el.offsetWidth;                         // restart the burst
    el.classList.add("is-on");
    window.clearTimeout(fxTimer);
    fxTimer = window.setTimeout(() => el.classList.remove("is-on"), 1500);
  }
  buildFx();

  let level = SHAKE.START_LEVEL; // 0–1 soothe level (drives BOTH the bar and the mood)
  let motionAccum = 0;           // above-floor motion summed since the last frame
  let drive = 0;                 // damped motion: eases toward motionAccum (gives weight/inertia)
  let state = "calm";            // 'cry' | 'calm' | 'smile'
  let hasInteracted = false;
  let lastFlipTs = 0;            // performance.now() the current mood was entered
  let loopRunning = false;
  let cardRaf = 0;
  let manualMood = false;        // a tap pins the mood until the next real shake
  let motionActive = false;
  let lastAcc = null;
  let lastTs = 0;
  let lastMotionTs = 0;          // performance.now() of the last above-floor motion (for HOLD)

  const HINT_KEY = { cry: "card.hintCry", calm: "card.hint", smile: "card.hintSmile" };
  function updateHint() {
    if (shakeHintText) shakeHintText.textContent = window.I18N.t(HINT_KEY[state]);
  }
  function setMood(next, force) {
    if (next === state) return;
    if (!force && performance.now() - lastFlipTs < SHAKE.GRACE_MS) return;
    state = next;
    lastFlipTs = performance.now();
    document.body.setAttribute("data-mood", next);
    if (next === "smile") document.body.classList.add("dl-on"); // unlock download, then it stays
    playMoodFx(next);                                           // rain (哭) / stars (笑) transition
    updateHint();
  }
  function setFill() {
    if (moodFill) moodFill.style.transform =
      "scaleX(" + Math.max(0, Math.min(1, level)).toFixed(3) + ")"; // bar == level == truth
  }
  // mood is read straight from the level (with tiny hysteresis) → always matches the bar
  function evalMood() {
    if (manualMood) return;
    let next = state;
    if (state === "smile") {
      if (level < SHAKE.SMILE_MIN - SHAKE.HYST) next = level < SHAKE.CRY_MAX ? "cry" : "calm";
    } else if (state === "cry") {
      if (level > SHAKE.CRY_MAX + SHAKE.HYST) next = level >= SHAKE.SMILE_MIN ? "smile" : "calm";
    } else { // calm
      if (level >= SHAKE.SMILE_MIN) next = "smile";
      else if (level < SHAKE.CRY_MAX) next = "cry";
    }
    if (next !== state) setMood(next);
  }
  function addMotion(m) {           // m = above-floor motion magnitude (or px-equiv)
    manualMood = false;
    hasInteracted = true;
    lastMotionTs = performance.now();
    motionAccum += Math.min(m, SHAKE.MOTION_CAP);
    ensureLoop();
  }

  function tick(ts) {
    const t = typeof ts === "number" ? ts : lastTs;
    const dt = lastTs ? Math.min(80, t - lastTs) : 16;
    lastTs = t;
    // damped drive: motion has to build up before it pushes the level (inertia)
    drive += (motionAccum - drive) * SHAKE.DAMP;
    motionAccum = 0;
    level += drive * SHAKE.RISE;                 // rise scaled by the damped drive
    // hold the level after you stop, then ease the decay in gently (stages linger)
    const sinceMotion = t - lastMotionTs;
    if (sinceMotion > SHAKE.HOLD_MS) {
      const ramp = Math.min(1, (sinceMotion - SHAKE.HOLD_MS) / SHAKE.DRAIN_RAMP_MS);
      level -= SHAKE.DRAIN * ramp * (dt / 1000);
    }
    level = Math.max(0, Math.min(1, level));
    setFill();
    evalMood();

    if (DEBUG) debugReadout();
    // keep ticking while there's still drive to bleed off or level to drain
    if ((level > 0 || drive > 0.01) && hasInteracted) { cardRaf = requestAnimationFrame(tick); }
    else { loopRunning = false; lastTs = 0; drive = 0; }
  }
  function ensureLoop() {
    if (!loopRunning) { loopRunning = true; lastTs = 0; cardRaf = requestAnimationFrame(tick); }
  }

  /* ---- accelerometer (all three axes + rotation) ---- */
  function onMotion(e) {
    let mag = 0;
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (a && a.x != null) {
      if (lastAcc) {
        const dx = (a.x || 0) - lastAcc.x, dy = (a.y || 0) - lastAcc.y, dz = (a.z || 0) - lastAcc.z;
        mag += Math.sqrt(dx * dx + dy * dy + dz * dz); // x=left/right, y=front/back, z=toward-screen
      }
      lastAcc = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
    }
    const rr = e.rotationRate;                          // twisting / waving the phone
    if (rr) mag += (Math.abs(rr.alpha || 0) + Math.abs(rr.beta || 0) + Math.abs(rr.gamma || 0)) * SHAKE.ROT_K;
    const over = mag - SHAKE.NOISE_FLOOR;
    if (over > 0) addMotion(over);                      // ignore sub-floor jitter
  }
  function startMotion() {
    if (motionActive) return;
    window.addEventListener("devicemotion", onMotion, { passive: true });
    motionActive = true;
  }

  /* ---- pointer / touch fallback ---- */
  let ptrLast = null;
  stage.addEventListener("pointermove", (e) => {
    const x = e.clientX, y = e.clientY;
    if (ptrLast) {
      const m = Math.hypot(x - ptrLast.x, y - ptrLast.y) - 4;
      if (m > 0) addMotion(m * SHAKE.POINTER_K);
    }
    ptrLast = { x, y };
  });
  stage.addEventListener("pointerleave", () => { ptrLast = null; });

  // Tap cycles the three moods (accessible / no-sensor fallback). Sticky (no decay loop).
  const TAP_NEXT = { calm: "smile", smile: "cry", cry: "calm" };
  const TAP_LEVEL = { smile: 0.85, calm: 0.5, cry: 0.1 };
  stage.addEventListener("click", () => {
    hasInteracted = true;
    manualMood = true;                 // pin until next real shake
    if (cardRaf) cancelAnimationFrame(cardRaf);
    loopRunning = false; lastTs = 0; drive = 0;   // freeze the decay loop so the tap sticks
    const next = TAP_NEXT[state] || "smile";
    level = TAP_LEVEL[next];
    setMood(next, true);
    setFill();
  });

  /* ---- permission gate ---- */
  function showNote(key) {
    if (!motionNote) return;
    motionNote.hidden = false;
    motionNote.textContent = window.I18N.t(key);
    motionNote.dataset.i18n = key;
  }
  function dismissGate() { gate.classList.add("is-hidden"); }
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const DME = window.DeviceMotionEvent;
      if (DME && typeof DME.requestPermission === "function") {
        DME.requestPermission()
          .then((res) => { if (res === "granted") startMotion(); else showNote("motion.denied"); })
          .catch(() => showNote("motion.denied"))
          .finally(dismissGate);
      } else if (DME) { startMotion(); dismissGate(); }
      else { showNote("motion.unsupported"); dismissGate(); }
    });
  }

  /* ---- save the smile ---- */
  async function downloadFile(src, name, span) {
    const key = span ? span.getAttribute("data-i18n") : null;
    try {
      const res = await fetch(withV(src));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if (span && key) {
        span.removeAttribute("data-i18n"); // so a language switch can't clobber the "Saved ✓"
        span.textContent = window.I18N.t("card.saved");
        window.setTimeout(() => {
          span.setAttribute("data-i18n", key);
          span.textContent = window.I18N.t(key);
        }, 1800);
      }
    } catch (e) { window.open(src, "_blank"); }
  }
  function downloadCurrent() {
    downloadFile(DOWNLOAD_IMG[state] || DOWNLOAD_IMG.smile,
                 DOWNLOAD_NAME[state] || DOWNLOAD_NAME.smile,
                 downloadBtn.querySelector("span"));   // photo of whatever stage is showing
  }
  if (downloadBtn) downloadBtn.addEventListener("click", downloadCurrent);

  function debugReadout() {
    let el = $("#debug");
    if (!el) {
      el = document.createElement("div");
      el.id = "debug";
      el.style.cssText = "position:fixed;left:8px;bottom:96px;z-index:9999;font:12px monospace;background:rgba(0,0,0,.6);color:#fff;padding:4px 8px;border-radius:6px;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = "lvl:" + level.toFixed(2) + " mood:" + state + " motion:" + motionActive;
  }

  /* ============================================================
     5. SCREEN 2 — 紀念小卡 : open + flip reveal
     ============================================================ */
  const deck = $("#deck");
  const cardBack = $("#card-back");
  const cardBackImg = $("#card-back-img");
  const drawn = $("#drawn");
  const drawCardImg = $("#draw-card-img");
  const drawAgain = $("#draw-again");
  const drawArea = $("#draw-area");
  setImg(cardBackImg, IMAGES.cardBack);
  let currentRarity = "legendary";              // re-rolled on every flip
  const cardCandidates = () => {
    const r = RARITY[currentRarity] || RARITY.legendary;
    return window.I18N.lang === "en" ? r.en : r.zh;
  };
  let isDrawing = false;

  function doDraw() {
    if (isDrawing) return;
    isDrawing = true;
    currentRarity = rollRarity();                 // 普通 / 精良 / 史詩 / 傳說
    if (drawArea) drawArea.dataset.rarity = currentRarity;  // CSS grades the burst & glow
    if (drawArea && !REDUCE_MOTION) {             // reveal burst — intensity scales by rarity
      drawArea.classList.remove("is-bursting");
      void drawArea.offsetWidth;
      drawArea.classList.add("is-bursting");
      window.setTimeout(() => drawArea.classList.remove("is-bursting"), 1300);
    }
    cardBack.classList.add("is-drawing");
    deck.classList.add("is-drawing");
    const ms = REDUCE_MOTION ? 60 : 820;
    window.setTimeout(() => {
      setImg(drawCardImg, cardCandidates());
      deck.hidden = true;
      deck.classList.remove("is-drawing");
      cardBack.classList.remove("is-drawing");
      drawn.hidden = false;
      drawn.classList.remove("is-revealed");
      void drawn.offsetWidth;
      drawn.classList.add("is-revealed");
      isDrawing = false;
    }, ms);
  }
  function resetDraw() {
    drawn.hidden = true;
    drawn.classList.remove("is-revealed");
    deck.hidden = false;
  }
  if (cardBack) cardBack.addEventListener("click", doDraw);
  if (drawAgain) drawAgain.addEventListener("click", resetDraw);

  const downloadCardBtn = $("#download-card");
  if (downloadCardBtn) downloadCardBtn.addEventListener("click", () => {
    const en = window.I18N.lang === "en";
    const r = RARITY[currentRarity] || RARITY.legendary;   // save whichever card you drew
    downloadFile(en ? r.dl.en : r.dl.zh,
                 en ? "Bobo-keepsake-card.png" : "波波紀念卡.png",
                 downloadCardBtn.querySelector("span"));
  });

  /* ============================================================
     6. LIGHTBOX — close-up with looping FX
     ============================================================ */
  const lightbox = $("#lightbox");
  const lbImg = $("#lightbox-img");
  const lbScene = $("#lightbox-scene");
  const lbClose = $("#lightbox-close");
  const lbCanvas = $("#lightbox-fx");
  const lbBg = $("#lb-bg");
  const lbFg = $("#lightbox-fg");
  const lbBackdrop = $("#lightbox-backdrop");
  const drawnCardBtn = $("#drawn-card");
  const appEl = $("#app");
  setImg(lbImg, IMAGES.cardOg);
  setImg(lbFg, IMAGES.cardOgFg);
  setImg(lbBackdrop, IMAGES.cardOg);   // og scene, blown-up + blurred, extends behind the frame

  let lbOpen = false, lbRaf = 0, lbReturnFocus = null, lbDepth = 1;
  const ctx = lbCanvas ? lbCanvas.getContext("2d") : null;
  let particles = [], cw = 0, ch = 0, dpr = 1;
  const par = { tx: 0, ty: 0, cx: 0, cy: 0, frame: 0 };

  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = window.innerWidth; ch = window.innerHeight;
    lbCanvas.width = Math.round(cw * dpr); lbCanvas.height = Math.round(ch * dpr);
    lbCanvas.style.width = cw + "px"; lbCanvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  let seed = 1337;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  function makeParticles() {
    particles = [];
    if (REDUCE_MOTION) return;
    const pmul = (RARITY_FX[currentRarity] || { particles: 1 }).particles; // density grades by rarity
    if (pmul <= 0) return;                                  // 普通 → no particles (plainest)
    const area = cw * ch;
    const bokehN = Math.round(Math.min(10, area / 80000) * pmul); // soft gold out-of-focus orbs (depth)
    const dustN  = Math.round(Math.min(64, area / 13000) * pmul); // floating gold dust
    const glitN  = Math.round(Math.min(34, area / 24000) * pmul); // glittering sparkles
    for (let i = 0; i < bokehN; i++) particles.push({ type: "bokeh", x: rnd()*cw, y: rnd()*ch, r: 30+rnd()*56, vy: -(0.03+rnd()*0.07), vx: (rnd()-.5)*0.05, ph: rnd()*6.28, sp: 0.004+rnd()*0.008, hue: 40+rnd()*9 });
    for (let i = 0; i < dustN; i++)  particles.push({ type: "dust",  x: rnd()*cw, y: rnd()*ch, r: 0.5+rnd()*1.5, vy: -(0.05+rnd()*0.28), vx: (rnd()-.5)*0.16, ph: rnd()*6.28, sp: 0.01+rnd()*0.03, hue: 42+rnd()*8 });
    for (let i = 0; i < glitN; i++)  particles.push({ type: "glit",  x: rnd()*cw, y: rnd()*ch, r: 0.8+rnd()*1.5, ph: rnd()*6.28, sp: 0.03+rnd()*0.06, hue: 44+rnd()*8, big: rnd()<0.3 });
  }
  function lbTick() {
    if (!lbOpen) return;
    par.frame++;
    const f = par.frame;
    const autoX = Math.sin(f * .012) * .25, autoY = Math.cos(f * .009) * .2;
    par.cx += (par.tx + autoX - par.cx) * .06;
    par.cy += (par.ty + autoY - par.cy) * .06;
    const D = lbDepth;                            // parallax depth grades by rarity
    if (lbBackdrop) lbBackdrop.style.transform = "scale(1.3) translate3d(" + (par.cx * -4 * D).toFixed(2) + "px," + (par.cy * -4 * D).toFixed(2) + "px,0)"; // drifts opposite → depth
    if (lbScene) lbScene.style.transform = "translate3d(" + (par.cx * 8 * D).toFixed(2) + "px," + (par.cy * 8 * D).toFixed(2) + "px,0)";
    if (lbBg) lbBg.style.transform = "translate3d(" + (par.cx * 4 * D).toFixed(2) + "px," + (par.cy * 4 * D).toFixed(2) + "px,0)";
    if (lbFg) lbFg.style.transform = "translate3d(" + (par.cx * 17 * D).toFixed(2) + "px," + (par.cy * 17 * D).toFixed(2) + "px,0)"; // foreground pops (2.5D)
    lbCanvas.style.transform = "translate3d(" + (par.cx * 24 * D).toFixed(2) + "px," + (par.cy * 24 * D).toFixed(2) + "px,0)";
    if (ctx) {
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.ph += p.sp;
        const tw = 0.5 + 0.5 * Math.sin(p.ph);
        if (p.type === "glit") {
          const al = tw * tw * tw; // sharp glitter twinkle
          if (al > 0.02) {
            const r = p.r * (0.8 + tw);
            ctx.globalAlpha = al * 0.5;            // soft golden bloom
            const hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
            hg.addColorStop(0, "hsla(" + p.hue + ",100%,80%,1)");
            hg.addColorStop(1, "hsla(" + p.hue + ",100%,80%,0)");
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(p.x, p.y, r * 6, 0, 6.2832); ctx.fill();
            ctx.globalAlpha = al;                  // bright core
            ctx.fillStyle = "hsl(" + p.hue + ",100%,94%)";
            ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.7, 0, 6.2832); ctx.fill();
            if (p.big) {                           // 4-point glitter cross
              ctx.globalAlpha = al * 0.8; ctx.strokeStyle = "hsla(" + p.hue + ",100%,88%,1)"; ctx.lineWidth = 0.8;
              const L = r * 4.5;
              ctx.beginPath(); ctx.moveTo(p.x - L, p.y); ctx.lineTo(p.x + L, p.y);
              ctx.moveTo(p.x, p.y - L); ctx.lineTo(p.x, p.y + L); ctx.stroke();
            }
          }
        } else {
          p.x += p.vx; p.y += p.vy;
          if (p.type === "dust") p.x += Math.sin(p.ph) * 0.25;
          const rad = p.type === "bokeh" ? p.r : p.r * 3.4;
          if (p.y < -rad) p.y = ch + rad; else if (p.y > ch + rad) p.y = -rad;
          if (p.x < -rad) p.x = cw + rad; else if (p.x > cw + rad) p.x = -rad;
          ctx.globalAlpha = p.type === "bokeh" ? (0.045 + 0.06 * tw) : (0.38 * (0.4 + 0.6 * tw));
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          g.addColorStop(0, "hsla(" + p.hue + ",100%,72%,1)");
          g.addColorStop(1, "hsla(" + p.hue + ",95%,60%,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.2832); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    lbRaf = requestAnimationFrame(lbTick);
  }
  function lbPointer(e) {
    const t = e.touches ? e.touches[0] : e; if (!t) return;
    par.tx = (t.clientX / window.innerWidth - .5) * 2;
    par.ty = (t.clientY / window.innerHeight - .5) * 2;
  }
  function openLightbox() {
    if (lbOpen) return;
    lbOpen = true; lbReturnFocus = document.activeElement;
    lightbox.hidden = false; void lightbox.offsetWidth;
    lightbox.classList.add("is-open"); document.body.classList.add("no-scroll");
    if (appEl) { appEl.inert = true; appEl.setAttribute("aria-hidden", "true"); }
    lightbox.dataset.rarity = currentRarity;               // CSS grades rays/holo/glows
    lbDepth = (RARITY_FX[currentRarity] || { depth: 1 }).depth;
    sizeCanvas(); makeParticles();
    par.tx = par.ty = par.cx = par.cy = 0;
    if (!REDUCE_MOTION) {
      window.addEventListener("pointermove", lbPointer, { passive: true });
      window.addEventListener("touchmove", lbPointer, { passive: true });
      lbRaf = requestAnimationFrame(lbTick);
    }
    if (lbClose) lbClose.focus();
  }
  function closeLightbox() {
    if (!lbOpen) return;
    lbOpen = false;
    lightbox.classList.remove("is-open"); document.body.classList.remove("no-scroll");
    if (appEl) { appEl.inert = false; appEl.removeAttribute("aria-hidden"); }
    window.removeEventListener("pointermove", lbPointer);
    window.removeEventListener("touchmove", lbPointer);
    cancelAnimationFrame(lbRaf);
    window.setTimeout(() => { if (!lbOpen) lightbox.hidden = true; if (ctx) ctx.clearRect(0, 0, cw, ch); }, 340);
    if (lbReturnFocus && lbReturnFocus.focus) lbReturnFocus.focus();
  }
  if (drawnCardBtn) drawnCardBtn.addEventListener("click", openLightbox);
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lightbox) lightbox.addEventListener("click", (e) => { if (e.target === lightbox || e.target === lbCanvas) closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lbOpen) closeLightbox(); });
  window.addEventListener("resize", () => {
    if (!lbOpen) return;
    const ow = cw, oh = ch; sizeCanvas();
    if (ow && oh && particles.length) { const sx = cw / ow, sy = ch / oh; for (let i = 0; i < particles.length; i++) { particles[i].x *= sx; particles[i].y *= sy; } }
  });

  /* ============================================================
     7. language side-effects + init
     ============================================================ */
  window.I18N.onChange(() => {
    updateHint();
    if (drawn && !drawn.hidden) {
      drawCardImg.style.opacity = "0";  // crossfade the keepsake to the other language
      setImg(drawCardImg, cardCandidates());
      drawCardImg.addEventListener("load", function once() {
        drawCardImg.style.opacity = "1";
        drawCardImg.removeEventListener("load", once);
      });
    }
    movePill();
  });

  RARITY_ORDER.forEach((k) => { preload(RARITY[k].zh); preload(RARITY[k].en); }); // all rarities, both langs
  updateHint(); setFill(); setScreen("card");
  window.addEventListener("resize", movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  window.setTimeout(movePill, 300);

  if (DEBUG) window.__BABY = { SHAKE, get level() { return level; }, get mood() { return state; } };
})();
