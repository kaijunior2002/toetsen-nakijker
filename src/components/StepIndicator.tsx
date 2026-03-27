interface Props {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ['Toets', 'Leerlingen', 'Nakijken', 'Resultaten'];

export default function StepIndicator({ currentStep, totalSteps }: Props) {
  return (
    <div style={{ padding: '16px 0 8px' }}>
      <div className="step-indicator">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className={`step-dot ${step < currentStep ? 'done' : step === currentStep ? 'active' : ''}`}>
              {step < currentStep ? '✓' : step}
            </div>
            {i < totalSteps - 1 && (
              <div className={`step-line ${step < currentStep ? 'done' : ''}`} />
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        Stap {currentStep} van {totalSteps} — {stepLabels[currentStep - 1]}
      </div>
    </div>
  );
}
