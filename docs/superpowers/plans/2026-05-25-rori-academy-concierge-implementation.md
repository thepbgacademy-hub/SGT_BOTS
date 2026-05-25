# Rori Academy Concierge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build Rori V1 as a chat-only Academy concierge workspace with purple Top Secret-style UI and Rori-specific routing replies.

**Architecture:** Reuse the existing bot manifest, chat endpoint, and conversation state. Add a dedicated Rori mini-app workspace that uses the existing `ChatPanel` send path without upload/report/artifact UI, and specialize the API chat reply for `concierge_general_academy_KB`.

**Tech Stack:** pnpm workspaces, TypeScript, React, Fastify chat service, Vitest, React server render tests, existing Telegram mini-app CSS.

---

## File Structure

- Modify `apps/api/src/modules/chat/chat.service.ts`: replace Rori's generic knowledge-base reply with Academy concierge-specific replies and routing.
- Modify `apps/api/tests/e2e/bot-runtime.spec.ts`: add backend tests for Rori Academy answers and routing behavior.
- Create `apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx`: dedicated Rori chat workspace with starter prompts and no report/artifact lane.
- Create `apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx`: render tests for prompt copy, chat-only surface, and no artifact/report language.
- Modify `apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx`: route the Rori manifest id to `RoriWorkspace`.
- Modify `apps/telegram-miniapp/src/features/chat/ChatPanel.tsx`: allow Rori-specific placeholder, empty state, starter prompts, and error copy through optional props.
- Modify `apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx`: cover optional starter prompts and custom placeholder behavior.
- Modify `apps/telegram-miniapp/src/app/app.css`: add Rori purple theme classes while keeping Top Secret scarlet untouched.

---

### Task 1: Backend Rori Reply Policy

**Files:**
- Modify: `apps/api/src/modules/chat/chat.service.ts`
- Modify: `apps/api/tests/e2e/bot-runtime.spec.ts`

- [x] **Step 1: Write failing backend tests for Rori Academy replies**

Add tests to `apps/api/tests/e2e/bot-runtime.spec.ts` inside the existing bot runtime route suite:

```ts
it("returns Rori Academy concierge replies for enrollment questions", async () => {
  const { app, sessionId, sessionToken } = await createAuthorizedSession();

  const response = await app.inject({
    method: "POST",
    url: "/api/chat/messages",
    headers: {
      authorization: `Bearer ${sessionToken}`,
    },
    payload: {
      botId: "concierge_general_academy_KB",
      message: "How do I enroll?",
      sessionId,
    },
  });
  const payload = response.json() as {
    output: string;
    citations: Array<{ title: string; url: string }>;
  };

  expect(response.statusCode).toBe(200);
  expect(payload.output).toContain("enroll");
  expect(payload.output).toContain("PBG Academy");
  expect(payload.output).not.toContain("Release Review Runbook");
  expect(payload.output).not.toContain("PDF");
  expect(payload.citations).toEqual([]);

  await app.close();
}, 40000);

it("routes specialized Rori requests to the correct Playground tool", async () => {
  const { app, sessionId, sessionToken } = await createAuthorizedSession();

  const cases = [
    {
      message: "Can you help me dispute a credit report account?",
      expectedTool: "Cursive",
    },
    {
      message: "Can you fact check this online claim?",
      expectedTool: "Top Secret",
    },
    {
      message: "Can you research a tax statute for me?",
      expectedTool: "Condor",
    },
    {
      message: "Can you collect form answers for a document?",
      expectedTool: "ShAzZaM",
    },
  ];

  for (const testCase of cases) {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat/messages",
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
      payload: {
        botId: "concierge_general_academy_KB",
        message: testCase.message,
        sessionId,
      },
    });
    const payload = response.json() as { output: string };

    expect(response.statusCode).toBe(200);
    expect(payload.output).toContain(testCase.expectedTool);
    expect(payload.output).not.toContain("Release Review Runbook");
  }

  await app.close();
}, 40000);
```

- [x] **Step 2: Run backend tests and verify they fail**

Run:

```powershell
corepack pnpm --filter ./apps/api exec vitest run tests/e2e/bot-runtime.spec.ts
```

Expected: the new Rori tests fail because `buildKnowledgeBaseReply` still returns generic release-runbook language for Rori.

- [x] **Step 3: Implement Rori-specific reply builder**

In `apps/api/src/modules/chat/chat.service.ts`, add:

