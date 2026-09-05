import test from "node:test";
import assert from "node:assert/strict";
import { environment } from "./helpers.mjs";

function setup(options = {}) {
  const env = environment(options);
  env.run("theme-effects.js");
  env.window.ThemeEffects.init();
  return { ...env, effects: env.window.ThemeEffects };
}
function enable(env, theme) {
  env.effects.setTheme(theme);
  const input = env.get("themeInteractive");
  input.checked = true;
  input.emit("change");
}

test("effects are opt-in and unsupported themes keep a disabled visible control", () => {
  const env = setup();
  for (const theme of ["dark", "light", "kakajicko", "maturita", "battlecats", "kasparnakart"]) {
    env.effects.setTheme(theme);
    assert.equal(env.get("themeInteractive").disabled, true);
    assert.equal(env.get("themeInteractive").checked, false);
    assert.equal(env.document.body.children.length, 0);
    assert.match(env.get("themeInteractiveStatus").textContent, /není dostupné/);
  }
  env.effects.setTheme("halloween");
  assert.equal(env.get("themeInteractive").disabled, false);
  assert.equal(env.get("themeInteractive").checked, false);
});

test("the stored choice survives unsupported themes; disabling cancels all future motion", () => {
  const env = setup();
  enable(env, "christmas");
  env.advance(2500);
  assert.ok(env.activeAnimations.size > 0);
  assert.equal(env.storage.get("sp_theme_interactive"), "true");
  env.effects.setTheme("dark");
  assert.equal(env.timers.size, 0);
  assert.equal(env.activeAnimations.size, 0);
  env.effects.setTheme("loona");
  assert.equal(env.get("themeInteractive").checked, true);
  env.get("themeInteractive").checked = false;
  env.get("themeInteractive").emit("change");
  env.advance(120000);
  assert.equal(env.document.body.children.length, 0);
  assert.equal(env.activeAnimations.size, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.storage.get("sp_theme_interactive"), "false");
});

test("reduced motion and missing browser support block effects without changing preference", () => {
  for (const options of [{ reduced: true }, { capable: false }]) {
    const env = setup({ ...options, stored: { sp_theme_interactive: "true" } });
    env.effects.setTheme("christmas");
    assert.equal(env.get("themeInteractive").disabled, true);
    assert.equal(env.document.body.children.length, 0);
    assert.equal(env.timers.size, 0);
    assert.equal(env.storage.get("sp_theme_interactive"), "true");
  }
});

test("changing the device motion preference immediately removes running effects", () => {
  const env = setup();
  enable(env, "christmas");
  assert.ok(env.activeAnimations.size > 0);
  env.media.matches = true;
  env.media.emit("change");
  assert.equal(env.document.body.children.length, 0);
  assert.equal(env.activeAnimations.size, 0);
  env.media.matches = false;
  env.media.emit("change");
  assert.equal(env.get("themeInteractive").checked, true);
  assert.ok(env.activeAnimations.size > 0);
});

test("background tabs and back/forward navigation release animations and timers", () => {
  const env = setup();
  enable(env, "christmas");
  env.document.hidden = true;
  env.document.emit("visibilitychange");
  assert.equal(env.activeAnimations.size, 0);
  assert.equal(env.timers.size, 0);
  env.document.hidden = false;
  env.document.emit("visibilitychange");
  assert.ok(env.activeAnimations.size > 0);
  env.window.emit("pagehide");
  assert.equal(env.activeAnimations.size, 0);
  env.window.emit("pageshow");
  assert.equal(env.document.body.children.length, 1);
});

test("all supported themes remain bounded through long sessions and rapid switching", () => {
  const env = setup();
  const descendants = (node) => node.children.reduce((n, child) => n + 1 + descendants(child), 0);
  for (const theme of ["halloween", "loona", "christmas", "sobokill", "easter"]) {
    enable(env, theme);
    for (let i = 0; i < 600; i += 1) {
      env.advance(3000);
      assert.equal(env.document.body.children.length, 1);
      assert.ok(descendants(env.document.body) <= 28, theme);
      assert.ok(env.activeAnimations.size <= 21, theme);
    }
    const layer = env.document.body.children[0];
    assert.equal(layer.attrs["aria-hidden"], "true");
    assert.equal(layer.attrs.inert, "");
  }
  env.effects.setTheme("dark");
  assert.equal(env.activeAnimations.size, 0);
  assert.equal(env.timers.size, 0);
});

test("mobile Christmas uses fewer snow particles", () => {
  const env = setup({ width: 390 });
  enable(env, "christmas");
  assert.equal(env.activeAnimations.size, 9);
});
