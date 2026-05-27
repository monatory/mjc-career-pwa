/**
 * 진단 진행 단계 표시 (STEP N / 3)
 * ────────────────────────────────
 * - current: 현재 단계 (1, 2, 3)
 * - label: 단계명 (예: "검사 소개", "응답자 정보", "진단 검사")
 *
 * 헤더 바로 아래에 작은 글씨로 표시.
 */
interface Props {
  current: 1 | 2 | 3;
  label: string;
}

export default function StepIndicator({ current, label }: Props) {
  return (
    <div className="step-indicator" aria-label={`전체 3단계 중 ${current}단계`}>
      <span className="step-indicator__num">STEP {current} / 3</span>
      <span className="step-indicator__sep">·</span>
      <span className="step-indicator__label">{label}</span>
    </div>
  );
}
