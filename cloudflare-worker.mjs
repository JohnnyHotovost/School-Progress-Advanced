// Cloudflare Worker - Bakalari timetable API (v8)
//
// Class endpoints support the permanent, current-week and next-week views.
// The teacher endpoint is intentionally limited to the current week so the
// tracker reflects Cafourek's actual schedule and substitutions.

const VERSION = "v8";
const BAKALARI_BASE = "https://1kspa-kladno.bakalari.cz";
const DEFAULT_TYPE = "Actual";
const REQUEST_TIMEOUT_MS = 12_000;
const VALID_ID = /^[A-Za-z0-9_-]{1,32}$/;

const TYPE_MAP = Object.freeze({
  permanent: "Permanent",
  actual: "Actual",
  next: "Next"
});

const FALLBACK_TIMES = Object.freeze([
  { start: "7:55", end: "8:40" },
  { start: "8:50", end: "9:35" },
  { start: "9:50", end: "10:35" },
  { start: "10:45", end: "11:30" },
  { start: "11:35", end: "12:20" },
  { start: "12:50", end: "13:35" },
  { start: "13:40", end: "14:25" },
  { start: "14:30", end: "15:15" },
  { start: "15:20", end: "16:05" },
  { start: "16:10", end: "16:55" },
  { start: "17:00", end: "17:45" },
  { start: "17:45", end: "18:30" },
  { start: "18:30", end: "19:15" },
  { start: "19:15", end: "20:00" }
]);

const DAY_MAP = Object.freeze({
  po: "Mon",
  út: "Tue",
  ut: "Tue",
  st: "Wed",
  čt: "Thu",
  ct: "Thu",
  pá: "Fri",
  pa: "Fri"
});

const DAY_TEXT = Object.freeze({
  Mon: "po",
  Tue: "út",
  Wed: "st",
  Thu: "čt",
  Fri: "pá"
});

const DAY_KEYS = Object.freeze(Object.keys(DAY_TEXT));

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      if (request.method !== "GET") {
        return json({ ok: false, error: "Method not allowed" }, 405, {
          Allow: "GET, OPTIONS"
        });
      }

      if (url.pathname === "/") {
        return json({
          ok: true,
          service: "bakalariapi",
          version: VERSION,
          endpoints: {
            classPermanent: "/api/timetable?class=5A&type=Permanent",
            classActual: "/api/timetable?class=5A&type=Actual",
            classNext: "/api/timetable?class=5A&type=Next",
            teacherActual: "/api/timetable?teacher=UV069&type=Actual"
          }
        });
      }

      if (url.pathname === "/api/timetable") {
        return handleTimetable(url);
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      return json({
        ok: false,
        error: "Internal error",
        detail: errorMessage(error)
      }, 500);
    }
  }
};

async function handleTimetable(url) {
  const classId = cleanText(url.searchParams.get("class"));
  const teacherId = cleanText(url.searchParams.get("teacher"));

  if (!classId && !teacherId) {
    return json({
      ok: false,
      error: "Missing query param: class=... or teacher=..."
    }, 400);
  }

  if (classId && teacherId) {
    return json({ ok: false, error: "Use only one: class OR teacher" }, 400);
  }

  const mode = classId ? "class" : "teacher";
  const entityId = classId || teacherId;
  if (!VALID_ID.test(entityId)) {
    return json({ ok: false, error: "Invalid class or teacher ID" }, 400);
  }

  const requestedType = cleanText(url.searchParams.get("type")) || DEFAULT_TYPE;
  const type = TYPE_MAP[requestedType.toLowerCase()];
  if (!type) {
    return json({
      ok: false,
      error: "Invalid type. Use Permanent, Actual or Next."
    }, 400);
  }

  if (mode === "teacher" && type !== "Actual") {
    return json({
      ok: false,
      error: "Teacher timetable supports only type=Actual"
    }, 400);
  }

  const entity = mode === "class" ? "Class" : "Teacher";
  const upstreamUrl =
    `${BAKALARI_BASE}/Timetable/Public/${type}/${entity}/${encodeURIComponent(entityId)}`;

  const upstream = await fetchHtmlWithTimeout(upstreamUrl, REQUEST_TIMEOUT_MS);
  if (!upstream.ok) {
    return json({
      ok: false,
      error: "Upstream fetch failed",
      detail: upstream.error,
      upstreamStatus: upstream.status
    }, 502, cacheHeaders(type));
  }

  const parsed = parseFromHtml(upstream.html, { mode });
  if (!parsed.valid) {
    return json({
      ok: false,
      error: "Bakalari timetable data was not found",
      source: {
        mode,
        url: upstreamUrl,
        upstreamStatus: upstream.status,
        type,
        ...(classId ? { classId } : { teacherId })
      },
      parser: parsed.parser
    }, 502, cacheHeaders(type));
  }

  return json({
    ok: true,
    source: {
      mode,
      url: upstreamUrl,
      upstreamStatus: upstream.status,
      type,
      ...(classId ? { classId } : { teacherId })
    },
    generatedAt: new Date().toISOString(),
    rawHtmlLength: upstream.html.length,
    times: parsed.times,
    days: parsed.days,
    marks: parsed.marks,
    events: parsed.events,
    parser: parsed.parser
  }, 200, cacheHeaders(type));
}

