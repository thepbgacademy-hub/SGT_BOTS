# Cursive V2 Redesign

## Summary

This document replaces the earlier Cursive intake/chat design with a workflow-only dispute engine design.

Cursive remains one of the six bots in the Telegram playground, but once the user enters the Cursive lane, the experience is no longer chat-driven. Cursive becomes a guided dispute workflow that produces bureau-targeted removal-demand letters from either:

- manual user-supplied dispute facts
- uploaded credit-report evidence

The product goal is not tutoring. The product goal is results.

## Product Position

Cursive is a focused dispute workflow bot inside the broader try-before-you-buy Academy playground.

The playground keeps all six bots and the 3-hour provider session model. Cursive is simply the first lane that becomes a fully operational workflow product instead of a conversational demo surface.

This means:

- keep the six-bot selection screen
- keep the other bot pages
- rewrite the Cursive lane around workflow screens only
- remove chat from the Cursive lane entirely

## Core Product Goal

Cursive should help the user generate narrow, specific, bureau-targeted removal-demand letters based on:

- documented inconsistency across bureaus
- documented inaccuracy with proof

Cursive should not produce generic verification letters.

## Cursive Entry Flow

When the user selects `Cursive`, the first screen asks:

- `Manual dispute`
- `Analyze uploaded report`

No helper chat appears in this lane.

## Workspace UI

### Full-Screen Identity

After the user taps the Cursive hex, the bot should open in a full-screen Cursive workspace that visually replaces the shared playground framing.

This gives Cursive its own identity and prevents it from feeling like a cosmetic overlay on the general playground shell.

### Visual Direction

Cursive should feel like a modern control room:

- clean and procedural
- premium but restrained
- mobile-first
- utility-driven, not theatrical
- distinct from the generic playground shell

Avoid:

- chat-app framing
- neon dashboard theatrics
- black-and-gold default SaaS styling
- anything that feels improvised or overly "vibe coded"

Use:

- thin complementary border accents
- graceful fades
- clear button pressed and selected states
- strong hierarchy with minimal noise

### Mobile-First Layout

Mobile is the primary design target.

The desktop Telegram mini-app experience should inherit from the mobile-first layout rather than driving it.

### Top Region

The top region of the Cursive workspace should have three rows:

1. `Back to Playground` and `Cursive`
2. current lane label such as `Manual dispute` or `Tri-merge analysis`
3. a horizontal named stepper

### Horizontal Stepper

The stepper should:

- stay horizontal on mobile
- use numbered steps with explicit names
- clearly show the current step
- reinforce the wizard workflow

Default step names:

Manual dispute:

1. `Mode`
2. `Evidence`
3. `Violation`
4. `Details`
5. `Review`
6. `Results`

Analyze uploaded report:

1. `Mode`
2. `Report Type`
3. `Upload`
4. `Issues`
5. `Review`
6. `Results`

### Footer / Action Rail

The footer should be sticky on mobile and always reachable.

Top row:

- `Back`
- `Next`, `Review`, or `Generate` depending on step

Bottom row:

- `Playground time remaining`
- the session countdown timer

The timer should remain visible in every bot page, including Cursive, but it should sit at the bottom and remain visually secondary so it does not distract from the workflow.

### Hidden Internal Workflow Rule

The user must never see internal orchestration.

Do not expose:

- prompts
- skills
- tool names
- model roles
- internal rewrite passes
- validation stages
- workflow internals

The app may only show user-relevant state such as:

- `Analyzing report`
- `Reviewing issues`
- `Generating letters`
- `Preparing downloads`

## Lane 1: Manual Dispute

### Evidence Posture Screen

After choosing `Manual dispute`, the user must choose how the issue is documented:

- `Inconsistent reporting across bureaus`
- `One bureau is reporting the item inaccurately and I have proof`

This decision determines the workflow, violation list, intake schema, and drafting posture.

### Manual Cross-Bureau Violation List

If the user selects `Inconsistent reporting across bureaus`, Cursive shows:

- different balances across bureaus
- different delinquency or derogatory dates across bureaus
- incorrect account number across bureaus
- incorrect creditor or furnisher name across bureaus
- incorrect payment status across bureaus
- open/closed status conflict across bureaus

### Manual Single-Bureau Violation List

If the user selects `One bureau is reporting the item inaccurately and I have proof`, Cursive shows:

- incorrect account number
- incorrect creditor or furnisher name
- duplicate creditor or collector reporting
- incorrect payment status
- closed account reported as open
- account not mine

### Manual Mode UI

The `Mode`, `Evidence`, and `Violation` screens should use large full-width selection buttons rather than cards or dropdowns.

This keeps the flow plain, direct, and utility-focused.

### Manual Intake Rules

Each violation type owns its own minimum-field intake.

Rules:

