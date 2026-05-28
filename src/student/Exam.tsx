import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { questionBank, departmentsDna } from "../lib/dataLoader";
import {
  getResponses,
  setResponse,
  markStage1Done,
  saveResultCache,
  saveActiveBranches,
  getProfile,
} from "../lib/sessionState";
import AppHeader from "../components/AppHeader";
import StepIndicator from "../components/StepIndicator";
import {
  calcAxisScores,
  calcFitScores,
  calcCounselingNeed,
  routeToBranches,
  DIAGNOSTIC_AXES,
  type DiagnosticAxis,
} from "@lib/recommendation_engine";
import ProgressBar from "../components/ProgressBar";
import ScaleButtons from "../components/ScaleButtons";

export default function Exam() {
  const nav = useNavigate();

  // STEP 3 진입 가드
  useEffect(() => {
    if (!getProfile()) nav("/profile", { replace: true });
  }, [nav]);

  // 1차 기본검사 90문항
  const items = useMemo(
    () => questionBank.items.filter((it) => it.stage === 1),
    [],
  );

  const [responses, setResponses] = useState<Record<string, number>>(() => getResponses());

  // 첫 미응답 위치에서 시작
  const initialIdx = useMemo(() => {
    const firstUnanswered = items.findIndex((it) => responses[it.id] == null);
    return firstUnanswered === -1 ? items.length - 1 : firstUnanswered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [idx, setIdx] = useState(initialIdx);

  // 다음 미응답 문항 인덱스 (없으면 -1)
  function nextUnansweredFrom(fromIdx: number, currentResponses: Record<string, number>): number {
    // 현재 위치 다음부터 탐색
    for (let i = fromIdx + 1; i < items.length; i++) {
      if (currentResponses[items[i].id] == null) return i;
    }
    // 못 찾으면 처음부터 fromIdx 미만으로 탐색
    for (let i = 0; i < fromIdx; i++) {
      if (currentResponses[items[i].id] == null) return i;
    }
    return -1;
  }

  // 응답: sessionStorage 저장 + 미응답 자동 점프
  function answer(v: number) {
    const qid = items[idx].id;
    setResponse(qid, v);
    const next = { ...responses, [qid]: v };
    setResponses(next);

    // 자동 진행: 다음 미응답으로 (선형 idx+1 대신). 없으면 그대로 머무름.
    const target = nextUnansweredFrom(idx, next);
    if (target !== -1) {
      setTimeout(() => setIdx(target), 500);
    }
  }

  function goPrev() { if (idx > 0) setIdx(idx - 1); }
  function goNext() { if (idx < items.length - 1) setIdx(idx + 1); }
  function jumpToNextUnanswered() {
    const target = nextUnansweredFrom(idx, responses);
    if (target !== -1) setIdx(target);
  }

  const answeredCount = items.filter((it) => responses[it.id] != null).length;
  const remaining = items.length - answeredCount;
  const isAllDone = remaining === 0;
  const hasNextUnanswered = !isAllDone && nextUnansweredFrom(idx, responses) !== -1;

  // 키보드 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 입력 요소에 포커스된 경우는 무시
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) answer(n);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "?" || e.key === "/") jumpToNextUnanswered();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, responses]);

  function submit() {
    const axisScores = calcAxisScores(responses, questionBank);
    const fits = calcFitScores(axisScores, departmentsDna);
    const counseling = calcCounselingNeed(responses, questionBank);
    const active = routeToBranches(axisScores);
    saveResultCache({
      axisScores, fits, counseling,
      computedAt: new Date().toISOString(),
    });
    saveActiveBranches(active);
    markStage1Done();
    nav("/stage2");
  }

  const item = items[idx];
  const canEditProfile = answeredCount < 5;

  return (
    <>
      <AppHeader />
      <main className="page">
        <StepIndicator current={3} label="진단 검사 · 1차" />
        <div className="exam-h1-row">
          <h1>1차 기본검사</h1>
          {canEditProfile && (
            <button className="link-btn" onClick={() => nav("/profile")}>
              응답자 정보 수정
            </button>
          )}
        </div>

        <ProgressBar
          current={answeredCount}
          total={items.length}
          label={`문항 ${idx + 1} / ${items.length}`}
        />
        <div className="exam-status muted">
          <span>응답 <strong>{answeredCount}</strong> / {items.length}</span>
          {!isAllDone && (
            <>
              <span className="exam-status__sep">·</span>
              <span>{remaining}개 남음</span>
              {hasNextUnanswered && (
                <>
                  <span className="exam-status__sep">·</span>
                  <button className="link-btn" onClick={jumpToNextUnanswered}>
                    다음 미응답으로 ↦
                  </button>
                </>
              )}
            </>
          )}
          {isAllDone && (
            <>
              <span className="exam-status__sep">·</span>
              <span className="exam-status__done">모두 응답 완료</span>
            </>
          )}
        </div>

        <div className="card question-card">
          <span className="badge">
            {item.axis} · {DIAGNOSTIC_AXES[item.axis as DiagnosticAxis] ?? ""}
          </span>
          <p className="text">{item.text}</p>
          <ScaleButtons value={responses[item.id]} onChange={answer} />
        </div>

        {/* 모두 응답된 즉시 제출 버튼 우선 노출 — 마지막 문항 도달 여부와 무관 */}
        {isAllDone ? (
          <div className="btn-row">
            <button className="ghost" onClick={goPrev} disabled={idx === 0}>← 이전</button>
            <button className="primary-cta" onClick={submit}>
              1차 검사 제출 →
            </button>
          </div>
        ) : (
          <div className="btn-row">
            <button className="ghost" onClick={goPrev} disabled={idx === 0}>← 이전</button>
            {idx < items.length - 1 ? (
              <button onClick={goNext} disabled={responses[item.id] == null}>다음 →</button>
            ) : (
              <button onClick={jumpToNextUnanswered}>
                미응답 {remaining}개로 이동 ↦
              </button>
            )}
          </div>
        )}

        <p className="kbd-hint muted">
          키보드: <kbd>1</kbd>~<kbd>5</kbd> 응답 · <kbd>←</kbd> 이전 · <kbd>→</kbd> 다음 · <kbd>?</kbd> 미응답 이동
        </p>
      </main>
    </>
  );
}
