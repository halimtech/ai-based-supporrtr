// Popup showing the voting space's brief description on entry.
export default function BriefDescriptionModal({ spaceName, description, onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card brief-desc-modal">
        <div className="brief-desc-icon">📋</div>
        <h2>Brief Description</h2>
        <p className="subtitle">{spaceName}</p>
        <div className="brief-desc-content">
          <p>{description}</p>
        </div>
        <button className="primary-button" onClick={onClose} type="button">
          Click to Continue
        </button>
      </div>
    </div>
  );
}
