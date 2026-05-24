import { describe, expect, it } from "vitest";
import {
  buildTopSecretStatuteAnalyses,
  extractFederalStatuteCitations,
} from "../../src/modules/top-secret/top-secret-statute-analysis.service";
import type { TopSecretSourceBundle } from "../../../../packages/shared/src/contracts/top-secret";

describe("Top Secret statute analysis", () => {
  it("extracts federal statute citations from pasted messages", () => {
    expect(
      extractFederalStatuteCitations(
        "Benefits are discussed under 42 USC 402(a).",
      ),
    ).toEqual([
      expect.objectContaining({
        citation: "42 U.S.C. Sec. 402(a)",
        section: "402(a)",
        title: "42",
      }),
    ]);
  });

  it("extracts CFR citations that use the section symbol", () => {
    const analyses = buildTopSecretStatuteAnalyses({
      message: "TreasuryDirect claims should be checked under 31 C.F.R. § 363.6.",
    });

    expect(analyses).toEqual([
      expect.objectContaining({
        citation: "31 C.F.R. Sec. 363.6",
      }),
    ]);
  });

  it("builds a strict plain-English statute reading tied to the pasted message", () => {
    const message =
      "Benefits are discussed under 42 USC 402(a).";
    const analyses = buildTopSecretStatuteAnalyses({ message });

    expect(analyses).toHaveLength(1);
    expect(analyses[0]).toMatchObject({
      citation: "42 U.S.C. Sec. 402(a)",
      currentnessStatus: "not_verified",
      pastedMessage: message,
    });
    expect(analyses[0].plainEnglishSummary).toContain(
      "title 42, section 402, subsection (a)",
    );
    expect(analyses[0].whyMessageMayBeMisunderstood).toContain(message);
    expect(analyses[0].whyMessageMayBeMisunderstood).not.toContain(
      "Top Secret should",
    );
    expect(analyses[0].readingChecklist).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Confirm the current codified text"),
        expect.stringContaining("Parse operator words"),
        expect.stringContaining("Follow cross-references"),
      ]),
    );
    expect(analyses[0].currentnessVerification).toMatchObject({
      jurisdiction: "United States federal law",
      officialSourceChecked: "Not checked by runtime retrieval yet.",
      verificationStatus: "not_verified",
    });
    expect(analyses[0].legalHierarchy).toEqual(
      expect.arrayContaining([expect.stringContaining("Statute")]),
    );
    expect(analyses[0].regulatoryEcosystem).toEqual(
      expect.arrayContaining([expect.stringContaining("agency")]),
    );
    expect(analyses[0].operatorWordsToParse).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Shall means mandatory"),
        expect.stringContaining("May means permissive"),
      ]),
    );
    expect(analyses[0].canonsApplied).toEqual(
      expect.arrayContaining([expect.stringContaining("Whole-act rule")]),
    );
    expect(analyses[0].verificationPath).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Find the official or authoritative codified text"),
      ]),
    );
  });

  it("builds statute readings from researcher-discovered citations even when the pasted message has none", () => {
    const message = "A person can claim Social Security benefits without checking eligibility rules.";
    const analyses = buildTopSecretStatuteAnalyses({
      discoveredCitations: ["42 U.S.C. Sec. 402(a)"],
      message,
    });

    expect(analyses).toHaveLength(1);
    expect(analyses[0]).toMatchObject({
      citation: "42 U.S.C. Sec. 402(a)",
      pastedMessage: message,
    });
    expect(analyses[0].whyMessageMayBeMisunderstood).toContain(message);
  });

  it("records partial currentness when runtime retrieval checked an authoritative source", () => {
    const sourceBundles: TopSecretSourceBundle[] = [
      {
        currentnessStatus: "partially_verified",
        detectedCitations: ["42 U.S.C. Sec. 402"],
        id: "source-1",
        publisher: "Legal Information Institute",
        retrievedText:
          "42 U.S.C. 402 addresses old-age and survivors insurance benefits and must be read with definitions and eligibility limits.",
        sourceType: "statute",
        title: "42 U.S.C. Sec. 402 - Old-age and survivors insurance benefit payments",
        url: "https://www.law.cornell.edu/uscode/text/42/402",
      },
    ];

    const analyses = buildTopSecretStatuteAnalyses({
      accessDate: "2026-05-24",
      discoveredCitations: ["42 U.S.C. Sec. 402(a)"],
      message: "A person can claim Social Security benefits without checking eligibility rules.",
      sourceBundles,
    });

    expect(analyses[0]).toMatchObject({
      citation: "42 U.S.C. Sec. 402(a)",
      currentnessStatus: "partially_verified",
      currentnessVerification: {
        codificationChecked:
          "Partially verified against retrieved authoritative source: https://www.law.cornell.edu/uscode/text/42/402",
        officialSourceChecked:
          "Legal Information Institute: 42 U.S.C. Sec. 402 - Old-age and survivors insurance benefit payments (https://www.law.cornell.edu/uscode/text/42/402)",
        sourceCurrencyDate:
          "Retrieved by runtime on 2026-05-24; page-level currency date not independently extracted.",
        verificationStatus: "partially_verified",
      },
    });
  });

  it("records verified currentness when runtime retrieval checked an official current source", () => {
    const sourceBundles: TopSecretSourceBundle[] = [
      {
        currentnessStatus: "verified_current",
        detectedCitations: ["31 U.S.C. Sec. 5103"],
        id: "source-1",
        publisher: "Office of the Law Revision Counsel",
        retrievedText:
          "31 U.S.C. 5103 is retained from the official current U.S. Code source and must be checked with amendments and case interpretation.",
        sourceType: "statute",
        title: "31 U.S.C. Sec. 5103 - Official current U.S. Code",
        url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section5103&num=0&edition=prelim",
      },
      {
        currentnessStatus: "partially_verified",
        detectedCitations: [],
        id: "source-2",
        publisher: "CourtListener",
        retrievedText:
          "Case-search source retained for interpretive context. Binding status and treatment are not fully verified.",
        sourceType: "court_case",
        title: "CourtListener search",
        url: "https://www.courtlistener.com/opinion/123/example/",
      },
    ];

    const analyses = buildTopSecretStatuteAnalyses({
      accessDate: "2026-05-24",
      message: "Federal Reserve notes are legal tender under 31 USC 5103.",
      sourceBundles,
    });

    expect(analyses[0]).toMatchObject({
      currentnessStatus: "verified_current",
      currentnessVerification: {
        codificationChecked:
          "Verified against official current source: https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section5103&num=0&edition=prelim",
        interpretiveCasesGuidanceChecked:
          "Partially checked against retained court-case source; binding status, jurisdiction, and later treatment are not fully verified.",
        sourceCurrencyDate:
          "Retrieved by runtime on 2026-05-24 from an official current source endpoint; page-level currency date still should be confirmed by the reader.",
        verificationStatus: "verified_current",
      },
    });
  });

  it("does not treat a court search page as a checked case interpretation", () => {
    const analyses = buildTopSecretStatuteAnalyses({
      accessDate: "2026-05-24",
      message: "Federal Reserve notes are legal tender under 31 USC 5103.",
      sourceBundles: [
        {
          currentnessStatus: "verified_current",
          detectedCitations: ["31 U.S.C. Sec. 5103"],
          id: "source-1",
          publisher: "Office of the Law Revision Counsel",
          retrievedText:
            "31 U.S.C. 5103 is retained from the official current U.S. Code source.",
          sourceType: "statute",
          title: "31 U.S.C. Sec. 5103 - Official current U.S. Code",
          url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title31-section5103&num=0&edition=prelim",
        },
        {
          currentnessStatus: "partially_verified",
          detectedCitations: [],
          id: "source-2",
          publisher: "CourtListener",
          retrievedText:
            "Search page retained for leads only. It is not an opinion or binding authority.",
          sourceType: "court_case",
          title: "CourtListener case search",
          url: "https://www.courtlistener.com/?q=31%20USC%205103&type=o",
        },
      ],
    });

    expect(
      analyses[0].currentnessVerification.interpretiveCasesGuidanceChecked,
    ).toBe("Not verified; binding cases, agency decisions, and guidance must be checked.");
  });

  it("builds legal-text readings for CFR regulations from runtime retrieval", () => {
    const sourceBundles: TopSecretSourceBundle[] = [
      {
        currentnessStatus: "verified_current",
        detectedCitations: ["31 C.F.R. Sec. 363.6"],
        id: "source-1",
        publisher: "Electronic Code of Federal Regulations",
        retrievedText:
          "31 CFR 363.6 appears in the Electronic Code of Federal Regulations and describes TreasuryDirect account rules.",
        sourceType: "regulation",
        title: "31 C.F.R. Sec. 363.6",
        url: "https://www.ecfr.gov/current/title-31/section-363.6",
      },
    ];

    const analyses = buildTopSecretStatuteAnalyses({
      accessDate: "2026-05-24",
      message:
        "TreasuryDirect account claims should be checked against 31 CFR 363.6.",
      sourceBundles,
    });

    expect(analyses).toEqual([
      expect.objectContaining({
        citation: "31 C.F.R. Sec. 363.6",
        currentnessStatus: "verified_current",
        currentnessVerification: expect.objectContaining({
          officialSourceChecked:
            "Electronic Code of Federal Regulations: 31 C.F.R. Sec. 363.6 (https://www.ecfr.gov/current/title-31/section-363.6)",
          verificationStatus: "verified_current",
        }),
        legalHierarchy: expect.arrayContaining([
          expect.stringContaining("Regulation"),
        ]),
        plainEnglishSummary: expect.stringContaining(
          "31 C.F.R. Sec. 363.6 is a federal regulation citation",
        ),
      }),
    ]);
  });
});
