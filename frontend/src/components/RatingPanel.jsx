import ScorePicker from "./ScorePicker";
import { IMPORTANCE_LABELS, PREFERENCE_LABELS } from "../lib/labels";
import { ratingKey } from "../lib/api";

// The full voting controls: personal criteria weights plus a rating block per
// alternative. Reused on both the Vote and Consensus tabs.
export default function RatingPanel({
  criteria,
  alternatives,
  weightsMap,
  ratingsMap,
  username,
  ownerLabel,
  onWeight,
  onRating,
  keyPrefix = "",
  weightsHint,
}) {
  return (
    <div className="rating-stack">
      <article className="rating-block">
        <div className="rating-block-header">
          <h3>Your Criteria Weights</h3>
          <span>{ownerLabel}</span>
        </div>
        {weightsHint ? (
          <p className="subtitle" style={{ marginBottom: 12 }}>
            {weightsHint}
          </p>
        ) : null}
        <div className="rating-grid">
          {criteria.map((criterion) => (
            <div className="rating-row" key={`${keyPrefix}weight-${criterion.name}`}>
              <div>
                <strong>{criterion.name}</strong>
              </div>
              <ScorePicker
                labels={IMPORTANCE_LABELS}
                value={weightsMap[criterion.name]}
                onSelect={(score) => onWeight(criterion.name, score)}
              />
            </div>
          ))}
        </div>
      </article>

      {alternatives.map((alternative) => (
        <article className="rating-block" key={`${keyPrefix}${alternative}`}>
          <div className="rating-block-header">
            <h3>{alternative}</h3>
            <span>{ownerLabel}</span>
          </div>
          <div className="rating-grid">
            {criteria.map((criterion) => (
              <div className="rating-row" key={`${keyPrefix}${alternative}-${criterion.name}`}>
                <div>
                  <strong>{criterion.name}</strong>
                  <p>Suggested importance: {criterion.weight}%</p>
                </div>
                <ScorePicker
                  labels={PREFERENCE_LABELS}
                  value={ratingsMap[ratingKey(username, alternative, criterion.name)]}
                  onSelect={(score) => onRating(alternative, criterion.name, score)}
                />
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
