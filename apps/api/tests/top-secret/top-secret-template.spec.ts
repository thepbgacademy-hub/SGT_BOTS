import { describe, expect, it } from "vitest";
import { buildTopSecretStatuteAnalyses } from "../../src/modules/top-secret/top-secret-statute-analysis.service";
import { renderTopSecretReportHtml } from "../../src/modules/top-secret/templates/top-secret-report.html";

describe("Top Secret report template", () => {
  it("renders claim, analysis, conclusion, and authoritative citations in letter portrait HTML", () => {
    const html = renderTopSecretReportHtml({
      generatedDate: "May 23, 2026",
      findings: [
        {
          analysis:
            "The claim must be compared against the operative statute and IRS guidance before relying on it.",
          commonSenseStatement:
            "Read the source and ask whether it says the full online claim, or only a smaller piece of it.",
          citations: [
            {
              publisher: "Legal Information Institute",
              title: "26 U.S.C. Sec. 61 - Gross income defined",
              url: "https://www.law.cornell.edu/uscode/text/26/61",
            },
          ],
          claimComponents: [
            {
              label: "1041-V",
              summary:
                "IRS Form 1041-V is a payment voucher used with an estate or trust income tax return.",
            },
            {
              label: "1099",
              summary:
                "A 1099 is generally an information return that reports certain payments or transactions.",
            },
          ],
          claim: "Income tax is voluntary.",
          conclusion:
            "The claim appears to misunderstand voluntary compliance language.",
          historicalAuthorities: [
            {
              authorityType: "dictionary",
              citationOrTitle: "Black's Law Dictionary definition of income",
              currentApplicationStatus: "controlling_not_verified",
              reportNote:
                "This secondary source may help identify a legal meaning or research path, but it does not by itself establish the controlling rule.",
            },
          ],
          researchContextNotes: [
            {
              topic: "income_tax_voluntary_compliance",
              note:
                "Voluntary compliance describes the method of reporting and paying without the government calculating every return first; it does not by itself mean voluntary participation.",
            },
          ],
          sourceChecks: [
            {
              currentnessStatus: "partially_verified",
              publisher: "Legal Information Institute",
              sourceId: "source-1",
              supportNote:
                "This source supports checking the broad statutory definition.",
              title: "26 U.S.C. Sec. 61 - Gross income defined",
              url: "https://www.law.cornell.edu/uscode/text/26/61",
            },
          ],
          statuteAnalyses: buildTopSecretStatuteAnalyses({
            message: "Income tax is voluntary under 26 USC 61.",
          }),
          verdict: "misunderstood",
        },
      ],
    });

    expect(html).toContain("@page");
    expect(html).toContain("size: Letter portrait");
    expect(html).toContain("Message 1");
    expect(html).toContain("<em><strong>The message says</strong></em>");
    expect(html).toContain("Income tax is voluntary.");
    expect(html).toContain("Read the source and ask whether");
    expect(html).toContain("In plain language");
    expect(html).toContain("So for this message, the evidence points to this conclusion");
    expect(html).toContain("message appears to contain a real idea");
    expect(html).toContain("Historical or secondary authority");
    expect(html).toContain("Black&#39;s Law Dictionary definition of income");
    expect(html).toContain("does not by itself establish the controlling rule");
    expect(html).toContain("Helpful context");
    expect(html).toContain("Voluntary Compliance");
    expect(html).toContain("does not by itself mean voluntary participation");
    expect(html).toContain("Sources checked");
    expect(html).toContain("Parts of the message to check");
    expect(html).toContain("1041-V");
    expect(html).toContain("payment voucher");
    expect(html).toContain("1099");
    expect(html).toContain("information return");
    expect(html).toContain("Currentness: Partially Verified");
    expect(html).toContain(
      "This source supports checking the broad statutory definition.",
    );
    expect(html).toContain("Reading the legal text");
    expect(html).toContain("Currentness: Not Verified");
    expect(html).toContain("Source status check");
    expect(html).toContain("Legal hierarchy");
    expect(html).toContain("Regulatory ecosystem");
    expect(html).toContain("Definitions to check");
    expect(html).toContain("Operator words to parse");
    expect(html).toContain("Canons and interpretation tools");
    expect(html).toContain("What the statute does not say");
    expect(html).toContain("Income tax is voluntary under 26 USC 61.");
    expect(html).toContain("law.cornell.edu");
    expect(html).not.toContain("Common sense:");
    expect(html).not.toContain("Conclusion:");
    expect(html).not.toContain("Top Secret should");
    expect(html).not.toContain("Top Secret could");
    expect(html).not.toContain("Body:");
    expect(html).not.toContain("End:");
    expect(html).not.toContain("Authoritative citations");
    expect(html).not.toContain("reddit.com");
  });

  it("explains not-enough-evidence and partially-verified verdicts without confirming bias", () => {
    const html = renderTopSecretReportHtml({
      generatedDate: "May 24, 2026",
      findings: [
        {
          analysis: "The source record does not support the full message.",
          citations: [
            {
              publisher: "Social Security Administration",
              title: "SSA official source",
              url: "https://www.ssa.gov/",
            },
          ],
          claim: "The agency has a secret account for every person.",
          conclusion:
            "Conclusion: There is not enough reliable evidence for the full message.",
          verdict: "not_enough_reliable_evidence",
        },
        {
          analysis:
            "A source supports one procedural point, but not the larger conclusion.",
          citations: [
            {
              publisher: "Legal Information Institute",
              title: "42 U.S.C. Sec. 402",
              url: "https://www.law.cornell.edu/uscode/text/42/402",
            },
          ],
          claim: "A person can claim Social Security benefits without checking eligibility rules.",
          conclusion:
            "Conclusion: The message overstates what the verified source supports.",
          verdict: "partially_verified",
        },
      ],
    });

    expect(html).toContain("confirmation of an interpretation");
    expect(html).toContain(
      "did not show enough reliable support for the full message",
    );
    expect(html).toContain("Some parts of the message were supported");
    expect(html).toContain("true fragment");
    expect(html).not.toContain("Conclusion:");
  });
});
