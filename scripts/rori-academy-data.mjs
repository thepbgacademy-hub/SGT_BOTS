#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_PATTERN =
  /(example\.[a-z]+|localhost|127\.0\.0\.1|tbd|todo|placeholder|#)/i;
const WIKI_STATUSES = new Set(["draft", "published", "archived"]);
const EVENT_TYPES = new Set(["workshop", "event"]);
const EVENT_STATUSES = new Set(["active", "cancelled", "archived"]);
const LINK_STATUSES = new Set(["configured", "not_configured", "closed"]);
const ROOM_LINK_STATUSES = new Set(["configured", "not_configured"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasPlaceholder(value) {
  return isNonEmptyString(value) && PLACEHOLDER_PATTERN.test(value);
}

function expectText(errors, value, pathLabel) {
  if (!isNonEmptyString(value)) {
    errors.push(`${pathLabel} is required.`);
    return;
  }

  if (hasPlaceholder(value)) {
    errors.push(`${pathLabel} must not be placeholder copy.`);
  }
}

function expectStringArray(errors, value, pathLabel) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push(`${pathLabel} must be an array of strings.`);
    return;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${pathLabel}[${index}] must not be empty.`);
    } else if (hasPlaceholder(item)) {
      errors.push(`${pathLabel}[${index}] must not be placeholder copy.`);
    }
  });
}

function expectOptionalUrlNotEmpty(errors, value, pathLabel) {
  if (value === "") {
    errors.push(`${pathLabel} must be omitted instead of an empty string.`);
  }
}

function expectOptionalBoolean(errors, value, pathLabel) {
  if (value !== undefined && typeof value !== "boolean") {
    errors.push(`${pathLabel} must be true or false when provided.`);
  }
}

function expectOptionalInteger(errors, value, pathLabel) {
  if (value !== undefined && !Number.isInteger(value)) {
    errors.push(`${pathLabel} must be an integer when provided.`);
  }
}

function expectUrl(errors, value, pathLabel, allowed) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (!isNonEmptyString(value)) {
    errors.push(`${pathLabel} must be a string when provided.`);
    return;
  }

  if (hasPlaceholder(value)) {
    errors.push(`${pathLabel} must not be a placeholder or local URL.`);
    return;
  }

  if (!allowed.some((prefix) => value.startsWith(prefix))) {
    errors.push(`${pathLabel} must start with ${allowed.join(" or ")}.`);
  }
}

function validateWikiPage(errors, record, index) {
  const base = `wikiPages[${index}]`;

  if (!isObject(record)) {
    errors.push(`${base} must be an object.`);
    return;
  }

  expectText(errors, record.pageKey, `${base}.pageKey`);
  expectText(errors, record.title, `${base}.title`);
  expectText(errors, record.summary, `${base}.summary`);
  expectText(errors, record.body, `${base}.body`);
  expectStringArray(errors, record.keywords, `${base}.keywords`);

  if (!WIKI_STATUSES.has(record.status)) {
    errors.push(`${base}.status must be draft, published, or archived.`);
  }

  expectOptionalUrlNotEmpty(errors, record.sourceUrl, `${base}.sourceUrl`);
  expectUrl(errors, record.sourceUrl, `${base}.sourceUrl`, [
    "https://",
    "sgt-bots://",
  ]);
  expectOptionalBoolean(errors, record.visible, `${base}.visible`);
  expectOptionalInteger(errors, record.sortOrder, `${base}.sortOrder`);
}

function validateTelegramRoom(errors, record, index) {
  const base = `telegramRooms[${index}]`;

  if (!isObject(record)) {
    errors.push(`${base} must be an object.`);
    return;
  }

  expectText(errors, record.roomKey, `${base}.roomKey`);
  expectText(errors, record.label, `${base}.label`);
  expectText(errors, record.purpose, `${base}.purpose`);
  expectStringArray(errors, record.keywords, `${base}.keywords`);

  if (!ROOM_LINK_STATUSES.has(record.linkStatus)) {
    errors.push(`${base}.linkStatus must be configured or not_configured.`);
  }

  expectOptionalUrlNotEmpty(errors, record.inviteUrl, `${base}.inviteUrl`);

  if (record.linkStatus === "configured") {
    if (!isNonEmptyString(record.inviteUrl)) {
      errors.push(`${base}.inviteUrl is required when linkStatus is configured.`);
    } else if (!record.inviteUrl.startsWith("https://t.me/")) {
      errors.push(
        `${base}.inviteUrl must start with https://t.me/ when linkStatus is configured.`,
      );
    } else if (hasPlaceholder(record.inviteUrl)) {
      errors.push(`${base}.inviteUrl must not be a placeholder or local URL.`);
    }
  } else if (record.inviteUrl) {
    errors.push(`${base}.inviteUrl must be omitted unless linkStatus is configured.`);
  }

  expectOptionalBoolean(errors, record.visible, `${base}.visible`);
  expectOptionalInteger(errors, record.sortOrder, `${base}.sortOrder`);
}

