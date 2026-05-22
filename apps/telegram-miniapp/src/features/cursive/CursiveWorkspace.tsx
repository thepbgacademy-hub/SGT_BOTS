import type { ReactNode } from "react";
import {
  CursiveStepper,
  type CursiveStepperStep as CursiveWorkspaceStep,
} from "./CursiveStepper";
import { CursiveFooter } from "./CursiveFooter";

type CursiveWorkspaceProps = {
  activeStepId: string;
  backLabel?: string;
  children: ReactNode;
  countdownLabel?: string;
  countdownValue?: string | null;
  footerSlot?: ReactNode;
  isBackDisabled?: boolean;
  isNextDisabled?: boolean;
  laneLabel: string;
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  onTitleBack?: () => void;
  steps: CursiveWorkspaceStep[];
  title: string;
};

export type { CursiveWorkspaceProps, CursiveWorkspaceStep };

export function CursiveWorkspace({
  activeStepId,
  backLabel,
  children,
  countdownLabel = "Playground countdown",
  countdownValue,
  footerSlot,
  isBackDisabled,
  isNextDisabled,
  laneLabel,
  nextLabel,
  onBack,
  onNext,
  onTitleBack,
  steps,
  title,
}: CursiveWorkspaceProps) {
  return (
    <section className="cursive-workspace" aria-label="Cursive workspace shell">
      <header className="cursive-workspace__topbar">
        <div className="cursive-workspace__title-row">
          <button
            aria-label="Go back"
            className="cursive-workspace__back"
            onClick={onTitleBack ?? onBack}
            type="button"
          >
            Back
          </button>
          <h2 className="cursive-workspace__title">{title}</h2>
        </div>
        {countdownValue ? (
          <div className="cursive-workspace__countdown" aria-live="polite">
            <span className="cursive-workspace__countdown-label">
              {countdownLabel}
            </span>
            <span className="cursive-workspace__countdown-value">
              {countdownValue}
            </span>
          </div>
        ) : null}
      </header>

      <div className="cursive-workspace__lane-row">
        <p className="cursive-workspace__lane-label">{laneLabel}</p>
      </div>

      <CursiveStepper activeStepId={activeStepId} steps={steps} />

      <main className="cursive-workspace__content">{children}</main>

      <CursiveFooter
        backLabel={backLabel}
        footerSlot={footerSlot}
        isBackDisabled={isBackDisabled}
        isNextDisabled={isNextDisabled}
        nextLabel={nextLabel}
        onBack={onBack}
        onNext={onNext}
      />
    </section>
  );
}