- only ask for the minimum fields required to draft that violation
- do not collect extra narrative if it is not required
- keep the bureau on a tight leash by limiting scope and facts
- use 2 to 3 fields per screen
- usually use 2 to 4 screens before review
- stay menu-driven wherever possible
- minimize free text

### Controlled Assertions

Cursive should prefer controlled statement selections over open narrative text.

Examples:

- `I have no account with this reported account number`
- `This account is being reported as open when it is closed`
- `This account is reported with inconsistent balances across bureaus`

The user should not be asked to draft their own legal theory in free text.

### Manual Cross-Bureau Special Subtype

For cross-bureau inconsistency categories, Cursive asks:

- `Has any bureau already responded or verified this item, but the inconsistency still remains?`

If yes, the issue is classified as:

- `unresolved inconsistency after verification`

This changes the drafting posture to emphasize that the inconsistency remains after notice or claimed reinvestigation.

### Single-Bureau Input Policy

For categories such as:

- incorrect account number
- incorrect creditor or furnisher name

Do not ask the user for the "correct" replacement information.

Cursive should not help the bureau preserve or repair the tradeline.

The intake should collect:

- the inaccurate reported information
- proof type or proof basis
- the controlled assertion needed to support the removal-demand lane

## Lane 2: Analyze Uploaded Report

### Report Type Chooser

After choosing `Analyze uploaded report`, the user chooses:

- `Tri-merge report`
- `Single-bureau report`

V1 supports:

- one tri-merge PDF, or
- one single-bureau PDF

V1 does not support uploading multiple separate single-bureau reports in the same run.

### Upload Lane Flow

1. choose report type
2. upload report
3. OCR / extraction / normalization
4. detect likely issues
5. review issues one at a time
6. confirm or skip each issue
7. collect all confirmations first
8. batch generate all letters at the end
9. show a simple list of generated letters

### Issue Review UX

The issue-review screen should feel like a guided confirmation console, not an editing screen.

Each issue is reviewed one at a time with:

- tradeline identity
- violation label
- exact surfaced facts
- confirm
- skip

Collect all confirmations first, then generate all letters together.

### Tri-Merge Lane

The tri-merge lane is the preferred evidence path for cross-bureau inconsistency disputes because it makes it easier to:

- compare matched tradelines across bureaus
- detect material inconsistencies
- create side-by-side supporting exhibits
- attach report snapshots to the final dispute package

### Single-Bureau Upload Lane

The single-bureau upload lane remains fully supported.

This lane is for situations where:

- the user has only one bureau report
- the user still has proof that the bureau is reporting inaccurate information

The single-bureau lane should not be treated as weak or secondary. Singular proof is enough for the documented-inaccuracy lane.

## Review Card Design

The issue review card is the core UX for uploaded-report analysis.

Each card should show:

- progress, such as `Issue 2 of 5`
- tradeline identity
- target bureau or bureau set
- violation label
- exact conflicting or inaccurate reported facts
- short confirmation prompt
- `Confirm issue`
- `Skip issue`

The review card should not include:

- long legal essays
- full letter previews
- open-ended chat
- emotional language

Its job is to help the user confirm the surfaced issue, not debate it.

## Legal / Product Doctrine

Cursive uses two hard-coded evidentiary theories:

- `documented inconsistency`
- `documented inaccuracy with proof`

These feed one core output posture:

- inaccurate or unreliable reporting
- demand removal from the receiving bureau’s file
- demand proof of deletion

### Hard Non-Negotiable Rules

These rules must be enforced in code, templates, and validation:

- no chat in Cursive
- no generic `verify this account` language
- no requests for bureau validation
- no `please correct if needed` fallback
- no arguing which bureau is right or wrong
- no inviting the bureau to sort the issue out with another bureau
- no extra user facts beyond the minimum required for the selected violation
- single-bureau proof is enough to support the documented-inaccuracy lane
- cross-bureau inconsistency is enough to support the documented-inconsistency lane
- if a bureau already verified the item but inconsistency remains, escalate to the unresolved inconsistency subtype

## Cross-Bureau Inconsistency Doctrine

This is a hard-coded rule and must not be optional.

When the same high-confidence matched tradeline is reported inconsistently across bureaus:

- the inconsistency itself is evidence of inaccurate and unreliable reporting
- the receiving bureau is still responsible for the tradeline it publishes
- the letter must demand removal from that bureau’s file

Cursive must never argue:

- that one bureau is right and the others are wrong
- that the receiving bureau should simply compare notes with the others
- that the bureau should merely verify and update the item

The letters must stick to:

- the documented inconsistency
- the bureau’s ongoing publication of the inconsistent tradeline
- the demand for removal and proof of deletion

## Single-Bureau Inaccuracy Doctrine

When the user supplies singular proof that one bureau is reporting inaccurate information:

- that singular proof is sufficient to support the dispute lane
- the bureau must not be invited to use that proof as a reason to merely verify and update
- the dispute should remain focused on inaccurate and unreliable reporting
- the demanded remedy remains removal from the bureau’s file and proof of deletion

