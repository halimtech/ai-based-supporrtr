// First-run onboarding overlay shown on the dashboard.
export default function OnboardingModal({ dontShowAgain, setDontShowAgain, onDismiss }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Welcome to Core Delight</h2>
        <p className="subtitle">A simple way for teams to make fair, structured decisions together.</p>

        <div className="onboarding-steps">
          <div className="onboarding-step">
            <strong>1. Create or join a voting space</strong>
            <p>Set up a decision topic and invite teammates with a 6-character code.</p>
          </div>
          <div className="onboarding-step">
            <strong>2. Vote</strong>
            <p>Everyone privately rates each option on the criteria that matter. Set your own weights to reflect what you care about.</p>
          </div>
          <div className="onboarding-step">
            <strong>3. Run the analysis</strong>
            <p>The algorithm calculates the fairest group choice and shows how much consensus you have.</p>
          </div>
          <div className="onboarding-step">
            <strong>4. Discuss</strong>
            <p>Use the chat panel to talk through results and next steps with your team.</p>
          </div>
        </div>

        <div className="modal-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            Don't show this again
          </label>
          <button className="secondary-button" onClick={onDismiss} type="button">
            Skip
          </button>
          <button className="primary-button" onClick={onDismiss} type="button">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
