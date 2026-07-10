import { describe, expect, it } from "vitest";
import { buildInsightTutorReply } from "../../src/modules/chat/insight-tutor";

describe("Insight approved-source tutoring", () => {
  it("explains approved Academy lesson material with citations", () => {
    const reply = buildInsightTutorReply("Explain Missions like I'm new.");

    expect(reply.boundaryType).toBeUndefined();
    expect(reply.output).toContain("Missions");
    expect(reply.output).toContain("structured learning");
    expect(reply.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Insight Approved Academy Lessons",
        }),
      ]),
    );
  });

  it("simplifies the same approved facts without adding unsupported examples", () => {
    const reply = buildInsightTutorReply("Say Missions in simpler words.");

    expect(reply.boundaryType).toBeUndefined();
    expect(reply.output).toContain("In simpler words");
    expect(reply.output).toContain("Missions");
    expect(reply.output).not.toMatch(/\bfor example\b/i);
  });

  it("asks a quiz question from approved lesson material", () => {
    const reply = buildInsightTutorReply("Quiz me on Academy credits.");

    expect(reply.boundaryType).toBeUndefined();
    expect(reply.output).toContain("Quick check");
    expect(reply.output).toContain("PBG credits");
  });

  it("refuses made-up examples and offers a source-supported alternative", () => {
    const reply = buildInsightTutorReply("Give me a made-up example not found in the lesson.");

    expect(reply.boundaryType).toBe("off_topic");
    expect(reply.output).toContain("I can't make up examples");
    expect(reply.output).toContain("approved Academy lesson");
  });

  it("refuses source-bypass tutoring requests even when the topic is approved", () => {
    const reply = buildInsightTutorReply("Explain Missions from memory only.");

    expect(reply.boundaryType).toBe("off_topic");
    expect(reply.output).toContain("approved Academy lessons");
    expect(reply.output).toContain("without approved sources");
  });

  it("stays inside approved lesson scope for unrelated tutoring requests", () => {
    const reply = buildInsightTutorReply("Teach me photosynthesis.");

    expect(reply.boundaryType).toBe("off_topic");
    expect(reply.output).toContain("approved Academy lessons");
    expect(reply.output).not.toContain("chlorophyll");
  });

  it("does not treat generic learning words as approved lesson matches", () => {
    const reply = buildInsightTutorReply("Can you help me learn algebra?");

    expect(reply.boundaryType).toBe("off_topic");
    expect(reply.output).toContain("approved Academy lessons");
    expect(reply.output).not.toContain("structured learning");
  });
});
