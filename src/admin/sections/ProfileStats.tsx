/**
 * 응답자 통계 — STEP 2 일반사항 16항목 분포
 * 권한: CENTER / EDU_SUPPORT
 */
import { aggregateProfileStats, type DistributionRow } from "../../lib/firestoreAdmin";
import { exportProfileStatsCsv } from "../csvExport";
import type { SavedResponse } from "../../lib/firestoreClient";

interface Props { responses: SavedResponse[] | null; }

export default function ProfileStats({ responses }: Props) {
  const live = responses && responses.length > 0;

  if (!live) {
    return (
      <section>
        <h2>응답자 통계</h2>
        <p className="muted small">
          학생 응답이 누적되면 STEP 2 일반사항 16항목의 분포가 자동으로 표시됩니다.
          (현재 0명)
        </p>
      </section>
    );
  }

  const stats = aggregateProfileStats(responses);

  return (
    <section>
      <div className="section-head">
        <h2>응답자 통계</h2>
        <button className="ghost" onClick={() => exportProfileStatsCsv(stats)}>
          전체 통계 CSV 다운로드
        </button>
      </div>
      <p className="section-desc">
        STEP 2에서 학생들이 입력한 일반사항 16항목의 분포입니다. 총 응답자 {stats.total}명.
        학번·이름은 일체 수집·표시하지 않습니다.
      </p>

      <DistGrid title="[A] 기본 정보">
        <DistCard title="출생연도"           rows={stats.birthYear} />
        <DistCard title="성별"               rows={stats.gender} />
        <DistCard title="학적 상태"          rows={stats.academicStatus} />
        <DistCard title="자유전공 진학 이유" rows={stats.selfDesignedReason} />
      </DistGrid>

      <DistGrid title="[B] 진로 방향">
        <DistCard title="진로방향"         rows={stats.careerDirection} />
        <DistCard title="의사결정 유형"     rows={stats.decisionMaker} />
        <DistCard title="진로상담 희망"     rows={stats.wantsCounseling} />
      </DistGrid>

      <DistGrid title="[C] 학습·경험 배경">
        <DistCard title="고등학교 유형"     rows={stats.highSchoolType} />
        <DistCard title="직장 경험"         rows={stats.workExperience} />
        <DistCard title="아르바이트 경험"   rows={stats.partTimeExperience} />
        <DistCard title="이전 대학 경험"    rows={stats.priorCollege} />
      </DistGrid>
    </section>
  );
}

function DistGrid({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dist-section">
      <h3>{title}</h3>
      <div className="dist-grid">{children}</div>
    </div>
  );
}

function DistCard({ title, rows }: { title: string; rows: DistributionRow[] }) {
  const max = rows[0]?.count ?? 0;
  return (
    <div className="card dist-card">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="muted small">데이터 없음</p>
      ) : (
        <ul className="dist-list">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="dist-list__head">
                <span className="dist-list__label">{r.label}</span>
                <span className="dist-list__count">
                  {r.count}명 <span className="muted small">({(r.ratio * 100).toFixed(1)}%)</span>
                </span>
              </div>
              <div className="dist-list__bar">
                <div
                  className="dist-list__fill"
                  style={{ width: `${max > 0 ? (r.count / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
