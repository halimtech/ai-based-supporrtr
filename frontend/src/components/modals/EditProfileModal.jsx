// Modal for changing the current user's display name.
export default function EditProfileModal({ editName, setEditName, onSubmit, onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Edit Profile</h2>
        <p className="subtitle">Update your display name.</p>
        <form onSubmit={onSubmit} className="create-room-form" style={{ gap: 18 }}>
          <label className="field">
            <span>Name</span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Your display name"
              required
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
