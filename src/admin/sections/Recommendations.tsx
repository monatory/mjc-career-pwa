/**
 * 학과별 추천 분포 — 31개 학과 TOP1·TOP5 카운트
 * 권한: CENTER (전체) / DEPT_HEAD (본인 학과만)
 *
 * 학과장은 본인 학과 한 행만 + 인접 학과 비교(같은 학부)만 노출.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { mockDeptDistribution } from "../mockData";
import { aggregateDeptDistribution } from "../../lib/firestoreAdmin";
import { MOCK_DEPT_HEAD_OF, type Role } from "../permissions";
import type { SavedResponse } from "../../lib/firestoreClient";

interface Props { role: Role; responses: SavedResponse[] | null; }

export default function Recommendations({ role, responses }: Props) {
  const live = responses && responses.length > 0;
  const all = live ? aggregateDeptDistribution(responses) : mockDeptDistribution();
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
      <div className="section-head">
        <h2>학과별 추천 분포</h2>
      </div>
      <p className="section-desc">
        시스템이 학생별 TOP1·TOP5 추천에 학과를 몇 번 포함시켰는지 집계합니다.
        {role === "DEPT_HEAD" && ` (학과장 권한 — 본인 학과 ${MOCK_DEPT_HEAD_OF}과 같은 학부 한정)`}
      </p>

      <div className="card chart-card">
        <h3>TOP1 / TOP5 분포 (상위 10개 학과)</h3>
        <div style={{ width: "100%", height: 380 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 52, left: -4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-25}
                textAnchor="end"
                interval={0}
                tickLine={false}
                axisLine={{ stroke: "#d8dde6" }}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #d8dde6", fontSize: 13 }}
                cursor={{ fill: "rgba(11,61,145,0.05)" }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="TOP1" fill="#0b3d91" radius={[4, 4, 0, 0]} />
              <Bar dataKey="TOP5" fill="#f5a623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>전체 학과 집계 표</h3>
        <div className="admin-table-wrap">
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
      </div>
    </section>
  );
}
