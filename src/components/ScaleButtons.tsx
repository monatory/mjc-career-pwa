// 계획서 Ⅵ-1, CLAUDE.md 8장 변경 금지 항목
const SCALE_LABELS = [
  "전혀\n그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우\n그렇다",
];

interface Props {
  value: number | undefined;
  onChange: (v: number) => void;
}

export default function ScaleButtons({ value, onChange }: Props) {
  return (
    <div className="scale-row" role="radiogroup" aria-label="5점 척도">
      {SCALE_LABELS.map((label, i) => {
        const score = i + 1;
        const selected = value === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`scale-btn ${selected ? "selected" : ""}`}
            onClick={() => onChange(score)}
          >
            <span className="num">{score}</span>
            <span style={{ whiteSpace: "pre-line" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