async function fetchHtmlWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": `Mozilla/5.0 (compatible; bakalariapi/${VERSION}; +CloudflareWorker)`
      },
      redirect: "follow",
      signal: controller.signal
    });
    const html = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        html,
        error: `HTTP ${response.status}`
      };
    }
    return { ok: true, status: response.status, html, error: "" };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      html: "",
      error: errorMessage(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseFromHtml(html, { mode }) {
  const embedded = extractTimetableData(html);
  if (embedded) return parseEmbeddedTimetable(embedded, { mode });
  return parseLegacyDataDetails(html, { mode });
}

function extractTimetableData(html) {
  const source = String(html || "");
  const marker = /\b(?:const|let|var)\s+timetableData\s*=\s*/g;
  const match = marker.exec(source);
  if (!match) return null;

  const start = source.indexOf("{", match.index + match[0].length);
  if (start < 0) return null;

  const jsonText = extractJsonObject(source, start);
  if (!jsonText) return null;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function extractJsonObject(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return null;
}

function parseEmbeddedTimetable(data, { mode }) {
  const times = parseTimes(data?.Hours);
  const cellParts = createCellParts(times.length);
  const marks = [];
  const events = [];
  const parser = createParser("embedded-timetableData", mode);
  const valid = arrayValue(data?.Days).length > 0 && times.length > 0;
  if (!valid) parser.warnings.push("Embedded timetableData does not contain days or hours");
  const hourLookup = new Map(times.map((time, index) => [timeKey(time.start), index]));

  const addPart = (dayKey, hourIndex, lesson) => {
    if (!dayKey || hourIndex == null || !cellParts[dayKey]?.[hourIndex]) {
      parser.stats.skipped += 1;
      return;
    }
    const parts = cellParts[dayKey][hourIndex];
    const signature = lessonSignature(lesson);
    if (parts.some((item) => lessonSignature(item) === signature)) return;
    if (parts.length) parser.stats.merged += 1;
    parts.push(lesson);
    parser.stats.assigned += 1;
  };

  for (const day of arrayValue(data?.Days)) {
    const dayText = cleanText(day?.DayAbbrev).toLowerCase();
    const dayKey = DAY_MAP[dayText] || null;
    if (!dayKey) {
      parser.stats.skipped += 1;
      continue;
    }
    parser.stats.days += 1;

    for (const slot of arrayValue(day?.Hours)) {
      parser.stats.slots += 1;
      const hourIndex = findHourIndex(slot?.Begin, slot?.BeginTimeValue, hourLookup, times);
      if (hourIndex == null) {
        parser.stats.skipped += 1;
        continue;
      }

      const removedNote = textValue(slot?.InfoRemoved);
      if (removedNote) {
        addMark(marks, {
          day: dayKey,
          idx: hourIndex,
          type: "cancel",
          title: "Odpadlo",
          room: "",
          note: removedNote
        });
        parser.stats.removed += 1;
      }

      for (const atom of arrayValue(slot?.Atoms)) {
        parser.stats.atoms += 1;
        const lesson = lessonFromAtom(atom, mode, removedNote);
        if (!lesson.subj) {
          parser.stats.skipped += 1;
          continue;
        }

        addPart(dayKey, hourIndex, lesson);
        const classification = classifyAtom(atom, removedNote);
        if (!classification) continue;

        const note = classification.note || lesson.note;
        addMark(marks, {
          day: dayKey,
          idx: hourIndex,
          type: classification.type,
          title: markTitle(classification.type),
          room: lesson.room,
          note
        });

        if (classification.type === "event") {
          addEvent(events, {
            dayKey,
            dayText: DAY_TEXT[dayKey],
            name: cleanText(atom?.SubjectText) || "Akce",
            begin: times[hourIndex]?.start || stripSeconds(slot?.Begin),
            end: times[hourIndex]?.end || stripSeconds(slot?.End),
            info: note
          });
        }
      }
    }

    const guards = [
      ...arrayValue(day?.PauseGuards),
      ...arrayValue(day?.HourGuards),
      ...arrayValue(day?.GeneralGuards)
    ];

    for (const guard of guards) {
      const name = cleanText(guard?.Name) || cleanText(guard?.Abbrev) || "Akce";
      const info = textValue(guard?.Info);
      const indexes = overlappingHourIndexes(guard?.Begin, guard?.End, times);
      if (!indexes.length) {
        parser.stats.skipped += 1;
        continue;
      }
      parser.stats.guards += 1;

      for (const hourIndex of indexes) {
        addPart(dayKey, hourIndex, {
          subj: name,
          room: "",
          teacher: "",
          class: "",
          note: info
        });
        addMark(marks, {
          day: dayKey,
          idx: hourIndex,
          type: "event",
          title: "Akce",
          room: "",
          note: info || name
        });
      }

      addEvent(events, {
        dayKey,
        dayText: DAY_TEXT[dayKey],
        name,
        begin: stripSeconds(guard?.Begin),
        end: stripSeconds(guard?.End),
        info
      });
    }
  }

  const days = collapseCellParts(cellParts);
  parser.stats.marks = marks.length;
  parser.stats.events = events.length;

  return {
    valid,
    times,
    days,
    marks,
    events,
    parser
  };
}

function parseLegacyDataDetails(html, { mode }) {
  const times = FALLBACK_TIMES.map((time) => ({ ...time }));
  const cellParts = createCellParts(times.length);
  const marks = [];
  const events = [];
  const parser = createParser("legacy-data-detail", mode);
  const detailPattern = /\bdata-detail\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match;

  while ((match = detailPattern.exec(String(html || ""))) !== null) {
    if (parser.stats.atoms >= 2_000) break;
    let detail;
    try {
      detail = JSON.parse(decodeHtml(match[2]));
    } catch {
      parser.stats.skipped += 1;
      continue;
    }

    if (cleanText(detail?.type).toLowerCase() !== "atom") continue;
    parser.stats.atoms += 1;
    const parsedPosition = parseLegacyPosition(detail);
    if (!parsedPosition.dayKey || parsedPosition.hourIndex == null) {
      parser.stats.skipped += 1;
      continue;
    }

    const lesson = {
      subj: cleanText(detail?.subjecttext),
      room: normalizeRoom(detail?.room),
      teacher: mode === "class" ? shortTeacher(detail?.teacher) : "",
      class: cleanText(detail?.group),
      note: joinText([
        detail?.changeinfo,
        detail?.removedinfo,
        detail?.notice,
        detail?.theme
      ])
    };

    if (!lesson.subj) continue;
    const parts = cellParts[parsedPosition.dayKey][parsedPosition.hourIndex];
    parts.push(lesson);
    parser.stats.assigned += 1;
    if (parts.length > 1) parser.stats.merged += 1;

    const classification = classifyLegacyDetail(detail);
    if (classification) {
      addMark(marks, {
        day: parsedPosition.dayKey,
        idx: parsedPosition.hourIndex,
        type: classification.type,
        title: markTitle(classification.type),
        room: lesson.room,
        note: classification.note || lesson.note
      });
    }
  }

  const days = collapseCellParts(cellParts);
  parser.stats.marks = marks.length;
  parser.stats.events = events.length;
  const valid = parser.stats.atoms > 0;
  if (!valid) parser.warnings.push("No embedded timetableData or legacy data-detail records found");

  return { valid, times, days, marks, events, parser };
}

function parseTimes(hours) {
  const parsed = arrayValue(hours)
    .map((hour) => ({
      start: stripSeconds(hour?.BeginTime || hour?.Begin),
      end: stripSeconds(hour?.EndTime || hour?.End)
    }))
    .filter((hour) => hour.start && hour.end);
  return parsed.length ? parsed : FALLBACK_TIMES.map((time) => ({ ...time }));
}

function createCellParts(length) {
  return Object.fromEntries(
    DAY_KEYS.map((dayKey) => [
      dayKey,
      Array.from({ length }, () => [])
    ])
  );
}

function collapseCellParts(cellParts) {
  return Object.fromEntries(
    DAY_KEYS.map((dayKey) => [
      dayKey,
      cellParts[dayKey].map((parts) => collapseLessons(parts))
    ])
  );
}

function collapseLessons(parts) {
  if (!parts.length) return null;
  const unique = [];
  const signatures = new Set();
  for (const part of parts) {
    const signature = lessonSignature(part);
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    unique.push(part);
  }

  return {
    // Repeated subject names are intentional for split groups. The frontend
    // uses the matching class/group values to render ANJ1/ANJ2 correctly.
    subj: unique.map((item) => item.subj).filter(Boolean).join(" / "),
    room: uniqueText(unique.map((item) => item.room)).join(" / "),
    teacher: uniqueText(unique.map((item) => item.teacher)).join(" / "),
    class: uniqueText(unique.map((item) => item.class)).join(" / "),
    note: uniqueText(unique.map((item) => item.note)).join(" | ")
  };
}

function lessonFromAtom(atom, mode, removedNote) {
  return {
    subj: cleanText(atom?.SubjectText) || cleanText(atom?.SubjectAbbrev),
    room: normalizeRoom(atom?.Room),
    teacher: mode === "class" ? cleanText(atom?.Teacher) : "",
    class: cleanText(atom?.GroupsNames),
    note: joinText([
      removedNote,
      atom?.ChangeInfo,
      atom?.AbsentInfo,
      atom?.AtomAbsenceText,
      atom?.Notice,
      atom?.Theme
    ])
  };
}

function classifyAtom(atom, removedNote) {
  const subject = normalizeSearchText([
    atom?.SubjectText,
    atom?.SubjectAbbrev
  ].join(" "));
  const removed = joinText([
    removedNote,
    atom?.InfoRemoved,
    atom?.RemovedInfo,
    atom?.AtomAbsenceText
  ]);
  const change = joinText([
    atom?.ChangeInfo,
    atom?.AbsentInfo
  ]);

  if (subject.includes("akce skoly") || /(^|\s)ask($|\s)/.test(subject)) {
    return { type: "event", note: joinText([change, atom?.Notice, atom?.Theme]) };
  }

  if (removed || containsCancelWord(change)) {
    return { type: "cancel", note: removed || change };
  }

  if (atom?.HasChanged || atom?.NewAtom || change) {
    return { type: "subst", note: change };
  }

  return null;
}

function classifyLegacyDetail(detail) {
  const subject = normalizeSearchText(detail?.subjecttext);
  const removed = joinText([detail?.removedinfo, detail?.absentInfoText]);
  const change = joinText([detail?.changeinfo]);
  if (subject.includes("akce skoly") || /(^|\s)ask($|\s)/.test(subject)) {
    return { type: "event", note: joinText([detail?.notice, detail?.theme]) };
  }
  if (removed || containsCancelWord(change)) {
    return { type: "cancel", note: removed || change };
  }
  if (change) return { type: "subst", note: change };
  return null;
}

function parseLegacyPosition(detail) {
  const dayText = cleanText(detail?.day).toLowerCase();
  const dayAbbrev = dayText.split(/\s+/)[0];
  const dayKey = DAY_MAP[dayAbbrev] || null;
  const timeText = cleanText(detail?.time);
  const match = timeText.match(/^\s*(\d{1,2})\b/);
  const hourIndex = match ? Number(match[1]) - 1 : null;
  return {
    dayKey,
    hourIndex: Number.isInteger(hourIndex) && hourIndex >= 0 && hourIndex < FALLBACK_TIMES.length
      ? hourIndex
      : null
  };
}

function findHourIndex(begin, beginMinutes, hourLookup, times) {
  const direct = hourLookup.get(timeKey(begin));
  if (direct != null) return direct;

  const numeric = Number(beginMinutes);
  if (Number.isFinite(numeric)) {
    const index = times.findIndex((time) => timeToMinutes(time.start) === numeric);
    if (index >= 0) return index;
  }

  return null;
}

function overlappingHourIndexes(begin, end, times) {
  const startMinutes = timeToMinutes(begin);
  const endMinutes = timeToMinutes(end);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) return [];

  const indexes = [];
  times.forEach((time, index) => {
    const hourStart = timeToMinutes(time.start);
    const hourEnd = timeToMinutes(time.end);
    if (startMinutes < hourEnd && endMinutes > hourStart) indexes.push(index);
  });
  return indexes;
}

function addMark(marks, mark) {
  const existing = marks.find((item) =>
    item.day === mark.day &&
    item.idx === mark.idx &&
    item.type === mark.type
  );
  if (!existing) {
    marks.push({ ...mark });
    return;
  }
  existing.room = uniqueText([existing.room, mark.room]).join(" / ");
  existing.note = uniqueText([existing.note, mark.note]).join(" | ");
}

function addEvent(events, event) {
  const signature = [
    event.dayKey,
    event.name,
    event.begin,
    event.end,
    event.info
  ].join("|");
  const exists = events.some((item) => [
    item.dayKey,
    item.name,
    item.begin,
    item.end,
    item.info
  ].join("|") === signature);
  if (!exists) events.push({ ...event });
}

function markTitle(type) {
  if (type === "event") return "Akce";
  if (type === "cancel") return "Odpadlo";
  return "Suplování";
}

function createParser(format, mode) {
  return {
    version: `${VERSION}-${format}`,
    format,
    mode,
    warnings: [],
    stats: {
      days: 0,
      slots: 0,
      atoms: 0,
      assigned: 0,
      merged: 0,
      guards: 0,
      removed: 0,
      marks: 0,
      events: 0,
      skipped: 0
    }
  };
}

function lessonSignature(lesson) {
  return [
    lesson.subj,
    lesson.room,
    lesson.teacher,
    lesson.class,
    lesson.note
  ].join("|");
}

function uniqueText(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function joinText(values) {
  return uniqueText(values.map(textValue)).join(" | ");
}

function textValue(value) {
  if (value == null || value === false) return "";
  if (typeof value === "string" || typeof value === "number") {
    return cleanText(value);
  }
  if (Array.isArray(value)) return joinText(value);
  if (typeof value === "object") {
    const preferredKeys = [
      "Name",
      "Text",
      "Info",
      "Caption",
      "Description",
      "Reason"
    ];
    const preferred = preferredKeys.map((key) => value[key]).filter(Boolean);
    if (preferred.length) return joinText(preferred);
  }
  return "";
}

function cleanText(value) {
  return decodeHtml(String(value ?? ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRoom(value) {
  const room = cleanText(value);
  return room ? room.replace(/\s+/g, "") : "";
}

function stripSeconds(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${Number(match[1])}:${match[2]}` : "";
}

function timeKey(value) {
  const minutes = timeToMinutes(value);
  if (!Number.isFinite(minutes)) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const match = cleanText(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeSearchText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsCancelWord(value) {
  const text = normalizeSearchText(value);
  return text.includes("odpad") || text.includes("zrus") || text.includes("removed");
}

function shortTeacher(value) {
  const cleaned = normalizeSearchText(value).replace(/[^a-z0-9 ]/g, " ");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const ignored = new Set([
    "mgr",
    "bc",
    "ing",
    "phdr",
    "mudr",
    "judr",
    "rndr",
    "phd",
    "mba",
    "dis",
    "csc",
    "doc",
    "prof"
  ]);
  const names = parts.filter((part) => !ignored.has(part));
  const surname = names[names.length - 1] || "";
  return surname.slice(0, 3).toUpperCase();
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (match, code) => {
      const number = Number(code);
      return Number.isFinite(number) ? String.fromCodePoint(number) : match;
    });
}

function errorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return String(error || "Unknown error");
}

function cacheHeaders(type) {
  return {
    "Cache-Control": type === "Permanent"
      ? "public, max-age=300, s-maxage=600"
      : "public, max-age=30, s-maxage=60",
    "X-Worker-Version": VERSION
  };
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    ...extra
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(headers)
  });
}

export { extractTimetableData, parseFromHtml };
