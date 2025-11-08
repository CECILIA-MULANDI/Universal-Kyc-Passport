import './ProgressSteps.css';

export type StepStatus = 'completed' | 'active' | 'pending';

interface Step {
  id: number;
  label: string;
  status: StepStatus;
}

interface ProgressStepsProps {
  steps: Step[];
}

export default function ProgressSteps({ steps }: ProgressStepsProps) {
  return (
    <div className="progress-steps">
      {steps.map((step, index) => (
        <div key={step.id} className="step-item">
          <div className="step-connector">
            {index > 0 && (
              <div
                className={`connector-line ${
                  steps[index - 1].status === 'completed' ? 'completed' : ''
                }`}
              />
            )}
          </div>
          <div className={`step-circle ${step.status}`}>
            {step.status === 'completed' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span>{step.id}</span>
            )}
          </div>
          <div className={`step-label ${step.status}`}>{step.label}</div>
        </div>
      ))}
    </div>
  );
}

