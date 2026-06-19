// Modal for editing a voting space's brief description.
export default function EditSpaceModal({ value, setValue, spaceName, onSubmit, onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Edit Voting Space</h2>
        <p className="subtitle">Update the brief description for {spaceName}.</p>
        <form onSubmit={onSubmit} className="create-room-form" style={{ gap: 18 }}>
          <label className="field">
            <span>Brief Description</span>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. We'll be voting about a trip to Egypt..."
              rows={4}
              maxLength={1000}
              className="description-textarea"
            />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit">Save Changes</button>
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
