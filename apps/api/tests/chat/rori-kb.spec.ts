import { describe, expect, it } from "vitest";
import {
  buildGroundedRoriReply,
  buildRoriConversationContext,
} from "../../src/modules/chat/rori-kb";

describe("Rori grounded replies", () => {
  it('routes "how do I join?" to enrollment instead of off-topic', () => {
    const reply = buildGroundedRoriReply("how do i join?");

    expect(reply.boundaryType).toBeUndefined();
    expect(reply.output).toContain("PBG Academy enrollment");
  });

  it('routes "how do I join the academy?" to enrollment instead of off-topic', () => {
    const reply = buildGroundedRoriReply("how do i join the academy?");

    expect(reply.boundaryType).toBeUndefined();
    expect(reply.output).toContain("PBG Academy enrollment");
  });

  it("keeps enrollment follow-ups in the enrollment lane", () => {
    const context = buildRoriConversationContext(["How do I enroll?"]);
    const reply = buildGroundedRoriReply("and then what?", {
      conversationContext: context,
    });

    expect(reply.boundaryType).toBeUndefined();
    expect(reply.output).toContain("After you enroll");
  });
});
