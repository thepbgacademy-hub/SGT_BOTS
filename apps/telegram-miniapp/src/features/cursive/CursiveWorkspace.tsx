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
  footerSlot?: ReactNode;
  hideFooter?: boolean;
  isBackDisabled?: boolean;
  isNextDisabled?: boolean;
  laneLabel: string;
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  steps: CursiveWorkspaceStep[];
};

export type { CursiveWorkspaceProps, CursiveWorkspaceStep };

export function CursiveWorkspace({
  activeStepId,
  backLabel,
  children,
  footerSlot,
  hideFooter = false,
  isBackDisabled,
  isNextDisabled,
  laneLabel,
  nextLabel,
  onBack,
  onNext,
  steps,
}: CursiveWorkspaceProps) {
  return (
    <section className="cursive-workspace" aria-label="Cursive workspace shell">
      <div className="cursive-workspace__lane-row">
        <p className="cursive-workspace__lane-label">{laneLabel}</p>
      </div>

      <CursiveStepper activeStepId={activeStepId} steps={steps} />

      <main className="cursive-workspace__content">{children}</main>

      {hideFooter ? null : (
        <CursiveFooter
          backLabel={backLabel}
          footerSlot={footerSlot}
          isBackDisabled={isBackDisabled}
          isNextDisabled={isNextDisabled}
          nextLabel={nextLabel}
          onBack={onBack}
          onNext={onNext}
        />
      )}
    </section>
  );
}
