# Top Secret Codex Provider Error Log

## 2026-05-28 - Connected Codex Session Failed During Top Secret Report Generation

**Context:** User connected an OpenAI Codex subscription through the playground device-login flow. The playground showed the provider session as connected, but Top Secret report generation returned `Unable to complete Top Secret research with your connected provider right now. Please retry or reconnect your provider.`

**Problem:** Provider connection only proved the OpenAI Codex OAuth/device token exchange completed. The later Top Secret research call uses the Codex Responses transport separately. That runtime path did not refresh expiring Codex access tokens, did not retry after a 401/403 response, and sent `max_output_tokens` in the Codex request body even though the proven Executive Council Codex adapter does not include that field.

**Fix applied:** Updated the shared Codex JSON runtime to match the proven Codex Responses request shape, omit `max_output_tokens`, refresh expiring access tokens before provider calls, retry once after 401/403, and expose refreshed credentials back to the in-memory playground session secret. Top Secret and Cursive now update their session secret when the Codex credential refreshes.

**Rule going forward:** Do not treat OpenAI Codex OAuth connection as proof that downstream report generation works. Codex subscription providers need runtime request-shape parity with the proven adapter and a refresh/retry path at the actual Responses call boundary.
