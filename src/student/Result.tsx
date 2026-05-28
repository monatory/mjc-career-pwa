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
import {
  questionBank,
  getCard,
  getDepartment,
  accessibilityData,
} from "../lib/dataLoader";
import { isFreeMajorAccessible } from "@lib/courses";
import {
  DIAGNOSTIC_AXES,
  generateReason,
  detectUndecided,
  calcAxisScores,
  type FitResult,
  type DiagnosticAxis,
} from "@lib/recommendation_engine";
import jsPDF from "jspdf";
import AppHeader from "../components/AppHeader";
import ConfirmModal from "../components/ConfirmModal";
import DepartmentDetailModal from "../components/DepartmentDetailModal";
import { saveResponseToFirestore } from "../lib/firestoreClient";
import { getProfile } from "../lib/sessionState";
import { calcHitMetrics } from "@lib/analytics";

/* ──────────────────────────────────────────────────────────────
 * 희망학과 vs 시스템 추천 비교 카드
 *   1지망 미입력 시 안내 + 상담 권유만 표시.
 *   1지망 입력 시 1·2·3지망 각각의 시스템 순위 + 적합도 표시.
 *   PDF는 결과지 화면 캡처 방식이라 자동 포함됨.
 * ──────────────────────────────────────────────────────────── */
