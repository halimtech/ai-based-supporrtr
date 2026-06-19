// Post-registration welcome screen.
export default function IntroView({ onGetStarted }) {
  return (
    <div className="app-shell auth-shell">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h1>Welcome to Core Delight</h1>
        <p className="subtitle">Make better group decisions, together.</p>
        <div className="intro-content" style={{ display: "grid", gap: 18 }}>
          <div className="intro-step">
            <strong>1. Create or join a voting space</strong>
            <p className="subtitle">Start a voting space and invite others with a simple code.</p>
          </div>
          <div className="intro-step">
            <strong>2. Vote on criteria and alternatives</strong>
            <p className="subtitle">Everyone sets their own weights and rates each option privately.</p>
          </div>
          <div className="intro-step">
            <strong>3. See the group result</strong>
            <p className="subtitle">Our algorithm finds the fairest option and shows consensus insights.</p>
          </div>
          <div className="intro-step">
            <strong>4. Chat in the chat panel</strong>
            <p className="subtitle">Use the chat panel to talk things through after seeing the results.</p>
          </div>
        </div>
        <button className="primary-button" onClick={onGetStarted} type="button">
          Get Started
        </button>
      </div>
    </div>
  );
}
