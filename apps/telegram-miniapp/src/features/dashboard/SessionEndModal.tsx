export type SessionEndPrompt = {
  reason: "early_exit" | "timeout";
  reviewUrl: string;
};

type SessionEndModalProps = {
  prompt: SessionEndPrompt;
};

export function SessionEndModal({ prompt }: SessionEndModalProps) {
  return (
    <section aria-label="Session end review" className="modal-shell">
      <div className="modal-card">
      <p className="eyebrow">Session Complete</p>
      <p className="modal-kicker">Your playground session has ended.</p>
      <h2>Leave a review</h2>
      <p className="modal-copy">
        {prompt.reason === "timeout"
          ? "Your three-hour playground window has ended."
          : "Thanks for taking the playground for a spin."}
      </p>
      <a className="primary-button primary-button--link" href={prompt.reviewUrl} rel="noreferrer" target="_blank">
        Open review group
      </a>
      </div>
    </section>
  );
}
