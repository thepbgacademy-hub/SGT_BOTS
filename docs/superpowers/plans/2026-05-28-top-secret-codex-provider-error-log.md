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

## 2026-05-29 - Review Prompt Needed To Be The Shared Credential Cleanup Path

**Context:** The user asked for a true `Danger Zone` exit and for timeout-driven playground endings to delete provider credentials automatically before sending people to the review room.

**Problem:** The existing mini-app `End playground` flow and timeout prompt cleared local UI state and showed the review CTA, but they did not guarantee the backend session secret was purged. The session could look over in the UI while the in-memory provider credential still existed on the server until other cleanup paths ran.

**Fix applied:** The review prompt path now calls `sessionService.retireSessionById(...)` before marking the review as prompted, so both `early_exit` and `timeout` reasons retire the active session and delete the in-memory provider secret. The manual session button in the playground UI is now explicitly labeled `Danger Zone`, and the retention browser tests now use unique Telegram identities so they do not trip the one-entry participation gate by accident.

**Rule going forward:** If a user-facing action ends the playground, it must also end the backend session and purge the provider secret through the same shared code path. Do not treat UI lockout or modal display as proof that credentials were actually removed.

## 2026-05-29 - Backend Hotfix Image Missed Workspace Dependencies After Source-Only Refresh

**Context:** After the live playground table-prefix migration was applied, the backend source was updated on VPS2 and the service was rebuilt using the lightweight `Dockerfile.backend.hotfix` path.

**Problem:** The hotfix image reused the previous dependency layer from `ghcr.io/thepbgacademy-hub/sgt-bots-app-backend:top-secret-smoke`. That layer did not include the newer workspace dependency `pdf-lib`, which is imported from `workers/queue/src/jobs/render-report.job.ts`. The backend container entered a restart loop with `ERR_MODULE_NOT_FOUND`, causing public health to fail with `502`.

**Fix applied:** Rebuilt the backend from the full `Dockerfile.backend` so `pnpm install` reran against the current workspace and refreshed the dependency layer before restarting only `sgt-bots-backend`.

**Rule going forward:** Use the source-only hotfix Dockerfile only when the dependency graph is unchanged. If any imported workspace package may have changed, rebuild from the full backend Dockerfile before restarting the live service.

## 2026-05-29 - Telegram Review CTA Needed A Native Telegram Open Path

**Context:** In the live playground, the user could reach the session-end CTA page, but tapping the review button closed the mini app instead of opening the Telegram review group. At the same time, the user still saw stale `End tour` copy in the session banner, which made it look like the newer `Danger Zone` flow had not been deployed.

**Problem:** The review CTA was rendered as a plain anchor with `target="_blank"`. That is fragile inside Telegram mini apps, where generic browser-link behavior can close or background the webview without navigating into the intended Telegram destination. The stale banner copy was a separate signal that the live frontend bundle had lagged behind the branch state even though the backend logic was already updated.

**Fix applied:** Added a shared `openTelegramReviewLink(...)` helper that prefers `Telegram.WebApp.openTelegramLink(...)`, falls back to `openLink(...)`, and only then falls back to `window.open(...)`. The session-end CTA now uses a button wired to that helper instead of a raw anchor. The handoff was updated to explicitly re-run the live Telegram UI smoke after the frontend redeploy.

**Rule going forward:** For Telegram mini-app destinations, do not rely on generic anchor behavior when the target is another Telegram surface. Use the Telegram WebApp navigation APIs first, and treat stale UI copy after backend success as a frontend deploy verification problem, not a logic regression.

## 2026-05-29 - Owner Testing Needed An Explicit Participation-Gate Bypass

**Context:** After the live `Danger Zone` and review-group flow worked correctly, the owner reopened the playground and was immediately blocked by the one-entry participation gate before reaching provider setup again. That is correct for normal members, but it is too strict for ongoing owner/admin smoke testing.

**Problem:** The participation gate enforced a hard durable block for every Telegram identity equally. That meant repeated live validation required manual SQL cleanup of the owner's participation row, which is noisy, easy to forget, and not a reliable long-term testing workflow.

**Fix applied:** Added `PLAYGROUND_PARTICIPATION_BYPASS_TELEGRAM_USER_IDS` as a backend env allowlist. Allowlisted Telegram user ids bypass the participation check and skip participation-row insertion altogether, so they can continue testing without polluting the durable one-entry ledger. The review CTA helper was also tightened to call `Telegram.WebApp.close()` shortly after opening the review group so the mini app exits more cleanly for end users.

**Rule going forward:** Business gates that should apply to normal members but not to owner/admin smoke testing need an explicit env-driven bypass, not repeated manual database cleanup. Keep the bypass narrowly keyed by Telegram user id and out of the ordinary user path. Also, if VPS Compose does not reliably propagate a new env-file key into the container, pin the variable explicitly in the service `environment:` block so the runtime contract is unambiguous.

## 2026-05-31 - Top Secret Needed To Salvage Partial Provider Findings Instead Of Flattening Them

**Context:** The user reviewed a live Top Secret PDF and found that one message read incomplete. The pasted claim cited a statute and listed multiple supposed requirements, but the generated report fell back to generic `not enough reliable evidence` wording instead of checking whether those items actually appeared in the statute.

