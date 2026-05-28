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
