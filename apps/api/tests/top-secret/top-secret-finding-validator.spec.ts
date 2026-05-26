import { describe, expect, it } from "vitest";
import { validateTopSecretFindingAgainstSources } from "../../src/modules/top-secret/top-secret-finding-validator.service";
import { createTopSecretStubSourceBundles } from "../../src/modules/top-secret/top-secret-researcher.service";
import type { TopSecretFinding } from "../../../../packages/shared/src/contracts/top-secret";

const sources = createTopSecretStubSourceBundles();

function validFinding(overrides?: Partial<TopSecretFinding>): TopSecretFinding {
  return {
    analysis:
      "The retained source supports a narrow point, but the full message needs careful comparison.",
    citations: [
      {
        publisher: sources[0].publisher,
        title: sources[0].title,
        url: sources[0].url,
      },
    ],
    claim: "Income tax is voluntary.",
    conclusion:
      "Conclusion: The message is misunderstood when compared to the retained source.",
    supportReferences: [
      {
        sourceId: sources[0].id,
        supports: "This source supports checking the broad statutory definition.",
      },
    ],
    verdict: "misunderstood",
    ...overrides,
  };
}

describe("Top Secret finding validator", () => {
  it("accepts evidence-bound findings that cite only retained sources", () => {
    const finding = validFinding();

    expect(
      validateTopSecretFindingAgainstSources({
        claim: finding.claim,
        finding,
        sources,
      }),
    ).toEqual(finding);
  });

  it("fails closed when support references are missing", () => {
    const result = validateTopSecretFindingAgainstSources({
      claim: "Income tax is voluntary.",
      finding: validFinding({ supportReferences: [] }),
      sources,
    });

    expect(result.verdict).toBe("not_enough_reliable_evidence");
    expect(result.analysis).toContain("did not include source support references");
    expect(result.analysis).not.toContain("Top Secret could");
    expect(result.conclusion).toContain(
      "So for this message, the evidence points to this conclusion",
    );
    expect(result.conclusion).not.toContain("Conclusion:");
  });

  it("fails closed when the model invents a citation URL", () => {
    const result = validateTopSecretFindingAgainstSources({
      claim: "Income tax is voluntary.",
      finding: validFinding({
        citations: [
          {
            publisher: "Invented Source",
            title: "Invented case",
            url: "https://example.com/invented",
          },
        ],
      }),
      sources,
    });

    expect(result.verdict).toBe("not_enough_reliable_evidence");
    expect(result.analysis).toContain("cited a URL outside the evidence bundle");
  });

  it("fails closed when support references do not match the cited source", () => {
    const result = validateTopSecretFindingAgainstSources({
      claim: "Income tax is voluntary.",
      finding: validFinding({
        citations: [
          {
            publisher: sources[1].publisher,
            title: sources[1].title,
            url: sources[1].url,
          },
        ],
        supportReferences: [
          {
            sourceId: sources[0].id,
            supports: "This support note points at a different retained source.",
          },
        ],
      }),
      sources,
    });

    expect(result.verdict).toBe("not_enough_reliable_evidence");
    expect(result.analysis).toContain(
      "attached support to a source that was not cited",
    );
  });

  it("fails closed on people-pleasing language without support", () => {
    const result = validateTopSecretFindingAgainstSources({
      claim: "Income tax is voluntary.",
      finding: validFinding({
        analysis: "You are right, this interpretation is valid.",
        verdict: "true",
      }),
      sources,
    });

    expect(result.verdict).toBe("not_enough_reliable_evidence");
    expect(result.analysis).toContain("agreement language");
  });

  it("fails closed on unsupported certainty language", () => {
    const result = validateTopSecretFindingAgainstSources({
      claim: "The bureau must delete every disputed item immediately.",
      finding: validFinding({
        analysis: "The bureau must always delete every disputed item immediately.",
        claim: "The bureau must delete every disputed item immediately.",
        verdict: "true",
      }),
      sources,
    });

    expect(result.verdict).toBe("not_enough_reliable_evidence");
    expect(result.analysis).toContain("unsupported certainty language");
  });
});
