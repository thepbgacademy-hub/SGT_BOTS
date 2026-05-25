import { describe, expect, it } from "vitest";
const scriptPath = "../../../../scripts/rori-academy-data.mjs";
const { buildRoriAcademyDataSql, validateRoriAcademyData } =
  await import(scriptPath);

const APPROVED_SHAPE_FIXTURE = {
  wikiPages: [
    {
      pageKey: "enrollment",
      title: "Academy Enrollment",
      summary: "How Academy enrollment is handled.",
      body: "Use the current Academy enrollment path and ask support for the next step.",
      keywords: ["enrollment", "academy"],
      status: "published",
      sourceUrl: "sgt-bots://wiki/rori/enrollment",
      visible: true,
      sortOrder: 10,
    },
  ],
  telegramRooms: [
    {
      roomKey: "enrollment-help",
      label: "Enrollment Help",
      purpose: "Questions about joining the PBG Academy.",
      keywords: ["enrollment"],
      linkStatus: "configured",
      inviteUrl: "https://t.me/+fixtureEnrollmentRoom",
      visible: true,
      sortOrder: 10,
    },
  ],
  events: [
    {
      eventKey: "academy-orientation",
      title: "Academy Orientation",
      summary: "A member orientation session.",
      timing: "June 15, 2026 at 7:00 PM Central",
      eventType: "workshop",
      status: "active",
      keywords: ["orientation", "workshop"],
      registrationStatus: "configured",
      registrationUrl: "https://academy.pbg/events/fixture-orientation",
      visible: true,
      sortOrder: 10,
    },
  ],
};

describe("Rori Academy data import", () => {
  it("validates real Academy wiki, room, and event records", () => {
    const result = validateRoriAcademyData(APPROVED_SHAPE_FIXTURE);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects empty production imports unless explicitly allowed", () => {
    const result = validateRoriAcademyData({
      wikiPages: [],
      telegramRooms: [],
      events: [],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "At least one Rori Academy wiki page, Telegram room, or event record is required.",
    );
  });

  it("rejects placeholder and mismatched live links", () => {
    const result = validateRoriAcademyData({
      wikiPages: [
        {
          pageKey: "bad-wiki",
          title: "Bad Wiki",
          summary: "Placeholder",
          body: "Placeholder",
          keywords: ["todo"],
          status: "published",
          sourceUrl: "https://example.org/rori",
        },
      ],
      telegramRooms: [
        {
          roomKey: "bad-room",
          label: "Bad Room",
          purpose: "Placeholder",
          keywords: [],
          linkStatus: "configured",
          inviteUrl: "https://academy.pbg/room",
        },
      ],
      events: [
        {
          eventKey: "bad-event",
          title: "Bad Event",
          summary: "Placeholder",
          timing: "TBD",
          eventType: "workshop",
          status: "active",
          keywords: [],
          registrationStatus: "not_configured",
          registrationUrl: "https://pbg.academy/events/bad",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "wikiPages[0].sourceUrl must not be a placeholder or local URL.",
        "wikiPages[0].keywords[0] must not be placeholder copy.",
        "telegramRooms[0].inviteUrl must start with https://t.me/ when linkStatus is configured.",
        "events[0].registrationUrl must be omitted unless registrationStatus is configured.",
        "events[0].timing must not be placeholder copy.",
      ]),
    );
  });

  it("builds non-destructive upsert SQL for valid records", () => {
    const sql = buildRoriAcademyDataSql(APPROVED_SHAPE_FIXTURE);

    expect(sql).toContain("begin;");
    expect(sql).toContain("insert into rori_academy_wiki_pages");
    expect(sql).toContain("insert into rori_telegram_rooms");
    expect(sql).toContain("insert into rori_academy_events");
    expect(sql).toContain("on conflict (page_key) do update");
    expect(sql).toContain("on conflict (room_key) do update");
    expect(sql).toContain("on conflict (event_key) do update");
    expect(sql).not.toMatch(/\bdelete\b|\btruncate\b|\bdrop\b/i);
  });

  it("rejects empty optional URL strings before SQL generation", () => {
    const result = validateRoriAcademyData({
      wikiPages: [
        {
          pageKey: "empty-source",
          title: "Empty Source",
          summary: "Empty source test.",
          body: "Empty source test body.",
          keywords: [],
          status: "published",
          sourceUrl: "",
        },
      ],
      telegramRooms: [
        {
          roomKey: "empty-room",
          label: "Empty Room",
          purpose: "Empty room URL test.",
          keywords: [],
          linkStatus: "not_configured",
          inviteUrl: "",
        },
      ],
      events: [
        {
          eventKey: "empty-event",
          title: "Empty Event",
          summary: "Empty event URL test.",
          timing: "June 15, 2026",
          eventType: "workshop",
          status: "active",
          keywords: [],
          registrationStatus: "closed",
          registrationUrl: "",
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "wikiPages[0].sourceUrl must be omitted instead of an empty string.",
        "telegramRooms[0].inviteUrl must be omitted instead of an empty string.",
        "events[0].registrationUrl must be omitted instead of an empty string.",
      ]),
    );
  });

  it("rejects duplicate keys before building upsert SQL", () => {
    const result = validateRoriAcademyData({
      wikiPages: [
        APPROVED_SHAPE_FIXTURE.wikiPages[0],
        APPROVED_SHAPE_FIXTURE.wikiPages[0],
      ],
      telegramRooms: [
        APPROVED_SHAPE_FIXTURE.telegramRooms[0],
        APPROVED_SHAPE_FIXTURE.telegramRooms[0],
      ],
      events: [
        APPROVED_SHAPE_FIXTURE.events[0],
        APPROVED_SHAPE_FIXTURE.events[0],
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "wikiPages[1].pageKey duplicates wikiPages[0].pageKey.",
        "telegramRooms[1].roomKey duplicates telegramRooms[0].roomKey.",
        "events[1].eventKey duplicates events[0].eventKey.",
      ]),
    );
  });
});
