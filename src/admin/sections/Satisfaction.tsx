/**
 * 만족도·자유응답 — 5점 척도 평균 + 자유 코멘트 워드 카운트
 * 권한: CENTER / EDU_SUPPORT
 */
import { mockSatisfaction, MOCK_PREVIEW_MSG } from "../mockData";

export default function Satisfaction() {
  const rows = mockSatisfaction();
  const noData = rows.every((r) => r.responseCount === 0);

  return (
    <section>
      <h2>만족도·자유응답</h2>
      <p className="muted small">{MOCK_PREVIEW_MSG}</p>
      <p className="muted small">
        결과지 확인 직후 학생에게 5점 척도 4문항 + 자유응답 1문항을 노출하는 만족도 폼을
        본격 구현 시 추가할 예정입니다(계획서 Ⅸ ⑩).
      </p>

      <div className="card">
        <h3>5점 척도 평균</h3>
        {noData && <p className="muted small">응답이 없습니다.</p>}
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>문항</th>
              <th style={{ textAlign: "right" }}>평균</th>
              <th style={{ textAlign: "right" }}>응답 수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.question}</td>
                <td style={{ textAlign: "right" }}>{r.avg == null ? "—" : r.avg.toFixed(2)}</td>
                <td style={{ textAlign: "right" }}>{r.responseCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="card">
        <h3>자유응답 워드 카운트</h3>
        <p className="muted small">
          자유응답 누적 후 한국어 형태소 분석기(Mecab/KoNLPy 등)로 명사 빈도 추출. 시범운영
          단계에서는 별도 서버 없이 단순 공백 토큰화로 상위 빈도만 표시 예정.
        </p>
        {noData ? (
          <p className="muted small">자유응답이 없습니다.</p>
        ) : (
          <div className="word-cloud-placeholder" />
        )}
      </div>
    </section>
  );
}
