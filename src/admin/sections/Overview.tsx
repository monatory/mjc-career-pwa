/**
 * 종합 현황 — KPI 카드 + 참여 추이 시계열
 * 권한: CENTER / EDU_SUPPORT / DEPT_HEAD 공통
 */
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { mockKpi, mockTrend } from "../mockData";
import { aggregateKpi, aggregateTrend } from "../../lib/firestoreAdmin";
import { exportAllResponsesCsv } from "../csvExport";
import type { SavedResponse } from "../../lib/firestoreClient";

interface Props { responses: SavedResponse[] | null; }

export default function Overview({ responses }: Props) {
  const live = responses && responses.length > 0;
  const kpi = live ? aggregateKpi(responses) : mockKpi();
  const trend = live ? aggregateTrend(responses) : mockTrend();

  return (
    <section>
      <div className="section-head">
        <h2>종합 현황</h2>
        {live && (
          <button className="ghost" onClick={() => exportAllResponsesCsv(responses)}>
            전체 응답 CSV 다운로드
          </button>
        )}
      </div>
      <p className="section-desc">
        참여자 수·검사 완료율·상담 우선군 등 시범운영 KPI 요약과 최근 14일 참여 추이입니다.
      </p>

      <div className="kpi-grid">
        <KpiCard label="참여 학생 수" value={kpi.participants.toLocaleString() + "명"} />
        <KpiCard label="검사 완료율" value={fmtPct(kpi.completionRate)} />
        <KpiCard label="평균 소요시간" value={kpi.avgMinutes ? `${kpi.avgMinutes}분` : "—"} />
        <KpiCard
          label="상담 우선군"
          value={kpi.counselingPriorityHigh + "명"}
          tone={kpi.counselingPriorityHigh >= 10 ? "warn" : undefined}
        />
        <KpiCard label="Hit@5 적중률" value={kpi.hitAt5Rate == null ? "학기말 입력 후" : fmtPct(kpi.hitAt5Rate)} />
        <KpiCard label="만족도 평균" value={kpi.satisfactionAvg == null ? "—" : kpi.satisfactionAvg.toFixed(2)} />
      </div>

      <div className="card chart-card">
        <h3>최근 14일 참여 추이</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b3d91" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0b3d91" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #d8dde6", fontSize: 13 }}
                labelStyle={{ color: "#0b3d91", fontWeight: 700 }}
                formatter={(v: number) => [`${v}명`, "참여"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0b3d91"
                strokeWidth={2.5}
                fill="url(#trendGrad)"
                dot={{ r: 3, fill: "#0b3d91" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" }) {
  // 숫자형 값과 텍스트형 값을 시각적으로 구분 — 텍스트는 살짝 작게
  const isTextual = /[가-힣]/.test(value) && !/^\d/.test(value);
  return (
    <div className={`kpi-card ${tone ?? ""}`}>
      <div className="kpi-card__label">{label}</div>
      <div className={`kpi-card__value ${isTextual ? "kpi-card__value--text" : ""}`}>{value}</div>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return (v * 100).toFixed(1) + "%";
}
