# Cursive V2 Removal-Demand Template Review Draft

> Review status: Draft for human review before implementation. Do not treat this as a working production template until approved.

## Currentness Verification

- Jurisdiction: United States federal law
- Official sources checked: Office of the Law Revision Counsel, U.S. Code
- Source currency: OLRC pages state the text contains laws in effect on May 18, 2026
- Core bureau-letter citations checked:
  - Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b)
  - Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A)
  - Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i)
  - Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(B)(i)
  - Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C)
- Verification status: Partially verified for template drafting. Official text was checked for the federal core. Recent cases, state law, and agency guidance were not added to this v1 template.
- Scope limit: This draft is for consumer-reporting-agency letters. Furnisher-directed templates should use a separate statute map and may include 15 U.S.C. Sec. 1681s-2 and 12 C.F.R. Sec. 1022.43 where appropriate.

## Output Rules

- Paper: U.S. Letter, portrait, 8.5in x 11in.
- Style: business formal, Times New Roman or equivalent serif, 12pt body, single column.
- Tone: factual, narrow, procedural, no emotional narrative.
- Remedy: removal from the receiving bureau's file and written proof of deletion.
- Forbidden posture:
  - do not ask the bureau to verify the account
  - do not ask the bureau to correct the tradeline if needed
  - do not ask the bureau to compare with another bureau
  - do not argue that one bureau is right and another is wrong
  - do not ask the user for replacement information that would help preserve the tradeline

## Strict Template Input

Every bureau removal-demand letter should be built from this structured object. No raw OCR, open user narrative, prompt text, or internal workflow notes should enter the template.

```ts
type BureauRemovalDemandTemplateInput = {
  consumer: {
    fullName: string;
    mailingAddressLines: string[];
  };
  bureau: {
    name: "Experian" | "Equifax" | "TransUnion" | string;
    mailingAddressLines: string[];
  };
  generatedDate: string;
  violationType:
    | "different_balances_across_bureaus"
    | "different_delinquency_dates_across_bureaus"
    | "incorrect_account_number_across_bureaus"
    | "incorrect_creditor_name_across_bureaus"
    | "incorrect_payment_status_across_bureaus"
    | "open_closed_status_conflict_across_bureaus"
    | "incorrect_account_number"
    | "incorrect_creditor_name"
    | "duplicate_creditor_or_collector_reporting"
    | "incorrect_payment_status"
    | "closed_account_reported_as_open"
    | "account_not_mine";
  violationLabel: string;
  doctrine:
    | "documented_inconsistency"
    | "documented_inaccuracy_with_proof"
    | "unresolved_inconsistency_after_verification";
  tradeline: {
    furnisherName: string;
    maskedAccountIdentifier?: string;
  };
  reportedFacts: {
    targetBureauFactLabel: string;
    targetBureauReportedValue: string;
  };
  conflictFacts?: {
    comparedBureauFacts: Array<{
      bureauName: string;
      reportedValue: string;
    }>;
    conflictSummary: string;
  };
  proofFacts?: {
    reportedInaccurateInformation: string;
    proofSummary: string;
  };
  priorVerification?: {
    respondingBureauName: string;
    responseDate: string;
    remainingIssueSummary: string;
  };
  evidenceSummary: string;
  enclosureLabels: string[];
  statuteMappingId:
    | "cra_cross_bureau_inconsistency"
    | "cra_unresolved_inconsistency_after_verification"
    | "cra_single_bureau_inaccuracy_with_proof";
};
```

## Fixed Letter Shell

The HTML/PDF renderer should preserve this order:

1. Consumer sender block
2. Date
3. Bureau recipient block
4. Subject line
5. Salutation
6. Opening authority paragraph
7. Tradeline identification block
8. Dispute-specific violation paragraph
9. Statute grounding paragraph
10. Demand paragraph
11. Closing and signature
12. Enclosures
13. Authorities

## Shared Fields

Subject line:

```text
Re: Demand for Removal of Inaccurate or Unreliable Reporting - {{furnisherName}}{{accountSuffixClause}}
```

`{{accountSuffixClause}}` renders as `, {{maskedAccountIdentifier}}` only when present.

Salutation:

```text
To Whom It May Concern:
```

Opening authority paragraph:

```text
I am submitting this dispute directly to {{bureau.name}} regarding the tradeline identified below. This letter disputes the completeness and accuracy of information appearing in my consumer file and is supported by the enclosed documentation. The disputed reporting is inaccurate or unreliable under the Fair Credit Reporting Act, including 15 U.S.C. Sec. 1681e(b) and 15 U.S.C. Sec. 1681i(a)(1)(A).
```

Tradeline identification block:

```text
Disputed tradeline: {{tradeline.furnisherName}}
Reported account identifier: {{tradeline.maskedAccountIdentifier}}
Receiving bureau: {{bureau.name}}
Violation type: {{violationLabel}}
Evidence reviewed: {{evidenceSummary}}
```

If `tradeline.maskedAccountIdentifier` is absent, omit that line rather than rendering a blank value.

## Template Family A: Cross-Bureau Inconsistency

Use for:

- different balances across bureaus
- different delinquency dates across bureaus
- incorrect account number across bureaus
- incorrect creditor or furnisher name across bureaus
- incorrect payment status across bureaus
- open/closed status conflict across bureaus

Violation paragraph:

```text
The disputed tradeline is being reported with inconsistent {{reportedFacts.targetBureauFactLabel}} information across my consumer reports. {{bureau.name}} reports {{reportedFacts.targetBureauFactLabel}} as {{reportedFacts.targetBureauReportedValue}}. The enclosed documentation shows that this same account is reported differently elsewhere: {{conflictFacts.conflictSummary}}. This documented inconsistency makes the tradeline inaccurate or unreliable as reported by {{bureau.name}}.
```

