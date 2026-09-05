import test from "node:test";
import assert from "node:assert/strict";
import "../school-calendar.js";
import { parseFromHtml } from "../cloudflare-worker.mjs";
import { environment } from "./helpers.mjs";

const { holidayName, normalizeWeek, weekStart } = globalThis.SchoolCalendar;
const date = (iso) => new Date(iso + "T12:00:00");
const regular = () => ({ days: Object.fromEntries(["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => [day, Array.from({ length: 7 }, () => ({ subj: "MAT" }))])) });
const html = (Days) => '<script>var timetableData = ' + JSON.stringify({ Days }) + ';</script>';

test("Czech holidays include movable Easter dates, without marking ordinary days", () => {
  assert.equal(holidayName(date("2026-09-28")), "Den české státnosti");
  assert.equal(holidayName(date("2026-04-03")), "Velký pátek");
  assert.equal(holidayName(date("2026-04-06")), "Velikonoční pondělí");
  assert.equal(holidayName(date("2027-03-26")), "Velký pátek");
  assert.equal(holidayName(date("2027-03-29")), "Velikonoční pondělí");
  assert.equal(holidayName(date("2026-09-29")), "");
  assert.equal(holidayName(new Date("invalid")), "");
});

test("all fixed holidays are excluded every year", () => {
  for (const md of ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"]) {
    assert.ok(holidayName(date("2026-" + md)), md);
    assert.ok(holidayName(date("2027-" + md)), md);
  }
});

test("actual and next weeks use different dates, including year and DST boundaries", () => {
  const actual = normalizeWeek(regular(), { now: date("2026-09-25") });
  const next = normalizeWeek(regular(), { now: date("2026-09-25"), offset: 1 });
  assert.equal(actual.blocks.length, 0);
  assert.equal(next.blocks[0].name, "Den české státnosti");
  assert.equal(next.days.Mon.filter(Boolean).length, 0);
  assert.equal(next.days.Tue.filter(Boolean).length, 7);
  assert.equal(weekStart(date("2026-12-27"), 1).getDate(), 28);
  const january = normalizeWeek(regular(), { now: date("2026-12-27"), offset: 1 });
  assert.equal(january.blocks[0].dayKey, "Fri");
  assert.match(january.blocks[0].name, /Nový rok/);
  const dst = normalizeWeek(regular(), { now: date("2027-03-28"), offset: 1 });
  assert.equal(dst.blocks[0].name, "Velikonoční pondělí");
});

test("an undated permanent template is never replaced by a dated holiday", () => {
  const result = normalizeWeek(regular(), { now: date("2026-09-28"), dated: false });
  assert.equal(result.blocks.length, 0);
  assert.equal(result.days.Mon.filter(Boolean).length, 7);
});

test("v9 DayOff becomes one all-day block and no lessons or duplicate events", () => {
  const parsed = parseFromHtml(html([{ DayAbbrev: "po", Date: "28.9.", DayOff: true, DayOffName: "Den české státnosti", Hours: [] }]), { mode: "class" });
  assert.ok(parsed.valid);
  assert.equal(parsed.blocks[0].source, "day-off");
  assert.ok(parsed.days.Mon.some(Boolean)); // Worker v9 represents the block in lesson slots too.
  const result = normalizeWeek(parsed, { now: date("2026-09-28"), online: true });
  assert.equal(result.days.Mon.filter(Boolean).length, 0);
  assert.equal(result.marks.length, 0);
  assert.equal(result.blocks.length, 1);
  assert.equal(result.events.length, 1);
  assert.equal(result.blocks[0].name, "Den české státnosti");
  assert.equal(result.blocks[0].endIdx, 6);
  assert.equal(result.blocks[0].allDay, true);
  assert.equal(result.blocks[0].noSchool, true);
  const teacher = normalizeWeek(parsed, { now: date("2026-09-28"), length: 9, online: true });
  assert.equal(teacher.days.Mon.length, 9);
  assert.ok(teacher.days.Mon.every((item) => item === null));
});

test("school-specific DayOff names are preserved even outside public holidays", () => {
  const parsed = parseFromHtml(html([{ DayAbbrev: "út", DayOff: true, DayOffName: "Ředitelské volno", Hours: [] }]), { mode: "class" });
  const result = normalizeWeek(parsed, { now: date("2026-09-08"), online: true });
  assert.equal(result.blocks[0].name, "Ředitelské volno");
  assert.equal(result.blocks[0].source, "day-off");
  assert.ok(result.days.Tue.every((item) => item === null));
});

test("school actions, class work and technical closures keep their original names and spans", () => {
  const parsed = parseFromHtml(html([
    { DayAbbrev: "po", Hours: [], Absences: [{ Begin: "7:55", End: "12:20", AbsentKind: { Name: "Akce školy", Abbrev: "AŠK" } }] },
    { DayAbbrev: "út", Hours: [], GeneralGuards: [{ Name: "Třídnické práce", Abbrev: "TŘP", Begin: "7:55", End: "10:35" }] },
    { DayAbbrev: "st", Hours: [], Absences: [{ Begin: "7:55", End: "14:25", AbsentKind: { Name: "Technické důvody", Abbrev: "TD" } }] }
  ]), { mode: "class" });
  const result = normalizeWeek(parsed, { now: date("2026-09-09"), online: true });
  assert.deepEqual(result.blocks.map((block) => block.name), ["Akce školy", "Třídnické práce", "Technické důvody"]);
  assert.equal(result.events.length, 3);
  assert.equal(result.blocks[1].endIdx, 2);
  assert.ok(result.blocks.every((block) => !block.noSchool));
});

test("a calendar fallback fills an empty online holiday, but keeps real online lessons/events", () => {
  const options = { now: date("2026-09-28"), online: true };
  assert.equal(normalizeWeek({ days: {} }, options).blocks[0].name, "Den české státnosti");
  assert.equal(normalizeWeek(regular(), options).blocks.length, 0);
  const event = { dayKey: "Mon", name: "Školní akce", source: "guard" };
  assert.equal(normalizeWeek({ events: [event] }, options).events[0].name, "Školní akce");
});

test("normalizing never mutates the upstream response and tolerates absent optional lists", () => {
  const input = regular();
  input.marks = {};
  const before = JSON.stringify(input);
  normalizeWeek(input, { now: date("2026-09-28") });
  assert.equal(JSON.stringify(input), before);
});

test("Daily Progress shows Weekend, a named holiday, then returns to a lesson timeline", () => {
  const env = environment();
  env.context.SchoolCalendar = globalThis.SchoolCalendar;
  env.run("script.js", (source) => source.replace('document.addEventListener("DOMContentLoaded", boot);', 'globalThis.subject = { updateDaily, state, activeClassLesson, renderEventsPanel };'));
  const app = env.context.subject;
  app.updateDaily(date("2026-09-05"));
  assert.equal(env.get("dailyText").textContent, "Weekend");
  assert.equal(env.get("dailyBadge").classList.contains("hidden"), true);
  assert.equal(env.get("daylabel").textContent, "");
  assert.equal(env.get("dailyBlock").classList.contains("daily-free"), true);
  const holiday = normalizeWeek(regular(), { now: date("2026-09-28") });
  app.state.actualDays = holiday.days;
  app.state.actualBlocks = holiday.blocks;
  app.state.actualEvents = holiday.events;
  app.updateDaily(date("2026-09-28"));
  assert.equal(env.get("dailyText").textContent, "Den české státnosti");
  assert.equal(app.activeClassLesson("Mon", 0), null);
  app.renderEventsPanel();
  assert.equal(env.get("eventsList").children.length, 1);
  assert.match(env.get("eventsList").textContent, /Den české státnosti.*Volno/);
  app.state.actualDays = regular().days;
  app.state.actualBlocks = [];
  app.updateDaily(date("2026-09-29"));
  assert.equal(env.get("dailyBlock").classList.contains("daily-free"), false);
  assert.ok(env.get("dayTimeline").children.length > 0);
});
