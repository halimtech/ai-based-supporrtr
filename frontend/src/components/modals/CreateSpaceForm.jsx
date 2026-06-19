// Inline panel (on the dashboard) for creating a new voting space.
export default function CreateSpaceForm({
  spaceName,
  setSpaceName,
  spaceTitle,
  setSpaceTitle,
  spaceDescription,
  setSpaceDescription,
  spaceAlternatives,
  setSpaceAlternatives,
  spaceCriteria,
  setSpaceCriteria,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="section-heading">
        <h2>Create a Voting Space</h2>
        <p>Set up the trip decision and invite others with the voting space code.</p>
      </div>
      <form onSubmit={onSubmit} className="create-room-form">
        <div className="two-columns">
          <label className="field">
            <span>Voting Space Name</span>
            <input value={spaceName} onChange={(e) => setSpaceName(e.target.value)} placeholder="e.g. Summer Trip 2025" required />
          </label>
          <label className="field">
            <span>Decision Question</span>
            <input value={spaceTitle} onChange={(e) => setSpaceTitle(e.target.value)} placeholder="e.g. Where should we travel?" required />
          </label>
        </div>
        <label className="field">
          <span>Brief Description</span>
          <textarea
            value={spaceDescription}
            onChange={(e) => setSpaceDescription(e.target.value)}
            placeholder="e.g. We'll be voting about a trip to Egypt. The voting will include budget, food, and accommodation options."
            rows={3}
            maxLength={1000}
            className="description-textarea"
          />
        </label>
        <div className="two-columns">
          <div>
            <h4>Alternatives</h4>
            {spaceAlternatives.map((alt, idx) => (
              <div className="inline-form" key={idx}>
                <input value={alt} onChange={(e) => {
                  const next = [...spaceAlternatives];
                  next[idx] = e.target.value;
                  setSpaceAlternatives(next);
                }} placeholder={`Alternative ${idx + 1}`} required />
                {spaceAlternatives.length > 1 ? (
                  <button type="button" className="secondary-button" onClick={() => setSpaceAlternatives(spaceAlternatives.filter((_, i) => i !== idx))}>Remove</button>
                ) : null}
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={() => setSpaceAlternatives([...spaceAlternatives, ""])}>Add Alternative</button>
          </div>
          <div>
            <h4>Criteria</h4>
            {spaceCriteria.map((c, idx) => (
              <div className="inline-form" key={idx}>
                <input value={c.name} onChange={(e) => {
                  const next = [...spaceCriteria];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setSpaceCriteria(next);
                }} placeholder="Criterion name" required />
                <input type="number" min="0" max="100" value={c.weight} onChange={(e) => {
                  const next = [...spaceCriteria];
                  next[idx] = { ...next[idx], weight: Number(e.target.value) };
                  setSpaceCriteria(next);
                }} style={{ width: 80 }} required />
                {spaceCriteria.length > 1 ? (
                  <button type="button" className="secondary-button" onClick={() => setSpaceCriteria(spaceCriteria.filter((_, i) => i !== idx))}>Remove</button>
                ) : null}
              </div>
            ))}
            <button type="button" className="secondary-button" onClick={() => setSpaceCriteria([...spaceCriteria, { name: "", weight: 20 }])}>Add Criterion</button>
          </div>
        </div>
        <div className="form-actions">
          <button className="primary-button" type="submit">Create Space</button>
          <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
