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
    cardZh:    ["assets/images/card-cn.webp",    "assets/images/card-cn.png"],
    cardEn:    ["assets/images/card-en.webp",    "assets/images/card-en.png"],
  };
  const SMILE_DOWNLOAD = "assets/images/baby-smile.png"; // full-res for saving

  // Shake engine — energy is a time-decaying "shake budget" mapped to 3 moods.
  const SHAKE = {
    MAX: 120,
    SMILE_ON: 70,   // calm  → smile
    SMILE_OFF: 48,  // smile → calm
    CRY_LEAVE: 26,  // cry   → calm
    CRY_ENTER: 12,  // calm  → cry
    TAU: 600,       // ms decay time-constant (frame-rate independent)
    MOTION_K: 10,   // accel delta (m/s²) → energy
    POINTER_K: 0.9, // pointer move (px) → energy (desktop fallback)
    GRACE_MS: 200,  // debounce between mood flips
  };

  const REDUCE_MOTION = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEBUG = /[?&]debug\b/.test(location.search);
  const $ = (s, r) => (r || document).querySelector(s);

  /* ---------- 1. resilient image loading ---------- */
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
      el.src = list[i++];
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

  let energy = 0;
  let state = "calm";       // 'cry' | 'calm' | 'smile'
  let hasInteracted = false;
  let lastFlipTs = 0;       // performance.now() of last mood flip (real-time debounce)
  let loopRunning = false;
  let cardRaf = 0;
  let manualMood = false;   // a tap pins the mood until the next real shake
  let motionActive = false;
  let lastAcc = null;
  let lastTs = 0;

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
    updateHint();
  }
  function setFill() {
    if (moodFill) moodFill.style.transform =
      "scaleX(" + Math.max(0, Math.min(1, energy / SHAKE.MAX)).toFixed(3) + ")";
  }
  function addEnergy(a) {
    manualMood = false; // real motion resumes dynamic mood evaluation
    energy = Math.min(SHAKE.MAX, energy + a);
    if (energy > SHAKE.CRY_LEAVE) hasInteracted = true;
    ensureLoop();
  }

  function tick(ts) {
    const t = typeof ts === "number" ? ts : lastTs;
    const dt = lastTs ? Math.min(80, t - lastTs) : 16;
    lastTs = t;
    energy *= Math.exp(-dt / SHAKE.TAU);
    if (energy < 0.4) energy = 0;
    setFill();

    // 3-band hysteresis: cry ↔ calm ↔ smile (skipped while a tap pins the mood)
    if (!manualMood) {
      if (state === "smile") {
        if (energy < SHAKE.SMILE_OFF) setMood("calm");
      } else if (state === "calm") {
        if (energy >= SHAKE.SMILE_ON) setMood("smile");
        else if (hasInteracted && energy <= SHAKE.CRY_ENTER) setMood("cry");
      } else { /* cry */
        if (energy >= SHAKE.CRY_LEAVE) setMood("calm");
      }
    }

    if (DEBUG) debugReadout();
    if (energy > 0) { cardRaf = requestAnimationFrame(tick); }
    else { loopRunning = false; lastTs = 0; }
  }
  function ensureLoop() {
    if (!loopRunning) { loopRunning = true; lastTs = 0; cardRaf = requestAnimationFrame(tick); }
  }

  /* ---- accelerometer ---- */
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null) return;
    if (lastAcc) {
      const dx = (a.x || 0) - lastAcc.x, dy = (a.y || 0) - lastAcc.y, dz = (a.z || 0) - lastAcc.z;
      addEnergy(Math.sqrt(dx * dx + dy * dy + dz * dz) * SHAKE.MOTION_K);
    }
    lastAcc = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
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
      const m = Math.hypot(x - ptrLast.x, y - ptrLast.y);
      if (m > 0) addEnergy(m * SHAKE.POINTER_K);
    }
    ptrLast = { x, y };
  });
  stage.addEventListener("pointerleave", () => { ptrLast = null; });

  // Tap cycles the three moods (accessible / no-sensor fallback). Sticky (no decay loop).
  const TAP_NEXT = { calm: "smile", smile: "cry", cry: "calm" };
  const TAP_ENERGY = { smile: SHAKE.MAX, calm: (SHAKE.SMILE_OFF + SHAKE.CRY_LEAVE) / 2, cry: 0 };
  stage.addEventListener("click", () => {
    hasInteracted = true;
    manualMood = true;                 // pin until next real shake
    if (cardRaf) cancelAnimationFrame(cardRaf);
    loopRunning = false; lastTs = 0;   // freeze the decay loop so the tap sticks
    const next = TAP_NEXT[state] || "smile";
    energy = TAP_ENERGY[next];
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
  let savedTimer = 0;
  async function downloadSmile() {
    const span = downloadBtn.querySelector("span");
    try {
      const res = await fetch(SMILE_DOWNLOAD);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "滿月賀卡-寶寶笑臉.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if (span) {
        // detach the i18n binding so a language switch can't clobber the confirmation
        span.removeAttribute("data-i18n");
        span.textContent = window.I18N.t("card.saved");
        clearTimeout(savedTimer);
        savedTimer = window.setTimeout(() => {
          span.setAttribute("data-i18n", "card.download");
          span.textContent = window.I18N.t("card.download");
        }, 1800);
      }
    } catch (e) { window.open(SMILE_DOWNLOAD, "_blank"); }
  }
  if (downloadBtn) downloadBtn.addEventListener("click", downloadSmile);

  function debugReadout() {
    let el = $("#debug");
    if (!el) {
      el = document.createElement("div");
      el.id = "debug";
      el.style.cssText = "position:fixed;left:8px;bottom:96px;z-index:9999;font:12px monospace;background:rgba(0,0,0,.6);color:#fff;padding:4px 8px;border-radius:6px;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = "E:" + energy.toFixed(0) + " mood:" + state + " motion:" + motionActive;
  }

  /* ============================================================
     5. SCREEN 2 — 紀念小卡 : open + flip reveal
     ============================================================ */
  const deck = $("#deck");
  const cardBack = $("#card-back");
  const drawn = $("#drawn");
  const drawCardImg = $("#draw-card-img");
  const drawAgain = $("#draw-again");
  const cardCandidates = () => (window.I18N.lang === "en" ? IMAGES.cardEn : IMAGES.cardZh);
  let isDrawing = false;

  function doDraw() {
    if (isDrawing) return;
    isDrawing = true;
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

  /* ============================================================
     6. LIGHTBOX — close-up with looping FX
     ============================================================ */
  const lightbox = $("#lightbox");
  const lbImg = $("#lightbox-img");
  const lbScene = $("#lightbox-scene");
  const lbClose = $("#lightbox-close");
  const lbCanvas = $("#lightbox-fx");
  const drawnCardBtn = $("#drawn-card");
  const appEl = $("#app");
  setImg(lbImg, IMAGES.cardOg);

  let lbOpen = false, lbRaf = 0, lbReturnFocus = null;
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
    const area = cw * ch;
    const emberN = Math.round(Math.min(70, area / 14000));
    const moteN = Math.round(Math.min(36, area / 26000));
    const sparkN = Math.round(Math.min(26, area / 34000));
    for (let i = 0; i < emberN; i++) particles.push({ type: "ember", x: rnd() * cw, y: rnd() * ch, r: .8 + rnd() * 2.2, vy: -(.15 + rnd() * .5), vx: (rnd() - .5) * .25, ph: rnd() * 6.28, sp: .02 + rnd() * .05, hue: 30 + rnd() * 22 });
    for (let i = 0; i < moteN; i++) particles.push({ type: "mote", x: rnd() * cw, y: rnd() * ch, r: 1 + rnd() * 2.4, vy: (rnd() - .5) * .18, vx: (rnd() - .5) * .18, ph: rnd() * 6.28, sp: .015 + rnd() * .03, hue: rnd() < .5 ? 275 + rnd() * 25 : 95 + rnd() * 30 });
    for (let i = 0; i < sparkN; i++) particles.push({ type: "spark", x: rnd() * cw, y: rnd() * ch, r: .6 + rnd() * 1.4, ph: rnd() * 6.28, sp: .05 + rnd() * .09, hue: 45 + rnd() * 15 });
  }
  function lbTick() {
    if (!lbOpen) return;
    par.frame++;
    const f = par.frame;
    const autoX = Math.sin(f * .012) * .25, autoY = Math.cos(f * .009) * .2;
    par.cx += (par.tx + autoX - par.cx) * .06;
    par.cy += (par.ty + autoY - par.cy) * .06;
    if (lbScene) lbScene.style.transform = "translate3d(" + (par.cx * 14).toFixed(2) + "px," + (par.cy * 14).toFixed(2) + "px,0)";
    lbCanvas.style.transform = "translate3d(" + (par.cx * 26).toFixed(2) + "px," + (par.cy * 26).toFixed(2) + "px,0)";
    if (ctx) {
      ctx.clearRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]; p.ph += p.sp; const tw = .5 + .5 * Math.sin(p.ph);
        if (p.type === "spark") {
          const al = tw * tw;
          if (al > .04) { ctx.globalAlpha = al; ctx.fillStyle = "hsl(" + p.hue + ",100%,85%)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.6 + tw), 0, 6.2832); ctx.fill(); }
        } else {
          p.x += p.vx; p.y += p.vy;
          if (p.type === "ember") p.x += Math.sin(p.ph) * .3;
          if (p.y < -6) p.y = ch + 6; if (p.y > ch + 6) p.y = -6;
          if (p.x < -6) p.x = cw + 6; if (p.x > cw + 6) p.x = -6;
          ctx.globalAlpha = (p.type === "ember" ? .5 : .4) * (.4 + .6 * tw);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
          g.addColorStop(0, "hsla(" + p.hue + ",100%,72%,1)"); g.addColorStop(1, "hsla(" + p.hue + ",100%,60%,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, 6.2832); ctx.fill();
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
    if (drawn && !drawn.hidden) setImg(drawCardImg, cardCandidates());
    movePill();
  });

  preload(IMAGES.cardZh); preload(IMAGES.cardEn);
  updateHint(); setFill(); setScreen("card");
  window.addEventListener("resize", movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  window.setTimeout(movePill, 300);

  if (DEBUG) window.__BABY = { SHAKE, get energy() { return energy; }, get mood() { return state; } };
})();
