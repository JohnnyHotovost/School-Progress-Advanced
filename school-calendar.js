/* Czech public holidays and Bakaláři v9+ day-off normalization.
 * Source: https://mzv.gov.cz/oslo/cz/viza_a_konzularni_cestovni_informace/statni_svatky_cr_norsko_island/index.html
 * Public holidays fill empty/missing dated schedules; Bakaláři's own entries take priority.
 */
(() => {
  "use strict";
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const FIXED = Object.freeze({
    "01-01": "Den obnovy samostatného českého státu / Nový rok",
    "05-01": "Svátek práce",
    "05-08": "Den vítězství",
    "07-05": "Den slovanských věrozvěstů Cyrila a Metoděje",
    "07-06": "Den upálení mistra Jana Husa",
    "09-28": "Den české státnosti",
    "10-28": "Den vzniku samostatného československého státu",
    "11-17": "Den boje za svobodu a demokracii a Mezinárodní den studentstva",
    "12-24": "Štědrý den",
    "12-25": "1. svátek vánoční",
    "12-26": "2. svátek vánoční"
  });
  const easterCache = new Map();
  const key = (date) => String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");

  function easterSunday(year) {
    // Gregorian Meeus/Jones/Butcher computus; use local noon across DST changes.
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return new Date(year, Math.floor(n / 31) - 1, n % 31 + 1, 12);
  }

  function holidayName(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "";
    const dateKey = key(date);
    if (FIXED[dateKey]) return FIXED[dateKey];
    const year = date.getFullYear();
    if (!easterCache.has(year)) {
      const sunday = easterSunday(year);
      const friday = new Date(sunday);
      const monday = new Date(sunday);
      friday.setDate(friday.getDate() - 2);
      monday.setDate(monday.getDate() + 1);
      easterCache.set(year, { [key(friday)]: "Velký pátek", [key(monday)]: "Velikonoční pondělí" });
    }
    return easterCache.get(year)[dateKey] || "";
  }

  function weekStart(date, offset = 0) {
    const monday = new Date(date);
    monday.setHours(12, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
    return monday;
  }

  function isDayOff(item) {
    return Boolean(item && (item.noSchool === true || item.source === "day-off" || item.source === "holiday-calendar"));
  }

  function normalizeWeek(data, { now = new Date(), offset = 0, length = 7, online = false, dated = true } = {}) {
    const result = {
      days: Object.fromEntries(DAYS.map((day) => [day, Array.from({ length }, (_, index) => {
        const item = data?.days?.[day]?.[index];
        return item ? { ...item } : null;
      })])),
      marks: (Array.isArray(data?.marks) ? data.marks : []).map((item) => ({ ...item })),
      events: (Array.isArray(data?.events) ? data.events : []).map((item) => ({ ...item })),
      blocks: (Array.isArray(data?.blocks) ? data.blocks : []).map((item) => ({ ...item }))
    };
    if (!dated) return result;
    const monday = weekStart(now, offset);

    DAYS.forEach((day, index) => {
      const date = new Date(monday);
      date.setDate(date.getDate() + index);
      const fromApi = result.blocks.find((item) => (item.dayKey || item.day) === day && isDayOff(item)) ||
        result.events.find((item) => (item.dayKey || item.day) === day && isDayOff(item));
      const holiday = holidayName(date);
      const hasSchedule = result.days[day].some(Boolean) ||
        [...result.blocks, ...result.events, ...result.marks].some((item) => (item.dayKey || item.day) === day);
      // Never replace a real online lesson or school event with a calendar guess.
      if (!fromApi && (!holiday || (online && hasSchedule))) return;

      const rawName = String(fromApi?.name || holiday || "Volný den").trim();
      const name = rawName.charAt(0).toLocaleUpperCase("cs-CZ") + rawName.slice(1);
      const block = {
        ...fromApi,
        day, dayKey: day,
        date: fromApi?.date || date.getDate() + "." + (date.getMonth() + 1) + ".",
        startIdx: 0, endIdx: length - 1,
        begin: "", end: "", code: "V", name,
        info: fromApi?.info || "Volno",
        color: fromApi?.color || "167, 139, 250",
        type: "event", allDay: true, noSchool: true,
        source: fromApi?.source || "holiday-calendar"
      };
      result.days[day] = Array(length).fill(null);
      result.marks = result.marks.filter((item) => (item.dayKey || item.day) !== day);
      result.blocks = result.blocks.filter((item) => (item.dayKey || item.day) !== day);
      result.events = result.events.filter((item) => (item.dayKey || item.day) !== day);
      result.blocks.push(block);
      result.events.push({ ...block });
    });
    return result;
  }

  globalThis.SchoolCalendar = Object.freeze({ holidayName, weekStart, isDayOff, normalizeWeek });
})();