## Generation Rules

### Single-Bureau Issues

One confirmed single-bureau issue produces:

- one bureau-specific letter

### Cross-Bureau Issues

One confirmed cross-bureau issue produces:

- one bureau-specific letter per affected bureau

This means one confirmed inconsistency cluster may produce multiple final letters.

### Batch Generation

For uploaded-report flows:

- collect all issue confirmations first
- generate all letters at the end

Do not interrupt the user after each issue with partial results.

## Violation Detection and Matching Rules

### Matching Posture

Tradeline matching must be conservative and multi-signal.

Use several identifiers such as:

- normalized creditor/furnisher name
- masked account suffix
- account type
- balance range
- status
- opened date
- delinquency-related dates

Classify matches into:

- high-confidence same account
- possible match
- do not merge

Only high-confidence matches should auto-surface cross-bureau inconsistency issues.

### First Canonical Cross-Bureau Rule

For `different balances across bureaus`:

- compare balances only after the tradeline match is high-confidence
- if balances are not an exact match across the selected bureaus, trigger the violation

### Additional Cross-Bureau Rules

For the first redesign scope, apply the same logic family to:

- delinquency / derogatory date mismatches
- account number mismatches
- creditor/furnisher naming conflicts
- payment status conflicts
- open/closed state conflicts

### Single-Bureau Issue Rules

For single-bureau violation types:

- require specific proof-backed facts
- do not over-infer from weak evidence
- always require explicit confirmation for `account not mine`

## Template Input Model

Each confirmed issue must normalize into a strict structured object before drafting.

At minimum, the template input should include:

- target bureau
- violation type
- creditor/furnisher name
- masked account identifier if available
- consumer identity block
- reported facts
- conflict facts or proof facts
- evidence summary
- statute mapping identifier
- remedy directive
- generated date

Raw OCR blobs or emotional user narrative must not go directly into the template.

## Letter Template Anatomy

Every Cursive letter should use a fixed shell:

1. sender block
2. bureau block
3. subject line
4. opening authority paragraph
5. violation paragraph
6. statute grounding paragraph
7. demand paragraph
8. closing
9. exhibit / enclosure references when applicable

The LLM may fill bounded factual inserts.

The LLM may not decide:

- the remedy class
- the statute set
- whether to soften into verification language
- whether one bureau is right or wrong

## Evidence Artifacts

### Tri-Merge Artifacts

For tri-merge cross-bureau inconsistency cases, Cursive should support:

- report excerpt snapshots
- tradeline-specific inconsistency exhibits
- highlight only the relevant conflicting fields

These artifacts should be factual and visual. They should not contain generated legal argument.

### Single-Bureau Artifacts

For single-bureau issues:

- evidence artifacts are optional
- only include them when the uploaded report excerpt meaningfully supports the letter

## Final Results Screen

The final results screen should remain simple.

Show a flat list of generated bureau-specific letters.

Each row should provide:

- violation label
- target bureau
- preview letter
- download letter
- download evidence when available

Do not turn this into a complex dashboard in v1.

## Review / Validation Gate

Every generated letter must pass a final validation gate before delivery.

Validate:

- violation fidelity
- evidence fidelity
- proper use of inconsistency doctrine when applicable
- removal plus proof-of-deletion remedy
- approved statute mapping only
- absence of forbidden language
- no unsupported facts
- no representation language

If a draft fails:

- rewrite once inside the same hard rules
- revalidate
- if still failing, mark it failed instead of delivering weak output

## Federal Core

The statute layer should be hard-coded around an approved federal core, especially:

- `15 U.S.C. § 1681i`
- `15 U.S.C. § 1681e(b)`

Additional federal mapping may be introduced by violation type, but only from an approved internal mapping table.

The LLM must never invent statute selections.

## State-Law Handling

Automatic state-law insertion is out of scope for v1.

Users may:

- research their own state codes
- amend the final PDF manually if desired

Cursive may encourage users to review state-specific support later, but should not automate that layer in v1.

## V1 Scope

Ship first with:

- no chat in Cursive
- manual lane
- uploaded-report lane
- tri-merge chooser
- single-bureau chooser
- issue review cards
- batch letter generation
- simple results list
- fixed template shell
- hard-coded doctrine and validation rules

Keep out of immediate v1:

- RMCR parsing
- specialty report families for mortgage, auto, personal loans, and cards
- automated state-law insertion
- multiple single-bureau uploads in one run
- broad identity-theft workflow expansion beyond the dispute letter itself

## Supersession

This document supersedes the earlier Cursive design direction that assumed:

- helper chat inside the Cursive lane
- category-first Cursive intake as the primary UX
- visible scaffold categories as the main flow
- a conversational intake posture

Implementation should treat this redesign as the new source of truth for Cursive.
