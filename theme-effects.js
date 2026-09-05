/* Optional, local-only decorative motion. Artwork credits: assets/theme-effects/ATTRIBUTION.md. */
(() => {
  "use strict";

  const STORAGE_KEY = "sp_theme_interactive";
  const SUPPORTED = new Set(["halloween", "loona", "christmas", "sobokill", "easter"]);
  const ICONS = new Set(["spider", "spider-web", "witch", "broom", "santa", "sleigh", "deer", "gift", "comet", "heart", "bunny", "easter-egg", "pyramid"]);
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const timers = new Set();
  const animations = new Set();
  let theme = "dark";
  let preference = false;
  let initialized = false;
  let suspended = false;
  let layer = null;
  let reducedMotion = null;
  let generation = 0;
  let lastScene = "";
  let glyphsReady = false;
  let glyphsLoading = false;

  function canAnimate() {
    return typeof Element !== "undefined" && typeof Element.prototype.animate === "function" &&
      typeof window.CSS?.supports === "function" &&
      (CSS.supports("mask-image", "url('')") || CSS.supports("-webkit-mask-image", "url('')"));
  }

  function after(callback, delay) {
    const current = generation;
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (current === generation && layer) callback();
    }, delay);
    timers.add(id);
  }

  function stop() {
    generation += 1;
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
    animations.forEach((animation) => {
      animation.onfinish = null;
      animation.cancel();
    });
    animations.clear();
    layer?.remove();
    layer = null;
  }

  function animate(node, frames, options, removeOnFinish = true) {
    const animation = node.animate(frames, { fill: "both", easing: "linear", ...options });
    animations.add(animation);
    animation.onfinish = () => {
      animations.delete(animation);
      if (removeOnFinish) node.remove();
      // Release finished animation objects and their fill styles too.
      animation.cancel();
    };
    return animation;
  }

  function element(className, parent = layer) {
    const node = document.createElement("span");
    node.className = className;
    parent.appendChild(node);
    return node;
  }

  function icon(name, parent = layer) {
    if (!ICONS.has(name)) return null;
    const node = element("theme-fx-icon theme-fx-" + name, parent);
    node.style.setProperty("--fx-icon", 'url("./assets/theme-effects/' + name + '.svg")');
    return node;
  }

  function drift(node, { x = 90, y = 80, size = 44, duration = 6500, opacity = 0.3, rise = 40, rotate = 0 } = {}) {
    node.style.left = x + "vw";
    node.style.top = y + "vh";
    node.style.setProperty("--fx-size", size + "px");
    animate(node, [
      { opacity: 0, transform: "translate3d(0, 14px, 0) rotate(" + (rotate - 5) + "deg)", offset: 0 },
      { opacity, transform: "translate3d(3px, 0, 0) rotate(" + rotate + "deg)", offset: 0.22 },
      { opacity, transform: "translate3d(-3px, -" + rise / 2 + "px, 0) rotate(" + (rotate + 4) + "deg)", offset: 0.65 },
      { opacity: 0, transform: "translate3d(0, -" + rise + "px, 0) rotate(" + rotate + "deg)", offset: 1 }
    ], { duration, easing: "ease-in-out" });
  }

  function cross(node, { y = 9, duration = 11000, opacity = 0.27, size = 54 } = {}) {
    node.style.left = "0";
    node.style.top = y + "vh";
    node.style.setProperty("--fx-size", size + "px");
    animate(node, [
      { transform: "translate3d(-160px, 0, 0)", opacity: 0, offset: 0 },
      { transform: "translate3d(12vw, -8px, 0)", opacity, offset: 0.2 },
      { transform: "translate3d(74vw, 6px, 0)", opacity, offset: 0.75 },
      { transform: "translate3d(calc(100vw + 160px), -10px, 0)", opacity: 0, offset: 1 }
    ], { duration });
  }

  function spider() {
    const node = element("theme-fx-spider-drop");
    node.style.left = pick([random(3, 8), random(90, 96)]) + "vw";
    element("theme-fx-thread", node);
    icon("spider", node);
    animate(node, [
      { transform: "translate3d(0, -220px, 0) rotate(-3deg)", opacity: 0, offset: 0 },
      { transform: "translate3d(0, 0, 0) rotate(2deg)", opacity: 0.45, offset: 0.32 },
      { transform: "translate3d(4px, 10px, 0) rotate(-2deg)", opacity: 0.45, offset: 0.62 },
      { transform: "translate3d(0, -220px, 0) rotate(1deg)", opacity: 0, offset: 1 }
    ], { duration: 9500, easing: "ease-in-out" });
  }

  function witch() {
    const group = element("theme-fx-flight theme-fx-witch-flight");
    icon("witch", group);
    icon("broom", group);
    cross(group, { y: random(6, 12), duration: 12500 });
  }

  function santa() {
    const group = element("theme-fx-flight theme-fx-santa-flight");
    icon("santa", group);
    icon("sleigh", group);
    icon("deer", group);
    cross(group, { y: random(5, 11), duration: 14000, opacity: 0.32 });
  }

  function fallingGift() {
    const node = icon("gift");
    node.style.left = pick([8, 88]) + "vw";
    node.style.top = "-50px";
    animate(node, [
      { transform: "translate3d(0, 0, 0) rotate(-12deg)", opacity: 0 },
      { transform: "translate3d(14px, 25vh, 0) rotate(8deg)", opacity: 0.4, offset: 0.3 },
      { transform: "translate3d(-8px, 65vh, 0) rotate(-6deg)", opacity: 0.4, offset: 0.75 },
      { transform: "translate3d(10px, 100vh, 0) rotate(8deg)", opacity: 0 }
    ], { duration: 9500, easing: "ease-in" });
  }

  function comet() {
    const node = icon("comet");
    node.style.left = "0";
    node.style.top = "0";
    node.style.setProperty("--fx-size", "52px");
    animate(node, [
      { transform: "translate3d(86vw, -60px, 0)", opacity: 0 },
      { transform: "translate3d(69vw, 10vh, 0)", opacity: 0.48, offset: 0.25 },
      { transform: "translate3d(38vw, 28vh, 0)", opacity: 0 }
    ], { duration: 3800, easing: "ease-out" });
  }

  function snow() {
    // A fixed population: no spawning loop and no growth during long sessions.
    const count = window.innerWidth < 700 ? 9 : 18;
    for (let i = 0; i < count; i += 1) {
      const node = element("theme-fx-snow");
      const size = random(1.5, 3.5);
      const x = (i + Math.random()) / count * 100;
      const duration = random(16000, 28000);
      const opacity = random(0.16, 0.4);
      node.style.width = node.style.height = size + "px";
      animate(node, [
        { transform: "translate3d(" + x + "vw, -10px, 0)", opacity: 0 },
        { transform: "translate3d(" + (x + 2) + "vw, 20vh, 0)", opacity, offset: 0.2 },
        { transform: "translate3d(" + (x - 2) + "vw, 80vh, 0)", opacity, offset: 0.8 },
        { transform: "translate3d(" + x + "vw, 105vh, 0)", opacity: 0 }
      ], { duration, delay: -Math.random() * duration, iterations: Infinity }, false);
    }
  }

  function hearts() {
    const x = pick([random(4, 10), random(86, 93)]);
    for (let i = 0; i < 3; i += 1) {
      after(() => drift(icon("heart"), {
        x: x + i * 1.6, y: 84 + i * 2, size: 20 + i * 5,
        opacity: 0.36, rise: 90, duration: 6200, rotate: i * 8 - 8
      }), i * 650);
    }
  }

  function trail() {
    const node = element("theme-fx-trail");
    cross(node, { y: pick([8, 91]), duration: 8000, opacity: 0.4 });
  }

  function uwu() {
    const node = element("theme-fx-uwu");
    node.textContent = "uwu";
    drift(node, { x: pick([5, 88]), y: random(65, 85), opacity: 0.3, rise: 24 });
  }

  function loadGlyphs() {
    if (glyphsReady || glyphsLoading || !document.fonts?.load) return;
    glyphsLoading = true;
    document.fonts.load('32px "Theme Hieroglyphs"', "𓂀𓆣𓋹𓇳𓊹")
      .then((fonts) => { glyphsReady = fonts.length > 0; })
      .catch(() => { glyphsReady = false; })
      .finally(() => { glyphsLoading = false; });
  }

  function hieroglyphs() {
    if (!glyphsReady) { pyramid(); return; }
    const node = element("theme-fx-glyphs");
    node.textContent = pick(["𓂀 𓋹 𓇳", "𓆣 𓊹 𓂀", "𓇳 𓆣 𓋹"]);
    drift(node, { x: random(4, 8), y: random(60, 86), opacity: 0.35, rise: 22, duration: 8000 });
  }

  function pyramid() {
    drift(icon("pyramid"), { x: pick([5, 86]), y: 78, size: 82, opacity: 0.35, rise: 18, duration: 8500 });
  }

  function bunny() {
    const node = icon("bunny");
    node.style.left = "0";
    node.style.top = "86vh";
    node.style.setProperty("--fx-size", "48px");
    const frames = Array.from({ length: 13 }, (_, i) => ({
      transform: "translate3d(calc(" + (i / 12 * 110) + "vw - 60px), " + (i % 2 ? -16 : 0) + "px, 0)",
      opacity: i === 0 || i === 12 ? 0 : 0.32,
      offset: i / 12
    }));
    animate(node, frames, { duration: 13000, easing: "ease-in-out" });
  }

  function eggs() {
    const x = pick([6, 88]);
    for (let i = 0; i < 2; i += 1) {
      after(() => drift(icon("easter-egg"), {
        x: x + i * 3, y: 86 + i, size: 30 + i * 6,
        opacity: 0.4, duration: 6500, rise: 36, rotate: i ? 14 : -14
      }), i * 650);
    }
  }

  const SCENES = {
    halloween: {
      spider, witch,
      crossing: () => cross(icon("spider"), { y: 88, size: 34, duration: 13000, opacity: 0.4 }),
      web: () => drift(icon("spider-web"), { x: pick([2, 89]), y: 4, size: 80, rise: 5, duration: 9000, opacity: 0.32 })
    },
    loona: { hearts, trail, uwu },
    christmas: {
      santa, comet, gift: fallingGift,
      deer: () => drift(icon("deer"), { x: pick([6, 88]), y: 80, size: 56, opacity: 0.35 })
    },
    sobokill: { hieroglyphs, pyramid },
    easter: { bunny, eggs }
  };

  function playScene() {
    const scenes = SCENES[theme];
    if (!scenes || !layer) return;
    const name = pick(Object.keys(scenes).filter((key) => key !== lastScene));
    lastScene = name;
    scenes[name]();
    after(playScene, random(26000, 42000));
  }

  function refresh() {
    if (!initialized) return;
    stop();
    const input = document.getElementById("themeInteractive");
    const status = document.getElementById("themeInteractiveStatus");
    const control = document.getElementById("themeInteractiveControl");
    if (!input || !status || !control) return;
    const supported = SUPPORTED.has(theme);
    const capable = canAnimate();
    const reduced = Boolean(reducedMotion?.matches);
    input.disabled = !supported || !capable || reduced;
    input.checked = !input.disabled && preference;
    control.classList.toggle("is-disabled", input.disabled);
    status.textContent = !supported ? "Pro tento motiv není dostupné" : reduced ? "V zařízení je zapnutý omezený pohyb" :
      !capable ? "Prohlížeč nepodporuje efekty" : preference ? "Zapnuto · jemné animace" : "Vypnuto";
    if (!input.checked || suspended || document.hidden) return;
    layer = document.createElement("div");
    layer.className = "theme-effects-layer theme-effects-" + theme;
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("inert", "");
    document.body.appendChild(layer);
    lastScene = "";
    if (theme === "christmas") snow();
    if (theme === "sobokill") loadGlyphs();
    after(playScene, 1800);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    try { preference = localStorage.getItem(STORAGE_KEY) === "true"; } catch { /* Session-only preference. */ }
    reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reducedMotion?.addEventListener?.("change", refresh);
    document.getElementById("themeInteractive")?.addEventListener("change", (event) => {
      if (event.target.disabled) return;
      preference = event.target.checked;
      try { localStorage.setItem(STORAGE_KEY, String(preference)); } catch { /* Storage may be disabled. */ }
      refresh();
    });
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pagehide", () => { suspended = true; stop(); });
    window.addEventListener("pageshow", () => { suspended = false; refresh(); });
    refresh();
  }

  window.ThemeEffects = Object.freeze({ init, setTheme(value) { theme = value; refresh(); } });
})();