```ts
function buildRoriReply(manifest: BotManifest, content: string): RuntimeReply {
  requireCapability(manifest, "chat");
  requireCapability(manifest, "citations");
  requireCapability(manifest, "rag_query");
  requireSourceBinding(manifest, "knowledge_base");
  requireToolPermission(manifest, "knowledge_base_search");

  const normalizedContent = content.toLowerCase();
  const route = getRoriToolRoute(normalizedContent);

  if (route) {
    return {
      output: `${route.tool} is the better tool for that. ${route.reason} Rori can still help you find your way around the Academy, workshops, enrollment, and Telegram rooms.`,
      citations: [],
    };
  }

  if (/\benroll|enrollment|join academy|sign up|signup\b/iu.test(content)) {
    return {
      output:
        "For enrollment, start with the current PBG Academy enrollment path. Rori can help you understand what to look for, what room or workshop fits your goal, and where to go next inside the Academy.",
      citations: [],
    };
  }

  if (/\bworkshop|event|class|register|registration\b/iu.test(content)) {
    return {
      output:
        "For workshops and events, Rori can explain the next step and point you toward the correct registration process. In this demo, Rori does not complete registration inside chat.",
      citations: [],
    };
  }

  if (/\btelegram|room|rooms|channel|group|chat\b/iu.test(content)) {
    return {
      output:
        "For Telegram help, tell Rori what you are trying to do and Rori will help you identify which PBG Telegram room fits that purpose. If a room link is not available in this demo, Rori will say so plainly.",
      citations: [],
    };
  }

  return {
    output:
      "Rori helps with PBG Academy questions, enrollment, workshops, events, Telegram rooms, and choosing the right Playground tool. Tell me what you are trying to do and I will point you in the right direction.",
    citations: [],
  };
}

function getRoriToolRoute(normalizedContent: string) {
  if (
    /\bcredit report|bureau|dispute|tradeline|account not mine|fcra\b/iu.test(
      normalizedContent,
    )
  ) {
    return {
      tool: "Cursive",
      reason:
        "Cursive is built for credit-report review, dispute letters, and bureau-facing document workflows.",
    };
  }

  if (/\bfact check|true|false|claim|myth|verify|verification\b/iu.test(normalizedContent)) {
    return {
      tool: "Top Secret",
      reason:
        "Top Secret is built to review online claims and separate reliable evidence from popular online beliefs.",
    };
  }

  if (/\btax|legal|statute|usc|cfr|law|irs|treasury\b/iu.test(normalizedContent)) {
    return {
      tool: "Condor",
      reason:
        "Condor is built for tax and legal research questions that need source-grounded analysis.",
    };
  }

  if (/\bform|intake|collect|questionnaire|document answers\b/iu.test(normalizedContent)) {
    return {
      tool: "ShAzZaM",
      reason:
        "ShAzZaM is built for structured forms and guided information collection.",
    };
  }

  return null;
}
```

Then update the `buildRuntimeReply` switch:

```ts
case "concierge_general_academy_KB":
  return buildRoriReply(manifest, trimmedContent);
```

- [x] **Step 4: Run backend tests and verify they pass**

Run:

```powershell
corepack pnpm --filter ./apps/api exec vitest run tests/e2e/bot-runtime.spec.ts
```

Expected: all bot runtime tests pass.

- [x] **Step 5: Run API type check**

Run:

```powershell
corepack pnpm --filter ./apps/api lint
```

Expected: `tsc --project tsconfig.json --noEmit` passes.

---

### Task 2: ChatPanel Customization Hooks

**Files:**
- Modify: `apps/telegram-miniapp/src/features/chat/ChatPanel.tsx`
- Modify: `apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx`

- [x] **Step 1: Write failing ChatPanel tests**

Add to `apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx`:

```tsx
it("renders custom starter prompts and placeholder when provided", () => {
  const markup = renderToStaticMarkup(
    <ChatPanel
      bot={roriBot}
      conversationId={undefined}
      emptyStateCopy="Ask Rori about the Academy, workshops, enrollment, or Telegram rooms."
      messages={[]}
      onArtifactQueued={() => undefined}
      onConversationUpdate={() => undefined}
      placeholder="Ask Rori about the Academy..."
      sessionId="session-1"
      sessionToken="token-1"
      starterPrompts={[
        "How do I enroll?",
        "What workshops are coming up?",
        "Which PBG Telegram rooms should I join?",
        "Which tool should I use for...?",
      ]}
    />,
  );

  expect(markup).toContain("Ask Rori about the Academy...");
  expect(markup).toContain("How do I enroll?");
  expect(markup).toContain("Which PBG Telegram rooms should I join?");
  expect(markup).toContain("Which tool should I use for...?");
  expect(markup).not.toContain("Start the conversation here.");
});
```

