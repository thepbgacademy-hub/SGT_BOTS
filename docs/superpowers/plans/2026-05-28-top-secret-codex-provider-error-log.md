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