**Problem:** When a provider finding contained useful core analysis but malformed nested fields such as citations, support references, or statute analyses, `parseProviderFindings(...)` treated the whole finding as unusable and replaced it with a neutral stub. That preserved pipeline stability, but it threw away substantive statutory analysis and made the PDF feel incomplete.

**Fix applied:** Added a salvage path for malformed findings. Top Secret now preserves usable provider analysis, conclusion, and verdict text, rebuilds citations/support references from retained authoritative sources, regenerates statute analyses from discovered citations, and normalizes user-visible text to strip prompt-like prefixes such as `Body:` and `Conclusion:` before the PDF is rendered. Only findings with no usable core text fall all the way back to the neutral stub.

**Rule going forward:** If a provider finding is partially malformed, salvage the valid substance and rebuild the structured support from retained sources. Do not discard useful statutory reasoning just because nested JSON fields are imperfect.

## 2026-05-31 - Playground PDF Artifacts Needed A Real Retention Window

**Context:** The user asked whether old generated PDFs could be cleaned up after several hours so the VPS does not accumulate stale artifacts indefinitely.

**Problem:** Report artifacts and their metadata stayed on disk until a later workflow explicitly replaced them or the runtime directory was cleaned manually. That left unnecessary PDFs around and made storage growth purely operational debt.

**Fix applied:** Added a six-hour artifact retention window in the report service. Artifacts older than six hours are now purged from the in-memory registry and deleted from disk together with their metadata during hydration and normal artifact/report access paths.

**Rule going forward:** Treat generated playground PDFs as short-lived session artifacts unless a workflow explicitly requires archival retention. Apply retention both to metadata and to the underlying files so runtime storage stays bounded.

## 2026-05-31 - Full Backend Dockerfile Was Required Again For Queue-Backed Top Secret Fixes

**Context:** After the Top Secret salvage and artifact-retention fixes were ready, the first VPS2 deploy attempt reused the lightweight backend hotfix path.

**Problem:** The hotfix image again reused a stale dependency layer and crashed the backend at startup with `ERR_MODULE_NOT_FOUND: Cannot find package 'pdf-lib' imported from /app/workers/queue/src/jobs/render-report.job.ts`.

**Fix applied:** Rebuilt and redeployed from the full `Dockerfile.backend`, then restarted only `sgt-bots-backend`. Public and container-local health checks returned to `{\"status\":\"ok\"}` afterward.

**Rule going forward:** Any backend change that touches report rendering or queue-backed code paths should default to the full backend Docker build unless dependency parity is already proven. Do not use the hotfix Dockerfile for queue/report work.

## 2026-05-31 - Top Secret Needed Atomic Claim Checks, Not Just Memo-Style Analysis

**Context:** After the salvage fix, the user reviewed a better-looking Top Secret report but still found it too generic. A pasted message that cited a statute was not being checked point by point against that statute. The report drifted into broad legal-reading commentary instead of telling the reader which parts of the message were actually supported, overstated, misunderstood, or simply not present in the cited text.

**Problem:** The Top Secret prompt and output contract were still optimized for a polished memo-style finding. Retrieval could fetch the cited statute, but the model was not required to decompose the pasted message into atomic assertions or compare each one against the retained source text. That made the result feel fluffy even when the retrieval layer had good source material.

**Fix applied:** Added `claimChecks` to the Top Secret finding contract, passed atomic assertions into provider requests, instructed the model to acknowledge any true fragment before explaining the overread, and added a `Point-by-point check` section to the PDF. When a message cites a specific federal statute or regulation, retrieval now prioritizes that cited legal text and suppresses unrelated default background sources.

**Rule going forward:** Top Secret is not just a legal memo generator. When a pasted message contains multiple factual points or cites a specific statute, the workflow must compare the message claim by claim against the retained source text and show the reader what was supported, overstated, misunderstood, or not found in the source.

## 2026-06-01 - CFR Part Citations Were Falling Through To Unrelated Default Source Bundles

**Context:** A live Top Secret report about `16 CFR Parts 436 and 437` still came back incoherent after the point-by-point claim-audit deploy. The saved artifact metadata showed the report was analyzing the message against `26 U.S.C. Sec. 61`, IRS Publication 17, TreasuryDirect, and the Social Security Act instead of the FTC franchise rule.

**Problem:** The retrieval adapter only recognized section-style CFR citations such as `31 CFR 363.6`. It did not recognize part-style citations such as `16 CFR Parts 436 and 437`. When retrieval found no candidates, Top Secret silently fell back to the generic IRS/Treasury/SSA stub bundle, which made the provider reason from the wrong evidence and produce nonsense.

**Fix applied:** Added explicit CFR `Part/Parts` citation extraction, generated eCFR part URLs such as `https://www.ecfr.gov/current/title-16/part-436`, and changed the no-fetch fallback path so explicit legal citations now stay anchored to citation-specific placeholder sources instead of unrelated generic defaults.

**Rule going forward:** If the pasted message names a specific statute, section, regulation, or CFR part, failure to retrieve that source must not trigger a generic fallback bundle from another domain of law. Keep the evidence bundle anchored to the named citation even when runtime retrieval fails.