If the test file lacks a Rori bot fixture, add:

```ts
const roriBot = {
  id: "concierge_general_academy_KB",
  name: "Rori",
  description: "Routes knowledge-base questions across the academy domain.",
  menuPosition: "middle-right",
  capabilities: createBotCapabilities({
    chat: true,
    citations: true,
    html_report: false,
    pdf_upload: false,
    rag_query: true,
    structured_form: false,
  }),
  sourceBinding: "knowledge_base",
} satisfies BotCatalogEntry;
```

- [x] **Step 2: Run ChatPanel tests and verify they fail**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/chat/ChatPanel.spec.tsx
```

Expected: TypeScript/render failure because `ChatPanel` does not yet accept the new props.

- [x] **Step 3: Add optional ChatPanel props**

In `apps/telegram-miniapp/src/features/chat/ChatPanel.tsx`, extend `ChatPanelProps`:

```ts
  emptyStateCopy?: string;
  placeholder?: string;
  starterPrompts?: string[];
```

Update the component signature:

```ts
  emptyStateCopy,
  placeholder = "Ask a question or describe what you need...",
  starterPrompts = [],
```

Replace the textarea placeholder with:

```tsx
placeholder={placeholder}
```

Replace the empty-state copy with:

```tsx
{emptyStateCopy ??
  "Start the conversation here. Each bot stays inside its assigned lane and only returns user-facing results."}
```

Render starter prompts above the form:

```tsx
{starterPrompts.length ? (
  <div className="starter-prompts" aria-label="Suggested questions">
    {starterPrompts.map((prompt) => (
      <button
        className="starter-prompt-button"
        key={prompt}
        onClick={() => setMessage(prompt)}
        type="button"
      >
        {prompt}
      </button>
    ))}
  </div>
) : null}
```

- [x] **Step 4: Run ChatPanel tests and verify they pass**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/chat/ChatPanel.spec.tsx
```

Expected: all ChatPanel tests pass.

---

### Task 3: Rori Workspace Component

**Files:**
- Create: `apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx`
- Create: `apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx`

- [x] **Step 1: Write failing RoriWorkspace render tests**

Create `apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createBotCapabilities } from "../../../../../packages/shared/src/bots/capabilities";
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { RoriWorkspace } from "./RoriWorkspace";

const roriBot = {
  id: "concierge_general_academy_KB",
  name: "Rori",
  description: "Routes knowledge-base questions across the academy domain.",
  menuPosition: "middle-right",
  capabilities: createBotCapabilities({
    chat: true,
    citations: true,
    html_report: false,
    pdf_upload: false,
    rag_query: true,
    structured_form: false,
  }),
  sourceBinding: "knowledge_base",
} satisfies BotCatalogEntry;

describe("RoriWorkspace", () => {
  it("renders the Rori concierge chat surface without report or upload language", () => {
    const markup = renderToStaticMarkup(
      <RoriWorkspace
        bot={roriBot}
        conversationId={undefined}
        messages={[]}
        onBackToMenu={() => undefined}
        onConversationUpdate={() => undefined}
        sessionId="session-1"
        sessionToken="token-1"
      />,
    );

    expect(markup).toContain("Rori");
    expect(markup).toContain(
      "Ask about the Academy, workshops, enrollment, or Telegram rooms.",
    );
    expect(markup).toContain("How do I enroll?");
    expect(markup).toContain("What workshops are coming up?");
    expect(markup).toContain("Which PBG Telegram rooms should I join?");
    expect(markup).toContain("Which tool should I use for...?");
    expect(markup).toContain("Ask Rori about the Academy...");
    expect(markup).toContain("rori-shell");
    expect(markup).not.toContain("PDF");
    expect(markup).not.toContain("Report section");
    expect(markup).not.toContain("Upload");
    expect(markup).not.toContain("artifact");
  });
});
```

- [x] **Step 2: Run RoriWorkspace test and verify it fails**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/rori/RoriWorkspace.spec.tsx
```

Expected: fails because `RoriWorkspace.tsx` does not exist.

- [x] **Step 3: Implement RoriWorkspace**

Create `apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx`:

```tsx
import type { BotCatalogEntry } from "../../../../../packages/shared/src/bots/manifests";
import { ChatPanel, type ChatMessage } from "../chat/ChatPanel";

type RoriWorkspaceProps = {
  bot: BotCatalogEntry;
  conversationId?: string;
  messages: ChatMessage[];
  onBackToMenu: () => void;
  onConversationUpdate: (input: {
    conversationId: string;
    messages: ChatMessage[];
  }) => void;
  sessionId: string;
  sessionToken: string;
};

