/**
 * 종합 현황 — KPI 카드 + 참여 추이 시계열
 * 권한: CENTER / EDU_SUPPORT / DEPT_HEAD 공통
 */
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { mockKpi, mockTrend, PILOT_NOT_STARTED_MSG } from "../mockData";

export default function Overview() {
  const kpi = mockKpi();
  const trend = mockTrend();
  const hasData = kpi.participants > 0;

  return (
    <section>
      <h2>종합 현황</h2>

      <div className="kpi-grid">
        <KpiCard label="참여 학생 수" value={kpi.participants.toLocaleString() + "명"} />
        <KpiCard label="검사 완료율" value={fmtPct(kpi.completionRate)} />
        <KpiCard label="평균 소요시간" value={kpi.avgMinutes ? `${kpi.avgMinutes}분` : "—"} />
        <KpiCard
          label="상담 우선군"
          value={kpi.counselingPriorityHigh + "명"}
          tone={kpi.counselingPriorityHigh > 0 ? "warn" : undefined}
        />
        <KpiCard label="Hit@5 적중률" value={kpi.hitAt5Rate == null ? "학기말 입력 후" : fmtPct(kpi.hitAt5Rate)} />
        <KpiCard label="만족도 평균" value={kpi.satisfactionAvg == null ? "—" : kpi.satisfactionAvg.toFixed(2)} />
      </div>

      <div className="card">
        <h3>최근 14일 참여 추이</h3>
        {!hasData && <p className="muted small">{PILOT_NOT_STARTED_MSG}</p>}
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eef9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0b3d91" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "warn" | "danger" }) {
  return (
    <div className={`kpi-card ${tone ?? ""}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
    </div>
  );
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return (v * 100).toFixed(1) + "%";
}
