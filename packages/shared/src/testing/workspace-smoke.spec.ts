import { describe, expect, it } from "vitest";
import { launchDefaults } from "../contracts/launch-defaults";

describe("launch defaults", () => {
  it("exposes the day-one provider and bot decisions", () => {
    expect(launchDefaults.providers).toEqual(["openai", "anthropic"]);
    expect(launchDefaults.initialBots).toEqual([
      "document_wizard",
      "kb_concierge",
    ]);
    expect(launchDefaults.reportRenderer).toBe("playwright");
  });
});
