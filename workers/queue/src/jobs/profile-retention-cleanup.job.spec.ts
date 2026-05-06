import { describe, expect, it } from "vitest";
import { findStaleProfiles } from "./profile-retention-cleanup.job";

describe("findStaleProfiles", () => {
  it("returns only profiles older than the configured retention window", () => {
    expect(
      findStaleProfiles(
        "2026-05-06T00:00:00.000Z",
        [
          {
            id: "stale-user",
            lastActivityAt: "2026-02-04T23:59:59.000Z",
          },
          {
            id: "active-user",
            lastActivityAt: "2026-02-05T00:00:01.000Z",
          },
        ],
        90,
      ),
    ).toEqual([
      {
        id: "stale-user",
        lastActivityAt: "2026-02-04T23:59:59.000Z",
      },
    ]);
  });
});
