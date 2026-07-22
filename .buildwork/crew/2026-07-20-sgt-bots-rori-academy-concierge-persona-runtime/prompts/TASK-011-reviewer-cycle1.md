# Role: QC Reviewer

You are the build-crew QC REVIEWER: a fresh, independent set of eyes with deliberately blank context. You know NOTHING about this build except what follows this prompt: a diff, the ticket's acceptance criteria, and the project's standards. That blindness is your value — do not ask for more context; review what is in front of you.

You report ONLY to the Orchestrator. One review, then you are done.

## Review the diff for

1. **Correctness** — bugs, broken edge cases, wrong logic, race conditions. For each: the concrete failure scenario (inputs → wrong outcome), not a vibe.
2. **Acceptance fit** — does the diff actually satisfy each acceptance criterion? Check them one by one; name any criterion the diff does not visibly meet.
3. **Scope** — changes outside what the acceptance criteria require. Name every file touched that the criteria don't explain.
4. **Bloat** — dead code, needless abstraction, duplicated logic, dependencies added for trivial gains.
5. **Hallucination** — calls to functions/APIs/config that the diff neither defines nor imports from something real. Flag anything you cannot see defined.
6. **Safety** — secrets in code, injection risks, silently swallowed errors.

## Report format (your final output)

- `VERDICT: pass` or `VERDICT: findings`
- Numbered findings, most severe first. Each: file, location, the defect in one sentence, the concrete failure scenario, suggested severity (blocker / should-fix / nit).
- Unverifiable-from-the-diff concerns go in a separate `UNVERIFIED:` list — claims you could not check are labeled as such, never presented as findings.

Do not soften findings to be agreeable, and do not invent findings to seem thorough. An honest `VERDICT: pass` is a valid review.


---

# Review target: TASK-011 diff

## Acceptance criteria

Each of these six quick wins implemented, scoped by the 2026-07-13 build inspection audit:

1. Wire the already-built `starterPrompts` per bot and un-hide Rori empty state
2. Add a "thinking" bubble during in-flight chat replies
3. Adopt Telegram BackButton, haptics, enableClosingConfirmation, and themeParams
4. Low-time nudges at 10 and 2 minutes
5. Auto-poll Codex OAuth status
6. Show bot descriptions before menu selection

## Project standards

- Telegram WebApp APIs MUST degrade gracefully with no `window.Telegram` (plain browser). Guard via optional chaining per `apps/telegram-miniapp/src/lib/telegram.ts` conventions.
- No secret values anywhere; env-var names only.
- Timers/intervals must be cleaned up on unmount and must not leak past their stop conditions.
- Any description/label affordance must be reachable by keyboard and screen reader, not hover-only, and must work at the 760px mobile breakpoint.
- TypeScript strict: both packages typecheck with `tsc --noEmit`.
- This package has NO jsdom/testing-library; component specs are `renderToStaticMarkup` snapshots. That is a pre-existing convention, not a defect to report.

## Out of scope (do NOT report as findings)

- Dead `ArtifactList.tsx`, unreachable cursive reply builder, stray tarballs/`tmp-rori-*`/`.deploy-src`, and the 1s session polling interval — these belong to a separate ticket.
- The `apps/api` changes present in the tree belong to a previously signed-off ticket and are NOT part of this diff.

## The diff

diff --git a/apps/telegram-miniapp/src/app/app.css b/apps/telegram-miniapp/src/app/app.css
index c245336..04ee3d8 100644
--- a/apps/telegram-miniapp/src/app/app.css
+++ b/apps/telegram-miniapp/src/app/app.css
@@ -584,6 +584,35 @@ h2 {
   height: 19%;
 }
 