const RORI_STARTER_PROMPTS = [
  "How do I enroll?",
  "What workshops are coming up?",
  "Which PBG Telegram rooms should I join?",
  "Which tool should I use for...?",
];

export function RoriWorkspace({
  bot,
  conversationId,
  messages,
  onBackToMenu,
  onConversationUpdate,
  sessionId,
  sessionToken,
}: RoriWorkspaceProps) {
  return (
    <div className="rori-shell">
      <section className="rori-card rori-intro-card">
        <button className="secondary-button rori-back-button" onClick={onBackToMenu} type="button">
          Back
        </button>
        <div>
          <p className="eyebrow">Academy concierge</p>
          <h2>Rori</h2>
          <p className="panel-description">
            Ask about the Academy, workshops, enrollment, or Telegram rooms.
          </p>
        </div>
      </section>
      <section className="rori-card rori-chat-card">
        <ChatPanel
          bot={bot}
          conversationId={conversationId}
          emptyStateCopy="Ask Rori about the Academy, workshops, enrollment, or Telegram rooms."
          messages={messages}
          onArtifactQueued={() => undefined}
          onConversationUpdate={onConversationUpdate}
          placeholder="Ask Rori about the Academy..."
          sessionId={sessionId}
          sessionToken={sessionToken}
          starterPrompts={RORI_STARTER_PROMPTS}
        />
      </section>
    </div>
  );
}
```

- [x] **Step 4: Run RoriWorkspace test and verify it passes**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/rori/RoriWorkspace.spec.tsx
```

Expected: test passes.

---

### Task 4: Dashboard Route Rori To The Dedicated Workspace

**Files:**
- Modify: `apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx`
- Modify: `apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx`

- [x] **Step 1: Add DashboardShell wiring**

In `apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx`, add the import:

```ts
import { RoriWorkspace } from "../rori/RoriWorkspace";
```

Near the existing workspace checks, add:

```ts
const isRoriWorkspace = selectedBot?.id === "concierge_general_academy_KB";
```

In the selected workspace render branch, add a Rori branch after Top Secret:

```tsx
) : isRoriWorkspace ? (
  <RoriWorkspace
    bot={selectedBot}
    conversationId={selectedConversation?.conversationId}
    messages={selectedConversation?.messages ?? []}
    onBackToMenu={handleBackToMenu}
    onConversationUpdate={({ conversationId, messages }) => {
      if (!selectedBot) {
        return;
      }

      setConversations((currentConversations) => ({
        ...currentConversations,
        [selectedBot.id]: {
          conversationId,
          messages,
        },
      }));
    }}
    sessionId={session.id}
    sessionToken={sessionToken}
  />
```

