import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTopSecretService,
  doesClaimLikelyInvolveFederalStatute,
  isAuthoritativeTopSecretCitation,
  parseTopSecretClaims,
} from "../../src/modules/top-secret/top-secret.service";
import type { SessionSecret } from "../../src/modules/sessions/session.store";

const sessionSecret: SessionSecret = {
  apiKey: "sk-test",
  provider: "openai",
  sessionId: "session-1",
  userId: "user-1",
};

describe("Top Secret service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts 1 to 5 statements and how-to claims", () => {
    expect(
      parseTopSecretClaims({
        claims: [
          "Income tax is voluntary.",
          "How to verify a TreasuryDirect claim using official sources.",
        ],
      }),
    ).toEqual([
      "Income tax is voluntary.",
      "How to verify a TreasuryDirect claim using official sources.",
    ]);
  });

  it("summarizes massive pasted text before research", () => {
    const longPaste = [
      "A video says income tax is voluntary because the IRS uses the phrase voluntary compliance.",
      ...Array.from({ length: 80 }, (_, index) =>
        `Extra quoted paragraph ${index + 1} repeats background commentary that does not change the claim.`,
      ),
      "The post also mentions 26 U.S.C. § 61 and says the statute does not create a real duty.",
    ].join(" ");

    const [claim] = parseTopSecretClaims({ claims: [longPaste] });

    expect(claim.length).toBeLessThanOrEqual(900);
    expect(claim).toContain("Summary of long paste:");
    expect(claim).toContain("income tax is voluntary");
    expect(claim).toContain("26 U.S.C. § 61");
    expect(claim).not.toContain("Extra quoted paragraph 80");
  });

  it("collapses huge multi-part quote dumps into one summarized claim", () => {
    const quoteDump = Array.from({ length: 30 }, (_, index) =>
      index === 0
        ? "A forum post says statutes are not law and only court cases matter."
        : `Quoted paragraph ${index} repeats the same internet argument and adds extra filler that does not change the claim.`,
    );

    const claims = parseTopSecretClaims({ claims: quoteDump });

    expect(claims).toHaveLength(1);
    expect(claims[0]).toContain("Summary of long paste:");
    expect(claims[0]).toContain("statutes are not law");
  });

  it("rejects questions instead of fact-checking them", () => {
    expect(() =>
      parseTopSecretClaims({
        claims: ["Is income tax voluntary?"],
      }),
    ).toThrow("top secret accepts statements and how-to claims, not questions");
  });

  it("rejects more than five claims", () => {
    expect(() =>
      parseTopSecretClaims({
        claims: ["one", "two", "three", "four", "five", "six"],
      }),
    ).toThrow();
  });

  it("rejects Cursive credit-report and FCRA claims", () => {
    expect(() =>
      parseTopSecretClaims({
        claims: ["The credit bureaus must delete under 15 USC 1681i(a)(5)(A)."],
      }),
    ).toThrow(
      "top secret does not process credit-report or FCRA claims; use Cursive for that workflow",
    );
  });

  it("rejects canonical FCRA and consumer-reporting claims before Top Secret processing", () => {
    expect(() =>
      parseTopSecretClaims({
        claims: ["A consumer reporting agency must respond under 15 U.S.C. § 1681i."],
      }),
    ).toThrow(
      "top secret does not process credit-report or FCRA claims; use Cursive for that workflow",
    );
    expect(() =>
      parseTopSecretClaims({
        claims: ["My credit report has an inaccurate account that must be removed."],
      }),
    ).toThrow(
      "top secret does not process credit-report or FCRA claims; use Cursive for that workflow",
    );
  });

  it("recognizes authoritative citations and rejects public forums", () => {
    expect(
      isAuthoritativeTopSecretCitation({
        publisher: "Legal Information Institute",
        title: "26 U.S.C. Sec. 61",
        url: "https://www.law.cornell.edu/uscode/text/26/61",
      }),
    ).toBe(true);
    expect(
      isAuthoritativeTopSecretCitation({
        publisher: "Social Security Administration",
        title: "Program Operations Manual System",
        url: "https://www.ssa.gov/OP_Home/ssact/title02/0202.htm",
      }),
    ).toBe(true);
    expect(
      isAuthoritativeTopSecretCitation({
        publisher: "Forum",
        title: "Thread",
        url: "https://reddit.com/r/example/comments/1/thread",
      }),
    ).toBe(false);
  });

  it("detects federal statute claims and applies statutory analysis instructions", async () => {
    let capturedSystemPrompt = "";
    let capturedUserPayload: {
      atomicAssertionsByClaim?: string[][];
      sourceBundlesByClaim?: Array<Array<{ id: string; url: string }>>;
    } = {};
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url, init) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>Social Security Act benefits are governed by federal statutory text. 42 U.S.C. 402 addresses old-age and survivors insurance benefits and must be read with definitions and limits.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        const capturedRequest = JSON.parse(String(init?.body ?? "{}")) as {
          messages?: Array<{ role: string; content: string }>;
        };
        capturedSystemPrompt = capturedRequest.messages?.[0]?.content ?? "";
        capturedUserPayload = JSON.parse(
          capturedRequest.messages?.[1]?.content ?? "{}",
        ) as typeof capturedUserPayload;

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The claim requires reading the statute, definitions, and any implementing materials before drawing a conclusion.",
                        citations: [
                          {
                            publisher: "Social Security Administration",
                            title: "42 U.S.C. Sec. 402",
                            url: "https://www.law.cornell.edu/uscode/text/42/402",
                          },
                        ],
                        claim:
                          "The Social Security Act makes benefits unavailable under 42 U.S.C. 402.",
                        conclusion:
                          "Conclusion: The statutory text must be checked by section and subsection before relying on the claim.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The exact statutory source is retained as the starting point for Social Security Act research.",
                          },
                        ],
                        verdict: "not_enough_reliable_evidence",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    expect(
      doesClaimLikelyInvolveFederalStatute(
        "The Social Security Act makes benefits unavailable under 42 U.S.C. 402.",
      ),
    ).toBe(true);

    const findings = await service.generateFindings({
      claims: [
        "The Social Security Act makes benefits unavailable under 42 U.S.C. 402.",
      ],
      sessionSecret,
    });

    expect(findings[0].citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringContaining("uscode.house.gov/view.xhtml"),
        }),
      ]),
    );
    expect(capturedSystemPrompt).toContain("ssa.gov");
    expect(capturedSystemPrompt).toContain("Statutory construction protocol");
    expect(capturedSystemPrompt).toContain(
      "Do not punish, shame, ridicule, or stereotype",
    );
    expect(capturedSystemPrompt).toContain(
      "validate only that supported scope and explain the limits",
    );
    expect(capturedSystemPrompt).toContain(
      "title, code, section, subsection, paragraph, and subparagraph",
    );
    expect(capturedSystemPrompt).toContain(
      "Each finding must include 2 to 8 claimChecks",
    );
    expect(capturedSystemPrompt).toContain(
      "Compare the message against the exact words of that citation first.",
    );
    expect(capturedUserPayload.atomicAssertionsByClaim?.[0]).toEqual([
      "The Social Security Act makes benefits unavailable under 42 U.S.C. 402.",
    ]);
  });

  it("retains eCFR regulation sources for provider research", async () => {
    let capturedSourceUrl = "";
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url, init) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>31 CFR 363.6 appears in the Electronic Code of Federal Regulations and describes TreasuryDirect account rules with enough text for retention.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        const capturedRequest = JSON.parse(String(init?.body ?? "{}")) as {
          messages?: Array<{ content: string }>;
        };
        const userPayload = JSON.parse(
          capturedRequest.messages?.[1]?.content ?? "{}",
        ) as {
          sourceBundlesByClaim?: Array<Array<{ id: string; url: string }>>;
        };
        capturedSourceUrl =
          userPayload.sourceBundlesByClaim?.[0]?.find(
            (source) =>
              source.url === "https://www.ecfr.gov/current/title-31/section-363.6",
          )?.url ?? "";

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The claim should be checked against the retained eCFR regulation source.",
                        citations: [
                          {
                            publisher: "Electronic Code of Federal Regulations",
                            title: "31 C.F.R. Sec. 363.6",
                            url: "https://www.ecfr.gov/current/title-31/section-363.6",
                          },
                        ],
                        claim:
                          "TreasuryDirect account claims should be checked against 31 CFR 363.6.",
                        conclusion:
                          "Conclusion: The regulation source is relevant, but the broader claim still needs careful source comparison.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The eCFR source supports checking the cited TreasuryDirect account regulation.",
                          },
                        ],
                        verdict: "partially_verified",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    const findings = await service.generateFindings({
      claims: [
        "TreasuryDirect account claims should be checked against 31 CFR 363.6.",
      ],
      sessionSecret,
    });

    expect(capturedSourceUrl).toBe(
      "https://www.ecfr.gov/current/title-31/section-363.6",
    );
    expect(findings[0].sourceChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentnessStatus: "verified_current",
          publisher: "Electronic Code of Federal Regulations",
          supportNote:
            "The eCFR source supports checking the cited TreasuryDirect account regulation.",
          url: "https://www.ecfr.gov/current/title-31/section-363.6",
        }),
      ]),
    );
  });

  it("builds regulation analysis from source-detected CFR citations", async () => {
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>TreasuryDirect account rules reference 31 CFR 363.6 and this source text is long enough for the retrieval adapter to retain it.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The retained TreasuryDirect source references account rules that need legal-text review.",
                        citations: [
                          {
                            publisher: "U.S. Treasury",
                            title: "TreasuryDirect - Treasury securities overview",
                            url: "https://www.treasurydirect.gov/marketable-securities/",
                          },
                        ],
                        claim:
                          "TreasuryDirect account claims should be checked with official sources.",
                        conclusion:
                          "Conclusion: The source reference calls for checking the related regulation before relying on the claim.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The TreasuryDirect source references the account-rule regulation.",
                          },
                        ],
                        verdict: "not_enough_reliable_evidence",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    const findings = await service.generateFindings({
      claims: [
        "TreasuryDirect account claims should be checked with official sources.",
      ],
      sessionSecret,
    });

    expect(findings[0].statuteAnalyses).toEqual([
      expect.objectContaining({
        citation: "31 C.F.R. Sec. 363.6",
        currentnessStatus: "partially_verified",
      }),
    ]);
  });

  it("returns neutral stub findings without ridiculing internet-myth claims", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: ["Income tax is voluntary."],
      sessionSecret,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].claim).toBe("Income tax is voluntary.");
    expect(findings[0].verdict).toBe("misunderstood");
    expect(findings[0].analysis.toLowerCase()).not.toContain("sovereign");
    expect(findings[0].analysis.toLowerCase()).not.toContain("frivolous");
    expect(findings[0].sourceChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentnessStatus: "not_verified",
          supportNote:
            "This retained source is a starting point for research; it does not by itself validate the full pasted message.",
        }),
      ]),
    );
    expect(findings[0].citations.every(isAuthoritativeTopSecretCitation)).toBe(
      true,
    );
  });

  it("falls back per malformed provider finding instead of failing the whole report", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>TreasuryDirect explains Treasury marketable securities and source text retained for evidence review.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "This malformed finding is missing the required citations array.",
                        claim:
                          "A postage stamp signature pays postage under federal law.",
                        conclusion:
                          "So for this message, the evidence points to this conclusion: unsupported.",
                        verdict: "not_enough_reliable_evidence",
                      },
                      {
                        analysis:
                          "TreasuryDirect is an official source for Treasury securities, but it does not validate unrelated private-account claims.",
                        citations: [
                          {
                            publisher: "U.S. Treasury",
                            title: "TreasuryDirect - Treasury securities overview",
                            url: "https://www.treasurydirect.gov/marketable-securities/",
                          },
                        ],
                        claim:
                          "TreasuryDirect account claims should be checked with official sources.",
                        conclusion:
                          "So for this message, the evidence points to this conclusion: the official source can verify Treasury securities information, not every online Treasury account claim.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The retained source supports checking TreasuryDirect account claims with official Treasury material.",
                          },
                        ],
                        verdict: "partially_verified",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    const findings = await service.generateFindings({
      claims: [
        "A postage stamp signature pays postage under federal law.",
        "TreasuryDirect account claims should be checked with official sources.",
      ],
      sessionSecret,
    });

    expect(findings).toHaveLength(2);
    expect(warnSpy).toHaveBeenCalledWith(
      "top secret provider finding failed schema validation",
      expect.objectContaining({ claimIndex: 0 }),
    );
    expect(findings[0]).toMatchObject({
      analysis: "This malformed finding is missing the required citations array.",
      verdict: "not_enough_reliable_evidence",
    });
    expect(findings[1]).toMatchObject({
      claim:
        "TreasuryDirect account claims should be checked with official sources.",
      verdict: "partially_verified",
    });
  });

  it("salvages useful provider analysis when only nested finding fields are malformed", async () => {
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>16 CFR 436.5 covers franchise disclosures. The retained legal text says franchisors must give a disclosure document with specific required items before a sale. This source text is long enough for retention.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "Body: The pasted message is directionally pointing to a real franchise disclosure rule, but it still needs the actual regulation text checked item by item before treating all twenty-three claimed items as proven.",
                        claimChecks: [
                          {
                            assertion:
                              "16 CFR 436.5 is a real franchise disclosure rule.",
                            explanation:
                              "The retained regulation source does cover franchise disclosure requirements before a sale.",
                            status: "supported",
                          },
                          {
                            assertion:
                              "All twenty-three claimed items are proven by the pasted message alone.",
                            explanation:
                              "The retained source still has to be checked item by item before treating the whole list as established.",
                            status: "overstated",
                          },
                        ],
                        citations: [
                          {
                            title: 23,
                            url: null,
                            publisher: false,
                          },
                        ],
                        claim:
                          "16 CFR 436.5 requires 23 specific disclosure items for franchise purchasers.",
                        conclusion:
                          "Conclusion: So for this message, the evidence points to this conclusion: the regulation should be read directly to confirm whether the claimed twenty-three items appear there and in what scope.",
                        supportReferences: ["source-1"],
                        statuteAnalyses: ["broken"],
                        verdict: "partially_verified",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    const [finding] = await service.generateFindings({
      claims: [
        "16 CFR 436.5 requires 23 specific disclosure items for franchise purchasers.",
      ],
      sessionSecret,
    });

    expect(finding.analysis).toContain(
      "directionally pointing to a real franchise disclosure rule",
    );
    expect(finding.analysis).not.toContain("Body:");
    expect(finding.analysis).not.toContain(
      "provider response did not keep the required report structure",
    );
    expect(finding.conclusion).not.toContain("Conclusion:");
    expect(finding.verdict).toBe("partially_verified");
    expect(finding.claimChecks).toEqual([
      expect.objectContaining({
        assertion: "16 CFR 436.5 is a real franchise disclosure rule.",
        status: "supported",
      }),
      expect.objectContaining({
        assertion: "All twenty-three claimed items are proven by the pasted message alone.",
        status: "overstated",
      }),
    ]);
    expect(finding.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringContaining("ecfr.gov/current/title-16"),
        }),
      ]),
    );
    expect(finding.statuteAnalyses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          citation: "16 C.F.R. Sec. 436.5",
        }),
      ]),
    );
  });

  it("keeps retrieval focused on the cited statute when the message names a specific federal citation", async () => {
    let capturedUrls: string[] = [];
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url, init) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>22 U.S.C. 2715c is a federal statute and this retained text is long enough for runtime analysis.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        const capturedRequest = JSON.parse(String(init?.body ?? "{}")) as {
          messages?: Array<{ content: string }>;
        };
        const userPayload = JSON.parse(
          capturedRequest.messages?.[1]?.content ?? "{}",
        ) as {
          sourceBundlesByClaim?: Array<Array<{ url: string }>>;
        };
        capturedUrls =
          userPayload.sourceBundlesByClaim?.[0]?.map((source) => source.url) ?? [];

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The cited statute should be read directly before adding broader agency theories to the message.",
                        citations: [
                          {
                            publisher: "Office of the Law Revision Counsel",
                            title: "22 U.S.C. Sec. 2715c - Official current U.S. Code",
                            url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title22-section2715c&num=0&edition=prelim",
                          },
                        ],
                        claim:
                          "22 U.S.C. Sec. 2715c proves a broader Treasury and SSA theory.",
                        conclusion:
                          "The statute text should be checked first before adding claims about other agencies.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The official statute text is the primary source for this claim.",
                          },
                        ],
                        verdict: "not_enough_reliable_evidence",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    await service.generateFindings({
      claims: ["22 U.S.C. Sec. 2715c proves a broader Treasury and SSA theory."],
      sessionSecret,
    });

    expect(capturedUrls).toEqual(
      expect.arrayContaining([
        expect.stringContaining("uscode.house.gov/view.xhtml"),
        "https://www.law.cornell.edu/uscode/text/22/2715c",
      ]),
    );
    expect(capturedUrls).not.toEqual(
      expect.arrayContaining([
        "https://www.treasurydirect.gov/marketable-securities/",
        "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
      ]),
    );
  });

  it("retrieves cited CFR parts instead of falling back to unrelated default sources", async () => {
    let capturedUrls: string[] = [];
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url, init) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>Part 436 regulates franchise disclosure duties and this source text is long enough for retention.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        const capturedRequest = JSON.parse(String(init?.body ?? "{}")) as {
          messages?: Array<{ content: string }>;
        };
        const userPayload = JSON.parse(
          capturedRequest.messages?.[1]?.content ?? "{}",
        ) as {
          sourceBundlesByClaim?: Array<Array<{ url: string }>>;
        };
        capturedUrls =
          userPayload.sourceBundlesByClaim?.[0]?.map((source) => source.url) ?? [];

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The cited FTC franchise regulation should be checked from the retained CFR part text before adding broader theories.",
                        citations: [
                          {
                            publisher: "Electronic Code of Federal Regulations",
                            title: "16 C.F.R. Part 436",
                            url: "https://www.ecfr.gov/current/title-16/part-436",
                          },
                        ],
                        claim:
                          "16 CFR Parts 436 and 437 prove a broader franchise-law theory.",
                        conclusion:
                          "The cited CFR part text should be checked directly before the larger message is accepted.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The retained eCFR part text is the proper starting point for this message.",
                          },
                        ],
                        verdict: "not_enough_reliable_evidence",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    await service.generateFindings({
      claims: ["16 CFR Parts 436 and 437 prove a broader franchise-law theory."],
      sessionSecret,
    });

    expect(capturedUrls).toEqual(
      expect.arrayContaining([
        "https://www.ecfr.gov/current/title-16/part-436",
        "https://www.ecfr.gov/current/title-16/part-437",
      ]),
    );
    expect(capturedUrls).not.toEqual(
      expect.arrayContaining([
        "https://www.law.cornell.edu/uscode/text/26/61",
        "https://www.irs.gov/publications/p17",
        "https://www.treasurydirect.gov/marketable-securities/",
        "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
      ]),
    );
  });

  it("keeps explicit citation placeholders instead of unrelated defaults when retrieval fails", async () => {
    let capturedUrls: string[] = [];
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url, init) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response("missing", { status: 404 });
        }

        const capturedRequest = JSON.parse(String(init?.body ?? "{}")) as {
          messages?: Array<{ content: string }>;
        };
        const userPayload = JSON.parse(
          capturedRequest.messages?.[1]?.content ?? "{}",
        ) as {
          sourceBundlesByClaim?: Array<Array<{ title: string; url: string; retrievedText: string }>>;
        };
        const sources = userPayload.sourceBundlesByClaim?.[0] ?? [];
        capturedUrls = sources.map((source) => source.url);
        expect(sources[0]?.retrievedText).toContain(
          "Runtime retrieval could not fetch the governing source text",
        );

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The cited CFR part could not be retrieved during this run, so the claim cannot be confirmed from unrelated sources.",
                        citations: [
                          {
                            publisher: "Electronic Code of Federal Regulations",
                            title: "16 C.F.R. Part 436",
                            url: "https://www.ecfr.gov/current/title-16/part-436",
                          },
                        ],
                        claim:
                          "16 CFR Parts 436 and 437 prove a broader franchise-law theory.",
                        conclusion:
                          "Without the governing CFR part text, the larger message cannot be verified here.",
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "This placeholder keeps the review anchored to the cited regulation instead of unrelated defaults.",
                          },
                        ],
                        verdict: "not_enough_reliable_evidence",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    await service.generateFindings({
      claims: ["16 CFR Parts 436 and 437 prove a broader franchise-law theory."],
      sessionSecret,
    });

    expect(capturedUrls).toEqual([
      "https://www.ecfr.gov/current/title-16/part-436",
      "https://www.ecfr.gov/current/title-16/part-437",
    ]);
  });

  it("adds historical authority notes for secondary legal sources", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: [
        "Black's Law Dictionary defines income using an old case, so the current tax statute does not apply.",
      ],
      sessionSecret,
    });

    expect(findings[0].historicalAuthorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          authorityType: "dictionary",
          citationOrTitle: "Black's Law Dictionary",
          currentApplicationStatus: "controlling_not_verified",
          reportNote: expect.stringContaining(
            "does not by itself establish the controlling rule",
          ),
        }),
      ]),
    );
  });

  it("marks historical authorities as superseded when retained sources show later treatment", async () => {
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url) => {
        if (String(url).includes("api.openai.com")) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      findings: [
                        {
                          analysis:
                            "The retained sources say the old rule was superseded.",
                          citations: [
                            {
                              publisher: "CourtListener",
                              title: "CourtListener case search",
                              url: "https://www.courtlistener.com/?q=old&type=o",
                            },
                          ],
                          claim:
                            "Black's Law Dictionary cites an old case about 31 USC 5103, so the current statute does not apply.",
                          conclusion:
                            "Conclusion: The old authority needs current treatment review.",
                          supportReferences: [
                            {
                              sourceId: "source-1",
                              supports:
                                "The retained source contains superseded treatment language.",
                            },
                          ],
                          verdict: "misunderstood",
                        },
                      ],
                    }),
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(
          `<html><body>${String(url)} Black's Law Dictionary cites an old case. Later current authority says the old rule was superseded and replaced by statute. This source text is long enough for retention.</body></html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        );
      },
    });
    const findings = await service.generateFindings({
      claims: [
        "Black's Law Dictionary cites an old case about 31 USC 5103, so the current statute does not apply.",
      ],
      sessionSecret,
    });

    expect(findings[0].historicalAuthorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentApplicationStatus: "superseded_or_replaced",
        }),
      ]),
    );
  });

  it("does not treat CourtListener search leads as current historical authority treatment", async () => {
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url) => {
        if (String(url).includes("api.openai.com")) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      findings: [
                        {
                          analysis:
                            "The retained source is only a case-search lead, not verified treatment.",
                          citations: [
                            {
                              publisher: "CourtListener",
                              title: "CourtListener case search",
                              url: "https://www.courtlistener.com/?q=old&type=o",
                            },
                          ],
                          claim:
                            "Black's Law Dictionary cites an old case, so the current statute does not apply.",
                          conclusion:
                            "Conclusion: The old authority needs current treatment review.",
                          supportReferences: [
                            {
                              sourceId: "source-1",
                              supports: "The retained source is only a search page.",
                            },
                          ],
                          verdict: "not_enough_reliable_evidence",
                        },
                      ],
                    }),
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        }

        return new Response(
          `<html><body>${String(url)} CourtListener search results for Black's Law Dictionary and old cases. This page says superseded in a search snippet, but it is a lead only and does not verify current treatment.</body></html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        );
      },
    });
    const findings = await service.generateFindings({
      claims: [
        "Black's Law Dictionary cites an old case, so the current statute does not apply.",
      ],
      sessionSecret,
    });

    expect(findings[0].historicalAuthorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentApplicationStatus: "controlling_not_verified",
        }),
      ]),
    );
  });

  it("adds neutral research framing for common misunderstood legal-financial claims", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: [
        "The right to travel means no license or plates are required in private capacity.",
        "Statutes are not law and have no force.",
        "The all caps name is a secret corporate fiction.",
        "All debts were prepaid by HJR 192 and Public Law 73-10.",
        "Income taxes are voluntary because the IRS says voluntary compliance.",
      ],
      sessionSecret,
    });

    expect(findings.flatMap((finding) => finding.researchContextNotes ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ topic: "right_to_travel" }),
        expect.objectContaining({ topic: "statutes_as_law" }),
        expect.objectContaining({ topic: "all_caps_name" }),
        expect.objectContaining({ topic: "hj343_public_law_73_10" }),
        expect.objectContaining({ topic: "prepaid_debt" }),
        expect.objectContaining({
          note: expect.stringContaining("voluntary participation"),
          topic: "income_tax_voluntary_compliance",
        }),
      ]),
    );
  });

  it("adds money framing for Federal Reserve note and Congress money claims", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: [
        "There is no such thing as real money. Only Congress can create money, not the Federal Reserve.",
      ],
      sessionSecret,
    });

    expect(findings[0].researchContextNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: expect.stringContaining("coin money"),
          topic: "money_federal_reserve_notes",
        }),
      ]),
    );
    expect(findings[0].researchContextNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: expect.stringContaining("Federal Reserve notes"),
          topic: "money_federal_reserve_notes",
        }),
      ]),
    );
  });

  it("adds agreement-based framing for debt-paid-with-debt claims", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: [
        "A court case says you cannot pay a debt with a debt, so Federal Reserve notes cannot satisfy wages or bills.",
      ],
      sessionSecret,
    });

    expect(findings[0].researchContextNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: expect.stringContaining("agreed"),
          topic: "debt_paid_with_debt",
        }),
      ]),
    );
    expect(findings[0].researchContextNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: expect.stringContaining("Federal Reserve notes"),
          topic: "debt_paid_with_debt",
        }),
      ]),
    );
  });

  it("adds point-by-point summaries for tax-form Treasury credit claims", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: [
        "Our signatures create instruments that are securitized; the 1041 V negated combined with the 1099 creates a credit. Every application goes to the Treasury.",
      ],
      sessionSecret,
    });

    expect(findings[0].claimComponents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "1041-V",
          summary: expect.stringContaining("payment voucher"),
        }),
        expect.objectContaining({
          label: "1099",
          summary: expect.stringContaining("information return"),
        }),
        expect.objectContaining({
          label: "Signature as an instrument",
          summary: expect.stringContaining("does not automatically"),
        }),
        expect.objectContaining({
          label: "Securitization",
          summary: expect.stringContaining("does not mean every signer"),
        }),
        expect.objectContaining({
          label: "Company goes to the Treasury",
          summary: expect.stringContaining("not the same as proving"),
        }),
        expect.objectContaining({
          label: "Application-created credit",
          summary: expect.stringContaining("decide whether to extend credit"),
        }),
      ]),
    );
    expect(findings[0].commonSenseStatement).toContain(
      "If a form or signature really created a Treasury credit",
    );
    expect(findings[0].analysis).toContain("research conjecture");
    expect(findings[0].analysis).toContain("tax forms");
    expect(findings[0].analysis).toContain("credit creation");
  });

  it("adds a plain common-sense statement to each finding", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: [
        "A court case says you cannot pay a debt with a debt, so Federal Reserve notes cannot satisfy wages or bills.",
        "Income taxes are voluntary because the IRS says voluntary compliance.",
      ],
      sessionSecret,
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commonSenseStatement: expect.stringContaining("paycheck"),
        }),
        expect.objectContaining({
          commonSenseStatement: expect.stringContaining("Read the source"),
        }),
      ]),
    );
    expect(
      findings.map((finding) => finding.commonSenseStatement).join("\n"),
    ).not.toContain("Common sense:");
  });

  it("attaches statute analyses to findings that cite federal statutes", async () => {
    const service = createTopSecretService({ mode: "stub" });
    const findings = await service.generateFindings({
      claims: ["Benefits are discussed under 42 USC 402(a)."],
      sessionSecret,
    });

    expect(findings[0].statuteAnalyses).toEqual([
      expect.objectContaining({
        citation: "42 U.S.C. Sec. 402(a)",
        pastedMessage: "Benefits are discussed under 42 USC 402(a).",
      }),
    ]);
  });

  it("attaches statute analyses when the researcher discovers a statute not present in the pasted message", async () => {
    const service = createTopSecretService({
      mode: "live",
      fetch: async (url) => {
        if (!String(url).includes("api.openai.com")) {
          return new Response(
            "<html><body>The Social Security Act source discusses 42 U.S.C. 402. The section addresses old-age and survivors insurance benefits and must be read with definitions and limits.</body></html>",
            {
              status: 200,
              headers: { "content-type": "text/html" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    findings: [
                      {
                        analysis:
                          "The research points to the Social Security Act benefits provision.",
                        citations: [
                          {
                            publisher: "Social Security Administration",
                            title:
                              "Social Security Act",
                            url: "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
                          },
                        ],
                        claim:
                          "A person can claim Social Security benefits without checking eligibility rules.",
                        conclusion:
                          "Conclusion: The claim may be directionally correct but must be read against the statutory conditions.",
                        discoveredStatuteCitations: [
                          "42 U.S.C. Sec. 402(a)",
                        ],
                        supportReferences: [
                          {
                            sourceId: "source-1",
                            supports:
                              "The Social Security Act source supports researching the benefits eligibility condition.",
                          },
                        ],
                        verdict: "misunderstood",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    const findings = await service.generateFindings({
      claims: [
        "A person can claim Social Security benefits without checking eligibility rules.",
      ],
      sessionSecret,
    });

    expect(findings[0].statuteAnalyses).toEqual([
      expect.objectContaining({
        citation: "42 U.S.C. Sec. 402(a)",
        pastedMessage:
          "A person can claim Social Security benefits without checking eligibility rules.",
      }),
    ]);
    expect(findings[0].sourceChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentnessStatus: "partially_verified",
          supportNote:
            "The Social Security Act source supports researching the benefits eligibility condition.",
          url: "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
        }),
      ]),
    );
  });
});
