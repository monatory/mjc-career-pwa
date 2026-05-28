/**
 * 추천 적중률 (Hit@5) — 학기말 실제 선택 학과 입력 → 시스템 TOP5 적중률
 * 권한: CENTER 전용
 *
 * 본격 구현 시 lib/analytics.js 의 calcHitMetrics 결과를 학생 단위로 누적 집계.
 * "실제 선택 학과" 입력 폼은 학기 종료 후 진로취업팀이 일괄 입력.
 */
import { mockHitSummary } from "../mockData";
import { aggregateHitSummary } from "../../lib/firestoreAdmin";
import type { SavedResponse } from "../../lib/firestoreClient";

interface Props { responses: SavedResponse[] | null; }

export default function HitRate({ responses }: Props) {
  const live = responses && responses.length > 0;
  const s = live ? aggregateHitSummary(responses) : mockHitSummary();
  const noData = s.evaluableCount === 0;

  return (
    <section>
      <h2>추천 적중률 (Hit@1 / Hit@3 / Hit@5)</h2>
      <p className="muted small">
        학기말 진로취업팀이 학생별 실제 선택 학과를 입력하면, 시스템 추천 TOP N 안에 포함된
        비율을 자동 계산합니다. 1지망 미입력 학생은 계산 대상에서 제외(evaluable=false).
      </p>

      <div className="kpi-grid">
        <HitKpi label="Hit@1" value={fmtPct(noData ? null : s.hitAt1 / s.evaluableCount)} />
        <HitKpi label="Hit@3" value={fmtPct(noData ? null : s.hitAt3 / s.evaluableCount)} />
        <HitKpi label="Hit@5" value={fmtPct(noData ? null : s.hitAt5 / s.evaluableCount)} />
        <HitKpi label="평가 가능 학생" value={`${s.evaluableCount}명`} />
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>실제 선택 학과 입력</h3>
          <button disabled>학생별 입력 시작</button>
        </div>
        {noData && <p className="muted small">실제 선택 학과 입력이 아직 진행되지 않았습니다.</p>}
        <p className="muted small">
          입력 폼은 본격 구현 시 학번·이름 검색 → 실제 선택 학과 드롭다운 → 저장 흐름으로
          만들어집니다(계획서 Ⅹ장). 시범운영 단계에서는 닉네임 기반 일괄 CSV 업로드도 검토.
        </p>
      </div>
    </section>
  );
}

function HitKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return (v * 100).toFixed(1) + "%";
}
