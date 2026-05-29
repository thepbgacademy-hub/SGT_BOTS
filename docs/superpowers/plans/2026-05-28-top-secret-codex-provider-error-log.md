# Top Secret Codex Provider Error Log

## 2026-05-28 - Connected Codex Session Failed During Top Secret Report Generation

**Context:** User connected an OpenAI Codex subscription through the playground device-login flow. The playground showed the provider session as connected, but Top Secret report generation returned `Unable to complete Top Secret research with your connected provider right now. Please retry or reconnect your provider.`

**Problem:** Provider connection only proved the OpenAI Codex OAuth/device token exchange completed. The later Top Secret research call uses the Codex Responses transport separately. That runtime path did not refresh expiring Codex access tokens, did not retry after a 401/403 response, and sent `max_output_tokens` in the Codex request body even though the proven Executive Council Codex adapter does not include that field.

**Fix applied:** Updated the shared Codex JSON runtime to match the proven Codex Responses request shape, omit `max_output_tokens`, refresh expiring access tokens before provider calls, retry once after 401/403, and expose refreshed credentials back to the in-memory playground session secret. Top Secret and Cursive now update their session secret when the Codex credential refreshes.

**Rule going forward:** Do not treat OpenAI Codex OAuth connection as proof that downstream report generation works. Codex subscription providers need runtime request-shape parity with the proven adapter and a refresh/retry path at the actual Responses call boundary.

## 2026-05-28 - Top Secret Provider Failure Was Hidden From Server Logs

**Context:** User still received the generic Top Secret connected-provider failure after the first Codex runtime patch.

**Problem:** The Top Secret report route converted provider failures into a generic user-facing message without logging the provider status or response body. VPS logs were empty, so the actual Codex failure could not be distinguished between transport rejection, model/request-shape rejection, invalid provider response text, or a provider account issue.

**Fix applied:** Added safe backend diagnostics for Top Secret claim-review failures and included a redacted, truncated provider response body in Codex provider error messages. User-facing copy remains generic, but VPS logs now show the real failure boundary.

**Rule going forward:** Provider-backed report routes must log sanitized upstream status/body details server-side before returning generic user-facing errors. Do not debug provider failures from UI copy alone.

## 2026-05-28 - Codex Output Parsing Needed To Join Split Output Text

**Context:** Top Secret continued returning the generic connected-provider failure after Codex refresh/retry was deployed.

**Problem:** The Codex Responses adapter copied most of the proven transport shape, but its text extraction selected only the first output text part. The proven adapter joins all output text parts. If Codex returns split output chunks or wraps JSON in a fenced code block, the first-part parser can throw `invalid top secret provider response` even when the provider returned usable JSON.

**Fix applied:** Updated Codex text extraction to join all output text parts and normalize fenced or prefixed JSON before parsing.

**Rule going forward:** Codex Responses output should be treated as a stream-like list of content parts. Join parts before parsing and tolerate common JSON fencing.

## 2026-05-28 - Diagnostic Logging Was Attached To The Wrong Report Route

**Context:** Top Secret still returned the generic connected-provider failure, but backend logs did not show the expected `top secret claim review failed` diagnostic.

**Problem:** The diagnostic warning was accidentally placed on the artifact-download route catch block instead of `POST /api/reports/top-secret/claim-review`. That meant the failing report-generation request could return the generic error without leaving a useful server log.

**Fix applied:** Moved sanitized logging to the actual Top Secret claim-review catch block and limited it to server/runtime failures so normal 400-level validation errors do not pollute production logs.

**Rule going forward:** When adding diagnostics, verify the log statement is inside the route that owns the failing user action, not an adjacent route with similar error handling.

## 2026-05-28 - Top Secret Failed Closed On Imperfect Provider JSON

**Context:** Connected Codex sessions can return JSON that is parseable but incomplete, such as a finding missing citations or a response with fewer findings than claims.

**Problem:** Top Secret treated any malformed finding as `invalid top secret provider response`, which killed the whole report. This made the user see a provider failure even when some evidence-bound output could be safely downgraded.

**Fix applied:** Top Secret now falls back to neutral, source-bound `not_enough_reliable_evidence` findings when the provider returns a malformed finding or mismatched finding count. Truly non-JSON provider output still fails at the route boundary.

**Rule going forward:** Do not force a true/false conclusion from malformed provider output. Degrade to a neutral evidence-bound finding when the retained sources exist; reserve hard failure for transport errors and non-parseable provider responses.

## 2026-05-28 - Opaque Codex Access Tokens Needed Preflight Refresh

**Context:** A Codex subscription can show as connected while the saved access token is opaque, undecodable, or missing a normal JWT expiration payload.

**Problem:** The runtime previously treated tokens with no JWT payload or decode failure as not expiring. That allowed stale or opaque access tokens to be sent directly to Codex Responses before refresh.

**Fix applied:** Unknown, opaque, or undecodable Codex access tokens are now treated as expiring and refreshed before the provider call. The Top Secret route writes refreshed credentials back to the active session secret store after report generation.

**Rule going forward:** If token currentness cannot be verified, refresh before use. Do not assume an opaque Codex access token is still valid.

## 2026-05-28 - Codex Streaming Payloads Required Body-Level SSE Detection

**Context:** After `stream: true` was added for live Codex Responses requests, Top Secret still failed with `Unexpected token 'e', "event: res"... is not valid JSON`.

