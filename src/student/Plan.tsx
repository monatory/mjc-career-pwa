/**
 * 내 수강 계획서 (/plan)
 * ────────────────────────────────────────────────────────────
 * 결과지 이후 부가 기능. 자유전공 공통 4과목 + 교양 강력추천 2과목 +
 * TOP5 학과별 1학기 추천 교과를 한 화면에 모아 학생이 직접 체크박스로
 * 1학기 학습 계획을 세우게 한다. 누적 학점이 권장 범위(12~23)에 들어가는지
 * 실시간 검증.
 *
 * 진입 조건:
 *   - 결과지 완료(mjc_cat_result) 필수 — 없으면 안내 후 STEP 1 으로 회귀
 *
 * 데이터 흐름:
 *   - data/department_courses.json (공통 + 학과별 교과)
 *   - data/certification_requirements.json (자격증 배너)
 *   - data/departments_accessibility.json (진입 불가 학과 제외)
 *   - sessionStorage(mjc_cat_plan) 으로 선택 상태 영속화
 *
 * PDF/인쇄: window.print() + @media print CSS — 한글 폰트 임베딩 불요
 *           "PDF로 저장"은 시스템 인쇄 다이얼로그의 PDF 옵션 활용 안내
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import CertificationBanner from "../components/CertificationBanner";
import {
  loadResultCache,
  getNickname,
  savePlanState,
  loadPlanState,
  type PlanCourseItem,
} from "../lib/sessionState";
import {
  courseData,
  accessibilityData,
  certificationData,
} from "../lib/dataLoader";
import {
  getCoursesForDept,
  isFreeMajorAccessible,
  getCertificationRequirements,
  calcSelectedCredits,
  validateCreditRange,
} from "@lib/courses";

const COMMON_CODE = "COMMON";

interface SectionCourse {
  course_name: string;
  credits: number;
  is_pass_fail?: boolean;
  strongly_recommended?: boolean;
  note?: string;
  dept_code: string;
  group_label?: string;
}

function keyOf(c: { dept_code: string; course_name: string }) {
  return `${c.dept_code}::${c.course_name}`;
}

export default function Plan() {
  const nav = useNavigate();
  const cache = loadResultCache();
  const nick = getNickname() || "익명";

  // 결과지 캐시가 없으면 자동 이동 대신 안내 화면을 보여준다.
  // QR/링크로 /plan 만 직접 받은 학생이 "왜 이동됐지?" 혼란을 겪지 않도록
  // 명시적인 메시지를 노출하고 본인이 검사를 시작하도록 유도.
  if (!cache) {
    return (
      <>
        <AppHeader />
        <main className="page plan-page plan-page--empty">
          <div className="card plan-empty">
            <h1 className="plan-title">
              <span aria-hidden>📋</span> 수강 계획서
            </h1>
            <p>
              수강 계획서는 진단 결과를 바탕으로 1학기 학습 계획을 세우는
              화면입니다. 진단을 먼저 완료해 주세요.
            </p>
            <p className="muted small">
              90문항(약 12~15분)을 응답하시면 31개 학과 중 적합도 TOP5를
              먼저 안내해 드립니다.
            </p>
            <div className="btn-row">
              <button onClick={() => nav("/", { replace: true })}>
                검사 시작하기 →
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  /* ── 섹션별 과목 목록 (계산은 1회) ────────────────────────────── */
  const sections = useMemo(() => {
    if (!cache) return null;

    const fmDed = courseData.common_courses.free_major_dedicated.map((c) => ({
      course_name: c.name,
      credits: c.credits,
      is_pass_fail: false,
      dept_code: COMMON_CODE,
      group_label: c.note ? `전용·${c.note}` : "전용",
    } as SectionCourse));
    const libReq = courseData.common_courses.liberal_required.map((c) => ({
      course_name: c.name,
      credits: c.credits,
      is_pass_fail: !!c.is_pass_fail,
      dept_code: COMMON_CODE,
      group_label: "교양필수",
    } as SectionCourse));
    const libRec = courseData.common_courses.strongly_recommended_liberal.map((c) => ({
      course_name: c.name,
      credits: c.credits,
      strongly_recommended: true,
      dept_code: COMMON_CODE,
      group_label: "강력추천",
    } as SectionCourse));

    // TOP5 중 진입 가능 학과만 사용. 진입 불가 학과는 표시 자체에서 제외.
    const top5Accessible = cache.fits.slice(0, 5).filter((f) =>
      isFreeMajorAccessible(f.code, accessibilityData),
    );

    return { fmDed, libReq, libRec, top5Accessible };
  }, [cache]);

  /* ── 기본 선택 상태 — 자유전공 공통 + 교양 강력추천 첫 항목 ─── */
  const defaultSelected = useMemo<Record<string, PlanCourseItem>>(() => {
    if (!sections) return {};
    const m: Record<string, PlanCourseItem> = {};
    const mark = (c: SectionCourse) => {
      m[keyOf(c)] = {
        dept_code: c.dept_code,
        course_name: c.course_name,
        credits: c.credits,
        is_pass_fail: c.is_pass_fail,
      };
    };
    sections.fmDed.forEach(mark);
    sections.libReq.forEach(mark);
    // 교양 강력추천은 첫 항목만 기본 체크 (택1 권장)
    if (sections.libRec[0]) mark(sections.libRec[0]);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  const [selected, setSelected] = useState<Record<string, PlanCourseItem>>({});
  const [openDepts, setOpenDepts] = useState<Record<string, boolean>>({});

  // 진입 시 — sessionStorage 복원 또는 기본값 적용
  useEffect(() => {
    if (!sections) return;
    const saved = loadPlanState();
    if (saved?.selected_courses?.length) {
      const m: Record<string, PlanCourseItem> = {};
      for (const c of saved.selected_courses) m[keyOf(c)] = c;
      setSelected(m);
    } else {
      setSelected(defaultSelected);
    }
    // TOP1·2 펼침 / TOP3·4·5 접힘 기본
    const opens: Record<string, boolean> = {};
    sections.top5Accessible.forEach((f, i) => {
      opens[f.code] = i < 2;
    });
    setOpenDepts(opens);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections === null]);

  // 선택 변경 시 sessionStorage 자동 저장
  useEffect(() => {
    if (Object.keys(selected).length === 0) return;
    savePlanState({
      selected_courses: Object.values(selected),
      updated_at: new Date().toISOString(),
    });
  }, [selected]);

  if (!cache || !sections) return null;

  /* ── 누적 학점 ────────────────────────────────────────────── */
  const selectedList = Object.values(selected);
  const totalCredits = calcSelectedCredits(selectedList);
  const passFailCount = selectedList.filter((c) => c.is_pass_fail).length;
  const range = validateCreditRange(totalCredits);

  function toggle(c: SectionCourse) {
    const k = keyOf(c);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) {
        delete next[k];
      } else {
        next[k] = {
          dept_code: c.dept_code,
          course_name: c.course_name,
          credits: c.credits,
          is_pass_fail: c.is_pass_fail,
        };
      }
      return next;
    });
  }

  function isChecked(c: { dept_code: string; course_name: string }) {
    return !!selected[keyOf(c)];
  }

  function toggleDept(code: string) {
    setOpenDepts((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function sendToCounselor() {
    const summary = selectedList
      .map((c) => `${c.course_name} (${c.is_pass_fail ? "P/NP" : `${c.credits}학점`})`)
      .join("\n");
    alert(
      `상담 신청이 접수되었습니다 (시범운영 단계: 실제 전송은 다음 단계에서 구현)\n\n` +
      `── ${nick} 님의 1학기 수강 계획 (${totalCredits}학점${
        passFailCount ? ` + P/NP ${passFailCount}` : ""
      }) ──\n${summary}`,
    );
  }

  /* ── 자격증 요건 학과 — TOP5 진입 가능 학과 안에 있으면 배너 ─ */
  const certDept = sections.top5Accessible.find((f) =>
    getCertificationRequirements(f.code, certificationData),
  );

  return (
    <>
      <AppHeader />
      <main className="page plan-page">
        <div className="plan-back-row no-print">
          <button
            className="link-back"
            onClick={() => nav("/result")}
            aria-label="결과지로 돌아가기"
          >
            ← 결과지로 돌아가기
          </button>
        </div>

        <div className="plan-title-row">
          <div>
            <h1 className="plan-title">
              <span aria-hidden>📋</span> 내 수강 계획서
            </h1>
            <p className="muted plan-subtitle">
              {nick} 님의 1학기 학습 계획
            </p>
          </div>
        </div>

        <div className="plan-intro">
          권장 학점 범위는 <strong>12~23학점</strong>입니다. 아래 과목들에서 선택해
          본인의 1학기를 설계해 보세요. 자유전공학과 전용 교과는 기본 선택되어 있습니다.
        </div>

        {/* 섹션 1: 자유전공 공통 (전용 + 교양필수) */}
        <section className="plan-section">
          <h2>섹션 1 · 자유전공 공통 <span className="muted small">전용·교양필수</span></h2>
          <ul className="plan-list">
            {[...sections.fmDed, ...sections.libReq].map((c) => (
              <PlanCourseRow
                key={keyOf(c)}
                c={c}
                checked={isChecked(c)}
                onToggle={() => toggle(c)}
              />
            ))}
          </ul>
        </section>

        {/* 섹션 2: 교양 강력추천 (택1 권장) */}
        <section className="plan-section">
          <h2>섹션 2 · 교양 강력추천 <span className="muted small">택1 권장</span></h2>
          <ul className="plan-list">
            {sections.libRec.map((c) => (
              <PlanCourseRow
                key={keyOf(c)}
                c={c}
                checked={isChecked(c)}
                onToggle={() => toggle(c)}
              />
            ))}
          </ul>
        </section>

        {/* 섹션 3: 희망 학과 전공탐색 */}
        <section className="plan-section">
          <h2>섹션 3 · 희망 학과 전공탐색 <span className="muted small">3과목 이상 권장</span></h2>
          {sections.top5Accessible.length === 0 && (
            <p className="muted">
              TOP5 중 자유전공 진입 가능 학과가 없습니다. 결과지로 돌아가
              비교탐색 학과를 살펴보시거나 진로 상담을 신청해 주세요.
            </p>
          )}
          {sections.top5Accessible.map((f) => {
            const e = getCoursesForDept(f.code, courseData);
            if (!e) return null;
            const open = openDepts[f.code] ?? false;
            const deptCheckedCount = e.courses.reduce(
              (n, x) => n + (isChecked({ dept_code: f.code, course_name: x.name }) ? 1 : 0),
              0,
            );
            return (
              <div key={f.code} className={`plan-dept ${open ? "plan-dept--open" : ""}`}>
                <button
                  type="button"
                  className="plan-dept__head no-print-toggle"
                  onClick={() => toggleDept(f.code)}
                  aria-expanded={open}
                >
                  <span className="plan-dept__caret" aria-hidden>{open ? "▾" : "▸"}</span>
                  <span className="plan-dept__name">
                    <strong>{f.name}</strong>
                    <span className="muted small">
                      {" "}TOP {f.rank} · 적합도 {f.percent.toFixed(1)}%
                    </span>
                  </span>
                  <span className="plan-dept__count muted small">
                    {deptCheckedCount} / {e.courses.length} 선택
                  </span>
                </button>
                {open && (
                  <ul className="plan-list plan-dept__list">
                    {e.courses.map((x) => {
                      const sc: SectionCourse = {
                        dept_code: f.code,
                        course_name: x.name,
                        credits: x.credits,
                        strongly_recommended: x.strongly_recommended,
                      };
                      return (
                        <PlanCourseRow
                          key={keyOf(sc)}
                          c={sc}
                          checked={isChecked(sc)}
                          onToggle={() => toggle(sc)}
                        />
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {/* 자격증 요건 학과 배너 — TOP5 진입 가능 학과 중 첫 매칭 학과 */}
        {certDept && (
          <CertificationBanner
            deptCode={certDept.code}
            deptName={certDept.name}
            placement="top"
          />
        )}

        {/* 누적 학점 — 페이지 하단 고정 */}
        <div className={`plan-total plan-total--${range.status.toLowerCase()}`}>
          <div className="plan-total__main">
            <span className="plan-total__label">현재 누적</span>
            <strong className="plan-total__credits">
              {totalCredits}<span className="plan-total__unit">학점</span>
            </strong>
            {passFailCount > 0 && (
              <span className="muted small">
                · P/NP {passFailCount}과목 포함
              </span>
            )}
          </div>
          <p className="plan-total__msg">{range.message}</p>
        </div>

        <div className="plan-actions no-print">
          <button onClick={() => window.print()}>
            <span aria-hidden>📄</span> PDF로 저장
          </button>
          <button className="ghost" onClick={() => window.print()}>
            <span aria-hidden>🖨️</span> 인쇄하기
          </button>
          <button className="ghost" onClick={sendToCounselor}>
            <span aria-hidden>💬</span> 상담사에게 보내기
          </button>
        </div>

        <p className="muted small plan-print-hint no-print">
          ※ "PDF로 저장"을 누르면 시스템 인쇄 다이얼로그가 열립니다. 대상을 "PDF로 저장"
          으로 선택하시면 파일로 받을 수 있습니다.
        </p>
      </main>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 과목 한 줄 — 체크박스 + 학점 + 강력추천 배지
 * ──────────────────────────────────────────────────────────── */
function PlanCourseRow({
  c,
  checked,
  onToggle,
}: {
  c: SectionCourse;
  checked: boolean;
  onToggle: () => void;
}) {
  const credits = c.is_pass_fail ? "P/NP" : `${c.credits}학점`;
  return (
    <li className={`plan-row ${c.strongly_recommended ? "plan-row--strong" : ""} ${checked ? "plan-row--on" : ""}`}>
      <label className="plan-row__label">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="plan-row__check"
        />
        {c.strongly_recommended && (
          <span className="plan-row__star" aria-hidden>⭐</span>
        )}
        <span className="plan-row__name">{c.course_name}</span>
        <span className="plan-row__credits">{credits}</span>
        {c.group_label && (
          <span className="plan-row__group">{c.group_label}</span>
        )}
        {c.strongly_recommended && !c.group_label && (
          <span className="plan-row__group">강력추천</span>
        )}
      </label>
    </li>
  );
}
