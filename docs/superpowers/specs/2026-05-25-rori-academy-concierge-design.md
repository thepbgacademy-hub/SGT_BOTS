# Rori Academy Concierge Design

## Purpose

Rori is the PBG Academy concierge for the Telegram Playground. Rori answers general Academy support questions, helps users find the correct Academy resource, and routes bot-specific work to the correct Playground tool.

Rori is a chat-only mini app experience. It does not accept document uploads, process PDFs, create reports, or run structured intake workflows.

## Bot Role

Rori acts like the Academy front desk. The tone should be warm, informal, clear, and practical. Rori should answer directly when the question is about the Academy, enrollment, workshops, events, Telegram rooms, or general navigation.

When the user asks for work outside Rori's role, Rori should route them to the right tool instead of attempting the work.

## Supported Topics

Rori V1 supports:

- Enrollment questions.
- Workshop and event questions.
- How to register or where to register for workshops and events.
- General PBG Academy questions.
- Telegram troubleshooting.
- Explaining which PBG Telegram rooms are for what purpose.
- Helping users choose the correct Playground tool for their task.

## Out Of Scope

Rori V1 must not:

- Process documents.
- Accept PDF uploads.
- Generate PDF reports.
- Fact-check online claims.
- Draft credit dispute letters.
- Perform tax or legal research.
- Complete workshop or event registration inside the chat.

For V1, Rori explains the next registration step and sends the user toward the correct registration link or process. Actual registration intake can be added later after the event data source and attendee record system are confirmed.

## Routing Rules

Rori should route users this way:

- Credit disputes, bureau letters, and uploaded credit reports: route to Cursive.
- Online claim checking, internet myths, and fact verification: route to Top Secret.
- Tax or legal research: route to Condor.
- Forms or structured document collection: route to ShAzZaM when it is the better fit.
- General Academy help, enrollment, workshops, rooms, and Telegram support: answer in Rori.

If the user asks something unrelated to the Academy or Playground tools, Rori should politely bring the conversation back to Academy support and ask what they need help finding.

## Mini App Experience

Rori opens from its existing Rori menu hex. The workspace should be dedicated to chat and should not show document upload, report generation, or artifact language.

The UI should borrow the Top Secret layout family:

- Same dark brown or near-black background.
- Cream text.
- Rounded cards, windows, and buttons.
- A quiet instruction section.
- A large chat viewer.
- A message composer at the bottom.
- A small, non-technical capability row may be shown for orientation, using plain labels such as `Enrollment`, `Workshops`, `Telegram rooms`, and `Tool routing`.

Rori uses purple accents instead of Top Secret scarlet:

- Dark purple for borders and inactive outlines.
- Lighter purple for primary buttons and active states.
- The purple palette should feel calm and Academy-support oriented, not neon.
- Purple should be an accent over the brown Academy background, not the dominant page color.

## Screen Content

Header:

- Title: `Rori`
- Helper text: `Ask about the Academy, workshops, enrollment, or Telegram rooms.`

Starter prompts:

- `How do I enroll?`
- `What workshops are coming up?`
- `Which PBG Telegram rooms should I join?`
- `Which tool should I use for...?`

Chat composer:

- Placeholder: `Ask Rori about the Academy...`
- Primary button: `Send`

Back control:

- A rounded `Back` button returns the user to the main Playground menu.

## Backend Behavior

Rori should use the existing chat runtime path rather than the report routes. The existing manifest id is `concierge_general_academy_KB`, with chat and knowledge-base capabilities already enabled.

The Rori runtime response should be specific to Academy concierge support. It should not use generic release-runbook language or placeholder citations.

V1 may use a bounded local response policy if a live Academy knowledge source is not yet available. The response policy should still be structured so a future Academy KB retrieval layer can replace or enrich it without changing the mini app UI.

## Data Flow

1. User opens Rori from the main menu.
2. The mini app renders the Rori chat workspace.
3. User types or taps a starter prompt.
4. The existing chat endpoint receives `botId: "concierge_general_academy_KB"`.
5. The chat service returns a Rori-specific response.
6. The mini app appends the user message and assistant response to the Rori conversation.

Rori does not create artifacts. It does not write report files. It does not use the Top Secret or Cursive report routes.

## Error Handling

If chat send fails, show a plain message in the Rori chat workspace:

`Rori could not answer right now. Please try again.`

If the session is expired, keep the existing Playground session behavior.

If the user asks to register for an event and no registration link is configured, Rori should say that it can explain the next step but does not have the live registration link available in this demo.

## Testing

Backend tests should verify:

- Rori uses the chat runtime.
- Rori answers Academy concierge questions with Academy-specific language.
- Rori routes Cursive, Top Secret, Condor, and ShAzZaM requests instead of attempting those workflows.
- Rori does not expose report, PDF, upload, or artifact language.

Frontend tests should verify:

- Rori opens a dedicated chat workspace.
- The starter prompts render exactly as specified.
- The visual class/palette is Rori-specific and does not reuse Top Secret scarlet button classes.
- Sending a message appends user and assistant messages.
- No upload/report/artifact section appears in the Rori workspace.

## Acceptance Criteria

Rori V1 is complete when:

- The Rori menu hex opens the Rori workspace.
- The workspace is chat-first and does not show document/report controls.
- The UI uses the Top Secret dark background family with purple accents.
- The starter prompts are visible and use the approved wording.
- Rori answers Academy support questions in a helpful concierge tone.
- Rori routes specialized requests to the correct tool.
- Relevant backend and frontend tests pass.
