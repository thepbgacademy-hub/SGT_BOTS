export type SessionEndPrompt = {
  reason: "early_exit" | "timeout";
  reviewUrl: string;
};

type SessionEndModalProps = {
  prompt: SessionEndPrompt;
};

export function SessionEndModal({ prompt }: SessionEndModalProps) {
  return (
    <section aria-label="Session end review">
      <p>Your playground session has ended.</p>
      <h2>Leave a review</h2>
      <p>
        {prompt.reason === "timeout"
          ? "Your three-hour playground window has ended."
          : "Thanks for taking the playground for a spin."}
      </p>
      <a href={prompt.reviewUrl} rel="noreferrer" target="_blank">
        Open review group
      </a>
    </section>
  );
}
