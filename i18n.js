/* ============================================================
   i18n.js — bilingual (zh-Hant / en) dictionary + switching
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "babycard.lang";

  const DICT = {
    zh: {
      "app.title": "滿月賀卡",
      "nav.card": "賀卡",
      "nav.draw": "紀念小卡",

      "motion.gateTitle": "滿月誌喜",
      "motion.gateDesc": "輕觸開始，緩緩搖晃手機，喚醒沉睡的寶寶",
      "motion.start": "開始",
      "motion.denied": "未取得動作權限 — 可直接輕觸照片切換寶寶表情",
      "motion.unsupported": "此裝置沒有陀螺儀 — 可輕觸照片切換表情",

      "card.hint": "緩慢地搖晃手機，逗寶寶笑",
      "card.hintSmile": "寶寶笑了！繼續輕輕搖晃",
      "card.hintCry": "寶寶哭了…再搖一搖哄哄他",
      "card.download": "儲存這張賀卡",
      "card.saved": "已儲存 ✓",

      "mood.cry": "哭",
      "mood.calm": "不哭",
      "mood.smile": "笑",

      "draw.deckLabel": "輕觸翻開你的紀念小卡",
      "draw.opening": "翻開中…",
      "draw.tapToZoom": "輕觸看特寫",
      "draw.again": "再翻一次",

      "lightbox.caption": "輕觸並傾斜畫面，感受魔法",
    },
    en: {
      "app.title": "Full-Moon Card",
      "nav.card": "Card",
      "nav.draw": "Keepsake",

      "motion.gateTitle": "A Full Moon to Celebrate",
      "motion.gateDesc": "Tap to begin, then slowly shake your phone to wake the sleeping baby",
      "motion.start": "Begin",
      "motion.denied": "Motion access denied — tap the photo to change the baby's mood",
      "motion.unsupported": "No motion sensor — tap the photo to change moods",

      "card.hint": "Slowly shake your phone to make the baby smile",
      "card.hintSmile": "The baby is smiling! Keep gently shaking",
      "card.hintCry": "The baby is crying… shake a little to soothe",
      "card.download": "Save this card",
      "card.saved": "Saved ✓",

      "mood.cry": "Crying",
      "mood.calm": "Calm",
      "mood.smile": "Smiling",

      "draw.deckLabel": "Tap to open your keepsake card",
      "draw.opening": "Opening…",
      "draw.tapToZoom": "Tap for close-up",
      "draw.again": "Flip again",

      "lightbox.caption": "Touch and tilt the scene to feel the magic",
    },
  };

  const HTML_LANG = { zh: "zh-Hant", en: "en" };

  const stored = localStorage.getItem(STORAGE_KEY);
  let current =
    stored === "en" ? "en"
    : stored === "zh" ? "zh"
    : (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";

  const subscribers = [];

  function t(key) {
    return (DICT[current] && DICT[current][key]) || DICT.zh[key] || key;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    document.documentElement.lang = HTML_LANG[current];
    document.body.setAttribute("data-lang", current);
  }

  function set(lang) {
    if ((lang !== "zh" && lang !== "en") || lang === current) return;
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    // toggle thumb / lang attr react immediately; text crossfades
    document.body.setAttribute("data-lang", current);
    document.documentElement.lang = HTML_LANG[current];
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const commit = () => { apply(); subscribers.forEach((fn) => { try { fn(current); } catch (e) {} }); };
    if (reduce) { commit(); return; }
    document.body.classList.add("lang-switching");
    window.setTimeout(commit, 200);
    window.setTimeout(() => document.body.classList.remove("lang-switching"), 420);
  }

  function toggle() { set(current === "zh" ? "en" : "zh"); }
  function onChange(fn) { if (typeof fn === "function") subscribers.push(fn); }

  window.I18N = {
    get lang() { return current; },
    t, apply, set, toggle, onChange,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => apply());
  } else {
    apply();
  }
})();
