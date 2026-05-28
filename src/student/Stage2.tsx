import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { questionBank, departmentsDna } from "../lib/dataLoader";
import {
  getResponses,
  setResponse,
  saveResultCache,
  loadActiveBranches,
  isStage1Done,
} from "../lib/sessionState";
import {
  calcAxisScores,
  calcFitScores,
  calcCounselingNeed,
  selectStage2Items,
  BRANCHES,
  DIAGNOSTIC_AXES,
  type BranchCode,
  type DiagnosticAxis,
} from "@lib/recommendation_engine";
import ProgressBar from "../components/ProgressBar";
import ScaleButtons from "../components/ScaleButtons";
import AppHeader from "../components/AppHeader";
import StepIndicator from "../components/StepIndicator";

export default function Stage2() {
  const nav = useNavigate();

  // 1차가 끝나지 않았으면 시작 화면으로
  useEffect(() => {
    if (!isStage1Done()) nav("/", { replace: true });
  }, [nav]);

  const activeBranches = useMemo(() => loadActiveBranches() as Exclude<BranchCode, "ALL">[], []);
  const items = useMemo(
    () => selectStage2Items(questionBank, activeBranches),
    [activeBranches]
  );

  const [responses, setResponses] = useState<Record<string, number>>(() => getResponses());
  const initialIdx = useMemo(() => {
    const firstUnanswered = items.findIndex((it) => responses[it.id] == null);
    return firstUnanswered === -1 ? Math.max(0, items.length - 1) : firstUnanswered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [idx, setIdx] = useState(initialIdx);

  function nextUnansweredFrom(fromIdx: number, current: Record<string, number>): number {
    for (let i = fromIdx + 1; i < items.length; i++) {
      if (current[items[i].id] == null) return i;
    }
    for (let i = 0; i < fromIdx; i++) {
      if (current[items[i].id] == null) return i;
    }
    return -1;
  }

  function answer(v: number) {
    const qid = items[idx].id;
    setResponse(qid, v);
    const next = { ...responses, [qid]: v };
    setResponses(next);
    const target = nextUnansweredFrom(idx, next);
    if (target !== -1) setTimeout(() => setIdx(target), 500);
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

  function finish() {
    // 2차 응답까지 합쳐 최종 결과 재산출
    const axisScores = calcAxisScores(responses, questionBank);
    const fits = calcFitScores(axisScores, departmentsDna);
    const counseling = calcCounselingNeed(responses, questionBank);
    saveResultCache({
      axisScores,
      fits,
      counseling,
      computedAt: new Date().toISOString(),
    });
    nav("/result");
  }

  // 활성 계열이 없으면(엣지케이스): 그냥 결과로
  if (items.length === 0) {
    return (
      <>
        <AppHeader />
        <main className="page">
          <StepIndicator current={3} label="진단 검사 · 2차 (건너뜀)" />
          <h1>2차 심화검사 (건너뜀)</h1>
          <p className="muted">
            1차 결과만으로 충분한 변별이 가능합니다. 결과지로 이동합니다.
          </p>
          <div className="btn-row">
            <button onClick={finish}>결과 보기</button>
          </div>
        </main>
      </>
    );
  }

  const item = items[idx];

  return (
    <>
      <AppHeader />
      <main className="page">
        <StepIndicator current={3} label="진단 검사 · 2차" />
      <h1>2차 심화검사</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        활성 계열:{" "}
        {activeBranches.length > 0
          ? activeBranches.map((b) => BRANCHES[b]).join(" · ")
          : "전체"}
      </p>

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
          {item.axis} · {DIAGNOSTIC_AXES[item.axis as DiagnosticAxis] ?? ""} · {BRANCHES[item.branch]}
        </span>
        <p className="text">{item.text}</p>
        <ScaleButtons value={responses[item.id]} onChange={answer} />
      </div>

      {isAllDone ? (
        <div className="btn-row">
          <button className="ghost" onClick={goPrev} disabled={idx === 0}>← 이전</button>
          <button className="primary-cta" onClick={finish}>결과 보기 →</button>
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
      </main>
    </>
  );
}
