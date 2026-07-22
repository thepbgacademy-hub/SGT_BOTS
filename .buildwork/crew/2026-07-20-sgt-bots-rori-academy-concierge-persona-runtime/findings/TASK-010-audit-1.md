# TASK-010 — Audit, cycle 1

AUDIT: PASS

Auditor: main session (Fable), 2026-07-20.

## Re-derived by the auditor (commands + observed results)

- Record validation: `validate-build.ps1 -File .buildwork/builds/2026-07-20-sgt-bots-rori-academy-concierge-persona-runtime.json` → `ok: true`, revision 6, TASK-010 `pending`.
- Full API suite, from `apps/api`, after `rm -rf .runtime-artifacts`: `corepack pnpm exec vitest run` → **47 files / 390 tests passed, 0 failed** (25.9s). Matches the staged claim, including its qualifier.
- Lints, from repo root: `corepack pnpm --filter @sgt-bots/api lint` → exit 0; `corepack pnpm --filter @sgt-bots/telegram-miniapp lint` → exit 0.
- Mini app suite, from `apps/telegram-miniapp`: `corepack pnpm exec vitest run` → **8 files / 42 tests passed, 0 failed**.
- Full diff read (13 modified files + 2 new test files, +300/-38). Every changed file is explained by the four ticket items or their caller-contract wiring.
- QC dismissals independently verified: `telegram.route.ts` lines 18-22 and `app.ts` lines 266-270 catch with an unconditional `reply.code(401)` and no message matching — the reviewer's 500-risk findings could not occur at those sites; the four message-matching sites (`profile.route.ts` ×1, `provider.route.ts` ×3) are all handled in the diff.
- New tests read in full (`tests/telegram/init-data.spec.ts`, `tests/telegram/launch-prefill.spec.ts`): negative cases present for all four items, fixtures synthetic only (REQ-004 clean), query-parameter-inert regression test present for the item 3 cutover.

## Scope adjudications

- `profile.route.ts` / `provider.route.ts` touches: **accepted as in-scope.** The brief's exclusion covered the POST-body initData contract, which is untouched; the change is the 401 status mapping for the new `"future-dated telegram init data"` message, without which item 4 would surface as a 500 at those routes. Same caller-contract wiring the brief itself demanded for item 1.
- Engineer implementing directly instead of spawning builders: accepted — disclosed in the envelope, justified by budget math, and the work product is verifiably complete.

## Non-blocking nits

1. `tasks[TASK-010].artifacts` contains duplicate entries (`upload.service.ts`, `telegram-bot.service.ts` each listed twice). Cosmetic; fix opportunistically at the next merge.
2. The `.runtime-artifacts` test-isolation flake (pre-existing, proven not introduced here) needs its own ticket — it makes the build-level "full API suite green" criterion non-deterministic and is a TASK-008 gate input. Recommend adding it when TASK-012 is scoped.

## Instruction to the orchestrator

Record this sign-off as ticket evidence (`type: auditor-signoff`) with the re-derivation summary above, and set TASK-010 to `completed`. No other record changes are authorized by this audit.