+.menu-specialist-guide {
+  display: grid;
+  gap: 0.5rem;
+  margin: 1rem 0 0;
+  padding: 0;
+  list-style: none;
+}
+
+.menu-specialist-guide li {
+  display: grid;
+  gap: 0.15rem;
+  padding: 0.6rem 0.75rem;
+  border: 1px solid rgba(255, 210, 110, 0.15);
+  background: rgba(255, 199, 84, 0.04);
+}
+
+.menu-specialist-guide-name {
+  font-weight: 700;
+  color: var(--gold-bright);
+  font-size: 0.82rem;
+  text-transform: uppercase;
+  letter-spacing: 0.04em;
+}
+
+.menu-specialist-guide-description {
+  color: var(--muted);
+  font-size: 0.85rem;
+}
+
 .workspace-shell {
   position: relative;
   aspect-ratio: 1432 / 1024;
@@ -1711,6 +1740,51 @@ h2 {
   border-style: dashed;
 }
 
+.message-card--thinking .message-copy {
+  display: flex;
+  align-items: center;
+  gap: 0.5rem;
+}
+
+.thinking-dots {
+  display: inline-flex;
+  gap: 0.3rem;
+}
+
+.thinking-dots span {
+  width: 0.4rem;
+  height: 0.4rem;
+  border-radius: 50%;
+  background: var(--gold);
+  animation: thinking-bounce 1.1s ease-in-out infinite;
+}
+
+.thinking-dots span:nth-child(2) {
+  animation-delay: 0.15s;
+}
+
+.thinking-dots span:nth-child(3) {
+  animation-delay: 0.3s;
+}
+
+.thinking-dots--static span {
+  animation: none;
+  opacity: 0.65;
+}
+
+@keyframes thinking-bounce {
+  0%,
+  80%,
+  100% {
+    transform: translateY(0);
+    opacity: 0.5;
+  }
+  40% {
+    transform: translateY(-0.25rem);
+    opacity: 1;
+  }
+}
+
 .message-role {
   font-size: 0.75rem;
   text-transform: uppercase;
@@ -1856,6 +1930,26 @@ h2 {
   background: rgba(12, 58, 35, 0.28);
 }
 
+.low-time-nudge {
+  display: flex;
+  align-items: center;
+  justify-content: space-between;
+  gap: 0.75rem;
+  padding: 0.85rem 1rem;
+  margin-bottom: 0;
+  border: 1px solid var(--line-strong);
+  background: rgba(255, 199, 84, 0.08);
+  color: var(--gold-bright);
+}
+
+.low-time-nudge-dismiss {
+  padding: 0.35rem 0.7rem;
+  border: 1px solid var(--line);
+  background: transparent;
+  color: var(--gold-bright);
+  cursor: pointer;
+}
+
 .status-panel {
   padding: 2rem;
   margin-top: 4rem;
diff --git a/apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx b/apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx
index fc9794e..d8427bf 100644
--- a/apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx
+++ b/apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx
@@ -226,6 +226,23 @@ describe("ChatPanel", () => {
     expect(markup).not.toContain("Knowledge Base");
   });
 
+  it("does not show the thinking indicator before a message is submitted", () => {
+    const markup = renderToStaticMarkup(
+      createElement(ChatPanel, {
+        bot: GENERIC_BOT,
+        conversationId: undefined,
+        messages: [],
+        onArtifactQueued: () => undefined,
+        onConversationUpdate: () => undefined,
+        sessionId: "session-1",
+        sessionToken: "token-1",
+      }),
+    );
+
+    expect(markup).not.toContain("message-card--thinking");
+    expect(markup).not.toContain("Thinking…");
+  });
+
   it("shows the upload and report workflow only for supported non-Cursive bots", () => {
     const markup = renderToStaticMarkup(
       createElement(ChatPanel, {
diff --git a/apps/telegram-miniapp/src/features/chat/ChatPanel.tsx b/apps/telegram-miniapp/src/features/chat/ChatPanel.tsx
index 345adfb..b23bfa9 100644
--- a/apps/telegram-miniapp/src/features/chat/ChatPanel.tsx
+++ b/apps/telegram-miniapp/src/features/chat/ChatPanel.tsx
@@ -6,6 +6,7 @@ import {
   type DocumentWizardReportFormData,
 } from "../forms/DocumentWizardForm";
 import { UploadPanel } from "../uploads/UploadPanel";
+import { triggerTelegramHaptic } from "../../lib/telegram";
 import { VanishInput } from "./VanishInput";
 
 const VANISH_DURATION_MS = 600;
@@ -153,6 +154,7 @@ export function ChatPanel({
       return;
     }
 
+    triggerTelegramHaptic("light");
     setChatError(null);
     setSubmitting(true);
     setVanishingText(submittedMessage);
@@ -380,7 +382,28 @@ export function ChatPanel({
             </article>
           );
         })}
-        {!visibleMessages.length && !hideEmptyState ? (
+        {submitting ? (
+          <article className="message-card is-assistant message-card--thinking" aria-live="polite">
+            <p className="message-role">{bot.name}</p>
+            <p className="message-copy">
+              <span
+                className={[
+                  "thinking-dots",
+                  prefersReducedMotion ? "thinking-dots--static" : "",
+                ]
+                  .filter(Boolean)
+                  .join(" ")}
+                aria-hidden="true"
+              >
+                <span />
+                <span />
+                <span />
+              </span>
+              <span>Thinking…</span>
+            </p>
+          </article>
+        ) : null}
+        {!visibleMessages.length && !hideEmptyState && !submitting ? (
           <article className="message-card message-card--empty">
             <p className="message-role">Ready</p>
             <p className="message-copy">{emptyCopy}</p>
diff --git a/apps/telegram-miniapp/src/features/dashboard/DashboardShell.spec.tsx b/apps/telegram-miniapp/src/features/dashboard/DashboardShell.spec.tsx
index 55b302c..709e624 100644
--- a/apps/telegram-miniapp/src/features/dashboard/DashboardShell.spec.tsx
+++ b/apps/telegram-miniapp/src/features/dashboard/DashboardShell.spec.tsx
@@ -5,6 +5,7 @@ import {
   CursiveWorkspaceShell,
   buildBureauRemovalDemandInput,
   getCursiveDetailErrors,
+  getLowTimeNudgeThreshold,
   getNextCursiveStepState,
   getSteppedCursiveState,
   isArtifactForMenuSelection,
@@ -372,3 +373,28 @@ describe("DashboardShell Cursive workspace", () => {
     ).toContain("consumer name");
   });
 });
+
+describe("getLowTimeNudgeThreshold", () => {
+  it("returns null while the session is inactive, regardless of remaining time", () => {
+    expect(getLowTimeNudgeThreshold(500, false)).toBeNull();
+    expect(getLowTimeNudgeThreshold(0, false)).toBeNull();
+  });
+
+  it("returns null above the 10-minute threshold", () => {
+    expect(getLowTimeNudgeThreshold(601, true)).toBeNull();
+  });
+
+  it("crosses into the 10-minute threshold at and below 600 seconds", () => {
+    expect(getLowTimeNudgeThreshold(600, true)).toBe("ten_minute");
+    expect(getLowTimeNudgeThreshold(300, true)).toBe("ten_minute");
+  });
+
+  it("crosses into the 2-minute threshold at and below 120 seconds", () => {
+    expect(getLowTimeNudgeThreshold(120, true)).toBe("two_minute");
+    expect(getLowTimeNudgeThreshold(0, true)).toBe("two_minute");
+  });
+
+  it("resolves the more urgent threshold even if a tick skips past 10 minutes", () => {
+    expect(getLowTimeNudgeThreshold(90, true)).toBe("two_minute");
+  });
+});
diff --git a/apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx b/apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
index 537a907..930bb49 100644
--- a/apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
+++ b/apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx
@@ -9,7 +9,13 @@ import { BotSupportPanel } from "./BotSupportPanel";
 import { formatRemaining } from "../../lib/timer";
 import { SessionEndModal, type SessionEndPrompt } from "./SessionEndModal";
 import { MainMenu } from "./MainMenu";
-import { openTelegramReviewLink } from "../../lib/telegram";
+import {
+  applyTelegramThemeParams,
+  openTelegramReviewLink,
+  setTelegramBackButton,
+  setTelegramClosingConfirmation,
+  triggerTelegramHaptic,
+} from "../../lib/telegram";
 import { getBotWorkspacePanel } from "./bot-workspace-panels";
 import {
   getMenuItem,
@@ -53,6 +59,34 @@ type DashboardShellProps = {
 
 const DEFAULT_REVIEW_GROUP_URL = "https://t.me/+1wagxfyhnAcwMDJh";
 
+export type LowTimeNudgeThreshold = "ten_minute" | "two_minute";
+
+export const LOW_TIME_NUDGE_COPY: Record<LowTimeNudgeThreshold, string> = {
+  ten_minute: "10 minutes left in your session.",
+  two_minute: "2 minutes left in your session.",
+};
+
+// Threshold-crossing (<=) rather than equality: remainingSeconds can jump
+// (server resync, a skipped tick) without ever landing exactly on 600 or 120.
+export function getLowTimeNudgeThreshold(
+  remainingSeconds: number,
+  isSessionActive: boolean,
+): LowTimeNudgeThreshold | null {
+  if (!isSessionActive) {
+    return null;
+  }
+
+  if (remainingSeconds <= 120) {
+    return "two_minute";
+  }
+
+  if (remainingSeconds <= 600) {
+    return "ten_minute";
+  }
+
+  return null;
+}
+
 type CursiveStep =
   | "mode"
   | "evidence"
@@ -1130,6 +1164,8 @@ export function DashboardShell({
   const [remainingCountdownSeconds, setRemainingCountdownSeconds] = useState<number | null>(
     null,
   );
+  const [lowTimeNudge, setLowTimeNudge] = useState<LowTimeNudgeThreshold | null>(null);
+  const firedLowTimeNudgesRef = useRef<Set<LowTimeNudgeThreshold>>(new Set());
   const [conversations, setConversations] = useState<
     Record<
       string,
@@ -1194,12 +1230,53 @@ export function DashboardShell({
   const remainingSeconds = isSessionActive
     ? remainingCountdownSeconds ?? session?.remainingSeconds ?? 0
     : 0;
+
+  useEffect(() => {
+    firedLowTimeNudgesRef.current = new Set();
+    setLowTimeNudge(null);
+  }, [activeSessionId]);
+
+  useEffect(() => {
+    const threshold = getLowTimeNudgeThreshold(remainingSeconds, isSessionActive);
+
+    if (!threshold || firedLowTimeNudgesRef.current.has(threshold)) {
+      return;
+    }
+
+    firedLowTimeNudgesRef.current.add(threshold);
+    setLowTimeNudge(threshold);
+  }, [isSessionActive, remainingSeconds]);
+
+  useEffect(() => {
+    applyTelegramThemeParams();
+  }, []);
+
+  useEffect(() => {
+    setTelegramClosingConfirmation(isSessionActive);
+
+    return () => {
+      setTelegramClosingConfirmation(false);
+    };
+  }, [isSessionActive]);
+
   const selectedBot =
     bots.find((bot) => bot.id === selectedMenuBotId) ?? null;
   const selectedConversation = selectedBot
     ? conversations[selectedBot.id]
     : undefined;
   const selectedMenuItem = getMenuItem(bots, selectedMenuBotId);
+
+  useEffect(() => {
+    if (!selectedMenuItem) {
+      return undefined;
+    }
+
+    // handleBackToMenu only touches stable setState setters/refs, so it is
+    // safe to omit from deps: re-running this effect on every render would
+    // just re-show/re-bind the same BackButton.
+    return setTelegramBackButton(() => handleBackToMenu());
+  }, [selectedMenuItem?.id]);
+
   const selectedWorkspacePanel = selectedBot
     ? getBotWorkspacePanel(selectedBot.id)
     : null;
@@ -1493,6 +1570,7 @@ export function DashboardShell({
   }
 
   function handleMenuSelection(menuBotId: PlaygroundMenuBotId) {
+    triggerTelegramHaptic("light");
     setSelectedMenuBotId(menuBotId);
     setBotError(null);
   }
@@ -2154,6 +2232,18 @@ export function DashboardShell({
               )}
             </div>
           </section>
+          {lowTimeNudge ? (
+            <p role="status" className="low-time-nudge">
+              {LOW_TIME_NUDGE_COPY[lowTimeNudge]}
+              <button
+                className="low-time-nudge-dismiss"
+                onClick={() => setLowTimeNudge(null)}
+                type="button"
+              >
+                Dismiss
+              </button>
+            </p>
+          ) : null}
           {botError ? <p role="alert" className="alert-banner">{botError}</p> : null}
           {artifactError ? <p role="alert" className="alert-banner">{artifactError}</p> : null}
           {selectedMenuItem ? (
diff --git a/apps/telegram-miniapp/src/features/dashboard/MainMenu.tsx b/apps/telegram-miniapp/src/features/dashboard/MainMenu.tsx
index ce97717..5a8806c 100644
--- a/apps/telegram-miniapp/src/features/dashboard/MainMenu.tsx
+++ b/apps/telegram-miniapp/src/features/dashboard/MainMenu.tsx
@@ -55,12 +55,20 @@ export function MainMenu({
             key={item.id}
             onClick={() => onSelect(item.id)}
             type="button"
-            aria-label={`Open ${item.displayName}`}
+            aria-label={`Open ${item.displayName}: ${item.description}`}
           >
             <span className="sr-only">{item.displayName}</span>
           </button>
         ))}
       </div>
+      <ul className="menu-specialist-guide" aria-label="Specialist guide">
+        {menuItems.map((item) => (
+          <li key={item.id}>
+            <span className="menu-specialist-guide-name">{item.displayName}</span>
+            <span className="menu-specialist-guide-description">{item.description}</span>
+          </li>
+        ))}
+      </ul>
     </section>
   );
 }
diff --git a/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.spec.tsx b/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.spec.tsx
index 5372be3..44821fc 100644
--- a/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.spec.tsx
+++ b/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.spec.tsx
@@ -1,7 +1,10 @@
 import { createElement } from "react";
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it } from "vitest";
-import { ProviderConnectPanel } from "./ProviderConnectPanel";
+import {
+  ProviderConnectPanel,
+  resolveCodexOAuthPollAction,
+} from "./ProviderConnectPanel";
 
 describe("ProviderConnectPanel", () => {
   it("offers the OpenAI Codex subscription login path", () => {
@@ -18,3 +21,54 @@ describe("ProviderConnectPanel", () => {
     expect(markup).not.toContain("Use an API key instead");
   });
 });
+
+describe("resolveCodexOAuthPollAction", () => {
+  const SESSION = {
+    id: "session-1",
+    provider: "openai_codex" as const,
+    startedAt: "2026-07-20T00:00:00.000Z",
+    expiresAt: "2026-07-20T03:00:00.000Z",
+    durationSeconds: 10_800,
+    remainingSeconds: 10_800,
+    state: "active" as const,
+  };
+
+  it("stops the poll and hands back the session when connected", () => {
+    expect(
+      resolveCodexOAuthPollAction({
+        status: "connected",
+        session: SESSION,
+        sessionToken: "token-1",
+      }),
+    ).toEqual({ type: "connected", session: SESSION, sessionToken: "token-1" });
+  });
+
+  it("treats a connected status missing session data as a non-terminal continue", () => {
+    expect(
+      resolveCodexOAuthPollAction({ status: "connected" }),
+    ).toEqual({ type: "continue" });
+  });
+
+  it("stops the poll on expired", () => {
+    expect(
+      resolveCodexOAuthPollAction({ status: "expired", message: "Login expired." }),
+    ).toEqual({ type: "stop", message: "Login expired." });
+  });
+
+  it("stops the poll on failed with a fallback message", () => {
+    expect(resolveCodexOAuthPollAction({ status: "failed" })).toEqual({
+      type: "stop",
+      message: "OpenAI Codex login needs to be restarted.",
+    });
+  });
+
+  it("keeps polling while pending", () => {
+    expect(resolveCodexOAuthPollAction({ status: "pending" })).toEqual({
+      type: "continue",
+    });
+  });
+
+  it("keeps polling on a failed fetch (null payload)", () => {
+    expect(resolveCodexOAuthPollAction(null)).toEqual({ type: "continue" });
+  });
+});
diff --git a/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx b/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx
index dbfb465..e025676 100644
--- a/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx
+++ b/apps/telegram-miniapp/src/features/onboarding/ProviderConnectPanel.tsx
@@ -1,4 +1,4 @@
-import { useState, type FormEvent } from "react";
+import { useEffect, useState, type FormEvent } from "react";
 
 type SessionSnapshot = {
   id: string;
@@ -10,6 +10,53 @@ type SessionSnapshot = {
   state: "active" | "expired" | "reauth_required";
 };
 
+type CodexOAuthStatusPayload = {
+  message?: string;
+  session?: SessionSnapshot;
+  sessionToken?: string;
+  status?: "pending" | "connected" | "expired" | "failed";
+};
+
+export type CodexOAuthPollAction =
+  | { type: "connected"; session: SessionSnapshot; sessionToken: string }
+  | { type: "stop"; message: string }
+  | { type: "continue" };
+
+export function resolveCodexOAuthPollAction(
+  payload: CodexOAuthStatusPayload | null,
+): CodexOAuthPollAction {
+  if (!payload) {
+    return { type: "continue" };
+  }
+
+  if (
+    payload.status === "connected" &&
+    payload.session &&
+    payload.sessionToken
+  ) {
+    return {
+      type: "connected",
+      session: payload.session,
+      sessionToken: payload.sessionToken,
+    };
+  }
+
+  if (payload.status === "expired" || payload.status === "failed") {
+    return {
+      type: "stop",
+      message:
+        payload.message ?? "OpenAI Codex login needs to be restarted.",
+    };
+  }
+
+  return { type: "continue" };
+}
+
+// Approval happens in a separate Telegram/browser tab, so this only needs to
+// notice a completed human action, not react in real time like the 1s
+// session-timer poll (flagged separately as too aggressive).
+const CODEX_OAUTH_POLL_INTERVAL_MS = 4_000;
+
 type ProviderConnectPanelProps = {
   initData: string;
   onConnected: (result: {
@@ -130,19 +177,13 @@ export function ProviderConnectPanel({
     }
   }
 
-  async function checkCodexLogin() {
-    if (!codexLogin) {
-      setError("Start OpenAI Codex login first.");
-      return;
-    }
-
-    setError(null);
-    setSubmitting(true);
-
+  async function fetchCodexOAuthStatus(
+    oauthSessionId: string,
+  ): Promise<CodexOAuthStatusPayload | null> {
     try {
       const response = await fetch(
         `/api/providers/openai-codex/oauth/${encodeURIComponent(
-          codexLogin.oauthSessionId,
+          oauthSessionId,
         )}/status`,
         {
           headers: {
@@ -150,33 +191,93 @@ export function ProviderConnectPanel({
           },
         },
       );
-      const payload = (await response.json()) as {
-        message?: string;
-        session?: SessionSnapshot;
-        sessionToken?: string;
-        status?: "pending" | "connected" | "expired" | "failed";
-      };
-
-      if (payload.status === "connected" && payload.session && payload.sessionToken) {
-        onConnected({
-          session: payload.session,
-          sessionToken: payload.sessionToken,
-        });
-        return;
-      }
 
-      setError(
-        payload.status === "pending"
-          ? "OpenAI Codex login is still waiting for approval."
-          : payload.message ?? "OpenAI Codex login needs to be restarted.",
-      );
-      setSubmitting(false);
+      return (await response.json()) as CodexOAuthStatusPayload;
     } catch {
+      return null;
+    }
+  }
+
+  async function checkCodexLogin() {
+    if (!codexLogin) {
+      setError("Start OpenAI Codex login first.");
+      return;
+    }
+
+    setError(null);
+    setSubmitting(true);
+
+    const payload = await fetchCodexOAuthStatus(codexLogin.oauthSessionId);
+
+    if (!payload) {
       setError("Unable to check OpenAI Codex login.");
       setSubmitting(false);
+      return;
+    }
+
+    const action = resolveCodexOAuthPollAction(payload);
+
+    if (action.type === "connected") {
+      onConnected({ session: action.session, sessionToken: action.sessionToken });
+      return;
+    }
+
+    if (action.type === "stop") {
+      setError(action.message);
+      setCodexLogin(null);
+      setSubmitting(false);
+      return;
     }
+
+    setError("OpenAI Codex login is still waiting for approval.");
+    setSubmitting(false);
   }
 
+  useEffect(() => {
+    if (provider !== "openai_codex" || !codexLogin) {
+      return;
+    }
+
+    let cancelled = false;
+    const oauthSessionId = codexLogin.oauthSessionId;
+
+    const intervalId = window.setInterval(() => {
+      void (async () => {
+        const payload = await fetchCodexOAuthStatus(oauthSessionId);
+
+        if (cancelled || !payload) {
+          return;
+        }
+
+        const action = resolveCodexOAuthPollAction(payload);
+
+        if (action.type === "connected") {
+          cancelled = true;
+          window.clearInterval(intervalId);
+          onConnected({
+            session: action.session,
+            sessionToken: action.sessionToken,
+          });
+          return;
+        }
+
+        if (action.type === "stop") {
+          cancelled = true;
+          window.clearInterval(intervalId);
+          setError(action.message);
+          setCodexLogin(null);
+        }
+      })();
+    }, CODEX_OAUTH_POLL_INTERVAL_MS);
+
+    return () => {
+      cancelled = true;
+      window.clearInterval(intervalId);
+    };
+    // onConnected/setError/setCodexLogin are stable setters/props; keying on
+    // codexLogin+provider is what actually starts/stops/restarts the poll.
+  }, [codexLogin, provider]);
+
   function openProviderLogin(verificationUrl: string) {
     const telegram = (
       window as Window & {
diff --git a/apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx b/apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx
index 6662ed1..ac5517f 100644
--- a/apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx
+++ b/apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx
@@ -41,12 +41,11 @@ describe("RoriWorkspace", () => {
     expect(markup).not.toContain("Tool routing");
     expect(markup).not.toContain("Telegram rooms</span>");
     expect(markup).toContain("Ask Rori about the Academy...");
-    expect(markup).not.toContain("Pick a prompt or type your question below.");
-    expect(markup).not.toContain("How do I enroll?");
-    expect(markup).not.toContain("What workshops are coming up?");
-    expect(markup).not.toContain("Which PBG Telegram rooms should I join?");
-    expect(markup).not.toContain("Which tool should I use for...?");
-    expect(markup).not.toContain("message-card--empty");
+    expect(markup).toContain("How do I enroll?");
+    expect(markup).toContain("What workshops are coming up?");
+    expect(markup).toContain("Which PBG Telegram rooms should I join?");
+    expect(markup).toContain("Which tool should I use for...?");
+    expect(markup).toContain("message-card--empty");
   });
 
   it("does not render upload, report, artifact, or support sections", () => {
diff --git a/apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx b/apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx
index 3acf83d..0de8944 100644
--- a/apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx
+++ b/apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx
@@ -1,5 +1,6 @@
 import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
 import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";
+import { RORI_STARTER_PROMPTS } from "./starter-prompts";
 
 type RoriWorkspaceProps = {
   bot: BotCatalogEntry | null;
@@ -38,7 +39,6 @@ export function RoriWorkspace({
           bot={bot}
           conversationId={conversationId}
           hideCitations
-          hideEmptyState
           hideHeader
           inputPlaceholder="Ask Rori about the Academy..."
           latestExchangeOnly
@@ -49,6 +49,7 @@ export function RoriWorkspace({
           sendErrorCopy="Rori could not answer right now. Please try again."
           sessionId={sessionId}
           sessionToken={sessionToken}
+          starterPrompts={RORI_STARTER_PROMPTS}
         />
       </div>
     </section>
diff --git a/apps/telegram-miniapp/src/lib/telegram.spec.ts b/apps/telegram-miniapp/src/lib/telegram.spec.ts
index 221cc44..32795c5 100644
--- a/apps/telegram-miniapp/src/lib/telegram.spec.ts
+++ b/apps/telegram-miniapp/src/lib/telegram.spec.ts
@@ -1,8 +1,13 @@
 import { afterEach, describe, expect, it, vi } from "vitest";
 import {
+  applyTelegramThemeParams,
+  computeThemeCssVariables,
   fetchLaunchContext,
   initializeTelegramWebApp,
   readTelegramInitData,
+  setTelegramBackButton,
+  setTelegramClosingConfirmation,
+  triggerTelegramHaptic,
   waitForTelegramInitData,
 } from "./telegram";
 
@@ -119,5 +124,134 @@ describe("telegram helpers", () => {
         url: "https://t.me/sgt_playground_bot/playground?startapp=profile-onboarding",
       },
     });
+
+    expect(fetchMock).toHaveBeenNthCalledWith(
+      1,
+      "/api/telegram/launch",
+      expect.objectContaining({
+        headers: { "x-telegram-init-data": "signed-data" },
+      }),
+    );
+    expect(fetchMock).toHaveBeenNthCalledWith(
+      2,
+      "/api/telegram/prefill",
+      expect.objectContaining({
+        headers: { "x-telegram-init-data": "signed-data" },
+      }),
+    );
+  });
+
+  it("no-ops the BackButton wiring outside Telegram", () => {
+    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);
+
+    const cleanup = setTelegramBackButton(() => undefined);
+
+    expect(() => cleanup()).not.toThrow();
+  });
+
+  it("shows and binds the Telegram BackButton, and tears it down on cleanup", () => {
+    const show = vi.fn();
+    const hide = vi.fn();
+    const onClick = vi.fn();
+    const offClick = vi.fn();
+    vi.stubGlobal("window", {
+      Telegram: {
+        WebApp: {
+          BackButton: { show, hide, onClick, offClick },
+        },
+      },
+    } as unknown as Window & typeof globalThis);
+
+    const handler = () => undefined;
+    const cleanup = setTelegramBackButton(handler);
+
+    expect(onClick).toHaveBeenCalledWith(handler);
+    expect(show).toHaveBeenCalledTimes(1);
+
+    cleanup();
+
+    expect(offClick).toHaveBeenCalledWith(handler);
+    expect(hide).toHaveBeenCalledTimes(1);
+  });
+
+  it("does not throw when triggering haptics outside Telegram", () => {
+    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);
+
+    expect(() => triggerTelegramHaptic("light")).not.toThrow();
+  });
+
+  it("forwards haptic impact style to the Telegram WebApp", () => {
+    const impactOccurred = vi.fn();
+    vi.stubGlobal("window", {
+      Telegram: {
+        WebApp: {
+          HapticFeedback: { impactOccurred },
+        },
+      },
+    } as unknown as Window & typeof globalThis);
+
+    triggerTelegramHaptic("medium");
+
+    expect(impactOccurred).toHaveBeenCalledWith("medium");
+  });
+
+  it("does not throw when toggling closing confirmation outside Telegram", () => {
+    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);
+
+    expect(() => setTelegramClosingConfirmation(true)).not.toThrow();
+  });
+
+  it("enables and disables the Telegram closing confirmation", () => {
+    const enableClosingConfirmation = vi.fn();
+    const disableClosingConfirmation = vi.fn();
+    vi.stubGlobal("window", {
+      Telegram: {
+        WebApp: { enableClosingConfirmation, disableClosingConfirmation },
+      },
+    } as unknown as Window & typeof globalThis);
+
+    setTelegramClosingConfirmation(true);
+    expect(enableClosingConfirmation).toHaveBeenCalledTimes(1);
+
+    setTelegramClosingConfirmation(false);
+    expect(disableClosingConfirmation).toHaveBeenCalledTimes(1);
+  });
+
+  it("maps known theme param keys to app CSS variables and ignores unset ones", () => {
+    expect(
+      computeThemeCssVariables({
+        bg_color: "#111111",
+        text_color: "#eeeeee",
+      }),
+    ).toEqual({
+      "--bg": "#111111",
+      "--text": "#eeeeee",
+    });
+    expect(computeThemeCssVariables({})).toEqual({});
+  });
+
+  it("applies theme params to a given root without touching global document", () => {
+    vi.stubGlobal("window", {
+      Telegram: {
+        WebApp: {
+          themeParams: { bg_color: "#0a0a0a", hint_color: "#c7b588" },
+        },
+      },
+    } as unknown as Window & typeof globalThis);
+    const setProperty = vi.fn();
+
+    applyTelegramThemeParams({ style: { setProperty } });
+
+    expect(setProperty).toHaveBeenCalledWith("--bg", "#0a0a0a");
+    expect(setProperty).toHaveBeenCalledWith("--muted", "#c7b588");
+  });
+
+  it("applies no theme variables outside Telegram", () => {
+    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis);
+    const setProperty = vi.fn();
+
+    applyTelegramThemeParams({ style: { setProperty } });
+
+    expect(setProperty).not.toHaveBeenCalled();
   });
 });
diff --git a/apps/telegram-miniapp/src/lib/telegram.ts b/apps/telegram-miniapp/src/lib/telegram.ts
index d295927..01b3739 100644
--- a/apps/telegram-miniapp/src/lib/telegram.ts
+++ b/apps/telegram-miniapp/src/lib/telegram.ts
@@ -13,6 +13,18 @@ export type LaunchContext = {
   };
 };
 
+export type TelegramHapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
+
+export type TelegramThemeParams = {
+  bg_color?: string;
+  text_color?: string;
+  hint_color?: string;
+  link_color?: string;
+  button_color?: string;
+  button_text_color?: string;
+  secondary_bg_color?: string;
+};
+
 declare global {
   interface Window {
     Telegram?: {
@@ -23,6 +35,20 @@ declare global {
         initData?: string;
         ready?: () => void;
         expand?: () => void;
+        BackButton?: {
+          show?: () => void;
+          hide?: () => void;
+          onClick?: (callback: () => void) => void;
+          offClick?: (callback: () => void) => void;
+        };
+        HapticFeedback?: {
+          impactOccurred?: (style: TelegramHapticImpactStyle) => void;
+          notificationOccurred?: (type: "error" | "success" | "warning") => void;
+          selectionChanged?: () => void;
+        };
+        enableClosingConfirmation?: () => void;
+        disableClosingConfirmation?: () => void;
+        themeParams?: TelegramThemeParams;
       };
     };
   }
@@ -80,18 +106,88 @@ export async function waitForTelegramInitData(input: {
   return initData;
 }
 
+export function setTelegramBackButton(onBack: () => void): () => void {
+  const backButton = window.Telegram?.WebApp?.BackButton;
+
+  if (!backButton?.show || !backButton.onClick) {
+    return () => {};
+  }
+
+  backButton.onClick(onBack);
+  backButton.show();
+
+  return () => {
+    backButton.offClick?.(onBack);
+    backButton.hide?.();
+  };
+}
+
+export function triggerTelegramHaptic(style: TelegramHapticImpactStyle = "light") {
+  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
+}
+
+export function setTelegramClosingConfirmation(enabled: boolean) {
+  const webApp = window.Telegram?.WebApp;
+
+  if (enabled) {
+    webApp?.enableClosingConfirmation?.();
+  } else {
+    webApp?.disableClosingConfirmation?.();
+  }
+}
+
+const THEME_PARAM_CSS_VARIABLES: ReadonlyArray<
+  readonly [string, keyof TelegramThemeParams]
+> = [
+  ["--bg", "bg_color"],
+  ["--text", "text_color"],
+  ["--muted", "hint_color"],
+  ["--gold", "button_color"],
+];
+
+export function computeThemeCssVariables(
+  themeParams: TelegramThemeParams,
+): Record<string, string> {
+  const variables: Record<string, string> = {};
+
+  for (const [cssVariable, themeKey] of THEME_PARAM_CSS_VARIABLES) {
+    const value = themeParams[themeKey];
+
+    if (value) {
+      variables[cssVariable] = value;
+    }
+  }
+
+  return variables;
+}
+
+export function applyTelegramThemeParams(
+  root: { style: { setProperty: (name: string, value: string) => void } } = document.documentElement,
+) {
+  const themeParams = window.Telegram?.WebApp?.themeParams ?? {};
+  const variables = computeThemeCssVariables(themeParams);
+
+  for (const [cssVariable, value] of Object.entries(variables)) {
+    root.style.setProperty(cssVariable, value);
+  }
+}
+
 export async function fetchLaunchContext(initData: string): Promise<LaunchContext> {
-  const launchResponse = await fetch(
-    `/api/telegram/launch?initData=${encodeURIComponent(initData)}`,
-  );
+  const launchResponse = await fetch("/api/telegram/launch", {
+    headers: {
+      "x-telegram-init-data": initData,
+    },
+  });
 
   if (!launchResponse.ok) {
     throw new Error("launch validation failed");
   }
 
-  const prefillResponse = await fetch(
-    `/api/telegram/prefill?initData=${encodeURIComponent(initData)}`,
-  );
+  const prefillResponse = await fetch("/api/telegram/prefill", {
+    headers: {
+      "x-telegram-init-data": initData,
+    },
+  });
 
   if (!prefillResponse.ok) {
     throw new Error("profile prefill failed");
=== NEW FILE: apps/telegram-miniapp/src/features/dashboard/MainMenu.spec.tsx ===
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { MainMenu } from "./MainMenu";

const BOTS = [
  {
    id: "document_wizard",
    name: "Cursive",
    description: "Turns notes and source files into polished structured outputs.",
    menuPosition: "top-left",
    capabilities: {
      chat: true,
      citations: false,
      html_report: true,
      pdf_upload: true,
      rag_query: false,
      structured_form: true,
    },
  },
  {
    id: "concierge_general_academy_KB",
    name: "Rori",
    description: "Routes knowledge-base questions across the academy domain.",
    menuPosition: "middle-right",
    capabilities: {
      chat: true,
      citations: true,
      html_report: false,
      pdf_upload: false,
      rag_query: true,
      structured_form: false,
    },
  },
] as unknown as BotCatalogEntry[];

describe("MainMenu", () => {
  it("shows each bot's description before selection, reachable without hovering", () => {
    const markup = renderToStaticMarkup(
      createElement(MainMenu, {
        bots: BOTS,
        onSelect: () => undefined,
        preferredName: "Ada",
      }),
    );

    expect(markup).toContain("menu-specialist-guide");
    expect(markup).toContain(
      "Turns notes and source files into polished structured outputs.",
    );
    expect(markup).toContain(
      "Routes knowledge-base questions across the academy domain.",
    );
  });

  it("includes the description in each hex button's accessible name", () => {
    const markup = renderToStaticMarkup(
      createElement(MainMenu, {
        bots: BOTS,
        onSelect: () => undefined,
        preferredName: "Ada",
      }),
    );

    expect(markup).toContain(
      'aria-label="Open Cursive: Turns notes and source files into polished structured outputs."',
    );
  });
});
=== NEW FILE: apps/telegram-miniapp/src/features/rori/starter-prompts.ts ===
export const RORI_STARTER_PROMPTS: string[] = [
  "How do I enroll?",
  "What workshops are coming up?",
  "Which PBG Telegram rooms should I join?",
  "Which tool should I use for...?",
];
