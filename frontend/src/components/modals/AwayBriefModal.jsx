// Popup summarising what changed in a space since the user's last visit.
export default function AwayBriefModal({ data, spaceName, onClose }) {
  const nothingNew = data.new_messages === 0 && data.new_members === 0 && data.new_ratings === 0;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card brief-desc-modal">
        <div className="brief-desc-icon">🔔</div>
        <h2>While you were away</h2>
        <p className="subtitle">{spaceName}</p>
        <ul className="away-brief-list">
          {data.new_messages > 0 ? (
            <li>📨 {data.new_messages} new message{data.new_messages > 1 ? "s" : ""}</li>
          ) : null}
          {data.new_members > 0 ? (
            <li>👤 {data.new_members} new member{data.new_members > 1 ? "s" : ""} joined</li>
          ) : null}
          {data.new_ratings > 0 ? (
            <li>⭐ {data.new_ratings} new rating{data.new_ratings > 1 ? "s" : ""} submitted</li>
          ) : null}
          {nothingNew ? <li>Nothing new since your last visit.</li> : null}
        </ul>
        <button className="primary-button" onClick={onClose} type="button">
          Got it
        </button>
      </div>
    </div>
  );
}