**Problem:** The Codex backend streamed SSE-style payloads with `event:` and `data:` lines, and the response parser relied too heavily on the response content type instead of the body format itself.

**Fix applied:** The Codex runtime now detects streamed payloads from the body text, ignores SSE event headers, reads only `data:` payload lines, and joins output text deltas before JSON parsing.

**Rule going forward:** For Codex Responses, trust the actual body shape more than the header. Event-stream payloads may arrive with mixed or misleading content-type hints.

## 2026-05-28 - Top Secret Results Screen Should Not Dump Provider Fallback Text

**Context:** A Top Secret run completed far enough to queue a report, but the mini app showed raw fallback analysis text on the results step and the user reasonably expected an immediate PDF download.

**Problem:** When the provider returned malformed-but-parseable structured output, the frontend treated the fallback findings like final user-facing copy instead of staying in a clean report-queue posture.

**Fix applied:** The Top Secret results step now suppresses provider fallback findings, shows a simple queue banner, relabels the primary action as `Back to menu`, and makes the report panel explicitly show queued-vs-ready download state.

**Rule going forward:** If the PDF/report flow is the primary user outcome, fallback normalization text belongs in logs or the final PDF, not as the main visible success-state copy in the app.

## 2026-05-28 - Top Secret Cover Page Was Lost When The Template Was Simplified

**Context:** A live Top Secret run successfully generated and downloaded a PDF, but page 1 started directly with the report body instead of the dedicated cover sheet the user had already approved.

**Problem:** The current `top-secret-report.html.ts` renderer still produced a valid report header and findings, so the PDF path looked healthy, but the standalone cover-page block had been dropped from the HTML template. Because the render queue only converts the supplied HTML to PDF, no later stage could re-attach a missing first page.

**Fix applied:** Restored the Top Secret cover page directly in the HTML template with a forced page break after it, including the approved `PBG TOP SECRET` and `Claim Review Report` headings plus generated date and reviewed-message count. Added a regression assertion so template tests now fail if the cover page disappears again.

**Rule going forward:** For Top Secret, the approved cover sheet must be part of the rendered HTML contract, not an implied post-processing step. When a PDF needs a fixed first page, add a template-level test that verifies the cover text and page break are present.

## 2026-05-28 - Top Secret Should Prepend The Approved Cover PDF Asset, Not Rebuild It In HTML

**Context:** The user provided the exact approved cover file `PBG-TopSecretCover.pdf` and clarified that this PDF, not an HTML recreation, must be attached as page 1 to every Top Secret rendered report.

**Problem:** The temporary HTML cover-page restoration fixed the missing-first-page symptom, but it still allowed layout drift from the approved PDF and did not satisfy the requirement to use the exact cover asset.

**Fix applied:** Added `workers/queue/assets/PBG-TopSecretCover.pdf`, taught the queue render job to prepend that PDF only when `templateId === "top_secret_fact_check_v1"`, removed the temporary HTML cover block from the Top Secret template, and added a queue-worker regression test proving Top Secret outputs gain an extra first page while other render paths stay unchanged.

**Rule going forward:** When a workflow has an approved first-page PDF asset, attach the binary asset in the render pipeline instead of rebuilding it as HTML. Keep a focused merge test at the queue layer so future template edits cannot silently replace the approved PDF.

## 2026-05-28 - Top Secret Session Artifact History Could Make Users Download The Wrong Report

**Context:** After the cover-page fix, the user reported that a Top Secret PDF appeared to include unrelated carry-over from a previous report.

**Problem:** Top Secret artifacts were kept for the whole session and surfaced back into the same Report area by `sessionId`. Because successive Top Secret outputs share the same human-facing filename, the user could easily download an older Top Secret PDF and reasonably conclude the current run was contaminated.

**Fix applied:** Top Secret now purges older Top Secret artifacts for the same session and user before queueing a new one. The new report becomes the only Top Secret PDF available in that session workspace, and a regression test now verifies the older artifact record and files are removed.

**Rule going forward:** If a workflow produces repeated single-result reports with the same filename, do not keep stale same-bot artifacts visible by default in the same session workspace. Either replace the older artifact or give every output a clearly distinct identity.

## 2026-05-28 - Playground Needed A Durable One-Entry Participation Gate

**Context:** The user wants the Telegram playground to be a one-time guided tour. The prior three-hour session timer limited a single session, but it did not stop someone from reconnecting later and taking the playground again, even if they had already used part or all of the tour.

**Problem:** We had durable profile rows and session rows, but no dedicated participation ledger that unambiguously records that a member already took the playground. That left repeat entry enforcement soft and made downstream PDF personalization depend on ad hoc profile lookups instead of a shared participation record.

**Fix applied:** Added a new `playground_participations` table plus in-memory/Supabase repo support. The first successful provider-backed playground entry records `user_id`, `telegram_user_id`, `telegram_username`, names, first provider, first session id, and participation timestamp. Later provider connect attempts, including OpenAI Codex device-login starts, now return a polite one-entry message instead of opening a new session. The VPS 2 Supabase database has migration `010_playground_participations.sql` applied.

**Rule going forward:** Session timers are not participation controls. If the business rule is one entry per member, enforce it with a durable participation table keyed by the internal user id and checked before any new provider-backed session can begin.
