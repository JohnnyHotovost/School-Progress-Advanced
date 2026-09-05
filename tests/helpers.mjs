import { readFileSync } from "node:fs";
import vm from "node:vm";

// Small host doubles for lifecycle and UI state tests; no browser or rendering dependency.
export function environment({ reduced = false, capable = true, stored = {}, width = 1280 } = {}) {
  let clock = 0;
  let nextId = 0;
  const timers = new Map();
  const activeAnimations = new Set();
  const storage = new Map(Object.entries(stored));
  function timeout(fn, delay = 0) {
    const id = ++nextId;
    timers.set(id, { at: clock + Math.max(0, delay), fn });
    return id;
  }
  class Events {
    listeners = new Map();
    addEventListener(name, fn) {
      if (!this.listeners.has(name)) this.listeners.set(name, []);
      this.listeners.get(name).push(fn);
    }
    emit(name) { this.listeners.get(name)?.forEach((fn) => fn({ target: this })); }
  }
  class Element extends Events {
    children = [];
    dataset = {};
    attrs = {};
    className = "";
    text = "";
    checked = false;
    disabled = false;
    style = { setProperty(name, value) { this[name] = value; } };
    classList = {
      add: (...names) => names.forEach((name) => this.classList.toggle(name, true)),
      remove: (...names) => names.forEach((name) => this.classList.toggle(name, false)),
      contains: (name) => this.className.split(" ").includes(name),
      toggle: (name, enabled) => {
        const names = new Set(this.className.split(" ").filter(Boolean));
        enabled ??= !names.has(name);
        if (enabled) names.add(name); else names.delete(name);
        this.className = [...names].join(" ");
        return enabled;
      }
    };
    get textContent() { return this.text + this.children.map((node) => node.textContent || "").join(""); }
    set textContent(value) { this.replaceChildren(); this.text = String(value); }
    appendChild(node) { node.remove?.(); this.children.push(node); node.parent = this; return node; }
    append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
    replaceChildren(...nodes) { this.children.forEach((node) => { node.parent = null; }); this.children = []; this.text = ""; this.append(...nodes); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this); this.parent = null; }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    animate(frames, options) {
      let end;
      const animation = {
        frames, options, onfinish: null,
        cancel() { timers.delete(end); activeAnimations.delete(animation); }
      };
      activeAnimations.add(animation);
      if (options.iterations !== Infinity) end = timeout(() => animation.onfinish?.(), options.duration);
      return animation;
    }
  }
  if (!capable) Element.prototype.animate = undefined;
  const elements = new Map();
  const document = Object.assign(new Events(), {
    body: new Element(), hidden: false,
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement() { return new Element(); },
    createTextNode(value) { const node = new Element(); node.textContent = value; return node; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    fonts: { load: async () => [true] }
  });
  const media = Object.assign(new Events(), { matches: reduced });
  const CSS = { supports: () => true };
  const window = Object.assign(new Events(), {
    CSS, innerWidth: width,
    setTimeout: timeout, clearTimeout: (id) => timers.delete(id),
    matchMedia: () => media
  });
  const context = vm.createContext({
    window, document, Element, CSS, Date,
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    console
  });
  return {
    context, document, window, media, storage, timers, activeAnimations,
    get: (id) => document.getElementById(id),
    run(file, transform = (source) => source) { vm.runInContext(transform(readFileSync(new URL("../" + file, import.meta.url), "utf8")), context); },
    advance(ms) {
      const target = clock + ms;
      for (let safety = 0; safety < 10000; safety += 1) {
        const next = [...timers.entries()].filter(([, item]) => item.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) { clock = target; return; }
        clock = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      throw new Error("Unbounded timer loop");
    }
  };
}
