// Modal for editing a voting space's alternatives and criteria.
export default function EditConfigModal({
  alternatives,
  setAlternatives,
  criteria,
  setCriteria,
  spaceName,
  onSubmit,
  onClose,
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Edit Alternatives & Criteria</h2>
        <p className="subtitle">Update the options and criteria for {spaceName}.</p>
        <form onSubmit={onSubmit} className="create-room-form" style={{ gap: 18 }}>
          <div>
            <h4>Alternatives</h4>
            {alternatives.map((alt, idx) => (
              <div className="inline-form" key={idx}>
                <input value={alt} onChange={(e) => {
                  const next = [...alternatives];
                  next[idx] = e.target.value;
                  setAlternatives(next);
                }} placeholder={`Alternative ${idx + 1}`} required />
                {alternatives.length > 1 ? (
                  <button type="button" className="secondary-button" onClick={() => setAlternatives(alternatives.filter((_, i) => i !== idx))}>Remove</button>
                ) : null}
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={() => setAlternatives([...alternatives, ""])}>Add Alternative</button>
          </div>
          <div>
            <h4>Criteria</h4>
            {criteria.map((c, idx) => (
              <div className="inline-form" key={idx}>
                <input value={c.name} onChange={(e) => {
                  const next = [...criteria];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setCriteria(next);
                }} placeholder="Criterion name" required />
                <input type="number" min="0" max="100" value={c.weight} onChange={(e) => {
                  const next = [...criteria];
                  next[idx] = { ...next[idx], weight: Number(e.target.value) };
                  setCriteria(next);
                }} style={{ width: 80 }} required />
                {criteria.length > 1 ? (
                  <button type="button" className="secondary-button" onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))}>Remove</button>
                ) : null}
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={() => setCriteria([...criteria, { name: "", weight: 20 }])}>Add Criterion</button>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit">Save Changes</button>
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