- [x] **Step 2: Run mini-app tests**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp test
```

Expected: existing mini-app tests pass or expose only tests that need updated snapshots/assertions for Rori routing.

---

### Task 5: Rori Purple Styling

**Files:**
- Modify: `apps/telegram-miniapp/src/app/app.css`
- Modify: `apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx`

- [x] **Step 1: Add CSS class assertions**

Extend the RoriWorkspace test:

```ts
expect(markup).toContain("rori-card");
expect(markup).toContain("rori-chat-card");
expect(markup).not.toContain("top-secret-shell");
expect(markup).not.toContain("top-secret-card");
```

- [x] **Step 2: Add Rori CSS**

Add to `apps/telegram-miniapp/src/app/app.css` near the Top Secret styles:

```css
.rori-shell {
  --rori-border: #5b3f8f;
  --rori-border-strong: #7d5bc7;
  --rori-button: #7d5bc7;
  --rori-button-soft: #bba0ff;
  --rori-text: #f7ecd2;
  background: var(--top-secret-bg, #120d08);
  color: var(--rori-text);
  display: grid;
  gap: 16px;
}

.rori-card {
  background: rgba(18, 13, 8, 0.94);
  border: 1px solid var(--rori-border);
  border-radius: 16px;
  color: var(--rori-text);
  padding: 16px;
}

.rori-intro-card {
  align-items: flex-start;
  display: grid;
  gap: 14px;
}

.rori-back-button {
  border-color: var(--rori-border);
  color: var(--rori-text);
  justify-self: start;
}

.rori-chat-card .chat-panel {
  background: transparent;
  border-color: var(--rori-border);
  border-radius: 16px;
  color: var(--rori-text);
}

.rori-chat-card .chat-panel textarea,
.rori-chat-card .chat-panel input {
  border-color: var(--rori-border);
  border-radius: 14px;
}

.rori-chat-card .primary-button {
  background: linear-gradient(135deg, var(--rori-button), var(--rori-button-soft));
  border-color: var(--rori-button);
  color: #130b1f;
}

.starter-prompts {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 12px 0;
}

.starter-prompt-button {
  background: rgba(125, 91, 199, 0.12);
  border: 1px solid var(--rori-border);
  border-radius: 999px;
  color: var(--rori-text);
  cursor: pointer;
  font: inherit;
  padding: 10px 12px;
  text-align: left;
}

.starter-prompt-button:hover,
.starter-prompt-button:focus-visible {
  border-color: var(--rori-border-strong);
  outline: none;
}
```

- [x] **Step 3: Run focused frontend tests**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp exec vitest run src/features/chat/ChatPanel.spec.tsx src/features/rori/RoriWorkspace.spec.tsx
```

Expected: focused tests pass.

---

### Task 6: Browser Verification

**Files:**
- No source changes expected unless visual bugs are found.

- [x] **Step 1: Start the mini-app dev server**

Run:

```powershell
corepack pnpm --filter ./apps/telegram-miniapp dev -- --host 127.0.0.1
```

Expected: Vite serves the mini app on a local port.

- [x] **Step 2: Open the app and select Rori**

Use the Browser plugin or Playwright CLI to open the local URL. If authentication/session setup blocks direct Rori access, use the repo's existing test harness or seeded launch path used by current mini-app verification.

Expected visual checks:

- Rori opens from the main hex.
- Rori uses dark Top Secret-like background with purple accents.
- Starter prompts show:
  - `How do I enroll?`
  - `What workshops are coming up?`
  - `Which PBG Telegram rooms should I join?`
  - `Which tool should I use for...?`
- The chat input placeholder is `Ask Rori about the Academy...`.
- No upload, report, PDF, or artifact section appears.
- Back returns to the main menu.

- [x] **Step 3: Send a chat message**

Send:

```text
How do I enroll?
```

Expected:

- The user message appears in the chat viewer.
- Rori responds with Academy/enrollment language.
- The response does not mention release runbooks, PDFs, artifacts, or report generation.

---

### Task 7: Final Quality Gate

**Files:**
- Review all files touched in Tasks 1-6.

- [x] **Step 1: Run full relevant checks**

Run:

```powershell
corepack pnpm --filter ./apps/api lint
corepack pnpm --filter ./apps/telegram-miniapp lint
corepack pnpm --filter ./apps/api exec vitest run tests/e2e/bot-runtime.spec.ts
corepack pnpm --filter ./apps/telegram-miniapp test
```

Expected: all commands pass.

- [x] **Step 2: Review for scope creep**

Check:

- No Cursive routes or report routes were changed.
- No Top Secret report behavior was changed.
- Rori does not create artifacts.
- Rori uses `concierge_general_academy_KB`.
- Starter prompt wording matches the spec exactly.
- Purple styling is scoped to `.rori-*` and starter prompt classes.

- [x] **Step 3: Commit**

Stage only Rori-related implementation files and tests:

```powershell
git add apps/api/src/modules/chat/chat.service.ts apps/api/tests/e2e/bot-runtime.spec.ts apps/telegram-miniapp/src/features/chat/ChatPanel.tsx apps/telegram-miniapp/src/features/chat/ChatPanel.spec.tsx apps/telegram-miniapp/src/features/rori/RoriWorkspace.tsx apps/telegram-miniapp/src/features/rori/RoriWorkspace.spec.tsx apps/telegram-miniapp/src/features/dashboard/DashboardShell.tsx apps/telegram-miniapp/src/app/app.css docs/superpowers/plans/2026-05-25-rori-academy-concierge-implementation.md
git commit -m "feat: add rori academy concierge workspace"
```

Expected: commit succeeds without staging unrelated Top Secret work unless the user explicitly asks to include it.

---

## Self-Review

Spec coverage:

- Chat-only Rori workspace: Tasks 2-5.
- Purple Top Secret-style visual treatment: Task 5.
- Starter prompt copy: Tasks 2-3.
- Existing chat runtime reuse: Tasks 1 and 4.
- Rori-specific Academy support replies: Task 1.
- Routing to Cursive, Top Secret, Condor, and ShAzZaM: Task 1.
- No upload/report/artifact UI: Tasks 3, 5, and 7.
- Tests and browser verification: Tasks 1-7.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps remain.

Type consistency:

- Rori bot id is consistently `concierge_general_academy_KB`.
- Rori workspace props use existing `BotCatalogEntry` and `ChatMessage` types.
- ChatPanel additions are optional and preserve existing callers.
