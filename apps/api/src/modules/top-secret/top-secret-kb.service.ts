import type {
  TopSecretClaimComponent,
  TopSecretResearchContextNote,
} from "../../../../../packages/shared/src/contracts/top-secret";

export const DEFAULT_TOP_SECRET_COMMON_SENSE_STATEMENT =
  "Read the source for yourself and ask whether it says the full online claim, or only a smaller piece of it.";

export type TopSecretKnowledgeEntry = {
  claimComponents?: TopSecretClaimComponent[];
  commonSenseStatement?: string;
  id: TopSecretResearchContextNote["topic"];
  matchers: RegExp[];
  requiredSourceHints: string[];
  researchContextNote: TopSecretResearchContextNote;
  status: "approved" | "needs_review";
  version: number;
};

export type TopSecretRuntimeKnowledgeEntry = TopSecretKnowledgeEntry | {
  claimComponents?: TopSecretClaimComponent[];
  commonSenseStatement?: string;
  id: string;
  requiredSourceHints: string[];
  researchContextNote: TopSecretResearchContextNote;
  status: "approved";
  triggerPhrases: string[];
  version: number;
};

export const TOP_SECRET_KNOWLEDGE_BASE: TopSecretKnowledgeEntry[] = [
  {
    id: "right_to_travel",
    matchers: [
      /\bright to travel\b/iu,
      /without (?:a )?(?:license|plates)/iu,
      /private capacity/iu,
      /passport\b/iu,
    ],
    requiredSourceHints: ["state motor vehicle code", "current controlling cases"],
    researchContextNote: {
      topic: "right_to_travel",
      note:
        "The review separates the general freedom to travel from state rules for operating a motor vehicle on public roads. If a state recognizes a narrow private-travel theory, the report should validate only what current controlling authority actually supports.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "statutes_as_law",
    matchers: [
      /\bstatutes?\s+(?:are|is)\s+not\s+(?:law|laws)/iu,
      /statutes?\s+have\s+no\s+force/iu,
      /\bnot law\b/iu,
    ],
    requiredSourceHints: ["current statute", "implementing regulations"],
    researchContextNote: {
      topic: "statutes_as_law",
      note:
        "Statutes are enacted law. The correct research question is usually whether the statute applies to the person, facts, date, jurisdiction, and activity described in the pasted message.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "debtor_creditor_status",
    matchers: [
      /\balways the creditor\b/iu,
      /\bcontractually the debtor\b/iu,
      /\bdebtor\b.*\bcreditor\b/iu,
      /\bcreditor\b.*\bdebtor\b/iu,
    ],
    requiredSourceHints: ["contract", "governing commercial law"],
    researchContextNote: {
      topic: "debtor_creditor_status",
      note:
        "A person may be a creditor in one transaction and a debtor in another. The contract, governing law, and transaction documents matter more than status assumed from a slogan.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "all_caps_name",
    matchers: [
      /\ball caps\b/iu,
      /all capital letters/iu,
      /capitalized name/iu,
      /corporate fiction/iu,
      /strawman/iu,
      /natural human/iu,
    ],
    requiredSourceHints: ["court cases", "recordkeeping rules"],
    researchContextNote: {
      topic: "all_caps_name",
      note:
        "Name styling can appear in forms, records, and databases, but styling alone does not prove a separate legal person or secret corporate fiction. The report should look for controlling authority, not typography alone.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "hj343_public_law_73_10",
    matchers: [
      /\bh\.?j\.?r\.?\s*192\b/iu,
      /\bpublic law\s*73-10\b/iu,
      /\bpl\s*73-10\b/iu,
      /\bno real money\b/iu,
    ],
    requiredSourceHints: ["Public Law 73-10", "H.J.Res. 192", "current debt law"],
    researchContextNote: {
      topic: "hj343_public_law_73_10",
      note:
        "Claims based on HJR 192 or Public Law 73-10 often require careful historical and current-law review. The key question is whether the source addressed government monetary obligations or actually created a private debt-discharge right.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "money_federal_reserve_notes",
    matchers: [
      /\bno (?:such thing as )?real money\b/iu,
      /\bonly congress\b.*\b(?:create|coin|make)\s+money\b/iu,
      /\bfederal reserve\b.*\b(?:not|cannot|can't)\b.*\bmoney\b/iu,
      /\bfederal reserve notes?\b.*\bnot\s+(?:real\s+)?money\b/iu,
    ],
    requiredSourceHints: [
      "U.S. Constitution Article I Section 8",
      "31 U.S.C. Sec. 5103",
      "Federal Reserve legal tender guidance",
    ],
    researchContextNote: {
      topic: "money_federal_reserve_notes",
      note:
        "The U.S. Constitution gives Congress the power to coin money and regulate its value. That means the U.S. Mint does coin money. U.S. coins and currency, including Federal Reserve notes, are legal tender for debts. Financial instruments can also function as money or monetary instruments depending on the governing law and transaction context.",
    },
    status: "approved",
    version: 1,
  },
  {
    commonSenseStatement:
      "When you deposit or cash a paycheck, you are accepting Federal Reserve notes or bank credit as payment for your labor, so the practical question is whether that payment method was agreed to and legally allowed.",
    id: "debt_paid_with_debt",
    matchers: [
      /\b(?:pay|satisfy|discharge)\s+(?:a\s+)?debt\s+with\s+(?:a\s+)?debt\b/iu,
      /\bdebt\s+(?:cannot|can't|can not|may not)\s+(?:pay|satisfy|discharge)\s+(?:a\s+)?debt\b/iu,
      /\bfederal reserve notes?\b.*\bdebt instruments?\b/iu,
    ],
    requiredSourceHints: [
      "31 U.S.C. Sec. 5103",
      "payment agreement",
      "governing contract law",
    ],
    researchContextNote: {
      topic: "debt_paid_with_debt",
      note:
        "The phrase 'you cannot pay a debt with a debt' is too broad unless the agreement and governing law are checked. If both parties agreed to payment in Federal Reserve notes, those notes can satisfy the obligation even if someone describes them as debt instruments. For example, wages can be paid in Federal Reserve notes when the employer and worker agree to that payment method and no controlling rule forbids it.",
    },
    status: "approved",
    version: 1,
  },
  {
    claimComponents: [
      {
        label: "1041-V",
        summary:
          "IRS Form 1041-V is a payment voucher used with an estate or trust income tax return. By itself, it does not show that a private application creates a credit.",
      },
      {
        label: "1099",
        summary:
          "A 1099 is generally an information return that reports certain payments or transactions. Reporting a transaction is different from creating spendable credit.",
      },
      {
        label: "Signature as an instrument",
        summary:
          "A signature can authenticate or execute a document, but a signed application does not automatically become a negotiable instrument without the legal elements that make it one.",
      },
      {
        label: "Securitization",
        summary:
          "Some financial contracts can later be pooled or securitized, but that does not mean every signer receives a Treasury credit or that the original obligation disappears.",
      },
      {
        label: "Company goes to the Treasury",
        summary:
          "A company may report tax information or make payments through government systems, but that is not the same as proving it collects Treasury funds on behalf of the applicant.",
      },
      {
        label: "Application-created credit",
        summary:
          "An application may help a company decide whether to extend credit. It does not prove that the applicant created a separate federal credit unless a controlling source says so.",
      },
    ],
    commonSenseStatement:
      "If a form or signature really created a Treasury credit, the source should say that directly; similar-sounding tax forms and payment records are not enough by themselves.",
    id: "tax_forms_treasury_credit_theory",
    matchers: [
      /\b1041[-\s]?v\b/iu,
      /\b1099\b/iu,
      /\bsignature(?:s)?\b.*\binstruments?\b/iu,
      /\binstruments?\b.*\bsecuriti[sz]ed\b/iu,
      /\bapplication\b.*\btreasury\b/iu,
      /\bcreates?\s+(?:a\s+)?credit\b/iu,
      /\bcompany\b.*\btreasury\b/iu,
    ],
    requiredSourceHints: [
      "IRS Form 1041-V instructions",
      "IRS 1099 information return instructions",
      "Treasury payment guidance",
      "negotiable instrument law",
      "securitization authority",
    ],
    researchContextNote: {
      topic: "tax_forms_treasury_credit_theory",
      note:
        "This message bundles several different ideas: IRS payment vouchers, 1099 information reporting, signatures, instruments, securitization, Treasury routing, and alleged credit creation. Each part has to be proved separately before the whole message can be treated as fact.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "prepaid_debt",
    matchers: [
      /\bdebts?\s+(?:are|is|were|was)\s+pre[- ]?paid\b/iu,
      /\bpre[- ]?paid by\b/iu,
      /\btreasury\b.*\bprivate debts?\b/iu,
    ],
    requiredSourceHints: ["Treasury materials", "contract documents"],
    researchContextNote: {
      topic: "prepaid_debt",
      note:
        "A claim that private debts are prepaid by the government must be traced to controlling law and the actual obligation at issue. Government finance concepts do not automatically transfer to a private person's contractual debts.",
    },
    status: "approved",
    version: 1,
  },
  {
    id: "income_tax_voluntary_compliance",
    matchers: [
      /\bincome tax(?:es)?\s+(?:are|is)\s+voluntary\b/iu,
      /\bvoluntary compliance\b/iu,
      /\bvoluntary participation\b/iu,
    ],
    requiredSourceHints: ["Internal Revenue Code", "IRS Publication 17"],
    researchContextNote: {
      topic: "income_tax_voluntary_compliance",
      note:
        "Voluntary compliance describes the method of reporting and paying without the government calculating every return first; it does not by itself mean voluntary participation.",
    },
    status: "approved",
    version: 1,
  },
];

export function matchTopSecretKnowledgeEntries(
  claim: string,
  runtimeEntries: TopSecretRuntimeKnowledgeEntry[] = [],
) {
  const normalizedClaim = claim.toLowerCase();
  const entries = [...TOP_SECRET_KNOWLEDGE_BASE, ...runtimeEntries];

  return entries.filter((entry) => {
    if ("matchers" in entry) {
      return entry.matchers.some((matcher) => matcher.test(claim));
    }

    return entry.triggerPhrases.some((phrase) =>
      normalizedClaim.includes(phrase.toLowerCase()),
    );
  });
}

export function buildTopSecretResearchContextNotes(
  claim: string,
  runtimeEntries: TopSecretRuntimeKnowledgeEntry[] = [],
) {
  const notes = matchTopSecretKnowledgeEntries(claim, runtimeEntries).map(
    (entry) => entry.researchContextNote,
  );

  return notes.length > 0 ? notes : undefined;
}

export function buildTopSecretClaimComponents(
  claim: string,
  runtimeEntries: TopSecretRuntimeKnowledgeEntry[] = [],
) {
  const components = matchTopSecretKnowledgeEntries(
    claim,
    runtimeEntries,
  ).flatMap((entry) => entry.claimComponents ?? []);

  return components.length > 0 ? components : undefined;
}

export function buildTopSecretCommonSenseStatement(
  claim: string,
  runtimeEntries: TopSecretRuntimeKnowledgeEntry[] = [],
) {
  return (
    matchTopSecretKnowledgeEntries(claim, runtimeEntries).find(
      (entry) => entry.commonSenseStatement,
    )?.commonSenseStatement ?? DEFAULT_TOP_SECRET_COMMON_SENSE_STATEMENT
  );
}

export function buildTopSecretKnowledgeSignal(
  claim: string,
  runtimeEntries: TopSecretRuntimeKnowledgeEntry[] = [],
) {
  const matchedEntries = matchTopSecretKnowledgeEntries(claim, runtimeEntries);

  return {
    claim,
    matchedEntryIds: matchedEntries.map((entry) => entry.id),
    matchedVersions: matchedEntries.map((entry) => ({
      id: entry.id,
      version: entry.version,
    })),
    requiredSourceHints: [
      ...new Set(matchedEntries.flatMap((entry) => entry.requiredSourceHints)),
    ],
    suggestedStatus: matchedEntries.length > 0 ? "matched" : "needs_review",
  };
}
