/**
 * 학과별 추천 분포 — 31개 학과 TOP1·TOP5 카운트
 * 권한: CENTER (전체) / DEPT_HEAD (본인 학과만)
 *
 * 학과장은 본인 학과 한 행만 + 인접 학과 비교(같은 학부)만 노출.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { mockDeptDistribution, MOCK_PREVIEW_MSG } from "../mockData";
import { MOCK_DEPT_HEAD_OF, type Role } from "../permissions";

interface Props { role: Role; }

export default function Recommendations({ role }: Props) {
  const all = mockDeptDistribution();
  // 학과장은 본인 학과 + 같은 학부 인접 학과로 좁힘
  const rows = role === "DEPT_HEAD"
    ? all.filter((d) => {
        const ownSchool = all.find((x) => x.code === MOCK_DEPT_HEAD_OF)?.school;
        return d.school === ownSchool;
      })
    : all;

  const chartData = rows.slice(0, 10).map((r) => ({
    name: r.name.length > 8 ? r.name.slice(0, 7) + "…" : r.name,
    TOP1: r.top1Count,
    TOP5: r.top5Count,
  }));

  return (
    <section>
      <h2>학과별 추천 분포</h2>
      <p className="muted small">{MOCK_PREVIEW_MSG}</p>
      {role === "DEPT_HEAD" && (
        <p className="muted small">
          현재 권한: 학과장 — 본인 학과({MOCK_DEPT_HEAD_OF})와 같은 학부의 집계만 표시됩니다.
        </p>
      )}

      <div className="card">
        <h3>TOP1 / TOP5 분포 (상위 10개 학과)</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="TOP1" fill="#0b3d91" />
              <Bar dataKey="TOP5" fill="#f5a623" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>전체 학과 집계 표</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>학과</th>
              <th>학부</th>
              <th style={{ textAlign: "right" }}>TOP1</th>
              <th style={{ textAlign: "right" }}>TOP5</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>{r.name}</td>
                <td className="muted small">{r.school}</td>
                <td style={{ textAlign: "right" }}>{r.top1Count}</td>
                <td style={{ textAlign: "right" }}>{r.top5Count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