function PreferenceComparisonCard({ nick, fits }: { nick: string; fits: FitResult[] }) {
  const profile = getProfile();
  if (!profile) return null;

  const prefCodes = [
    profile.preferred_dept_1,
    profile.preferred_dept_2,
    profile.preferred_dept_3,
  ];
  const hasAny = prefCodes.some((c) => c != null);

  if (!hasAny) {
    return (
      <div className="card">
        <h2>희망학과와의 비교</h2>
        <p className="muted">
          희망학과를 입력하지 않으셨습니다. 응답자 정보에서 1·2·3지망을 추가하시면,
          본인이 마음에 두었던 학과와 시스템 추천 결과를 직접 비교해 볼 수 있습니다.
        </p>
        <p className="muted">
          탐색이 더 필요한 단계라면, 진로·취업 컨설턴트와의 상담을 통해 결과지를 함께 살펴보고
          의사결정에 도움을 받으시기 바랍니다.
        </p>
      </div>
    );
  }

  const hits = calcHitMetrics(profile, fits);
  const rows = prefCodes.map((code, i) => {
    if (!code) return null;
    const idx = fits.findIndex((f) => f.code === code);
    const fit = idx >= 0 ? fits[idx] : null;
    return {
      rank: (i + 1) as 1 | 2 | 3,
      code,
      name: fit?.name ?? code,
      school: fit?.school ?? "",
      systemRank: fit ? idx + 1 : null,
      systemPercent: fit?.percent ?? null,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const summary = makeSummary(hits, rows);

  return (
    <div className="card pref-compare">
      <h2>희망학과와의 비교</h2>
      <p className="muted small">
        {nick}님이 입력하신 희망학과와 시스템 추천 결과를 비교한 내용입니다.
      </p>

      <table className="pref-compare__table">
        <thead>
          <tr>
            <th>희망</th>
            <th>학과</th>
            <th style={{ textAlign: "right" }}>시스템 순위</th>
            <th style={{ textAlign: "right" }}>적합도</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className={r.systemRank != null && r.systemRank <= 5 ? "pref-compare__top5" : ""}>
              <td className="pref-compare__rank">{r.rank}지망</td>
              <td>
                <div className="pref-compare__name">{r.name}</div>
                <div className="muted small">{r.school}</div>
              </td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.systemRank == null ? (
                  <span className="muted">—</span>
                ) : (
                  <>
                    <strong>{r.systemRank}</strong>
                    <span className="muted small"> / {fits.length}</span>
                  </>
                )}
              </td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {r.systemPercent == null ? "—" : `${r.systemPercent.toFixed(1)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pref-compare__summary">
        <strong>{summary.headline}</strong>
        <p style={{ margin: "6px 0 0", lineHeight: 1.55 }}>{summary.body}</p>
      </div>
    </div>
  );
}

function makeSummary(
  hits: ReturnType<typeof calcHitMetrics>,
  rows: { rank: number; name: string; systemRank: number | null }[],
): { headline: string; body: string } {
  const names = rows.map((r) => r.name);
  const myList = names.length === 1 ? names[0] : names.join(", ");

  if (hits.hit_at_1) {
    return {
      headline: "희망학과와 시스템 추천 결과가 일치합니다",
      body: `1지망 ${rows[0].name}이(가) 시스템 추천 TOP1과 일치합니다. 현재까지의 응답 결과는 본인의 학과 선택과 잘 부합하며, 결정에 가까운 상태로 보입니다. 진로·취업 컨설턴트와 함께 학과 생활과 진로 준비 방향을 구체화해 보시기 바랍니다.`,
    };
  }
  if (hits.hit_at_3) {
    return {
      headline: "희망학과가 시스템 추천 TOP3 안에 있습니다",
      body: `1지망 ${rows[0].name}이(가) 시스템 추천 상위 3개 학과 안에 포함됩니다. 결정에 도움이 되는 강한 신호입니다. 다른 추천 학과들과 비교해 보면서 본인에게 가장 잘 맞는 선택을 점검해 보세요.`,
    };
  }
  if (hits.hit_at_5) {
    return {
      headline: "희망학과가 시스템 추천 TOP5 안에 있습니다",
      body: `희망과 추천이 비교적 잘 부합합니다. 다만 시스템 TOP1~3과 본인 희망 사이에 차이가 있으니, 진로·취업 컨설턴트와 함께 결과지를 점검하시면 결정에 도움이 됩니다.`,
    };
  }
  return {
    headline: "희망학과와 시스템 추천 결과 사이에 차이가 있습니다",
    body: `희망하신 ${myList}이(가) 시스템 추천 TOP5 밖에 위치합니다. 응답 결과가 다른 분야에 더 가까운 신호를 보이고 있으니, 진로·취업 컨설턴트와 상담을 통해 본인의 강점·관심사를 다시 한 번 살펴보시기 바랍니다. 시스템 결과는 참고자료이며 최종 선택은 학생 본인의 권리입니다.`,
  };
}

// 상담 필요도 시각화 — SVG 반원 게이지(0~100)
function CounselingGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  // 반원: 반지름 56, 둘레 = π·56 ≈ 175.93
  const R = 56;
  const C = Math.PI * R;
  const dash = (clamped / 100) * C;
  const color = clamped >= 70 ? "#c0392b" : clamped >= 40 ? "#f5a623" : "#2e7d32";
  return (
    <div className="need-gauge" aria-label={`상담 필요도 ${clamped}점`}>
      <svg viewBox="0 0 140 80" width="140" height="80">
        <path d="M 14 70 A 56 56 0 0 1 126 70" stroke="#e8eef9" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path
          d="M 14 70 A 56 56 0 0 1 126 70"
          stroke={color}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="need-gauge__score" style={{ color }}>
        {clamped.toFixed(1)}
        <span className="need-gauge__unit">/100</span>
      </div>
    </div>
  );
}

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
  const [restartOpen, setRestartOpen] = useState(false);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cache) nav("/", { replace: true });
  }, [cache, nav]);

  // Firestore에 결과 자동 저장 (시범운영 백엔드)
  // 결과지에 처음 진입할 때 한 번만. 실패해도 UX에 영향 없음.
  useEffect(() => {
    if (!cache) return;
    const profile = getProfile();
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const r = await saveResponseToFirestore({
        profile,
        axisScores: cache.axisScores,
        fits: cache.fits,
        counselingNeed: cache.counseling,
      });
      if (!cancelled && r.ok) {
        console.info("[Firestore] saved:", r.anonymousId);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  /**
   * PDF 저장 — 결과지 화면을 html2canvas로 캡처해 한글 그대로 PDF에 임베드.
   * jsPDF의 텍스트 출력은 한글 폰트 임베드가 무거워 캡처 방식 채택.
   */
  async function exportPdf() {
    if (!pageRef.current) return;
    setDownloading(true);
    try {
      // 동적 import로 번들 분할 (PDF 저장 클릭 시에만 로드)
      const html2canvas = (await import("html2canvas")).default;

      // 결과지 main 영역 캡처 (모달은 portal 밖에 있어 자연스럽게 제외)
      const canvas = await html2canvas(pageRef.current, {
        scale: 2,           // 고해상도
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: pageRef.current.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // 이미지 비율 유지하며 페이지 폭에 맞추고, 세로가 길면 페이지 분할
      const imgW = pageW - 40; // 좌우 20pt 여백
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pageH - 40) {
        pdf.addImage(imgData, "JPEG", 20, 20, imgW, imgH);
      } else {
        // 페이지 분할: 캔버스를 페이지 높이 단위로 잘라 추가
        const pageContentH = pageH - 40;
        const sliceH = (canvas.width * pageContentH) / imgW; // 한 페이지에 해당하는 캔버스 픽셀 높이
        let yOffset = 0;
        let firstPage = true;
        while (yOffset < canvas.height) {
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = Math.min(sliceH, canvas.height - yOffset);
          const ctx = slice.getContext("2d")!;
          ctx.drawImage(
            canvas,
            0, yOffset, canvas.width, slice.height,
            0, 0, canvas.width, slice.height,
          );
          const sliceData = slice.toDataURL("image/jpeg", 0.92);
          const sliceImgH = (slice.height * imgW) / slice.width;
          if (!firstPage) pdf.addPage();
          pdf.addImage(sliceData, "JPEG", 20, 20, imgW, sliceImgH);
          yOffset += sliceH;
          firstPage = false;
        }
      }

      pdf.save(`MJC-CAT_${nick}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  function confirmRestart() {
    clearAll();
    nav("/", { replace: true });
  }

  return (
    <>
      <AppHeader />
      <main className="page" ref={pageRef}>
        <div className="step-indicator step-indicator--done">
          <span className="step-indicator__num">검사 완료</span>
          <span className="step-indicator__sep">·</span>
          <span className="step-indicator__label">결과지</span>
        </div>
        <h1>진단 결과</h1>
        <p className="muted">
          {nick}님 · {new Date(cache.computedAt).toLocaleString()}
        </p>

      <div className="card">
        <h2>상담 필요도</h2>
        <div className="need-gauge-row">
          <CounselingGauge score={cache.counseling.score} />
          <div className="need-gauge-meta">
            <span className={`badge ${cache.counseling.score >= 70 ? "danger" : cache.counseling.score >= 40 ? "warn" : ""}`}>
              {cache.counseling.category}
            </span>
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              0~40 상담 선택군 · 40~70 상담 권장군 · 70 이상 상담 우선 권장군
            </p>
          </div>
        </div>
        {undecided.is_undecided && (
          <p style={{ marginTop: 14, color: "var(--c-text-soft)" }}>
            <strong>탐색이 더 필요한 단계</strong> — 추천 학과 간 적합도가 가까워 결정에 더 깊은
            탐색이 도움됩니다. 진로·취업 컨설턴트와의 상담을 통해 학생의 강점과 가능성을 함께
            살펴볼 수 있습니다.
          </p>
        )}
      </div>

      {/* 내 희망학과 vs 시스템 추천 비교 — 상담 필요도 직후로 배치(가독성) */}
      <PreferenceComparisonCard nick={nick} fits={fits} />

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
        <details className="axis-score-details">
          <summary>
            <span className="axis-score-details__label">점수 자세히 보기</span>
            <span className="axis-score-details__icon" aria-hidden>▾</span>
          </summary>
          <table className="axis-score-table">
            <thead>
              <tr><th>진단축</th><th style={{ textAlign: "right" }}>점수</th></tr>
            </thead>
            <tbody>
              {radarData.map((d) => (
                <tr key={d.axis}>
                  <td>{d.axis}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {d.value.toFixed(2)}
                    <span className="muted small"> / 5</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="card">
        <h2>추천 TOP 5</h2>
        {top5.map((f) => {
          const card = getCard(f.code);
          const isFirst = f.rank === 1;
          const accessible = isFreeMajorAccessible(f.code, accessibilityData);
          return (
            <button
              key={f.code}
              className={`top-card top-card--clickable ${isFirst ? "top-card--first" : ""} ${!accessible ? "top-card--no-access" : ""}`}
              style={{ flexDirection: "column", alignItems: "stretch", textAlign: "left" }}
              onClick={() => setDetailCode(f.code)}
              aria-label={`${f.name} 상세 보기`}
            >
              {isFirst && <span className="top-card__crown">최적합 학과</span>}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="rank">{f.rank}</span>
                <div className="info">
                  <div className="school">{f.school}</div>
                  <div className="name">{f.name}</div>
                </div>
                <span className="percent">{f.percent.toFixed(1)}%</span>
              </div>
              {!accessible && (
                <span
                  className="access-label access-label--no top-card__access"
                  title={accessibilityData.not_accessible_notice}
                >
                  {accessibilityData.labels.NOT_ACCESSIBLE}
                </span>
              )}
              <p style={{ margin: "10px 0 0", fontSize: "0.92rem", color: "var(--c-text-soft)" }}>
                {reasonFor(f.code)}
              </p>
              {card?.talent_type && (
                <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>
                  <span className="badge">인재상</span> {card.talent_type}
                </p>
              )}
              <span className="top-card__more muted small">자세히 보기 →</span>
            </button>
          );
        })}
      </div>

      {next3.length > 0 && (
        <div className="card">
          <h2>비교탐색 학과 (6~8위)</h2>
          <p className="muted small" style={{ margin: "0 0 10px" }}>
            TOP 5에 가까운 적합도. 진로 탐색의 폭을 넓히는 데 참고하세요.
          </p>
          {next3.map((f) => {
            const accessible = isFreeMajorAccessible(f.code, accessibilityData);
            return (
              <button
                key={f.code}
                className={`top-card top-card--clickable top-card--compare ${!accessible ? "top-card--no-access" : ""}`}
                style={{ flexDirection: "column", alignItems: "stretch", textAlign: "left" }}
                onClick={() => setDetailCode(f.code)}
                aria-label={`${f.name} 상세 보기`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="rank" style={{ color: "var(--c-text-soft)" }}>{f.rank}</span>
                  <div className="info">
                    <div className="school">{f.school}</div>
                    <div className="name">{f.name}</div>
                  </div>
                  <span className="percent" style={{ color: "var(--c-text-soft)" }}>
                    {f.percent.toFixed(1)}%
                  </span>
                </div>
                {!accessible && (
                  <span className="access-label access-label--no top-card__access" title={accessibilityData.not_accessible_notice}>
                    {accessibilityData.labels.NOT_ACCESSIBLE}
                  </span>
                )}
                <p style={{ margin: "8px 0 0", fontSize: "0.88rem", color: "var(--c-text-soft)" }}>
                  {reasonFor(f.code)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* 진로 상담 신청 CTA — 70점 이상이면 강조 */}
      <div className={`card counseling-cta ${cache.counseling.score >= 70 ? "counseling-cta--urgent" : ""}`}>
        <div className="counseling-cta__head">
          <h2>진로·취업 상담 신청</h2>
          {cache.counseling.score >= 70 && (
            <span className="badge danger">상담 우선 권장</span>
          )}
        </div>
        <p className="muted small" style={{ margin: "0 0 12px" }}>
          {cache.counseling.score >= 70
            ? "결과 해석과 학과 결정을 위해 진로·취업 컨설턴트와의 상담을 권장합니다. 학생지원처 AI융합진로지원센터로 문의해 주세요."
            : "결과에 대한 추가 해석이나 학과 정보가 필요하시면 진로·취업 컨설턴트가 도와드립니다."}
        </p>
        <ul className="counseling-cta__contact muted small">
          <li>학생지원처 AI융합진로지원센터</li>
          <li>위치: (본관 OOO호 — 학과 회신 후 갱신 예정)</li>
          <li>전화·이메일: (학과 회신 후 갱신 예정)</li>
        </ul>
      </div>

      <div className="btn-row">
        <button className="ghost" onClick={() => setRestartOpen(true)}>다시 진단하기</button>
        <button onClick={exportPdf} disabled={downloading}>
          {downloading ? "PDF 저장 중…" : "PDF로 저장"}
        </button>
      </div>
      </main>
      <ConfirmModal
        open={restartOpen}
        title="응답을 모두 초기화하시겠습니까?"
        body="현재 결과지와 240문항 응답이 모두 사라집니다. 처음부터 다시 진단을 시작합니다."
        confirmText="초기화하고 다시 시작"
        cancelText="취소"
        tone="danger"
        onConfirm={confirmRestart}
        onCancel={() => setRestartOpen(false)}
      />
      <DepartmentDetailModal
        code={detailCode}
        fit={detailCode ? fits.find((f) => f.code === detailCode) ?? null : null}
        onClose={() => setDetailCode(null)}
      />
    </>
  );
}
