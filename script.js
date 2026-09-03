(() => {
  "use strict";

  const CONFIG = Object.freeze({
    workerBase: "https://bakalariapi.janpilat-bp.workers.dev",
    classId: "5A",
    className: "DE4A",
    teacherId: "UV069",
    version: "1.5.2",
    refreshMs: 5 * 60 * 1000,
    requestTimeoutMs: 12000,
    localTimetableUpdated: "03.09.2026"
  });

  const CLASS_API =
    CONFIG.workerBase + "/api/timetable?class=" + encodeURIComponent(CONFIG.classId) + "&type=Actual";
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
    "Akce skoly": "AŠK"
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

  const mergeDays = (localDays, remoteDays, length) => {
    const merged = cloneDays(localDays, length);
    DAY_KEYS.forEach((day) => {
      const remote = Array.isArray(remoteDays && remoteDays[day]) ? remoteDays[day] : [];
      for (let index = 0; index < length; index += 1) {
        if (remote[index] && remote[index].subj) {
          merged[day][index] = { ...remote[index] };
        }
      }
    });
    return merged;
  };

  const state = {
    classDays: cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length),
    classMarks: [],
    classEvents: [],
    classOnline: false,
    teacherDays: cloneDays(LOCAL_TEACHER_DAYS, TEACHER_TIMES.length),
    teacherOnline: false,
    syncState: "loading",
    lastSync: null,
    syncing: false
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
      "DE4A: final year unlocked.",
      "Bakaláři moment.",
      "Touch grass after class.",
      "Maturita loading…",
      "Local timetable. Production-grade trust issues.",
      "School Progress — allegedly functional."
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
    const allowed = ["light", "dark", "loona", "sobokill", "kasparnakart", "battlecats"];
    const selected = allowed.includes(theme) ? theme : "dark";
    document.body.classList.remove(...allowed.map((item) => "theme-" + item));
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
    applyVisibility();
  }

  function setStatusMode(element, mode) {
    if (!element) return;
    element.classList.remove("loading", "online", "fallback");
    element.classList.add(mode);
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

    setStatusMode($("headerSourcePill"), classMode);
    setStatusMode($("pillClass"), classMode);
    setStatusMode($("pillTeacher"), teacherMode);
    setStatusMode($("pillInfo"), classMode);
    setStatusMode($("ttUpdated"), classMode);

    $("headerSourceDot").className = "status-dot " + classMode;
    $("dotClass").className = "status-dot " + classMode;
    $("dotTeacher").className = "status-dot " + teacherMode;
    $("dotInfo").className = "status-dot " + classMode;
    $("dotTt").className = "status-dot " + classMode;

    if (state.syncState === "loading") {
      setText("headerSourceText", "Připojuji…");
      setText("statusClass", "Ověřuji online změny");
      setText("statusTeacher", "Ověřuji online změny");
      setText("infoSrc", "Načítání");
      setText("statusHint", "Lokální data jsou připravena, ověřuji online změny.");
      return;
    }

    setText(
      "headerSourceText",
      state.classOnline ? CONFIG.className + " · online + lokální" : CONFIG.className + " · lokální"
    );
    setText(
      "statusClass",
      state.classOnline ? "Online změny + lokální základ" : "Lokální fallback"
    );
    setText(
      "statusTeacher",
      state.teacherOnline ? "Online změny + lokální základ" : "Lokální fallback"
    );
    setText("infoSrc", state.classOnline ? "Online" : "Lokální");

    if (state.classOnline && state.teacherOnline) {
      setText(
        "statusHint",
        "Online změny jsou aktivní. Základ rozvrhu chrání lokální snapshot z " +
          CONFIG.localTimetableUpdated + "."
      );
    } else {
      setText(
        "statusHint",
        "Online zdroj není dostupný. Dashboard běží z lokálního rozvrhu z " +
          CONFIG.localTimetableUpdated + "."
      );
    }
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

  function mondayOfCurrentWeek(date) {
    const monday = new Date(date);
    const weekday = monday.getDay() || 7;
    monday.setDate(monday.getDate() - weekday + 1);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function dateForDayIndex(index, now = new Date()) {
    const date = mondayOfCurrentWeek(now);
    date.setDate(date.getDate() + index);
    return date;
  }

  function appendTextElement(parent, tagName, className, value) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function renderTimetable() {
    const grid = $("ttGrid");
    grid.style.setProperty("--cols", String(CLASS_TIMES.length));
    grid.replaceChildren();

    const corner = document.createElement("div");
    corner.className = "tt-corner";
    grid.appendChild(corner);

    CLASS_TIMES.forEach((time, index) => {
      const header = document.createElement("div");
      header.className = "tt-hour";
      const number = document.createTextNode(String(index + 1));
      const rangeElement = document.createElement("span");
      rangeElement.textContent = time.start + "–" + time.end;
      header.append(number, rangeElement);
      grid.appendChild(header);
    });

    DAY_KEYS.forEach((dayKey, dayIndex) => {
      const day = document.createElement("div");
      day.className = "tt-day";
      day.textContent = DAY_LABELS[dayKey];
      grid.appendChild(day);

      for (let index = 0; index < CLASS_TIMES.length; index += 1) {
        const base = state.classDays[dayKey] && state.classDays[dayKey][index]
          ? state.classDays[dayKey][index]
          : null;
        const mark = markForCell(dayKey, index);
        const cell = document.createElement("div");
        cell.className = "tt-cell";
        cell.dataset.day = dayKey;
        cell.dataset.idx = String(index);

        if (!base && !mark) {
          cell.classList.add("tt-empty");
          cell.textContent = "—";
          grid.appendChild(cell);
          continue;
        }

        let type = "";
        if (mark && mark.type === "event") {
          cell.classList.add("tt-event");
          type = "Akce";
        } else if (mark && mark.type === "subst") {
          cell.classList.add("tt-subst");
          type = "Suplování";
        } else if (mark && mark.type === "cancel") {
          cell.classList.add("tt-cancel");
          type = "Odpadlo";
        }

        const subject = base && base.subj ? base.subj : mark && mark.type === "event" ? "Akce školy" : "";
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

        const dayDate = dateForDayIndex(dayIndex);
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
          source: state.classOnline ? "Bakaláři + lokální základ" : "Lokální rozvrh"
        };

        cell.tabIndex = 0;
        cell.setAttribute("role", "button");
        cell.setAttribute(
          "aria-label",
          DAY_LABELS[dayKey] + ", " + (index + 1) + ". hodina, " + (subject || type || "bez výuky")
        );
        cell.addEventListener("mouseenter", (event) => showTooltip(data, event.clientX, event.clientY));
        cell.addEventListener("mousemove", (event) => showTooltip(data, event.clientX, event.clientY));
        cell.addEventListener("mouseleave", hideTooltip);
        cell.addEventListener("click", (event) => {
          event.stopPropagation();
          showTooltip(
            data,
            event.clientX || window.innerWidth / 2,
            event.clientY || window.innerHeight / 2
          );
        });
        cell.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const rect = cell.getBoundingClientRect();
          showTooltip(data, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });

        grid.appendChild(cell);
      }
    });

    const updated = state.lastSync || new Date();
    setText(
      "ttUpdatedText",
      "Aktualizováno " + formatDateTimeCZ(updated) + " · " +
        (state.classOnline ? "hybrid" : "lokálně")
    );
    updateTimetableNowHighlight();
    scheduleSixSevenScan();
  }

  function updateTimetableNowHighlight() {
    const now = new Date();
    const todayKey = dayKeyFromDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    document.querySelectorAll("#ttGrid .tt-cell[data-day][data-idx]").forEach((cell) => {
      const index = Number(cell.dataset.idx);
      const time = CLASS_TIMES_MIN[index];
      const active =
        isSchoolDay(now) &&
        todayKey === cell.dataset.day &&
        time &&
        nowMin >= time.startMin &&
        nowMin <= time.endMin;
      cell.classList.toggle("tt-now", Boolean(active));
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
      Array.isArray(state.classEvents) ? state.classEvents : [],
      (event) =>
        [event.dayKey, event.name, event.begin, event.end, event.info].join("|")
    ).sort(
      (a, b) =>
        (order[a.dayKey] || 99) - (order[b.dayKey] || 99) ||
        String(a.begin || "").localeCompare(String(b.begin || ""))
    );

    const marks = dedupe(
      Array.isArray(state.classMarks) ? state.classMarks : [],
      (mark) => [mark.day, mark.idx, mark.type, mark.note, mark.room].join("|")
    ).sort(
      (a, b) =>
        (order[a.day] || 99) - (order[b.day] || 99) ||
        Number(a.idx || 0) - Number(b.idx || 0)
    );

    events.forEach((event) => {
      const time = event.begin && event.end ? " · " + event.begin + "–" + event.end : "";
      list.appendChild(
        createEventItem(
          event.name || "Akce",
          (event.dayText || dayLabelCZ(event.dayKey)) + time,
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
        : state.classOnline
          ? "Žádné změny ani události pro tento týden."
          : "Online změny nejsou dostupné. Rozvrh dál funguje lokálně.";
      list.appendChild(empty);
    }
    scheduleSixSevenScan();
  }

  function activeClassLesson(dayKey, index) {
    const mark = markForCell(dayKey, index);
    if (mark && mark.type === "cancel") return null;
    const base = state.classDays[dayKey] && state.classDays[dayKey][index];
    if (base && base.subj) return base;
    if (mark && mark.type === "event") {
      return lesson("Akce školy", mark.room || "", "", "");
    }
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
    badge.textContent = text;
  }

  function updateDaily(now) {
    const dayKey = dayKeyFromDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (!dayKey || !isSchoolDay(now)) {
      setDailyBadge("free", "Volno");
      setText("dailyText", "Dnes bez výuky 😎");
      setText("daylabel", "Další školní den si dashboard načte automaticky.");
      setText("dailyDebug", formatWeekdayCZ(now));
      setBar("daybar", 100);
      return;
    }

    const lessons = CLASS_TIMES.map((_, index) => activeClassLesson(dayKey, index));
    const activeIndexes = lessons
      .map((item, index) => item ? index : -1)
      .filter((index) => index >= 0);

    if (!activeIndexes.length) {
      setDailyBadge("free", "Volno");
      setText("dailyText", "Dnes bez výuky 😎");
      setText("daylabel", "V rozvrhu pro dnešek nejsou žádné hodiny.");
      setText("dailyDebug", formatWeekdayCZ(now));
      setBar("daybar", 100);
      return;
    }

    const firstIndex = activeIndexes[0];
    const lastIndex = activeIndexes[activeIndexes.length - 1];
    const firstTime = CLASS_TIMES_MIN[firstIndex];
    const lastTime = CLASS_TIMES_MIN[lastIndex];

    if (nowMin < firstTime.startMin) {
      setDailyBadge("", "Za chvíli");
      setText("dailyText", "Začne: " + formatLesson(lessons[firstIndex]));
      setText(
        "daylabel",
        "Hodina " + (firstIndex + 1) + " · start v " + CLASS_TIMES[firstIndex].start
      );
      setText("dailyDebug", formatWeekdayCZ(now) + " · " + CONFIG.className);
      setBar("daybar", 0);
      return;
    }

    if (nowMin > lastTime.endMin) {
      setDailyBadge("free", "Hotovo");
      setText("dailyText", "Pro dnešek cooked. Volno 😎");
      setText("daylabel", activeIndexes.length + " hodin dokončeno.");
      setText("dailyDebug", formatWeekdayCZ(now) + " · " + CONFIG.className);
      setBar("daybar", 100);
      return;
    }

    for (let index = 0; index < CLASS_TIMES.length; index += 1) {
      const currentTime = CLASS_TIMES_MIN[index];
      const currentLesson = lessons[index];
      if (
        currentLesson &&
        nowMin >= currentTime.startMin &&
        nowMin <= currentTime.endMin
      ) {
        const percent =
          ((nowMin - currentTime.startMin) /
            Math.max(1, currentTime.endMin - currentTime.startMin)) *
          100;
        const nextIndex = activeIndexes.find((candidate) => candidate > index);
        const nextText = typeof nextIndex === "number"
          ? " · Další: " + formatLesson(lessons[nextIndex])
          : "";
        setDailyBadge("", "Právě");
        setText("dailyText", formatLesson(currentLesson) + nextText);
        setText(
          "daylabel",
          "Hodina " + (index + 1) + " · " +
            CLASS_TIMES[index].start + "–" + CLASS_TIMES[index].end
        );
        setText("dailyDebug", Math.round(percent) + "% aktuální hodiny");
        setBar("daybar", percent);
        return;
      }
    }

    const nextIndex = activeIndexes.find(
      (index) => CLASS_TIMES_MIN[index].startMin > nowMin
    );
    if (typeof nextIndex === "number") {
      const isLunch = nowMin >= LUNCH_START && nowMin < LUNCH_END;
      setDailyBadge("", isLunch ? "Oběd" : "Pauza");
      setText(
        "dailyText",
        (isLunch ? "Obědová pauza" : "Následuje") + ": " + formatLesson(lessons[nextIndex])
      );
      setText(
        "daylabel",
        "Další hodina v " + CLASS_TIMES[nextIndex].start
      );
      setText("dailyDebug", formatWeekdayCZ(now) + " · " + CONFIG.className);
      setBar("daybar", 0);
      return;
    }

    setDailyBadge("free", "Volno");
    setText("dailyText", "Pro dnešek hotovo 😎");
    setText("daylabel", "");
    setText("dailyDebug", formatWeekdayCZ(now) + " · " + CONFIG.className);
    setBar("daybar", 100);
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

  function updateCafaTracker(now) {
    const dayKey = dayKeyFromDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const source = state.teacherOnline ? "online + local" : "lokální";

    if (!dayKey || !isSchoolDay(now)) {
      setText("cafaMain", "He gone 😔");
      setText("cafaSub", "Mimo školní den · " + source);
      scheduleSixSevenScan();
      return;
    }

    const lessons = state.teacherDays[dayKey] || Array(TEACHER_TIMES.length).fill(null);
    const activeIndexes = lessons
      .map((item, index) => item && item.subj ? index : -1)
      .filter((index) => index >= 0);

    if (!activeIndexes.length) {
      setText("cafaMain", "He gone 😔");
      setText("cafaSub", dayLabelCZ(dayKey) + " · momentálně neučí · " + source);
      scheduleSixSevenScan();
      return;
    }

    const firstIndex = activeIndexes[0];
    const lastIndex = activeIndexes[activeIndexes.length - 1];
    if (nowMin < TEACHER_TIMES_MIN[firstIndex].startMin) {
      setText("cafaMain", "He is getting ready 😎");
      setText(
        "cafaSub",
        "První hodina " + TEACHER_TIMES[firstIndex].start + " · " + source
      );
      scheduleSixSevenScan();
      return;
    }

    for (let index = 0; index < TEACHER_TIMES.length; index += 1) {
      const time = TEACHER_TIMES_MIN[index];
      if (nowMin < time.startMin || nowMin > time.endMin) continue;
      const current = lessons[index];
      if (current && current.subj) {
        setText("cafaMain", formatTrackerLesson(current));
        setText(
          "cafaSub",
          "Hodina " + (index + 1) + " · " +
            TEACHER_TIMES[index].start + "–" + TEACHER_TIMES[index].end +
            " · " + source
        );
      } else {
        const nextIndex = activeIndexes.find((candidate) => candidate > index);
        setText("cafaMain", "KašpárnaSeek 👀");
        setText(
          "cafaSub",
          typeof nextIndex === "number"
            ? "Další: " + formatTrackerLesson(lessons[nextIndex]) +
                " · " + TEACHER_TIMES[nextIndex].start + " · " + source
            : "Ve škole, ale bez aktivní hodiny · " + source
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
      setText("cafaMain", "KašpárnaSeek 👀");
      if (typeof nextIndex === "number") {
        const previous = typeof previousIndex === "number"
          ? "Naposledy: " + formatTrackerLesson(lessons[previousIndex]) + " · "
          : "";
        setText(
          "cafaSub",
          previous + "další " + TEACHER_TIMES[nextIndex].start + " · " + source
        );
      } else {
        setText("cafaSub", "Ještě může být ve škole · " + source);
      }
      scheduleSixSevenScan();
      return;
    }

    setText("cafaMain", "Cáfa se skrývá ve stínech 😎");
    setText("cafaSub", "Mimo školu · " + source);
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

  async function syncBackend() {
    if (state.syncing) return;
    state.syncing = true;
    try {
      const [classResult, teacherResult] = await Promise.all([
        fetchJsonSafe(CLASS_API),
        fetchJsonSafe(TEACHER_API)
      ]);

      if (classResult.data && classResult.data.ok) {
        state.classDays = mergeDays(
          LOCAL_CLASS_DAYS,
          classResult.data.days,
          CLASS_TIMES.length
        );
        state.classMarks = Array.isArray(classResult.data.marks)
          ? classResult.data.marks
          : [];
        state.classEvents = Array.isArray(classResult.data.events)
          ? classResult.data.events
          : [];
        state.classOnline = true;
      } else {
        state.classDays = cloneDays(LOCAL_CLASS_DAYS, CLASS_TIMES.length);
        state.classMarks = [];
        state.classEvents = [];
        state.classOnline = false;
      }

      if (teacherResult.data && teacherResult.data.ok) {
        state.teacherDays = mergeDays(
          LOCAL_TEACHER_DAYS,
          teacherResult.data.days,
          TEACHER_TIMES.length
        );
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
    } finally {
      state.syncing = false;
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
