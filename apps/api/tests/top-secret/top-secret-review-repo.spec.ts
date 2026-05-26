import { describe, expect, it } from "vitest";
import { createInMemoryTopSecretReviewRepo } from "../../src/modules/top-secret/top-secret-review.repo";

describe("Top Secret review repo", () => {
  it("persists submissions and queues unmatched claims as review candidates", async () => {
    const repo = createInMemoryTopSecretReviewRepo();

    const submission = await repo.recordSubmission({
      artifactId: "artifact-1",
      claims: ["A brand new internet claim that is not in the KB."],
      findings: [
        {
          analysis: "Needs review.",
          citations: [
            {
              publisher: "Legal Information Institute",
              title: "Example source",
              url: "https://www.law.cornell.edu/uscode/text/31/5103",
            },
          ],
          claim: "A brand new internet claim that is not in the KB.",
          conclusion: "Conclusion: More review is needed.",
          verdict: "not_enough_reliable_evidence",
        },
      ],
      sessionId: "session-1",
      userId: "user-1",
    });

    expect(submission.id).toBeTruthy();
    expect(await repo.listReviewCandidates({ status: "pending" })).toEqual([
      expect.objectContaining({
        claim: "A brand new internet claim that is not in the KB.",
        matched_entry_ids: [],
        status: "pending",
        submission_id: submission.id,
      }),
    ]);
  });

  it("promotes a reviewed candidate into an approved runtime KB entry", async () => {
    const repo = createInMemoryTopSecretReviewRepo();
    await repo.recordSubmission({
      artifactId: "artifact-1",
      claims: ["Novel pattern about a special receipt."],
      findings: [
        {
          analysis: "Needs review.",
          citations: [
            {
              publisher: "Legal Information Institute",
              title: "Example source",
              url: "https://www.law.cornell.edu/uscode/text/31/5103",
            },
          ],
          claim: "Novel pattern about a special receipt.",
          conclusion: "Conclusion: More review is needed.",
          verdict: "not_enough_reliable_evidence",
        },
      ],
      sessionId: "session-1",
      userId: "user-1",
    });
    const [candidate] = await repo.listReviewCandidates({ status: "pending" });

    const approved = await repo.promoteReviewCandidate({
      candidateId: candidate.id,
      commonSenseStatement:
        "Common sense: a receipt does not prove a rule unless the source says it does.",
      requiredSourceHints: ["current statute", "current cases"],
      researchNote:
        "This reviewed pattern should compare the receipt claim against current legal sources.",
      triggerPhrases: ["special receipt"],
    });

    expect(approved).toMatchObject({
      source_candidate_id: candidate.id,
      status: "approved",
      topic: "reviewed_pattern",
      version: 1,
    });
    expect(await repo.listApprovedRuntimeEntries()).toEqual([
      expect.objectContaining({
        commonSenseStatement:
          "Common sense: a receipt does not prove a rule unless the source says it does.",
        id: approved.id,
      }),
    ]);
    expect(await repo.listReviewCandidates({ status: "approved" })).toEqual([
      expect.objectContaining({
        id: candidate.id,
        status: "approved",
      }),
    ]);
  });

  it("rejects repeat promotion of an already reviewed candidate", async () => {
    const repo = createInMemoryTopSecretReviewRepo();
    await repo.recordSubmission({
      artifactId: "artifact-1",
      claims: ["Novel pattern about a special receipt."],
      findings: [
        {
          analysis: "Needs review.",
          citations: [
            {
              publisher: "Legal Information Institute",
              title: "Example source",
              url: "https://www.law.cornell.edu/uscode/text/31/5103",
            },
          ],
          claim: "Novel pattern about a special receipt.",
          conclusion: "Conclusion: More review is needed.",
          verdict: "not_enough_reliable_evidence",
        },
      ],
      sessionId: "session-1",
      userId: "user-1",
    });
    const [candidate] = await repo.listReviewCandidates({ status: "pending" });
    const payload = {
      candidateId: candidate.id,
      commonSenseStatement:
        "Common sense: a receipt does not prove a rule unless the source says it does.",
      requiredSourceHints: ["current statute"],
      researchNote:
        "This reviewed pattern should compare receipt claims against current legal sources.",
      triggerPhrases: ["special receipt"],
    };

    await repo.promoteReviewCandidate(payload);
    await expect(repo.promoteReviewCandidate(payload)).rejects.toThrow(
      "top secret review candidate is not pending",
    );
    expect(await repo.listApprovedRuntimeEntries()).toHaveLength(1);
  });
});
