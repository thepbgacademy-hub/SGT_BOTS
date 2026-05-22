import type { ReactNode } from "react";

type CursiveFooterProps = {
  backLabel?: string;
  footerSlot?: ReactNode;
  isBackDisabled?: boolean;
  isNextDisabled?: boolean;
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
};

export function CursiveFooter({
  backLabel = "Back",
  footerSlot,
  isBackDisabled = false,
  isNextDisabled = false,
  nextLabel = "Next",
  onBack,
  onNext,
}: CursiveFooterProps) {
  return (
    <footer className="cursive-workspace-footer">
      <button
        className="secondary-button cursive-workspace-footer__button"
        disabled={isBackDisabled}
        onClick={onBack}
        type="button"
      >
        {backLabel}
      </button>
      {footerSlot ? (
        <div className="cursive-workspace-footer__slot">{footerSlot}</div>
      ) : (
        <div aria-hidden="true" className="cursive-workspace-footer__slot" />
      )}
      <button
        className="primary-button cursive-workspace-footer__button"
        disabled={isNextDisabled}
        onClick={onNext}
        type="button"
      >
        {nextLabel}
      </button>
    </footer>
  );
}
