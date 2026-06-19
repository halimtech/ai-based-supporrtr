// A row of five word-labelled buttons used to pick a 1–5 value.
export default function ScorePicker({ labels, value, onSelect }) {
  return (
    <div className="score-picker">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          className={`score-button is-word ${value === score ? "is-selected" : ""}`}
          onClick={() => onSelect(score)}
          type="button"
        >
          {labels[score]}
        </button>
      ))}
    </div>
  );
}
