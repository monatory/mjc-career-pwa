import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  loadResultCache,
  getNickname,
  clearAll,
  getResponses,
} from "../lib/sessionState";
import { questionBank, getCard, getDepartment } from "../lib/dataLoader";
import {
  DIAGNOSTIC_AXES,
  generateReason,
  detectUndecided,
  calcAxisScores,
  type FitResult,
  type DiagnosticAxis,
} from "@lib/recommendation_engine";
import jsPDF from "jspdf";

// 8개 진단축 평균 (레이더용)
function calcDiagnosticAverages(
  responses: Record<string, number>
): Record<DiagnosticAxis, number> {
  const result: Record<string, { sum: number; cnt: number }> = {};
  for (const it of questionBank.items) {
    const v = responses[it.id];
    if (v == null) continue;
    const adj = it.reverse ? 6 - v : v;
    if (!result[it.axis]) result[it.axis] = { sum: 0, cnt: 0 };
    result[it.axis].sum += adj;
    result[it.axis].cnt += 1;
  }
  const out: Record<string, number> = {};
  for (const ax of Object.keys(DIAGNOSTIC_AXES)) {
    out[ax] = result[ax]?.cnt ? result[ax].sum / result[ax].cnt : 0;
  }
  return out as Record<DiagnosticAxis, number>;
}

export default function Result() {
  const nav = useNavigate();
  const nick = getNickname() || "익명";
  const cache = loadResultCache();
  const [downloading, setDownloading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cache) nav("/", { replace: true });
  }, [cache, nav]);

  const diagnostic = useMemo(
    () => calcDiagnosticAverages(getResponses()),
    []
  );

  if (!cache) return null;
  const c = cache; // 클로저 내부에서 narrowing 유지용

  // 추가 응답 반영된 매칭축 점수 (캐시값 검증용)
  const axisScores = c.axisScores ?? calcAxisScores(getResponses(), questionBank);
  const fits = c.fits;
  const top5 = fits.slice(0, 5);
  const next3: FitResult[] = fits.slice(5, 8);
  const undecided = detectUndecided(fits);

  const radarData = (["INT", "ACT", "LRN", "COMP", "JOB", "VAL", "CONF", "NEED"] as DiagnosticAxis[]).map(
    (ax) => ({
      axis: DIAGNOSTIC_AXES[ax],
      value: Number((diagnostic[ax] || 0).toFixed(2)),
      fullMark: 5,
    })
  );

  function reasonFor(code: string) {
    const dept = getDepartment(code);
    return dept ? generateReason(axisScores, dept) : "";
  }

  async function exportPdf() {
    setDownloading(true);
    try {
      // 텍스트만으로 깔끔히 출력 (한글 폰트 임베드는 추후 단계)
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      let y = 50;

      doc.setFontSize(18);
      doc.text("MJC Career Path Diagnosis Result", W / 2, y, { align: "center" });
      y += 28;
      doc.setFontSize(11);
      doc.text(`Nickname: ${nick}  /  Date: ${new Date().toLocaleString()}`, W / 2, y, { align: "center" });
      y += 24;

      doc.setFontSize(13);
      doc.text("TOP 5 Recommended Departments", 50, y);
      y += 18;
      doc.setFontSize(11);
      top5.forEach((f, i) => {
        doc.text(
          `${i + 1}. [${f.percent.toFixed(1)}%] ${f.school} / ${f.name}  (${f.code})`,
          60,
          y
        );
        y += 16;
      });

      y += 12;
      doc.setFontSize(13);
      doc.text("Counseling Need", 50, y);
      y += 18;
      doc.setFontSize(11);
      doc.text(`Score: ${c.counseling.score} (${c.counseling.category})`, 60, y);
      y += 14;
      doc.text(`Decision: ${undecided.is_undecided ? "Undecided" : "Decided"} — ${undecided.reason}`, 60, y);

      y += 30;
      doc.setFontSize(9);
      doc.setTextColor(120);
      const legalEn =
        "This result is reference material for major exploration. It does not constitute formal placement.";
      doc.text(legalEn, W / 2, y, { align: "center" });

      doc.save(`MJC_Career_${nick}_${Date.now()}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  function restart() {
    if (confirm("응답을 모두 초기화하고 처음부터 다시 진단하시겠습니까?")) {
      clearAll();
      nav("/", { replace: true });
    }
  }

  return (
    <main className="page" ref={pageRef}>
      <h1>진단 결과</h1>
      <p className="muted">
        {nick}님 · {new Date(cache.computedAt).toLocaleString()}
      </p>

      <div className="card">
        <h2>상담 필요도</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--c-primary)" }}>
            {cache.counseling.score}
          </span>
          <span className={`badge ${cache.counseling.score >= 70 ? "danger" : cache.counseling.score >= 40 ? "warn" : ""}`}>
            {cache.counseling.category}
          </span>
        </div>
        {undecided.is_undecided && (
          <p style={{ marginTop: 10, color: "var(--c-text-soft)" }}>
            <strong>학과 결정 미정군</strong> — {undecided.reason}. 진로상담을 추천드립니다.
          </p>
        )}
      </div>

      <div className="card">
        <h2>진단축 8개 프로파일</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Radar
                name="응답"
                dataKey="value"
                stroke="#0b3d91"
                fill="#0b3d91"
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>추천 TOP 5</h2>
        {top5.map((f) => {
          const card = getCard(f.code);
          return (
            <div key={f.code} className="top-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="rank">{f.rank}</span>
                <div className="info">
                  <div className="school">{f.school}</div>
                  <div className="name">{f.name}</div>
                </div>
                <span className="percent">{f.percent.toFixed(1)}%</span>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: "0.92rem", color: "var(--c-text-soft)" }}>
                {reasonFor(f.code)}
              </p>
              {card?.talent_type && (
                <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>
                  <span className="badge">인재상</span> {card.talent_type}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {next3.length > 0 && (
        <div className="card">
          <h2>비교탐색 학과 (6~8위)</h2>
          {next3.map((f) => (
            <div key={f.code} className="top-card">
              <span className="rank" style={{ fontSize: "1.15rem", color: "var(--c-text-soft)" }}>{f.rank}</span>
              <div className="info">
                <div className="school">{f.school}</div>
                <div className="name">{f.name}</div>
              </div>
              <span className="percent" style={{ color: "var(--c-text-soft)" }}>
                {f.percent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="btn-row">
        <button className="ghost" onClick={restart}>다시 진단하기</button>
        <button onClick={exportPdf} disabled={downloading}>
          {downloading ? "PDF 저장 중…" : "PDF로 저장"}
        </button>
      </div>
    </main>
  );
}
