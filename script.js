(() => {
  "use strict";

  const CONFIG = Object.freeze({
    workerBase: "https://bakalariapi.janpilat-bp.workers.dev",
    classId: "5A",
    className: "DE4A",
    teacherId: "UV069",
    version: "1.6.5",
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000
  });

  const TIMETABLE_VIEWS = Object.freeze({
    Permanent: "Stálý",
    Actual: "Tento týden",
    Next: "Příští týden"
  });
  const TIMETABLE_KICKERS = Object.freeze({
    Permanent: "Stálý rozvrh",
    Actual: "Přehled tohoto týdne",
    Next: "Přehled příštího týdne"
  });
  const SETTINGS_TIMETABLE_VIEWS = Object.freeze({
    Permanent: "Stálý",
    Actual: "Tento Týden",
    Next: "Příští Týden"
  });
  const THEMES = Object.freeze([
    "light",
    "dark",
    "loona",
    "sobokill",
    "kasparnakart",
    "battlecats",
    "halloween",
    "christmas",
    "easter",
    "kakajicko",
    "maturita"
  ]);
  const TIMETABLE_VIEW_KEYS = Object.keys(TIMETABLE_VIEWS);
  const classApi = (type) =>
    CONFIG.workerBase + "/api/timetable?class=" + encodeURIComponent(CONFIG.classId) +
      "&type=" + encodeURIComponent(type);
  const TEACHER_API =
    CONFIG.workerBase + "/api/timetable?teacher=" + encodeURIComponent(CONFIG.teacherId) + "&type=Actual";

  const $ = (id) => document.getElementById(id);
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const DAY_LABELS = { Mon: "Po", Tue: "Út", Wed: "St", Thu: "Čt", Fri: "Pá" };

  const CLASS_TIMES = [
    { start: "07:55", end: "08:40" },
    { start: "08:50", end: "09:35" },
    { start: "09:50", end: "10:35" },
    { start: "10:45", end: "11:30" },
    { start: "11:35", end: "12:20" },
    { start: "12:50", end: "13:35" },
    { start: "13:40", end: "14:25" }
  ];

  const TEACHER_TIMES = [
    ...CLASS_TIMES,
    { start: "14:30", end: "15:15" },
    { start: "15:20", end: "16:05" }
  ];

  const timeToMinutes = (time) => {
    const parts = String(time).split(":").map(Number);
    return parts[0] * 60 + parts[1];
  };

  const CLASS_TIMES_MIN = CLASS_TIMES.map((time) => ({
    startMin: timeToMinutes(time.start),
    endMin: timeToMinutes(time.end)
  }));

  const TEACHER_TIMES_MIN = TEACHER_TIMES.map((time) => ({
    startMin: timeToMinutes(time.start),
    endMin: timeToMinutes(time.end)
  }));

  const LUNCH_START = timeToMinutes("12:20");
  const LUNCH_END = timeToMinutes("12:50");

  const SUBJECT_SHORT = {
    "Matematika": "MAT",
    "Český jazyk a literatura": "ČJL",
    "Elektrotechnika": "ELT",
    "Softwarové aplikace": "SWA",
    "Počítačové sítě a komunikace": "PSK",
    "Základní programové vybavení": "ZPG",
    "Vývoj aplikací": "VYA",
    "Výpočetní technika": "VYT",
    "Ekonomie": "EKO",
    "Občanská nauka": "OBN",
    "Fyzika": "FYZ",
    "Technické kreslení": "TEK",
    "Tělesná výchova": "TV",
    "Německý jazyk": "NEJ",
    "Ruský jazyk": "RUJ",
    "Anglický jazyk": "ANJ",
    "Konverzace v anglickém jazyce": "KAJ",
    "Akce školy": "AŠK",
    "Akce skoly": "AŠK",
    "Třídnické práce": "TŘP",
    "Tridnicke prace": "TŘP",
    "Technické důvody": "TECH",
    "Technicke duvody": "TECH"
  };

  const lesson = (subj, room = "", teacher = "", className = "") => ({
    subj,
    room,
    teacher,
    class: className,
    note: ""
  });

  const combinedLesson = (...items) => ({
    subj: items.map((item) => item.subj).join(" / "),
    room: items.map((item) => item.room).join(" / "),
    teacher: items.map((item) => item.teacher).join(" / "),
    class: items.map((item) => item.class).join(" / "),
    note: ""
  });

  // Snapshot stálého rozvrhu DE4A z veřejných Bakalářů, 03.09.2026.
  // Slouží jako skutečný základ při výpadku nebo neúplné odpovědi parseru.
  const LOCAL_CLASS_DAYS = {
    Mon: [
      lesson("Výpočetní technika", "uč10", "SVA"),
      lesson("Výpočetní technika", "uč10", "SVA"),
      combinedLesson(
        lesson("Německý jazyk", "uč10", "PRH", "NEJ"),
        lesson("Ruský jazyk", "KLB", "ZYJ", "RUJ")
      ),
      combinedLesson(
        lesson("Německý jazyk", "uč9", "PRH", "NEJ"),
        lesson("Ruský jazyk", "uč17", "ZYJ", "RUJ")
      ),
      lesson("Český jazyk a literatura", "uč10", "BAP"),
      lesson("Český jazyk a literatura", "uč10", "BAP"),
      null
    ],
    Tue: [
      combinedLesson(
        lesson("Anglický jazyk", "uč11", "KLE", "ANJ1"),
        lesson("Anglický jazyk", "KLB", "KLM", "ANJ2")
      ),
      combinedLesson(
        lesson("Anglický jazyk", "uč11", "KLE", "ANJ1"),
        lesson("Konverzace v anglickém jazyce", "uč10", "HAE", "ANJ2")
      ),
      lesson("Počítačové sítě a komunikace", "uč10", "KOO"),
      lesson("Softwarové aplikace", "uč10", "CAJ"),
      lesson("Matematika", "uč10", "BUP"),
      lesson("Matematika", "uč10", "BUP"),
      null
    ],
    Wed: [
      lesson("Softwarové aplikace", "uč10", "CAJ"),
      lesson("Český jazyk a literatura", "uč9", "BAP"),
      combinedLesson(
        lesson("Německý jazyk", "uč10", "PRH", "NEJ"),
        lesson("Ruský jazyk", "uč21", "ZYJ", "RUJ")
      ),
      lesson("Vývoj aplikací", "uč10", "KOO"),
      lesson("Základní programové vybavení", "VT3", "CAJ"),
      lesson("Základní programové vybavení", "uč10", "CAJ"),
      lesson("Matematika", "uč8", "BUP")
    ],
    Thu: [
      null,
      null,
      combinedLesson(
        lesson("Anglický jazyk", "uč10", "KLE", "ANJ1"),
        lesson("Anglický jazyk", "uč11", "KLM", "ANJ2")
      ),
      combinedLesson(
        lesson("Konverzace v anglickém jazyce", "uč11", "KOO", "ANJ1"),
        lesson("Anglický jazyk", "uč13", "KLM", "ANJ2")
      ),
      lesson("Český jazyk a literatura", "uč16", "BAP"),
      lesson("Vývoj aplikací", "uč10", "KOO"),
      lesson("Počítačové sítě a komunikace", "uč10", "KOO")
    ],
    Fri: [
      lesson("Vývoj aplikací", "uč10", "KOO"),
      lesson("Softwarové aplikace", "VT3", "CAJ"),
      lesson("Ekonomie", "uč10", "FRP"),
      lesson("Ekonomie", "uč2", "FRP"),
      lesson("Tělesná výchova", "TV1", "HYP"),
      lesson("Tělesná výchova", "TV1", "HYP"),
      null
    ]
  };

  // Lokální podklad pro Cáfa Tracker. Devět hodin je záměrně odděleno
  // od sedmi sloupců třídního rozvrhu.
  const LOCAL_TEACHER_DAYS = {
    Mon: [
      lesson("Elektrotechnika", "uč2", "", "DE3A"),
      lesson("Softwarové aplikace", "uč13", "", "DE3A"),
      null, null, null, null, null, null, null
    ],
    Tue: [
      null,
      null,
      lesson("Základní programové vybavení", "uč13", "", "DE1A"),
      lesson("Softwarové aplikace", "uč10", "", "DE4A"),
      null,
      lesson("Technické kreslení", "učD3", "", "DE4B"),
      lesson("Technické kreslení", "učD3", "", "DE4B"),
      lesson("Technické kreslení", "učD7", "", "DE1E"),
      lesson("Technické kreslení", "učD7", "", "DE1E")
    ],
    Wed: [
      lesson("Softwarové aplikace", "uč10", "", "DE4A"),
      null,
      null,
      lesson("Softwarové aplikace", "VT1", "", "DE3A"),
      lesson("Základní programové vybavení", "VT3", "", "DE4A"),
      lesson("Základní programové vybavení", "uč10", "", "DE4A"),
      lesson("Softwarové aplikace", "uč10", "", "DE3A"),
      null,
      null
    ],
    Thu: [null, null, null, null, null, null, null, null, null],
    Fri: [
      lesson("Základní programové vybavení", "uč13", "", "DE1A"),
      lesson("Softwarové aplikace", "VT3", "", "DE4A"),
      lesson("Softwarové aplikace", "VT1", "", "DE2A"),
      lesson("Softwarové aplikace", "VT1", "", "DE2A"),
      lesson("Elektrotechnika", "uč2", "", "DE3A"),
      null, null, null, null
    ]
  };

  const cloneDays = (days, length) => {
    const result = {};
    DAY_KEYS.forEach((day) => {
      const source = Array.isArray(days && days[day]) ? days[day] : [];
      result[day] = Array.from({ length }, (_, index) => {
        const item = source[index];
        return item && typeof item === "object" ? { ...item } : null;
      });
    });
    return result;
  };

  const state = {
    classDays: cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length),
    classMarks: [],
    classBlocks: [],
    classView: "Actual",
    classBaseOnline: false,
    classSelectedOnline: false,
    classOnline: false,
    actualDays: cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length),
    actualMarks: [],
    actualEvents: [],
    actualBlocks: [],
    actualOnline: false,
    teacherDays: cloneDays(LOCAL_TEACHER_DAYS, TEACHER_TIMES.length),
    teacherOnline: false,
    syncState: "loading",
    lastSync: null,
    syncing: false,
    syncSequence: 0
  };

  function localDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function localDateEnd(year, month, day) {
    const date = new Date(year, month - 1, day);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  const range = (start, end) => ({ start, end });
  const HIGH_SCHOOL_START = localDate(2023, 9, 4);
  const HIGH_SCHOOL_END = localDateEnd(2027, 6, 30);
  const MATURITA_APPROX = localDateEnd(2027, 5, 1);

  const NON_SCHOOL_RANGES = [
    range("2023-10-26", "2023-10-27"),
    range("2023-12-23", "2024-01-02"),
    range("2024-02-02", "2024-02-02"),
    range("2024-02-26", "2024-03-03"),
    range("2024-07-01", "2024-08-31"),
    range("2024-10-29", "2024-10-30"),
    range("2024-12-23", "2025-01-03"),
    range("2025-01-31", "2025-01-31"),
    range("2025-03-03", "2025-03-09"),
    range("2025-07-01", "2025-08-31"),
    range("2025-10-27", "2025-10-29"),
    range("2025-12-22", "2026-01-02"),
    range("2026-01-30", "2026-01-30"),
    range("2026-03-09", "2026-03-15"),
    range("2026-07-01", "2026-08-31"),
    range("2026-09-28", "2026-09-28"),
    range("2026-10-28", "2026-10-30"),
    range("2026-11-17", "2026-11-17"),
    range("2026-12-23", "2027-01-03"),
    range("2027-01-29", "2027-01-29"),
    range("2027-02-01", "2027-02-07"),
    range("2027-03-25", "2027-03-29"),
    range("2027-07-01", "2027-08-31")
  ];

  const DIRECTOR_DAYS = [];

  function toISO(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function formatDateCZ(date) {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function formatDateTimeCZ(date) {
    return new Intl.DateTimeFormat("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function formatWeekdayCZ(date) {
    const text = new Intl.DateTimeFormat("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function dayKeyFromDate(date) {
    return ({ 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" })[date.getDay()] || null;
  }

  function dayLabelCZ(dayKey) {
    return DAY_LABELS[dayKey] || "—";
  }

  function isSchoolDay(date) {
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) return false;
    const iso = toISO(date);
    if (DIRECTOR_DAYS.includes(iso)) return false;
    return !NON_SCHOOL_RANGES.some((item) => iso >= item.start && iso <= item.end);
  }

  function countSchoolDays(start, end) {
    const first = new Date(start);
    const last = new Date(end);
    first.setHours(0, 0, 0, 0);
    last.setHours(23, 59, 59, 999);
    let count = 0;
    const cursor = new Date(first);
    while (cursor <= last) {
      if (isSchoolDay(cursor)) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }

  function calendarPercent(start, end, now) {
    const total = end - start;
    if (total <= 0) return 0;
    const passed = Math.min(Math.max(now - start, 0), total);
    return (passed / total) * 100;
  }

  function schoolPercent(start, end, now) {
    const total = countSchoolDays(start, end);
    const clipped = now < start ? start : now > end ? end : now;
    const passed = countSchoolDays(start, clipped);
    return total ? (passed / total) * 100 : 0;
  }

  function schoolDaysUntil(target, now) {
    const start = new Date(now);
    const end = new Date(target);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return end < start ? -countSchoolDays(end, start) : countSchoolDays(start, end);
  }

  function currentSchoolYear(now) {
    const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      start: localDate(year, 9, 1),
      end: localDateEnd(year + 1, 6, 30)
    };
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function setBar(id, percent, weekend = false) {
    const element = $(id);
    if (!element) return;
    element.style.width = clamp(percent).toFixed(2) + "%";
    element.classList.toggle("weekend", weekend);
  }

  function baseShort(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (SUBJECT_SHORT[text]) return SUBJECT_SHORT[text];
    const plain = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return plain.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() ||
      text.slice(0, 3).toUpperCase();
  }

  function shortSubject(full, classHint = "") {
    const value = String(full || "").trim();
    if (!value) return "";
    const parts = value.includes(" / ")
      ? value.split(" / ")
      : value.includes("/")
        ? value.split("/")
        : null;
    if (!parts) return baseShort(value);

    const shorts = parts.map(baseShort).filter(Boolean);
    const unique = [...new Set(shorts)];
    if (unique.length === 1 && classHint) {
      const groups = String(classHint)
        .split(/\s*\/\s*/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (groups.length >= 2 && groups.every((item) => item.toUpperCase().startsWith(unique[0]))) {
        return groups.join("/");
      }
    }
    return shorts.join("/");
  }

  async function loadMinecraftSplash() {
    const target = $("mcSplash");
    const fallback = [
      "Co říká Gejmr? BATMAAAAN",
      "Běž si koupit kakajíčko!",
      "Hmm hmm hmm… mrkev v zimě",
      "SIX SEVEN!!!1!!1!",
      "She progress on my school until I maturita",
      "Cafagang"
    ];
    try {
      const response = await fetch("./MinecraftTextSource.txt?ts=" + Date.now(), {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const lines = (await response.text())
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
      target.textContent = lines.length
        ? lines[Math.floor(Math.random() * lines.length)]
        : fallback[0];
    } catch {
      target.textContent = fallback[Math.floor(Math.random() * fallback.length)];
    }
  }

  function applyTitleMode(mode) {
    const title = $("pageTitle");
    title.replaceChildren();
    if (mode === "nonchalant") {
      const bluePart = document.createElement("span");
      bluePart.textContent = "Bakaláři";
      bluePart.style.color = "var(--blue)";
      title.append(bluePart, document.createTextNode(", kdyby nebyly mid"));
    } else if (mode === "freaky") {
      title.textContent = "Kdy to utrpení skončí";
    } else {
      title.textContent = "School Progress";
    }
    localStorage.setItem("sp_mode", mode);
    $("modeSelect").value = mode;
    scheduleSixSevenScan();
  }

  function applyTheme(theme) {
    const selected = THEMES.includes(theme) ? theme : "dark";
    document.body.classList.remove(...THEMES.map((item) => "theme-" + item));
    document.body.classList.add("theme-" + selected);
    localStorage.setItem("sp_theme", selected);
    $("themeSelect").value = selected;
  }

  function applyUiScale(percent) {
    const value = Math.max(85, Math.min(120, Number(percent) || 100));
    document.documentElement.style.setProperty("--ui-scale", String(value / 100));
    $("uiScaleRange").value = String(value);
    $("uiScaleValue").textContent = value + "%";
    localStorage.setItem("sp_ui_scale", String(value));
  }

  function applyCardTransparency(percent) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    const surfaceOpacity = 1 - value / 100;
    const strongOpacity = surfaceOpacity;
    document.documentElement.style.setProperty("--surface-opacity", surfaceOpacity.toFixed(2));
    document.documentElement.style.setProperty("--surface-strong-opacity", strongOpacity.toFixed(2));
    $("cardTransparencyRange").value = String(value);
    $("cardTransparencyValue").textContent = value + "%";
    localStorage.setItem("sp_card_transparency", String(value));
  }

  function initialCardTransparency() {
    const migrationKey = "sp_card_transparency_default_v2";
    const saved = localStorage.getItem("sp_card_transparency");
    if (localStorage.getItem(migrationKey) !== "1") {
      localStorage.setItem(migrationKey, "1");
      if (saved === null || saved === "26") return "60";
    }
    return saved || "60";
  }

  function setSettingsOpen(open) {
    $("settingsPanel").classList.toggle("hidden", !open);
    $("settingsBtn").setAttribute("aria-expanded", String(open));
  }

  function applyVisibility() {
    const showDaily = $("toggleDaily").checked;
    const showEvents = $("toggleEvents").checked;
    const showTracker = $("toggleTracker").checked;
    const showTimetable = $("toggleTimetable").checked;

    $("dailyBlock").classList.toggle("hidden", !showDaily);
    $("eventsBlock").classList.toggle("hidden", !showEvents);
    $("cafaBlock").classList.toggle("hidden", !showTracker);
    $("addonPanel").classList.toggle("hidden", !(showEvents || showTracker));
    $("timetableBlock").classList.toggle("hidden", !showTimetable);
  }

  function initSettings() {
    $("settingsBtn").addEventListener("click", () => {
      setSettingsOpen($("settingsPanel").classList.contains("hidden"));
    });
    $("settingsCloseBtn").addEventListener("click", () => setSettingsOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setSettingsOpen(false);
    });

    $("themeSelect").addEventListener("change", (event) => applyTheme(event.target.value));
    $("modeSelect").addEventListener("change", (event) => applyTitleMode(event.target.value));
    $("uiScaleRange").addEventListener("input", (event) => applyUiScale(event.target.value));
    $("cardTransparencyRange").addEventListener("input", (event) => {
      applyCardTransparency(event.target.value);
    });

    const toggles = [
      ["toggleDaily", "sp_toggle_daily"],
      ["toggleEvents", "sp_toggle_events"],
      ["toggleTracker", "sp_toggle_tracker"],
      ["toggleTimetable", "sp_toggle_tt"]
    ];

    const legacyInfo = localStorage.getItem("sp_toggle_info");
    if (localStorage.getItem("sp_toggle_events") === null && legacyInfo !== null) {
      localStorage.setItem("sp_toggle_events", legacyInfo);
    }

    toggles.forEach(([id, key]) => {
      const element = $(id);
      const saved = localStorage.getItem(key);
      if (saved !== null) element.checked = saved === "1";
      element.addEventListener("change", () => {
        localStorage.setItem(key, element.checked ? "1" : "0");
        applyVisibility();
      });
    });

    applyTheme(localStorage.getItem("sp_theme") || "dark");
    applyTitleMode(localStorage.getItem("sp_mode") || "normal");
    applyUiScale(localStorage.getItem("sp_ui_scale") || "100");
    applyCardTransparency(initialCardTransparency());
    applyVisibility();
  }

  function setStatusMode(element, mode) {
    if (!element) return;
    element.classList.remove("loading", "online", "fallback");
    element.classList.add(mode);
  }

  function timetableViewLabel(view = state.classView) {
    return TIMETABLE_VIEWS[view] || TIMETABLE_VIEWS.Actual;
  }

  function setTimetableButtonsLoading(loading) {
    document.querySelectorAll("[data-timetable-view]").forEach((button) => {
      button.disabled = Boolean(loading);
    });
  }

  function updateTimetableViewControls() {
    document.querySelectorAll("[data-timetable-view]").forEach((button) => {
      const active = button.dataset.timetableView === state.classView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setText(
      "timetableKicker",
      TIMETABLE_KICKERS[state.classView] || TIMETABLE_KICKERS.Actual
    );
  }

  async function setTimetableView(view) {
    if (!TIMETABLE_VIEW_KEYS.includes(view) || view === state.classView) return;
    state.classView = view;
    localStorage.setItem("sp_timetable_view", view);
    updateTimetableViewControls();
    state.syncState = "loading";
    setTimetableButtonsLoading(true);
    updateSourceStatus();
    await syncBackend();
  }

  function initTimetableViewSwitch() {
    const saved = localStorage.getItem("sp_timetable_view");
    state.classView = TIMETABLE_VIEW_KEYS.includes(saved) ? saved : "Actual";
    updateTimetableViewControls();
    document.querySelectorAll("[data-timetable-view]").forEach((button) => {
      button.addEventListener("click", () => setTimetableView(button.dataset.timetableView));
    });
  }

  function updateSourceStatus() {
    const classMode = state.syncState === "loading"
      ? "loading"
      : state.classOnline
        ? "online"
        : "fallback";
    const teacherMode = state.syncState === "loading"
      ? "loading"
      : state.teacherOnline
        ? "online"
        : "fallback";

    setStatusMode($("pillClass"), classMode);
    setStatusMode($("pillTeacher"), teacherMode);
    setStatusMode($("ttUpdated"), classMode);

    $("dotClass").className = "status-dot " + classMode;
    $("dotTeacher").className = "status-dot " + teacherMode;
    $("dotTt").className = "status-dot " + classMode;

    if (state.syncState === "loading") {
      setText("statusClass", "Ověřuji Online Změny");
      setText("statusTeacher", "Ověřuji Online Změny");
      return;
    }

    const selectedLabel = SETTINGS_TIMETABLE_VIEWS[state.classView] || SETTINGS_TIMETABLE_VIEWS.Actual;
    let classStatus = "Lokální Nouzový Režim";
    if (state.classOnline) {
      classStatus = selectedLabel + " · Online";
    } else if (state.classBaseOnline) {
      classStatus = selectedLabel + " Nedostupný · Stálý Online";
    }

    setText("statusClass", classStatus);
    setText("statusTeacher", state.teacherOnline ? "Tento Týden · Online" : "Lokální Nouzový Režim");
  }

  const tooltip = $("ttTooltip");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function tooltipRow(label, value) {
    if (!value) return "";
    return (
      '<div class="tooltip-row"><span class="tooltip-key">' +
      escapeHtml(label) +
      '</span><span class="tooltip-value">' +
      escapeHtml(value) +
      "</span></div>"
    );
  }

  function tooltipHTML(data) {
    return [
      '<div class="tooltip-title">',
      escapeHtml(data.dayLabel + " · " + data.dateLong + " · " + data.time),
      "</div>",
      tooltipRow("Třída", data.className),
      tooltipRow("Předmět", data.subject),
      tooltipRow("Učebna", data.room),
      tooltipRow("Učitel", data.teacher),
      tooltipRow("Skupina", data.group),
      tooltipRow("Typ", data.type),
      tooltipRow("Popis", data.note),
      tooltipRow("Zdroj", data.source)
    ].join("");
  }

  function showTooltip(data, x, y) {
    tooltip.innerHTML = tooltipHTML(data);
    tooltip.style.display = "block";
    tooltip.setAttribute("aria-hidden", "false");

    const margin = 12;
    const offset = 14;
    const rect = tooltip.getBoundingClientRect();
    const left = Math.max(margin, Math.min(x + offset, window.innerWidth - rect.width - margin));
    const top = Math.max(margin, Math.min(y + offset, window.innerHeight - rect.height - margin));
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    tooltip.style.display = "none";
    tooltip.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", hideTooltip);
  window.addEventListener("scroll", hideTooltip, { passive: true });

  function markForCell(dayKey, index) {
    return state.classMarks.find((mark) => mark.day === dayKey && mark.idx === index) || null;
  }

  function blockForCell(dayKey, index) {
    return state.classBlocks.find((block) => {
      const blockDay = block.dayKey || block.day;
      const start = Number(block.startIdx);
      const end = Number(block.endIdx);
      return blockDay === dayKey && Number.isFinite(start) && Number.isFinite(end) &&
        index >= start && index <= end;
    }) || null;
  }

  function actualMarkForCell(dayKey, index) {
    return state.actualMarks.find((mark) => mark.day === dayKey && mark.idx === index) || null;
  }

  function bindTooltip(element, data) {
    element.tabIndex = 0;
    element.setAttribute("role", "button");
    element.addEventListener("mouseenter", (event) => showTooltip(data, event.clientX, event.clientY));
    element.addEventListener("mousemove", (event) => showTooltip(data, event.clientX, event.clientY));
    element.addEventListener("mouseleave", hideTooltip);
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      showTooltip(
        data,
        event.clientX || window.innerWidth / 2,
        event.clientY || window.innerHeight / 2
      );
    });
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      showTooltip(data, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  }

  function mondayOfCurrentWeek(date) {
    const monday = new Date(date);
    const weekday = monday.getDay() || 7;
    monday.setDate(monday.getDate() - weekday + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function dateForDayIndex(index, now = new Date(), weekOffset = 0) {
    const date = mondayOfCurrentWeek(now);
    date.setDate(date.getDate() + index + weekOffset * 7);
    return date;
  }

  function timetableSourceDescription() {
    if (state.classOnline) return "Bakaláři · " + timetableViewLabel();
    if (state.classBaseOnline) return "Bakaláři · stálý nouzový pohled";
    if (state.classSelectedOnline) return "Bakaláři + lokální nouzový základ";
    return "Lokální nouzový rozvrh";
  }

  function isTimetableSlotPast(dayKey, index, now = new Date()) {
    if (state.classView === "Next") return false;
    const targetDay = DAY_KEYS.indexOf(dayKey) + 1;
    const currentDay = now.getDay();
    if (targetDay < 1) return false;
    if (currentDay === 0 || currentDay === 6) return true;
    if (targetDay < currentDay) return true;
    if (targetDay > currentDay) return false;
    const time = CLASS_TIMES_MIN[index];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return Boolean(time && nowMin > time.endMin);
  }

  function isTimetableDayPast(dayKey, now = new Date()) {
    if (state.classView === "Next") return false;
    const targetDay = DAY_KEYS.indexOf(dayKey) + 1;
    const currentDay = now.getDay();
    if (targetDay < 1) return false;
    if (currentDay === 0 || currentDay === 6) return true;
    return targetDay < currentDay;
  }

  function appendTextElement(parent, tagName, className, value) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function cssRgb(value) {
    const matches = String(value || "").match(/\d{1,3}/g);
    if (!matches || matches.length < 3) return "";
    return matches
      .slice(0, 3)
      .map((part) => String(Math.max(0, Math.min(255, Number(part)))))
      .join(", ");
  }

  function isTimetableBlockPast(block, now = new Date()) {
    if (state.classView === "Next") return false;
    const dayKey = block.dayKey || block.day;
    if (isTimetableDayPast(dayKey, now)) return true;
    if (dayKey !== dayKeyFromDate(now)) return false;
    const endMin = timeToMinutes(block.end);
    return Number.isFinite(endMin) && now.getHours() * 60 + now.getMinutes() > endMin;
  }

  function renderTimetableBlocks(grid, now) {
    const blocks = Array.isArray(state.classBlocks) ? state.classBlocks : [];
    const todayKey = dayKeyFromDate(now);

    blocks.forEach((block) => {
      const dayKey = block.dayKey || block.day;
      const dayIndex = DAY_KEYS.indexOf(dayKey);
      const rawStart = Number(block.startIdx);
      const rawEnd = Number(block.endIdx);
      if (dayIndex < 0 || !Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) return;

      const start = Math.max(0, Math.min(CLASS_TIMES.length - 1, rawStart));
      const end = Math.max(start, Math.min(CLASS_TIMES.length - 1, rawEnd));
      if (rawEnd < 0 || rawStart >= CLASS_TIMES.length) return;

      const item = document.createElement("article");
      item.className = "tt-block-overlay";
      item.dataset.day = dayKey;
      item.dataset.begin = block.begin || CLASS_TIMES[start].start;
      item.dataset.end = block.end || CLASS_TIMES[end].end;
      item.style.gridRow = String(dayIndex + 2);
      item.style.gridColumn = String(start + 2) + " / " + String(end + 3);
      item.classList.toggle("tt-today", state.classView !== "Next" && dayKey === todayKey);
      item.classList.toggle("tt-past", isTimetableBlockPast(block, now));

      const color = cssRgb(block.color);
      if (color) item.style.setProperty("--block-rgb", color);

      const code = String(block.code || "").trim();
      const name = String(block.name || block.title || code || "Mimořádná událost").trim();
      const time = [block.begin, block.end].filter(Boolean).join("–");
      const heading = document.createElement("div");
      heading.className = "tt-block-heading";
      if (code) appendTextElement(heading, "span", "tt-block-code", code);
      appendTextElement(heading, "strong", "tt-block-name", name);
      item.appendChild(heading);
      if (time) appendTextElement(item, "span", "tt-block-time", time);

      const dayDate = dateForDayIndex(dayIndex, now, state.classView === "Next" ? 1 : 0);
      const tooltipData = {
        dayLabel: DAY_LABELS[dayKey],
        dateLong: formatDateCZ(dayDate),
        time,
        className: CONFIG.className,
        subject: code && code !== name ? code + " · " + name : name,
        room: "",
        teacher: "",
        group: "",
        note: block.info || "",
        type: "Mimořádný blok",
        source: timetableSourceDescription()
      };
      item.setAttribute(
        "aria-label",
        DAY_LABELS[dayKey] + ", " + name + (time ? ", " + time : "")
      );
      bindTooltip(item, tooltipData);
      grid.appendChild(item);
    });
  }

  function renderTimetable() {
    const grid = $("ttGrid");
    const now = new Date();
    const todayKey = dayKeyFromDate(now);
    const showCurrentWeekState = state.classView !== "Next";
    grid.style.setProperty("--cols", String(CLASS_TIMES.length));
    grid.replaceChildren();

    const corner = document.createElement("div");
    corner.className = "tt-corner";
    corner.style.gridRow = "1";
    corner.style.gridColumn = "1";
    grid.appendChild(corner);

    CLASS_TIMES.forEach((time, index) => {
      const header = document.createElement("div");
      header.className = "tt-hour";
      header.style.gridRow = "1";
      header.style.gridColumn = String(index + 2);
      const number = document.createTextNode(String(index + 1));
      const rangeElement = document.createElement("span");
      rangeElement.textContent = time.start + "–" + time.end;
      header.append(number, rangeElement);
      grid.appendChild(header);
    });

    DAY_KEYS.forEach((dayKey, dayIndex) => {
      const day = document.createElement("div");
      day.className = "tt-day";
      day.dataset.day = dayKey;
      day.style.gridRow = String(dayIndex + 2);
      day.style.gridColumn = "1";
      day.textContent = DAY_LABELS[dayKey];
      day.classList.toggle("tt-today", showCurrentWeekState && dayKey === todayKey);
      day.classList.toggle(
        "tt-past-day",
        isTimetableDayPast(dayKey, now)
      );
      grid.appendChild(day);

      for (let index = 0; index < CLASS_TIMES.length; index += 1) {
        const base = state.classDays[dayKey] && state.classDays[dayKey][index]
          ? state.classDays[dayKey][index]
          : null;
        const mark = markForCell(dayKey, index);
        const spanningBlock = blockForCell(dayKey, index);
        const cell = document.createElement("div");
        cell.className = "tt-cell";
        cell.dataset.day = dayKey;
        cell.dataset.idx = String(index);
        cell.style.gridRow = String(dayIndex + 2);
        cell.style.gridColumn = String(index + 2);
        cell.classList.toggle("tt-today", showCurrentWeekState && dayKey === todayKey);
        cell.classList.toggle("tt-past", isTimetableSlotPast(dayKey, index, now));

        if (!base && !mark) {
          cell.classList.add("tt-empty");
          cell.textContent = "—";
          grid.appendChild(cell);
          continue;
        }

        let type = "";
        if (mark && mark.type === "event") {
          cell.classList.add("tt-event");
          type = mark.title || "Událost";
        } else if (mark && mark.type === "subst") {
          cell.classList.add("tt-subst");
          type = "Suplování";
        } else if (mark && mark.type === "cancel") {
          cell.classList.add("tt-cancel");
          type = "Odpadlo";
        }

        const subject = mark && mark.type === "event"
          ? (base && base.subj) || mark.code || mark.title || "Událost"
          : base && base.subj
            ? base.subj
            : "";
        const room = (mark && mark.room) || (base && base.room) || "";
        const teacher = (base && base.teacher) || "";
        const group = (base && base.class) || "";
        const note = (mark && mark.note) || (base && base.note) || "";

        const topLine = document.createElement("div");
        topLine.className = "tt-topline";
        appendTextElement(topLine, "span", "tt-class", CONFIG.className);
        appendTextElement(topLine, "span", "tt-room", room);
        cell.appendChild(topLine);
        appendTextElement(cell, "div", "tt-subject", shortSubject(subject, group) || "—");
        appendTextElement(cell, "div", "tt-teacher", teacher || type || " ");

        const dayDate = dateForDayIndex(dayIndex, now, state.classView === "Next" ? 1 : 0);
        const data = {
          dayLabel: DAY_LABELS[dayKey],
          dateLong: formatDateCZ(dayDate),
          time: CLASS_TIMES[index].start + "–" + CLASS_TIMES[index].end,
          className: CONFIG.className,
          subject,
          room,
          teacher,
          group,
          note,
          type,
          source: timetableSourceDescription()
        };

        cell.setAttribute(
          "aria-label",
          DAY_LABELS[dayKey] + ", " + (index + 1) + ". hodina, " + (subject || type || "bez výuky")
        );
        if (spanningBlock) {
          cell.classList.add("tt-under-block");
          cell.setAttribute("aria-hidden", "true");
        } else {
          bindTooltip(cell, data);
        }

        grid.appendChild(cell);
      }
    });

    renderTimetableBlocks(grid, now);

    const updated = state.lastSync || new Date();
    setText(
      "ttUpdatedText",
      "Aktualizováno " + formatDateTimeCZ(updated) +
        (state.classOnline ? "" : " · nouzový režim")
    );
    updateTimetableNowHighlight();
    scheduleSixSevenScan();
  }

  function updateTimetableNowHighlight() {
    const now = new Date();
    const todayKey = dayKeyFromDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    document.querySelectorAll("#ttGrid .tt-day[data-day]").forEach((day) => {
      day.classList.toggle(
        "tt-today",
        state.classView !== "Next" && day.dataset.day === todayKey
      );
      day.classList.toggle("tt-past-day", isTimetableDayPast(day.dataset.day, now));
    });
    document.querySelectorAll("#ttGrid .tt-cell[data-day][data-idx]").forEach((cell) => {
      const index = Number(cell.dataset.idx);
      const time = CLASS_TIMES_MIN[index];
      const active =
        state.classView !== "Next" &&
        isSchoolDay(now) &&
        todayKey === cell.dataset.day &&
        time &&
        nowMin >= time.startMin &&
        nowMin <= time.endMin &&
        !cell.classList.contains("tt-cancel") &&
        !cell.classList.contains("tt-empty");
      cell.classList.toggle("tt-now", Boolean(active));
      cell.classList.toggle(
        "tt-today",
        state.classView !== "Next" && cell.dataset.day === todayKey
      );
      cell.classList.toggle(
        "tt-past",
        !active && isTimetableSlotPast(cell.dataset.day, index, now)
      );
    });
    document.querySelectorAll("#ttGrid .tt-block-overlay[data-day]").forEach((block) => {
      const beginMin = timeToMinutes(block.dataset.begin);
      const endMin = timeToMinutes(block.dataset.end);
      const active =
        state.classView !== "Next" &&
        isSchoolDay(now) &&
        todayKey === block.dataset.day &&
        Number.isFinite(beginMin) &&
        Number.isFinite(endMin) &&
        nowMin >= beginMin &&
        nowMin <= endMin;
      block.classList.toggle("tt-now", active);
      block.classList.toggle(
        "tt-today",
        state.classView !== "Next" && block.dataset.day === todayKey
      );
      block.classList.toggle(
        "tt-past",
        !active && isTimetableBlockPast({
          dayKey: block.dataset.day,
          end: block.dataset.end
        }, now)
      );
    });
  }

  function dedupe(items, keyFn) {
    const keys = new Set();
    return items.filter((item) => {
      const key = keyFn(item);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
  }

  function createEventItem(title, meta, description, type = "event") {
    const item = document.createElement("article");
    item.className = "event-item " + type;
    appendTextElement(item, "div", "event-title", title);
    appendTextElement(item, "div", "event-meta", meta);
    if (description) appendTextElement(item, "div", "event-description", description);
    return item;
  }

  function renderEventsPanel() {
    const list = $("eventsList");
    list.replaceChildren();
    const order = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };

    const events = dedupe(
      Array.isArray(state.actualEvents) ? state.actualEvents : [],
      (event) =>
        [event.dayKey, event.name, event.begin, event.end, event.info].join("|")
    ).sort(
      (a, b) =>
        (order[a.dayKey] || 99) - (order[b.dayKey] || 99) ||
        String(a.begin || "").localeCompare(String(b.begin || ""))
    );

    const marks = dedupe(
      Array.isArray(state.actualMarks) ? state.actualMarks : [],
      (mark) => [mark.day, mark.idx, mark.type, mark.note, mark.room].join("|")
    ).sort(
      (a, b) =>
        (order[a.day] || 99) - (order[b.day] || 99) ||
        Number(a.idx || 0) - Number(b.idx || 0)
    );

    events.forEach((event) => {
      const time = event.begin && event.end ? " · " + event.begin + "–" + event.end : "";
      const date = event.date ? " " + event.date : "";
      const title = event.code && event.code !== event.name
        ? event.code + " · " + (event.name || "Událost")
        : event.name || event.code || "Událost";
      list.appendChild(
        createEventItem(
          title,
          dayLabelCZ(event.dayKey) + date + time,
          event.info || "",
          "event"
        )
      );
    });

    marks.forEach((mark) => {
      if (mark.type === "event") return;
      const isSubstitution = mark.type === "subst";
      const title = isSubstitution ? "Suplování" : "Odpadlo";
      const time = CLASS_TIMES[mark.idx];
      const meta = [
        dayLabelCZ(mark.day),
        "hodina " + (Number(mark.idx) + 1) + "/" + CLASS_TIMES.length,
        time ? time.start + "–" + time.end : "",
        mark.room || ""
      ].filter(Boolean).join(" · ");
      list.appendChild(
        createEventItem(title, meta, mark.note || "", isSubstitution ? "subst" : "cancel")
      );
    });

    if (!list.children.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = state.syncState === "loading"
        ? "Ověřuji online změny…"
        : state.actualOnline
          ? "Žádné změny ani události pro tento týden."
          : "Online změny nejsou dostupné. Zobrazuji nouzový stálý rozvrh.";
      list.appendChild(empty);
    }
    scheduleSixSevenScan();
  }

  function activeClassLesson(dayKey, index) {
    const mark = actualMarkForCell(dayKey, index);
    if (mark && mark.type === "cancel") return null;
    if (mark && mark.type === "event") {
      const eventLesson = lesson(mark.title || mark.code || "Událost", mark.room || "", "", "");
      eventLesson.note = mark.note || "";
      return eventLesson;
    }
    const base = state.actualDays[dayKey] && state.actualDays[dayKey][index];
    if (base && base.subj) return base;
    return null;
  }

  function formatLesson(item) {
    if (!item) return "";
    const subject = shortSubject(item.subj, item.class || "");
    return subject + (item.room ? " (" + item.room + ")" : "");
  }

  function setDailyBadge(kind, text) {
    const badge = $("dailyBadge");
    badge.className = "badge" + (kind ? " " + kind : "");
    badge.classList.toggle("hidden", !text);
    badge.textContent = text;
  }

  function setDailyDetail(text) {
    const detail = $("daylabel");
    detail.textContent = text;
    detail.classList.toggle("hidden", !text);
  }

  function createTimelineSegment(kind, startMin, endMin, title) {
    const segment = document.createElement("div");
    segment.className = "timeline-segment " + kind;
    segment.style.setProperty("--duration", String(Math.max(1, endMin - startMin)));
    segment.title = title;
    return segment;
  }

  function appendTimelineGap(timeline, startMin, endMin, nowMin) {
    if (endMin <= startMin) return;
    const cuts = [startMin];
    if (LUNCH_START > startMin && LUNCH_START < endMin) cuts.push(LUNCH_START);
    if (LUNCH_END > startMin && LUNCH_END < endMin) cuts.push(LUNCH_END);
    cuts.push(endMin);
    cuts.sort((a, b) => a - b);

    for (let index = 0; index < cuts.length - 1; index += 1) {
      const pieceStart = cuts[index];
      const pieceEnd = cuts[index + 1];
      const isLunch = pieceStart >= LUNCH_START && pieceEnd <= LUNCH_END;
      const segment = createTimelineSegment(
        isLunch ? "lunch" : "break",
        pieceStart,
        pieceEnd,
        isLunch ? "Obědová pauza 12:20–12:50" : "Pauza"
      );
      if (pieceEnd < nowMin) segment.classList.add("elapsed-gap");
      if (nowMin >= pieceStart && nowMin <= pieceEnd) segment.classList.add("current-gap");
      if (isLunch) {
        appendTextElement(segment, "strong", "", "Oběd");
        appendTextElement(segment, "small", "", "12:20–12:50");
      } else {
        segment.setAttribute("aria-hidden", "true");
      }
      timeline.appendChild(segment);
    }
  }

  function renderDayTimeline(lessons, activeIndexes, nowMin) {
    const timeline = $("dayTimeline");
    timeline.replaceChildren();
    timeline.classList.remove("empty");

    if (!activeIndexes.length) {
      timeline.classList.add("empty");
      timeline.textContent = "Dnes tu není co trackovat.";
      timeline.setAttribute("aria-label", "Dnes bez výuky");
      return;
    }

    const firstIndex = activeIndexes[0];
    const lastIndex = activeIndexes[activeIndexes.length - 1];
    const startMin = CLASS_TIMES_MIN[firstIndex].startMin;
    const endMin = CLASS_TIMES_MIN[lastIndex].endMin;
    let cursor = startMin;

    activeIndexes.forEach((index) => {
      const time = CLASS_TIMES_MIN[index];
      appendTimelineGap(timeline, cursor, time.startMin, nowMin);
      const status = nowMin > time.endMin
        ? "completed"
        : nowMin >= time.startMin && nowMin <= time.endMin
          ? "current"
          : "upcoming";
      const shortName = shortSubject(lessons[index].subj, lessons[index].class || "") || "Výuka";
      const segment = createTimelineSegment(
        "lesson " + status,
        time.startMin,
        time.endMin,
        (index + 1) + ". hodina · " + formatLesson(lessons[index]) + " · " +
          CLASS_TIMES[index].start + "–" + CLASS_TIMES[index].end
      );
      appendTextElement(segment, "small", "", String(index + 1) + ".");
      appendTextElement(segment, "strong", "", shortName);
      timeline.appendChild(segment);
      cursor = Math.max(cursor, time.endMin);
    });
    appendTimelineGap(timeline, cursor, endMin, nowMin);

    if (nowMin >= startMin && nowMin <= endMin) {
      const marker = document.createElement("span");
      marker.className = "timeline-now-marker";
      marker.style.setProperty(
        "--marker-left",
        clamp(((nowMin - startMin) / Math.max(1, endMin - startMin)) * 100).toFixed(2) + "%"
      );
      marker.setAttribute("aria-hidden", "true");
      timeline.appendChild(marker);
    }

    timeline.setAttribute(
      "aria-label",
      activeIndexes.length + " hodin, výuka od " + CLASS_TIMES[firstIndex].start +
        " do " + CLASS_TIMES[lastIndex].end + ", oběd 12:20 až 12:50"
    );
  }

  function setDailyEmpty(text, detail) {
    setDailyBadge("free", "Volno");
    setText("dailyText", text);
    setDailyDetail(detail);
    setText("dailyDebug", "0 hodin");
    setText("dayStartText", "—");
    setText("dayEndText", "—");
    renderDayTimeline([], [], 0);
  }

  function updateDaily(now) {
    const dayKey = dayKeyFromDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (!dayKey || !isSchoolDay(now)) {
      setDailyEmpty("Dnes bez výuky 😎", "Daily Progress má taky nárok na volno.");
      return;
    }

    const lessons = CLASS_TIMES.map((_, index) => activeClassLesson(dayKey, index));
    const activeIndexes = lessons
      .map((item, index) => item ? index : -1)
      .filter((index) => index >= 0);

    if (!activeIndexes.length) {
      setDailyEmpty("Dnes bez výuky 😎", "V aktuálním rozvrhu nejsou žádné hodiny.");
      return;
    }

    const firstIndex = activeIndexes[0];
    const lastIndex = activeIndexes[activeIndexes.length - 1];
    const firstTime = CLASS_TIMES_MIN[firstIndex];
    const lastTime = CLASS_TIMES_MIN[lastIndex];
    const completedCount = activeIndexes.filter(
      (index) => nowMin > CLASS_TIMES_MIN[index].endMin
    ).length;

    setText("dayStartText", CLASS_TIMES[firstIndex].start);
    setText("dayEndText", CLASS_TIMES[lastIndex].end);
    setText("dailyDebug", completedCount + " z " + activeIndexes.length + " hodin");
    renderDayTimeline(lessons, activeIndexes, nowMin);

    if (nowMin < firstTime.startMin) {
      setDailyBadge("", "Před výukou");
      setText("dailyText", "První hodina: " + formatLesson(lessons[firstIndex]));
      setDailyDetail("");
      return;
    }

    if (nowMin > lastTime.endMin) {
      setDailyBadge("free", "");
      setText("dailyText", "Dnešní výuka skončila.");
      setDailyDetail(
        "Výuka probíhala " + CLASS_TIMES[firstIndex].start + "–" +
          CLASS_TIMES[lastIndex].end + " · " + activeIndexes.length + " hodin"
      );
      setText("dailyDebug", activeIndexes.length + " z " + activeIndexes.length + " hodin");
      return;
    }

    const currentIndex = activeIndexes.find((index) => {
      const time = CLASS_TIMES_MIN[index];
      return nowMin >= time.startMin && nowMin <= time.endMin;
    });
    if (typeof currentIndex === "number") {
      const nextIndex = activeIndexes.find((candidate) => candidate > currentIndex);
      setDailyBadge("", "Probíhá");
      setText("dailyText", (currentIndex + 1) + ". hodina · " + formatLesson(lessons[currentIndex]));
      setDailyDetail(
        CLASS_TIMES[currentIndex].start + "–" + CLASS_TIMES[currentIndex].end +
          (typeof nextIndex === "number" ? " · další " + formatLesson(lessons[nextIndex]) : " · poslední hodina")
      );
      return;
    }

    const nextIndex = activeIndexes.find(
      (index) => CLASS_TIMES_MIN[index].startMin > nowMin
    );
    if (typeof nextIndex === "number") {
      const isLunch = nowMin >= LUNCH_START && nowMin < LUNCH_END;
      setDailyBadge(isLunch ? "lunch" : "", isLunch ? "Oběd" : "Pauza");
      setText("dailyText", isLunch ? "Obědová pauza" : "Pauza mezi hodinami");
      setDailyDetail(
        "Další: " + formatLesson(lessons[nextIndex]) + " v " + CLASS_TIMES[nextIndex].start
      );
      return;
    }

    setDailyBadge("free", "");
    setText("dailyText", "Dnešní výuka skončila.");
    setDailyDetail(
      "Výuka probíhala " + CLASS_TIMES[firstIndex].start + "–" +
        CLASS_TIMES[lastIndex].end + " · " + activeIndexes.length + " hodin"
    );
    setText("dailyDebug", activeIndexes.length + " z " + activeIndexes.length + " hodin");
  }

  function normalizeTrackerClass(value) {
    const text = String(value || "").trim().toUpperCase();
    if (!text) return "";
    if (/^(DE\d[A-Z]|[1-9][A-Z]{1,2}|IT\d[A-Z]?|[A-Z]{1,3}\d[A-Z]?)$/.test(text)) {
      return text;
    }
    return text;
  }

  function formatTrackerLesson(item) {
    if (!item) return "";
    const className = normalizeTrackerClass(item.class);
    const subject = shortSubject(item.subj, className);
    const room = String(item.room || "").trim();
    const main = [className, subject].filter(Boolean).join(" ");
    if (main && room) return main + " (" + room + ")";
    if (main) return main;
    if (room) return "(" + room + ")";
    return "Neznámá lokace";
  }

  function setCafaState(main, detail = "") {
    setText("cafaMain", main);
    setText("cafaSub", detail);
    $("cafaSub").classList.toggle("hidden", !detail);
  }

  function updateCafaTracker(now) {
    const dayKey = dayKeyFromDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (!dayKey || !isSchoolDay(now)) {
      setCafaState("Dnes bez výuky", "Cáfa má podle rozvrhu volno.");
      scheduleSixSevenScan();
      return;
    }

    const lessons = state.teacherDays[dayKey] || Array(TEACHER_TIMES.length).fill(null);
    const activeIndexes = lessons
      .map((item, index) => item && item.subj ? index : -1)
      .filter((index) => index >= 0);

    if (!activeIndexes.length) {
      setCafaState("Dnes bez naplánované výuky", "Cáfa má podle rozvrhu volno.");
      scheduleSixSevenScan();
      return;
    }

    const firstIndex = activeIndexes[0];
    const lastIndex = activeIndexes[activeIndexes.length - 1];
    if (nowMin < TEACHER_TIMES_MIN[firstIndex].startMin) {
      setCafaState("Výuka ještě nezačala");
      scheduleSixSevenScan();
      return;
    }

    for (let index = 0; index < TEACHER_TIMES.length; index += 1) {
      const time = TEACHER_TIMES_MIN[index];
      if (nowMin < time.startMin || nowMin > time.endMin) continue;
      const current = lessons[index];
      if (current && current.subj) {
        setCafaState(
          formatTrackerLesson(current),
          (index + 1) + ". hodina · " +
            TEACHER_TIMES[index].start + "–" + TEACHER_TIMES[index].end
        );
      } else {
        const nextIndex = activeIndexes.find((candidate) => candidate > index);
        setCafaState(
          "Pauza mezi hodinami",
          typeof nextIndex === "number"
            ? "Další: " + formatTrackerLesson(lessons[nextIndex]) +
                " v " + TEACHER_TIMES[nextIndex].start
            : "Momentálně bez aktivní hodiny."
        );
      }
      scheduleSixSevenScan();
      return;
    }

    if (nowMin <= TEACHER_TIMES_MIN[lastIndex].endMin + 15) {
      const previousIndexes = activeIndexes.filter(
        (index) => TEACHER_TIMES_MIN[index].endMin < nowMin
      );
      const previousIndex = previousIndexes[previousIndexes.length - 1];
      const nextIndex = activeIndexes.find(
        (index) => TEACHER_TIMES_MIN[index].startMin > nowMin
      );
      if (typeof nextIndex === "number") {
        const previous = typeof previousIndex === "number"
          ? "Naposledy: " + formatTrackerLesson(lessons[previousIndex]) + " · "
          : "";
        setCafaState(
          "Pauza mezi hodinami",
          previous + "další v " + TEACHER_TIMES[nextIndex].start
        );
      } else {
        setCafaState("Dnešní výuka skončila", "Cáfa má pro dnešek klid.");
      }
      scheduleSixSevenScan();
      return;
    }

    setCafaState("Dnešní výuka skončila", "Cáfa má pro dnešek klid.");
    scheduleSixSevenScan();
  }

  function updateProgressBars() {
    const now = new Date();
    const timeInDay = now.getHours() / 24 + now.getMinutes() / 1440;
    const weekday = now.getDay();
    const weekend = weekday === 0 || weekday === 6;
    const workIndex = weekday >= 1 && weekday <= 5 ? weekday - 1 : 4;
    const weekPercent = weekend ? 100 : ((workIndex + timeInDay) / 5) * 100;

    setBar("rt-week", weekPercent, weekend);
    setText("rt-week-label", weekend ? "Weekend" : weekPercent.toFixed(1) + "%");
    setBar("raw-week", weekPercent, weekend);
    setText("raw-week-label", weekend ? "Weekend" : weekPercent.toFixed(1) + "%");

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthPercent = ((now.getDate() - 1 + timeInDay) / daysInMonth) * 100;
    const monthStart = localDate(now.getFullYear(), now.getMonth() + 1, 1);
    const monthEnd = localDateEnd(now.getFullYear(), now.getMonth() + 1, daysInMonth);
    const rawMonthPercent = schoolPercent(monthStart, monthEnd, now);

    setBar("rt-month", monthPercent);
    setText("rt-month-label", monthPercent.toFixed(1) + "%");
    setBar("raw-month", rawMonthPercent);
    setText("raw-month-label", rawMonthPercent.toFixed(1) + "%");

    const schoolYear = currentSchoolYear(now);
    const yearPercent = calendarPercent(schoolYear.start, schoolYear.end, now);
    const rawYearPercent = schoolPercent(schoolYear.start, schoolYear.end, now);
    setBar("rt-year", yearPercent);
    setText("rt-year-label", yearPercent.toFixed(1) + "%");
    setBar("raw-year", rawYearPercent);
    setText("raw-year-label", rawYearPercent.toFixed(1) + "%");

    const totalPercent = calendarPercent(HIGH_SCHOOL_START, HIGH_SCHOOL_END, now);
    const rawTotalPercent = schoolPercent(HIGH_SCHOOL_START, HIGH_SCHOOL_END, now);
    setBar("rt-total", totalPercent);
    setText("rt-total-label", totalPercent.toFixed(1) + "%");
    setBar("raw-total", rawTotalPercent);
    setText("raw-total-label", rawTotalPercent.toFixed(1) + "%");

    const daysUntil = Math.ceil((MATURITA_APPROX - now) / 86400000);
    const rawDaysUntil = schoolDaysUntil(MATURITA_APPROX, now);
    setText(
      "rt-maturita-label",
      daysUntil >= 0 ? "≈ " + daysUntil + " dní" : Math.abs(daysUntil) + " dní zpět"
    );
    setText(
      "raw-maturita-label",
      rawDaysUntil >= 0
        ? "≈ " + rawDaysUntil + " školních dní"
        : Math.abs(rawDaysUntil) + " školních dní zpět"
    );
    scheduleSixSevenScan();
  }

  async function fetchJsonSafe(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      return { data: await response.json(), error: null };
    } catch (error) {
      return {
        data: null,
        error: error && error.name === "AbortError"
          ? "Vypršel časový limit"
          : String(error && error.message ? error.message : error)
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function hasTimetableData(result) {
    return Boolean(
      result &&
      result.data &&
      result.data.ok &&
      result.data.days &&
      typeof result.data.days === "object"
    );
  }

  function responseList(result, key) {
    return hasTimetableData(result) && Array.isArray(result.data[key])
      ? result.data[key]
      : [];
  }

  async function syncBackend() {
    const sequence = state.syncSequence + 1;
    state.syncSequence = sequence;
    state.syncing = true;
    setTimetableButtonsLoading(true);
    const requestedView = state.classView;

    try {
      const permanentPromise = fetchJsonSafe(classApi("Permanent"));
      const actualPromise = fetchJsonSafe(classApi("Actual"));
      const nextPromise = requestedView === "Next"
        ? fetchJsonSafe(classApi("Next"))
        : Promise.resolve(null);

      const [permanentResult, actualResult, nextResult, teacherResult] = await Promise.all([
        permanentPromise,
        actualPromise,
        nextPromise,
        fetchJsonSafe(TEACHER_API)
      ]);

      if (sequence !== state.syncSequence) return;

      const permanentOnline = hasTimetableData(permanentResult);
      const actualOnline = hasTimetableData(actualResult);
      const nextOnline = hasTimetableData(nextResult);
      const baseDays = permanentOnline
        ? cloneDays(permanentResult.data.days, CLASS_TIMES.length)
        : cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length);
      const actualDays = actualOnline
        ? cloneDays(actualResult.data.days, CLASS_TIMES.length)
        : cloneDays(baseDays, CLASS_TIMES.length);

      state.classBaseOnline = permanentOnline;
      state.actualOnline = actualOnline;
      state.actualDays = actualDays;
      state.actualMarks = responseList(actualResult, "marks");
      state.actualEvents = responseList(actualResult, "events");
      state.actualBlocks = responseList(actualResult, "blocks");

      if (requestedView === "Permanent") {
        state.classDays = cloneDays(baseDays, CLASS_TIMES.length);
        state.classMarks = [];
        state.classBlocks = [];
        state.classSelectedOnline = permanentOnline;
      } else if (requestedView === "Next") {
        state.classDays = nextOnline
          ? cloneDays(nextResult.data.days, CLASS_TIMES.length)
          : cloneDays(baseDays, CLASS_TIMES.length);
        state.classMarks = responseList(nextResult, "marks");
        state.classBlocks = responseList(nextResult, "blocks");
        state.classSelectedOnline = nextOnline;
      } else {
        state.classDays = cloneDays(actualDays, CLASS_TIMES.length);
        state.classMarks = [...state.actualMarks];
        state.classBlocks = [...state.actualBlocks];
        state.classSelectedOnline = actualOnline;
      }
      state.classOnline = state.classSelectedOnline;

      if (hasTimetableData(teacherResult)) {
        state.teacherDays = cloneDays(teacherResult.data.days, TEACHER_TIMES.length);
        state.teacherOnline = true;
      } else {
        state.teacherDays = cloneDays(LOCAL_TEACHER_DAYS, TEACHER_TIMES.length);
        state.teacherOnline = false;
      }

      state.lastSync = new Date();
      state.syncState = "ready";
      updateSourceStatus();
      renderTimetable();
      renderEventsPanel();
      tick();
    } catch {
      if (sequence !== state.syncSequence) return;
      state.syncState = "ready";
      state.classBaseOnline = false;
      state.classSelectedOnline = false;
      state.classOnline = false;
      state.actualOnline = false;
      state.teacherOnline = false;
      state.classDays = cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length);
      state.classMarks = [];
      state.classBlocks = [];
      state.actualDays = cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length);
      state.actualMarks = [];
      state.actualEvents = [];
      state.actualBlocks = [];
      state.teacherDays = cloneDays(LOCAL_TEACHER_DAYS, TEACHER_TIMES.length);
      updateSourceStatus();
      renderTimetable();
      renderEventsPanel();
      tick();
    } finally {
      if (sequence === state.syncSequence) {
        state.syncing = false;
        setTimetableButtonsLoading(false);
      }
    }
  }

  let sixSevenTimer = null;

  function makeSixSeven(value) {
    const wrapper = document.createElement("span");
    wrapper.className = "ss";
    wrapper.dataset.ss = "1";
    const clean = String(value).replace(/\s+/g, "");
    const six = document.createElement("span");
    six.className = "digit six";
    six.textContent = "6";
    const middle = document.createElement("span");
    middle.className = "digit";
    middle.textContent = clean.includes("/") ? "/" : clean.includes(".") ? "." : "";
    const seven = document.createElement("span");
    seven.className = "digit seven";
    seven.textContent = "7";
    wrapper.appendChild(six);
    if (middle.textContent) wrapper.appendChild(middle);
    wrapper.appendChild(seven);
    return wrapper;
  }

  function wrapSixSeven(root) {
    if (!root) return;
    const skipped = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION"]);
    const hit = /6\s*\/\s*7|6\.7|67/;
    const patterns = [/6\s*\/\s*7/g, /6\.7/g, /67/g];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentNode;
        if (!parent || skipped.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest && (parent.closest(".timetable-tooltip") || parent.closest(".ss"))) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue && hit.test(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((textNode) => {
      let parts = [{ text: textNode.nodeValue, match: false }];
      patterns.forEach((pattern) => {
        const next = [];
        parts.forEach((part) => {
          if (part.match) {
            next.push(part);
            return;
          }
          let last = 0;
          let match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(part.text)) !== null) {
            if (match.index > last) {
              next.push({ text: part.text.slice(last, match.index), match: false });
            }
            next.push({ text: match[0], match: true });
            last = match.index + match[0].length;
          }
          if (last < part.text.length) {
            next.push({ text: part.text.slice(last), match: false });
          }
        });
        parts = next;
      });

      if (!parts.some((part) => part.match)) return;
      const fragment = document.createDocumentFragment();
      parts.forEach((part) => {
        fragment.appendChild(part.match ? makeSixSeven(part.text) : document.createTextNode(part.text));
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  function scheduleSixSevenScan() {
    if (sixSevenTimer) window.clearTimeout(sixSevenTimer);
    sixSevenTimer = window.setTimeout(() => {
      try {
        wrapSixSeven(document.querySelector(".app-shell"));
      } catch {
        // Easter egg nesmí ovlivnit funkce dashboardu.
      }
    }, 80);
  }

  function triggerSixSevenEmote() {
    document.querySelectorAll(".ss[data-ss='1']").forEach((element) => {
      element.classList.remove("hot");
      void element.offsetWidth;
      element.classList.add("hot");
      window.setTimeout(() => element.classList.remove("hot"), 1150);
    });
  }

  function tick() {
    const now = new Date();
    updateProgressBars();
    if ($("toggleDaily").checked) updateDaily(now);
    if ($("toggleTracker").checked) updateCafaTracker(now);
    updateTimetableNowHighlight();
  }

  function boot() {
    setText("verText", CONFIG.version);
    initSettings();
    initTimetableViewSwitch();
    updateSourceStatus();
    renderTimetable();
    renderEventsPanel();
    loadMinecraftSplash();
    tick();
    syncBackend();

    window.setInterval(triggerSixSevenEmote, 10000);
    window.setInterval(tick, 30000);
    window.setInterval(syncBackend, CONFIG.refreshMs);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
