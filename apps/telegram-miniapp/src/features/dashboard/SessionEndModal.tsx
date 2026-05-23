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
      <h2>Please leave a review</h2>
      <p className="modal-copy">
        {prompt.reason === "timeout"
          ? "Your three-hour playground window has ended."
          : "Thanks for taking the playground for a spin."}
      </p>
      <p className="modal-copy">
        These are just a handful of the tools and gadgets available at the PBG
        Academy to help you learn the proper way to handle business, commerce,
        discharge and more. Please leave us a heartfelt review of the playground
        so others can feel assured they have found the right place to be, to buy
        back their time and accomplish their goals.
      </p>
      <a className="primary-button primary-button--link" href={prompt.reviewUrl} rel="noreferrer" target="_blank">
        Leave your review
      </a>
      </div>
    </section>
  );
}