function validateEvent(errors, record, index) {
  const base = `events[${index}]`;

  if (!isObject(record)) {
    errors.push(`${base} must be an object.`);
    return;
  }

  expectText(errors, record.eventKey, `${base}.eventKey`);
  expectText(errors, record.title, `${base}.title`);
  expectText(errors, record.summary, `${base}.summary`);
  expectText(errors, record.timing, `${base}.timing`);
  expectStringArray(errors, record.keywords, `${base}.keywords`);

  if (!EVENT_TYPES.has(record.eventType)) {
    errors.push(`${base}.eventType must be workshop or event.`);
  }

  if (!EVENT_STATUSES.has(record.status)) {
    errors.push(`${base}.status must be active, cancelled, or archived.`);
  }

  if (!LINK_STATUSES.has(record.registrationStatus)) {
    errors.push(
      `${base}.registrationStatus must be configured, not_configured, or closed.`,
    );
  }

  expectOptionalUrlNotEmpty(
    errors,
    record.registrationUrl,
    `${base}.registrationUrl`,
  );

  if (record.registrationStatus === "configured") {
    expectUrl(errors, record.registrationUrl, `${base}.registrationUrl`, [
      "https://",
    ]);

    if (!isNonEmptyString(record.registrationUrl)) {
      errors.push(
        `${base}.registrationUrl is required when registrationStatus is configured.`,
      );
    }
  } else if (record.registrationUrl) {
    errors.push(
      `${base}.registrationUrl must be omitted unless registrationStatus is configured.`,
    );
  }

  expectOptionalBoolean(errors, record.visible, `${base}.visible`);
  expectOptionalInteger(errors, record.sortOrder, `${base}.sortOrder`);
}

export function validateRoriAcademyData(data, options = {}) {
  const errors = [];

  if (!isObject(data)) {
    return {
      ok: false,
      errors: ["Rori Academy data must be a JSON object."],
    };
  }

  const wikiPages = asArray(data.wikiPages);
  const telegramRooms = asArray(data.telegramRooms);
  const events = asArray(data.events);

  if (
    !options.allowEmpty &&
    wikiPages.length + telegramRooms.length + events.length === 0
  ) {
    errors.push(
      "At least one Rori Academy wiki page, Telegram room, or event record is required.",
    );
  }

  if (!Array.isArray(data.wikiPages)) {
    errors.push("wikiPages must be an array.");
  }

  if (!Array.isArray(data.telegramRooms)) {
    errors.push("telegramRooms must be an array.");
  }

  if (!Array.isArray(data.events)) {
    errors.push("events must be an array.");
  }

  wikiPages.forEach((record, index) => validateWikiPage(errors, record, index));
  telegramRooms.forEach((record, index) =>
    validateTelegramRoom(errors, record, index),
  );
  events.forEach((record, index) => validateEvent(errors, record, index));
  checkDuplicateKeys(errors, wikiPages, "wikiPages", "pageKey");
  checkDuplicateKeys(errors, telegramRooms, "telegramRooms", "roomKey");
  checkDuplicateKeys(errors, events, "events", "eventKey");

  return {
    ok: errors.length === 0,
    errors,
  };
}

function checkDuplicateKeys(errors, records, collectionName, keyName) {
  const seen = new Map();

  records.forEach((record, index) => {
    if (!isObject(record) || !isNonEmptyString(record[keyName])) {
      return;
    }

    const key = record[keyName].trim();
    const firstIndex = seen.get(key);

    if (firstIndex !== undefined) {
      errors.push(
        `${collectionName}[${index}].${keyName} duplicates ${collectionName}[${firstIndex}].${keyName}.`,
      );
      return;
    }

    seen.set(key, index);
  });
}