Doctrine paragraph:

```text
The inconsistency itself is the basis of this dispute. I am not asking {{bureau.name}} to preserve the tradeline by changing it to match another bureau's version. Because {{bureau.name}} is publishing this tradeline in my consumer file, {{bureau.name}} remains responsible for the accuracy and reliability of the information it reports.
```

Demand paragraph:

```text
Based on the documented inconsistency described above, I demand that {{bureau.name}} remove the disputed tradeline from my consumer file and provide written proof of deletion. Please also provide an updated copy of my {{bureau.name}} consumer report showing that the disputed tradeline has been removed.
```

Authority list:

```text
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b): requires consumer reporting agencies to follow reasonable procedures to assure maximum possible accuracy when preparing consumer reports.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A): applies when the completeness or accuracy of an item in a consumer's file is disputed by the consumer.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i): requires prompt deletion or modification, as appropriate, after disputed information is found inaccurate, incomplete, or not confirmed through the statutory dispute process.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C): requires reasonable procedures designed to prevent deleted information from reappearing except as permitted by the statute.
```

## Template Family B: Unresolved Inconsistency After Prior Response

Use when the user confirms that a bureau already responded or claimed the item was handled, but the inconsistency remains.

Violation paragraph:

```text
The disputed tradeline remains inconsistent after prior notice. {{priorVerification.respondingBureauName}} responded on {{priorVerification.responseDate}}, yet the same unresolved conflict remains: {{priorVerification.remainingIssueSummary}}. {{bureau.name}} continues to publish the disputed tradeline with {{reportedFacts.targetBureauFactLabel}} reported as {{reportedFacts.targetBureauReportedValue}}, while the enclosed documentation shows the continuing inconsistency: {{conflictFacts.conflictSummary}}.
```

Doctrine paragraph:

```text
The continued reporting of this conflict after prior notice makes the tradeline unreliable as it appears in my {{bureau.name}} file. The issue is not which bureau is correct. The issue is that {{bureau.name}} is publishing a tradeline that remains materially inconsistent and unsupported after notice.
```

Demand paragraph:

```text
Based on the unresolved inconsistency described above, I demand removal of the disputed tradeline from my {{bureau.name}} consumer file and written proof of deletion. Please provide an updated {{bureau.name}} consumer report showing that the disputed tradeline has been removed and apply reasonable procedures to prevent the deleted information from reappearing except as permitted by the Fair Credit Reporting Act.
```

Authority list:

```text
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b): requires consumer reporting agencies to follow reasonable procedures to assure maximum possible accuracy when preparing consumer reports.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A): applies when the completeness or accuracy of an item in a consumer's file is disputed by the consumer.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i): requires prompt deletion or modification, as appropriate, after disputed information is found inaccurate, incomplete, or not confirmed through the statutory dispute process.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(B)(i): restricts reinsertion of information deleted under Sec. 1681i(a)(5)(A) unless the furnisher certifies that the information is complete and accurate.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C): requires reasonable procedures designed to prevent deleted information from reappearing except as permitted by the statute.
```

## Template Family C: Single-Bureau Inaccuracy With Proof

Use for:

- incorrect account number
- incorrect creditor or furnisher name
- duplicate creditor or collector reporting
- incorrect payment status
- closed account reported as open
- account not mine

Violation paragraph:

```text
{{bureau.name}} is reporting inaccurate information for the disputed tradeline. The specific inaccurate information is: {{proofFacts.reportedInaccurateInformation}}. My supporting proof is: {{proofFacts.proofSummary}}. The enclosed documentation supports that the tradeline, as reported by {{bureau.name}}, is inaccurate or unreliable.
```

Doctrine paragraph:

```text
This dispute is based on documented inaccuracy with proof. I am not providing replacement information for {{bureau.name}} to repair or preserve the tradeline. The disputed reporting is inaccurate or unreliable as published and should be removed from my {{bureau.name}} consumer file.
```

Demand paragraph:

```text
Based on the proof described above, I demand that {{bureau.name}} remove the disputed tradeline from my consumer file and provide written proof of deletion. Please also provide an updated copy of my {{bureau.name}} consumer report showing that the disputed tradeline has been removed.
```

Authority list:

```text
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681e(b): requires consumer reporting agencies to follow reasonable procedures to assure maximum possible accuracy when preparing consumer reports.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(1)(A): applies when the completeness or accuracy of an item in a consumer's file is disputed by the consumer.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(A)(i): requires prompt deletion or modification, as appropriate, after disputed information is found inaccurate, incomplete, or not confirmed through the statutory dispute process.
Fair Credit Reporting Act, 15 U.S.C. Sec. 1681i(a)(5)(C): requires reasonable procedures designed to prevent deleted information from reappearing except as permitted by the statute.
```

## Closing

```text
Thank you for your prompt attention to this dispute. I have enclosed the documentation identified above and request written confirmation of deletion at the mailing address listed in this letter.

Sincerely,

{{consumer.fullName}}
```

## Validation Requirements Before Delivery

The generator must fail before preview if any of these conditions appear:

- required merge field is empty
- `statuteMappingId` is not one of the approved mappings
- cross-bureau template has no `conflictFacts.conflictSummary`
- single-bureau template has no `proofFacts.proofSummary`
- unresolved prior-response template has no `priorVerification`
- letter contains `verify this account`
- letter contains `correct if needed`
- letter contains `validate this debt`
- letter asks a bureau to compare with another bureau
- letter asks the user for the correct replacement account number, furnisher name, or payment status
- letter lacks a demand for removal
- letter lacks proof-of-deletion language
