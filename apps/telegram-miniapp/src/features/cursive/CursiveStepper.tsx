type CursiveStepperStep = {
  id: string;
  label: string;
};

type CursiveStepperProps = {
  activeStepId: string;
  steps: CursiveStepperStep[];
};

export type { CursiveStepperStep };

export function CursiveStepper({
  activeStepId,
  steps,
}: CursiveStepperProps) {
  return (
    <nav aria-label="Cursive steps" className="cursive-workspace-stepper">
      <ol className="cursive-workspace-stepper__list">
        {steps.map((step, index) => {
          const isActive = step.id === activeStepId;

          return (
            <li className="cursive-workspace-stepper__item" key={step.id}>
              <span
                aria-current={isActive ? "step" : undefined}
                className={[
                  "cursive-workspace-stepper__pill",
                  isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="cursive-workspace-stepper__index">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span>{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
