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
} from "@lib/recommendation_engine";
import ProgressBar from "../components/ProgressBar";
import ScaleButtons from "../components/ScaleButtons";

export default function Exam() {
  const nav = useNavigate();

  // STEP 3 진입 가드: 응답자 정보(profile)가 없으면 STEP 2로 강제 이동
  useEffect(() => {
    if (!getProfile()) nav("/profile", { replace: true });
  }, [nav]);

  // 1차 기본검사 90문항 (stage === 1)
  const items = useMemo(
    () => questionBank.items.filter((it) => it.stage === 1),
    []
  );

  // 응답 상태 (sessionStorage 동기)
  const [responses, setResponses] = useState<Record<string, number>>(() => getResponses());

  // 시작 위치: 가장 첫 미응답 문항
  const initialIdx = useMemo(() => {
    const firstUnanswered = items.findIndex((it) => responses[it.id] == null);
    return firstUnanswered === -1 ? items.length - 1 : firstUnanswered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [idx, setIdx] = useState(initialIdx);

  // 응답 변경 시 sessionStorage 즉시 반영
  function answer(v: number) {
    const qid = items[idx].id;
    setResponse(qid, v);
    setResponses((prev) => ({ ...prev, [qid]: v }));

    // 자동 진행: 마지막 문항이 아니면 다음 문항으로
    if (idx < items.length - 1) {
      setTimeout(() => setIdx((i) => i + 1), 180);
    }
  }

  function goPrev() {
    if (idx > 0) setIdx(idx - 1);
  }
  function goNext() {
    if (idx < items.length - 1) setIdx(idx + 1);
  }

  // 응답 완료 여부
  const answeredCount = items.filter((it) => responses[it.id] != null).length;
  const isAllDone = answeredCount === items.length;

  // 키보드 1~5로 응답 (선택사항)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) answer(n);
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, responses]);

  function submit() {
    // 1차 결과 산출 → 캐시 + 2차 라우팅 결정
    const axisScores = calcAxisScores(responses, questionBank);
    const fits = calcFitScores(axisScores, departmentsDna);
    const counseling = calcCounselingNeed(responses, questionBank);
    const active = routeToBranches(axisScores);

    saveResultCache({
      axisScores,
      fits,
      counseling,
      computedAt: new Date().toISOString(),
    });
    saveActiveBranches(active);
    markStage1Done();
    nav("/stage2");
  }

  const item = items[idx];

  return (
    <>
      <AppHeader />
      <main className="page">
        <StepIndicator current={3} label="진단 검사 · 1차" />
      <h1>1차 기본검사</h1>
      <ProgressBar
        current={answeredCount}
        total={items.length}
        label={`문항 ${idx + 1} / ${items.length}`}
      />

      <div className="card question-card">
        <span className="badge">{item.axis}</span>
        <p className="text">{item.text}</p>

        <ScaleButtons value={responses[item.id]} onChange={answer} />
      </div>

      <div className="btn-row">
        <button className="ghost" onClick={goPrev} disabled={idx === 0}>
          ← 이전
        </button>
        {idx < items.length - 1 ? (
          <button onClick={goNext} disabled={responses[item.id] == null}>
            다음 →
          </button>
        ) : (
          <button onClick={submit} disabled={!isAllDone}>
            1차 검사 제출
          </button>
        )}
      </div>

      {!isAllDone && idx === items.length - 1 && (
        <p className="muted" style={{ marginTop: 12 }}>
          {items.length - answeredCount}개 문항이 비어 있습니다. 이전 버튼으로 돌아가 응답해 주세요.
        </p>
      )}
      </main>
    </>
  );
}
