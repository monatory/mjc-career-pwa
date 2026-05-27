import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearAll,
  getResumeState,
  setConsent,
  type ResumeState,
} from "../lib/sessionState";
import AppHeader from "../components/AppHeader";
import StepIndicator from "../components/StepIndicator";

/**
 * STEP 1 / 3 — 검사 소개 화면
 * ───────────────────────────
 * - 공통 헤더(MJC + 센터명)
 * - STEP 1/3 진행 표시
 * - 검사명: MJC-CAT (Myongji College Career Aptitude Test)
 * - 검사 구성 안내 (8축 / 90문항 / 31학과)
 * - 안내사항 + 동의 체크
 * - "다음: 응답자 정보 입력 →" 버튼 → /profile (STEP 2)
 *
 * 추가:
 * - 진행 중인 검사 발견 시 "이어서 진행 / 처음부터" 모달
 *
 * 닉네임 입력은 STEP 2(응답자 정보)에서 받음.
 */
export default function Start() {
  const nav = useNavigate();
  const [agree, setAgree] = useState(false);

  // 새로고침·복귀 시 진행 상태 감지 → 모달
  const [resume, setResume] = useState<ResumeState | null>(null);
  useEffect(() => {
    const r = getResumeState();
    if (r.stage !== "none") setResume(r);
  }, []);

  function goNext() {
    setConsent(true);
    nav("/profile");
  }

  function resumeProgress() {
    if (resume) nav(resume.nextPath);
  }
  function restart() {
    clearAll();
    setResume(null);
  }

  return (
    <>
      <AppHeader />
      <main className="page">
        <StepIndicator current={1} label="검사 소개" />

        <header className="exam-title">
          <h1 className="exam-title__main">MJC-CAT</h1>
          <p className="exam-title__sub">명지전문대학 학과 적합도 진단</p>
          <p className="exam-title__abbr muted">
            <span className="muted">Myongji College Career Aptitude Test</span>
          </p>
        </header>

        <p className="muted">
          명지전문대학 자유전공 학생을 위한 학과 탐색 도구입니다.
          1차 기본검사 약 12~15분, 2차 심화검사 약 7~10분 소요됩니다.
        </p>

        <div className="card">
          <h2>검사 구성</h2>
          <p>
            본 진단은 <strong>8개 진단축</strong>
            <span className="muted">
              (흥미·활동선호·학습방식·역량인식·직무선호·진로가치·선택확신도·상담필요도)
            </span>
            을 측정하는 <strong>총 90개 문항</strong>으로 구성됩니다.
            응답 결과에 따라 추가 50문항이 자동 선별되며,
            본교 <strong>31개 학과</strong> 중 본인에게 가장 적합한 5개 학과를 안내합니다.
          </p>
        </div>

        <div className="card">
          <h2>안내사항</h2>
          <ul style={{ paddingLeft: "1.2em", margin: "8px 0", color: "var(--c-text-soft)" }}>
            <li>본 결과는 <strong>참고자료</strong>이며 학과 배정과 무관합니다.</li>
            <li>최종 학과 선택은 학생 본인의 권리입니다.</li>
            <li>응답에는 정답이 없습니다. 솔직하게 답해 주세요.</li>
            <li>진행 중 새로고침해도 응답은 유지됩니다.</li>
          </ul>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <span>위 안내사항을 확인했습니다.</span>
          </label>
        </div>

        <div className="btn-row">
          <button disabled={!agree} onClick={goNext}>
            다음: 응답자 정보 입력 →
          </button>
        </div>
      </main>

      {/* ─────────── 이어서 진행 모달 ─────────── */}
      {resume && <ResumeModal resume={resume} onResume={resumeProgress} onRestart={restart} />}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 이어서 진행 모달
 * ──────────────────────────────────────────────────────────── */
function ResumeModal({
  resume,
  onResume,
  onRestart,
}: {
  resume: ResumeState;
  onResume: () => void;
  onRestart: () => void;
}) {
  const stageLabel = {
    profile: "응답자 정보 입력",
    exam: `1차 검사 (${resume.s1Count}문항 응답 중)`,
    stage2: `2차 적응형 검사 (${resume.s2Count}문항 응답 중)`,
    result: "결과지",
    none: "",
  }[resume.stage];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2 style={{ marginTop: 0 }}>진행 중이던 검사가 있습니다</h2>
        <p>
          마지막 위치: <strong>{stageLabel}</strong>
          <br />
          <span className="muted">이어서 진행하시겠습니까? 새로 시작하면 응답이 모두 초기화됩니다.</span>
        </p>
        <div className="btn-row" style={{ marginTop: 18 }}>
          <button className="ghost" onClick={onRestart}>처음부터 다시</button>
          <button onClick={onResume}>이어서 진행하기 →</button>
        </div>
      </div>
    </div>
  );
}
