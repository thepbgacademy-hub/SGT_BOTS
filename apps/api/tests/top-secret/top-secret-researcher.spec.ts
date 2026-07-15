import { describe, expect, it, vi } from "vitest";
import {
  buildTopSecretCandidateSourceDescriptors,
  extractTopSecretSourceText,
  isAuthoritativeTopSecretSourceUrl,
  retrieveTopSecretSourceBundles,
} from "../../src/modules/top-secret/top-secret-researcher.service";

describe("Top Secret researcher", () => {
  it("builds authoritative candidate URLs from federal statute citations", () => {
    expect(
      buildTopSecretCandidateSourceDescriptors(
        "Benefits are discussed under 42 USC 402(a).",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publisher: "Office of the Law Revision Counsel",
          title: "42 U.S.C. Sec. 402(a) - Official current U.S. Code",
          url: expect.stringContaining("uscode.house.gov/view.xhtml"),
        }),
        expect.objectContaining({
          title: "42 U.S.C. Sec. 402(a)",
          url: "https://www.law.cornell.edu/uscode/text/42/402",
        }),
      ]),
    );
  });

  it("builds authoritative eCFR candidate URLs from CFR citations", () => {
    expect(
      buildTopSecretCandidateSourceDescriptors(
        "TreasuryDirect account claims should be checked against 31 CFR 363.6.",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publisher: "Electronic Code of Federal Regulations",
          sourceType: "regulation",
          title: "31 C.F.R. Sec. 363.6",
          url: "https://www.ecfr.gov/current/title-31/section-363.6",
        }),
      ]),
    );
  });

  it("does not build Cursive credit-report or FCRA candidates", () => {
    expect(
      buildTopSecretCandidateSourceDescriptors(
        "The credit bureaus must delete under 15 USC 1681i(a)(5)(A).",
      ),
    ).toEqual([]);
  });

  it("builds legal tender and coinage-power candidates for real-money claims", () => {
    expect(
      buildTopSecretCandidateSourceDescriptors(
        "There is no such thing as real money. Only Congress can create money, not the Federal Reserve.",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publisher: "Congress.gov",
          title: "U.S. Constitution Article I, Section 8 - Coinage power",
          url: "https://constitution.congress.gov/constitution/article-1/",
        }),
        expect.objectContaining({
          publisher: "Legal Information Institute",
          sourceType: "statute",
          title: "31 U.S.C. Sec. 5103 - Legal tender",
          url: "https://www.law.cornell.edu/uscode/text/31/5103",
        }),
        expect.objectContaining({
          publisher: "Federal Reserve Board",
          title: "Federal Reserve - Legal tender",
          url: "https://www.federalreserve.gov/frrs/statutes/legal-tender.htm",
        }),
      ]),
    );
  });

  it("builds IRS candidates for 1041-V and 1099 credit-theory claims", () => {
    expect(
      buildTopSecretCandidateSourceDescriptors(
        "The 1041 V negated combined with the 1099 creates a credit.",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publisher: "Internal Revenue Service",
          title: "About Form 1041-V, Payment Voucher",
          url: "https://www.irs.gov/forms-pubs/about-form-1041-v",
        }),
        expect.objectContaining({
          publisher: "Internal Revenue Service",
          title:
            "About Publication 1099, General Instructions for Certain Information Returns",
          url: "https://www.irs.gov/forms-pubs/about-form-1099",
        }),
      ]),
    );
  });

  it("accepts only authoritative source URLs", () => {
    expect(
      isAuthoritativeTopSecretSourceUrl(
        "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
      ),
    ).toBe(true);
    expect(
      isAuthoritativeTopSecretSourceUrl(
        "https://www.federalreserve.gov/frrs/statutes/legal-tender.htm",
      ),
    ).toBe(true);
    expect(
      isAuthoritativeTopSecretSourceUrl(
        "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section5103",
      ),
    ).toBe(true);
    expect(isAuthoritativeTopSecretSourceUrl("https://reddit.com/r/example")).toBe(
      false,
    );
  });

  it("extracts compact source text from HTML", () => {
    expect(
      extractTopSecretSourceText(
        "<html><style>.x{}</style><script>alert(1)</script><body>Gross&nbsp;income &amp; deductions</body></html>",
      ),
    ).toBe("Gross income & deductions");
  });

  it("retrieves live authoritative bundles and marks them partially verified", async () => {
    const bundles = await retrieveTopSecretSourceBundles({
      claim: "Income tax is voluntary under 26 USC 61.",
      mode: "live",
      fetchImpl: async (url) => {
        if (String(url).includes("uscode.house.gov")) {
          return new Response("not retained", { status: 404 });
        }

        return (
        new Response(
          `<html><body>${String(url)} 26 U.S.C. 61 defines gross income and this official page has enough text for a source bundle to be retained by the runtime retrieval adapter.</body></html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        )
        );
      },
    });

    expect(bundles[0]).toMatchObject({
      currentnessStatus: "partially_verified",
      publisher: "Legal Information Institute",
      sourceType: "statute",
      url: "https://www.law.cornell.edu/uscode/text/26/61",
    });
    expect(bundles[0].detectedCitations).toContain("26 U.S.C. Sec. 61");
  });

  it("marks official current sources as verified current", async () => {
    const bundles = await retrieveTopSecretSourceBundles({
      claim: "TreasuryDirect account claims should be checked against 31 CFR 363.6.",
      mode: "live",
      fetchImpl: async (url) =>
        new Response(
          `<html><body>${String(url)} 31 CFR 363.6 appears in a current official source and this source text is long enough for retention by the retrieval adapter.</body></html>`,
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        ),
    });

    expect(bundles[0]).toMatchObject({
      currentnessStatus: "verified_current",
      publisher: "Electronic Code of Federal Regulations",
      url: "https://www.ecfr.gov/current/title-31/section-363.6",
    });
  });

  it("builds court and historical follow-up candidates without losing direct statutes", () => {
    const candidates = buildTopSecretCandidateSourceDescriptors(
      "Black's Law Dictionary cites an old Supreme Court case, and the claim mentions 26 USC 61.",
    );

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publisher: "Office of the Law Revision Counsel",
          sourceType: "statute",
        }),
        expect.objectContaining({
          publisher: "Legal Information Institute",
          url: "https://www.law.cornell.edu/uscode/text/26/61",
        }),
        expect.objectContaining({
          publisher: "CourtListener",
          sourceType: "court_case",
          url: expect.stringContaining("courtlistener.com"),
        }),
      ]),
    );
  });

  it("detects CFR citations inside retrieved source text", async () => {
    const bundles = await retrieveTopSecretSourceBundles({
      claim: "TreasuryDirect account claims should be checked with official sources.",
      mode: "live",
      fetchImpl: async () =>
        new Response(
          "<html><body>TreasuryDirect account rules reference 31 CFR 363.6 and this source text is long enough for the retrieval adapter to retain it.</body></html>",
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        ),
    });

    expect(bundles[0].detectedCitations).toContain("31 C.F.R. Sec. 363.6");
  });

  it("detects CFR citations written with a section sign", async () => {
    const bundles = await retrieveTopSecretSourceBundles({
      claim: "TreasuryDirect account claims should be checked with 31 CFR § 363.6.",
      mode: "live",
      fetchImpl: async () =>
        new Response(
          "<html><body>Official regulation text retained for section-sign citation coverage.</body></html>",
          {
            status: 200,
            headers: { "content-type": "text/html" },
          },
        ),
    });

    expect(bundles[0].detectedCitations).toContain("31 C.F.R. Sec. 363.6");
  });

  it("falls back to stub sources when live retrieval cannot retain a source", async () => {
    const bundles = await retrieveTopSecretSourceBundles({
      claim: "TreasuryDirect accounts can discharge every debt.",
      mode: "live",
      fetchImpl: async () => new Response("not found", { status: 404 }),
    });

    expect(bundles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentnessStatus: "not_verified",
          url: "https://www.treasurydirect.gov/marketable-securities/",
        }),
      ]),
    );
  });

  it("does not call an official-current fallback verified", async () => {
    const bundles = await retrieveTopSecretSourceBundles({
      claim: "TreasuryDirect account claims should be checked against 31 CFR 363.6.",
      mode: "live",
      fetchImpl: async () => new Response("not found", { status: 404 }),
    });

    expect(bundles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentnessStatus: "not_verified",
          url: "https://www.ecfr.gov/current/title-31/section-363.6",
        }),
      ]),
    );
  });

  it("does not treat Social Security as a Treasury securities claim", () => {
    expect(
      buildTopSecretCandidateSourceDescriptors(
        "A person can claim Social Security benefits without checking eligibility rules.",
      ),
    ).toEqual([
      expect.objectContaining({
        title: "Social Security Act",
        url: "https://www.ssa.gov/OP_Home/ssact/ssact.htm",
      }),
    ]);
  });

  it("aborts slow source retrieval and falls back instead of stalling reports", async () => {
    vi.useFakeTimers();

    try {
      const retrieval = retrieveTopSecretSourceBundles({
        claim: "Claim under 26 USC 61.",
        mode: "live",
        timeoutMs: 5,
        fetchImpl: async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new Error("aborted"));
            });
          }),
      });

      await vi.advanceTimersByTimeAsync(5);

      const bundles = await retrieval;

      expect(bundles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            currentnessStatus: "not_verified",
            url: "https://www.law.cornell.edu/uscode/text/26/61",
          }),
        ]),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