function sqlString(value) {
  if (value === undefined || value === null) {
    return "null";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlBoolean(value) {
  return value === false ? "false" : "true";
}

function sqlInteger(value) {
  return Number.isInteger(value) ? String(value) : "0";
}

function sqlArray(values) {
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function buildWikiSql(records) {
  if (records.length === 0) {
    return "";
  }

  const values = records
    .map(
      (record) =>
        `(${sqlString(record.pageKey)}, ${sqlString(record.title)}, ${sqlString(record.summary)}, ${sqlString(record.body)}, ${sqlArray(record.keywords)}, ${sqlString(record.status)}, ${sqlString(record.sourceUrl)}, ${sqlBoolean(record.visible)}, ${sqlInteger(record.sortOrder)})`,
    )
    .join(",\n");

  return `insert into rori_academy_wiki_pages (page_key, title, summary, body, keywords, status, source_url, visible, sort_order)
values
${values}
on conflict (page_key) do update set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  keywords = excluded.keywords,
  status = excluded.status,
  source_url = excluded.source_url,
  visible = excluded.visible,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());`;
}

function buildRoomsSql(records) {
  if (records.length === 0) {
    return "";
  }

  const values = records
    .map(
      (record) =>
        `(${sqlString(record.roomKey)}, ${sqlString(record.label)}, ${sqlString(record.purpose)}, ${sqlArray(record.keywords)}, ${sqlString(record.linkStatus)}, ${sqlString(record.inviteUrl)}, ${sqlBoolean(record.visible)}, ${sqlInteger(record.sortOrder)})`,
    )
    .join(",\n");

  return `insert into rori_telegram_rooms (room_key, label, purpose, keywords, link_status, invite_url, visible, sort_order)
values
${values}
on conflict (room_key) do update set
  label = excluded.label,
  purpose = excluded.purpose,
  keywords = excluded.keywords,
  link_status = excluded.link_status,
  invite_url = excluded.invite_url,
  visible = excluded.visible,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());`;
}

function buildEventsSql(records) {
  if (records.length === 0) {
    return "";
  }

  const values = records
    .map(
      (record) =>
        `(${sqlString(record.eventKey)}, ${sqlString(record.title)}, ${sqlString(record.summary)}, ${sqlString(record.timing)}, ${sqlString(record.eventType)}, ${sqlString(record.status)}, ${sqlArray(record.keywords)}, ${sqlString(record.registrationStatus)}, ${sqlString(record.registrationUrl)}, ${sqlBoolean(record.visible)}, ${sqlInteger(record.sortOrder)})`,
    )
    .join(",\n");

  return `insert into rori_academy_events (event_key, title, summary, timing, event_type, status, keywords, registration_status, registration_url, visible, sort_order)
values
${values}
on conflict (event_key) do update set
  title = excluded.title,
  summary = excluded.summary,
  timing = excluded.timing,
  event_type = excluded.event_type,
  status = excluded.status,
  keywords = excluded.keywords,
  registration_status = excluded.registration_status,
  registration_url = excluded.registration_url,
  visible = excluded.visible,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());`;
}

export function buildRoriAcademyDataSql(data) {
  const result = validateRoriAcademyData(data);

  if (!result.ok) {
    throw new Error(result.errors.join("\n"));
  }

  return [
    "begin;",
    buildWikiSql(data.wikiPages),
    buildRoomsSql(data.telegramRooms),
    buildEventsSql(data.events),
    "commit;",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function runCli(argv) {
  const inputIndex = argv.indexOf("--input");
  const outputIndex = argv.indexOf("--output");
  const inputPath = inputIndex >= 0 ? argv[inputIndex + 1] : undefined;
  const outputPath = outputIndex >= 0 ? argv[outputIndex + 1] : undefined;

  if (!inputPath) {
    throw new Error(
      "Usage: node scripts/rori-academy-data.mjs --input path/to/rori-data.json --output path/to/rori-data.sql",
    );
  }

  const raw = await fs.readFile(inputPath, "utf8");
  const data = JSON.parse(raw);
  const sql = buildRoriAcademyDataSql(data);

  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${sql}\n`, "utf8");
  } else {
    process.stdout.write(`${sql}\n`);
  }
}

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
