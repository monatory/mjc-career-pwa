/**
 * 상담 필요군 — 필요도 70점 이상 자동 추출 + 상담 우선군 분류(rule_a/b/c)
 * 권한: CENTER 전용 (개별 학생 식별 가능)
 *
 * 본격 구현 시 lib/analytics.js 의 classifyCounselingPriority 결과로 채움.
 */
import { mockCounselingList, MOCK_PREVIEW_MSG } from "../mockData";

export default function Counseling() {
  const rows = mockCounselingList();

  return (
    <section>
      <h2>상담 필요군 자동 추출</h2>
      <p className="muted small">{MOCK_PREVIEW_MSG}</p>
      <p className="muted small">
        규칙: <strong>rule_a</strong> 상담 필요도 ≥ 70 ·{" "}
        <strong>rule_b</strong> 가족·친구 결정 + 1지망 미스매치 ·{" "}
        <strong>rule_c</strong> TOP1 적합도 &lt; 50점
      </p>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>상담 권장 학생 목록</h3>
          <button className="ghost" disabled>CSV 다운로드 (개인정보 포함)</button>
        </div>
        {rows.length === 0 ? (
          <p className="muted small">상담 필요군 학생이 없습니다.</p>
        ) : (
          <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>닉네임</th>
                <th style={{ textAlign: "right" }}>필요도</th>
                <th>우선순위</th>
                <th>트리거</th>
                <th>TOP1</th>
                <th>1지망</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.nickname}</td>
                  <td style={{ textAlign: "right" }}>{r.needScore}</td>
                  <td>
                    <span className={`badge ${r.priority === "HIGH" ? "danger" : r.priority === "MEDIUM" ? "warn" : ""}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="muted small">{r.triggeredRules.join(", ")}</td>
                  <td>{r.top1Name}</td>
                  <td>{r.preferredName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="card muted small">
        본 메뉴는 개인정보(닉네임 + 응답)가 노출됩니다. 다운로드 시 진로취업팀 내부 보관 원칙을
        준수해 주세요. 학번·이름은 시범운영 단계에서는 수집하지 않으며, 본 운영 전환 시
        AES-256 암호화된 식별정보 컬럼이 추가됩니다(CLAUDE.md §7).
      </div>
    </section>
  );
}
