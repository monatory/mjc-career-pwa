/**
 * 메타 분석 함수 회귀 테스트
 * ==============================================================
 * lib/analytics.js 의 4개 함수를 가상 데이터로 검증한다.
 * tests/test_engine.js (적합도 엔진 테스트)와 독립적으로 실행.
 *
 * 실행:
 *   node tests/test_analytics.js
 *
 * 통과 기준:
 *   - 모든 어서션이 통과해야 PASS (exit code 0)
 *   - 하나라도 실패하면 메시지 출력 후 exit code 1
 */

import {
  calcHitMetrics,
  classifyCounselingPriority,
  groupByDesignedReason,
  crossAnalyzeCareerVsRecommendation,
} from "../lib/analytics.js";

let passed = 0;
let failed = 0;

function assert(cond, label, detail) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
    if (detail !== undefined) console.log(`      detail: ${JSON.stringify(detail)}`);
  }
}

function section(title) {
  console.log("");
  console.log("─".repeat(72));
  console.log(title);
  console.log("─".repeat(72));
}

/* ──────────────────────────────────────────────────────────────
 * 공통 mock 데이터
 * ──────────────────────────────────────────────────────────── */

// 가상 학과 적합도 결과 (큰 순서대로 정렬되어 있다고 가정)
const fitScoresIT = [
  { rank: 1, code: "AISW_CS",   school: "AI.SW 융합학부", name: "컴퓨터공학과",     percent: 88.4 },
  { rank: 2, code: "AISW_GAME", school: "AI.SW 융합학부", name: "AI게임소프트웨어학과", percent: 82.1 },
  { rank: 3, code: "AISW_SEC",  school: "AI.SW 융합학부", name: "컴퓨터보안공학과", percent: 78.0 },
  { rank: 4, code: "AISW_ICT",  school: "AI.SW 융합학부", name: "정보통신공학과",   percent: 74.3 },
  { rank: 5, code: "SMART_IE",  school: "스마트시스템공학부", name: "산업경영공학과", percent: 65.2 },
];

const fitScoresWeak = [
  { rank: 1, code: "BIZ_MGT",  school: "경영휴먼라이프학부", name: "경영학과",     percent: 42.0 },
  { rank: 2, code: "BIZ_TAX",  school: "경영휴먼라이프학부", name: "세무회계과",   percent: 40.5 },
  { rank: 3, code: "BIZ_REAL", school: "경영휴먼라이프학부", name: "부동산경영과", percent: 38.7 },
  { rank: 4, code: "BIZ_PUBADM", school: "경영휴먼라이프학부", name: "공공행정서비스상담과", percent: 36.1 },
  { rank: 5, code: "ART_PE",   school: "예술건강학부", name: "사회체육과",     percent: 35.5 },
];

/* ──────────────────────────────────────────────────────────────
 * Test 1: calcHitMetrics
 * ──────────────────────────────────────────────────────────── */
section("Test 1: calcHitMetrics — 학생 희망 vs 시스템 TOP1/3/5");

// 1-1. 1지망이 TOP1과 일치 → 모든 hit true
{
  const p = { preferred_dept_1: "AISW_CS", preferred_dept_2: "AISW_GAME", preferred_dept_3: null };
  const r = calcHitMetrics(p, fitScoresIT);
  assert(r.evaluable === true, "evaluable=true (1지망 입력 있음)");
  assert(r.hit_at_1 === true,  "1지망 AISW_CS == TOP1 → hit_at_1");
  assert(r.hit_at_3 === true,  "→ hit_at_3");
  assert(r.hit_at_5 === true,  "→ hit_at_5");
  assert(r.top1_in_preferences === true, "TOP1(AISW_CS)이 학생 희망 안에 있음");
  assert(r.preferences.length === 2, "preferences 배열은 입력된 2개만 포함", r.preferences);
}

// 1-2. 1지망이 TOP5에는 있으나 TOP1은 아님
{
  const p = { preferred_dept_1: "SMART_IE", preferred_dept_2: null, preferred_dept_3: null };
  const r = calcHitMetrics(p, fitScoresIT);
  assert(r.hit_at_1 === false, "1지망 SMART_IE != TOP1");
  assert(r.hit_at_3 === false, "SMART_IE는 TOP3에 없음");
  assert(r.hit_at_5 === true,  "SMART_IE는 TOP5에는 있음");
}

// 1-3. 1지망이 비어있으면 evaluable=false
{
  const p = { preferred_dept_1: null };
  const r = calcHitMetrics(p, fitScoresIT);
  assert(r.evaluable === false, "1지망 미입력 시 evaluable=false");
  assert(r.hit_at_1 === false && r.hit_at_3 === false && r.hit_at_5 === false,
         "evaluable=false 시 모든 hit는 false");
}

/* ──────────────────────────────────────────────────────────────
 * Test 2: classifyCounselingPriority
 * ──────────────────────────────────────────────────────────── */
section("Test 2: classifyCounselingPriority — HIGH/MEDIUM/LOW 분류");

// 2-1. 어떤 규칙도 트리거하지 않음 → LOW
{
  const profile = {
    preferred_dept_1: "AISW_CS",
    decision_maker: "SELF",
  };
  const need = { score: 35 };
  const r = classifyCounselingPriority(profile, fitScoresIT, need);
  assert(r.priority === "LOW",          "self+낮은 need+TOP1 일치 → LOW", r);
  assert(r.triggered_rules.length === 0, "트리거 규칙 0건");
}

// 2-2. NEED 점수만 높음 → MEDIUM (rule_a)
{
  const profile = {
    preferred_dept_1: "AISW_CS",
    decision_maker: "SELF",
  };
  const need = { score: 72 };
  const r = classifyCounselingPriority(profile, fitScoresIT, need);
  assert(r.priority === "MEDIUM",          "need=72만 트리거 → MEDIUM", r);
  assert(r.triggered_rules.includes("rule_a"), "rule_a 포함");
}

// 2-3. 가족 결정 + 미스매치 → MEDIUM (rule_b)
{
  const profile = {
    preferred_dept_1: "SMART_IE",   // TOP5 안이지만 TOP1과 불일치
    decision_maker: "FAMILY",
  };
  const need = { score: 30 };
  const r = classifyCounselingPriority(profile, fitScoresIT, need);
  assert(r.priority === "MEDIUM", "family+1지망 미스매치 → MEDIUM", r);
  assert(r.triggered_rules.includes("rule_b"), "rule_b 포함");
}

// 2-4. NEED 높음 + 강한 매칭 없음 → HIGH (rule_a + rule_c)
{
  const profile = {
    preferred_dept_1: "BIZ_MGT",
    decision_maker: "SELF",
  };
  const need = { score: 80 };
  const r = classifyCounselingPriority(profile, fitScoresWeak, need);
  assert(r.priority === "HIGH", "need 높음+TOP1<50 → HIGH", r);
  assert(r.triggered_rules.includes("rule_a"), "rule_a 포함");
  assert(r.triggered_rules.includes("rule_c"), "rule_c 포함");
}

// 2-5. 1지망 미입력 + 가족 결정이지만 평가 불가 → rule_b 트리거되지 않아야 함
{
  const profile = {
    preferred_dept_1: null,
    decision_maker: "FAMILY",
  };
  const need = { score: 30 };
  const r = classifyCounselingPriority(profile, fitScoresIT, need);
  assert(!r.triggered_rules.includes("rule_b"),
         "1지망 미입력 시 rule_b 평가 불가 → 트리거 안 됨", r);
}

/* ──────────────────────────────────────────────────────────────
 * Test 3: groupByDesignedReason
 * ──────────────────────────────────────────────────────────── */
section("Test 3: groupByDesignedReason — 자유전공 진학 이유 그룹별 집계");

{
  const mockStudents = [
    {
      profile: { self_designed_reason: "UNDECIDED", preferred_dept_1: "AISW_CS" },
      fitScores: fitScoresIT,
      counselingNeed: { score: 75 },
    },
    {
      profile: { self_designed_reason: "UNDECIDED", preferred_dept_1: "SMART_IE" },
      fitScores: fitScoresIT,
      counselingNeed: { score: 60 },
    },
    {
      profile: { self_designed_reason: "EXPLORE", preferred_dept_1: null },
      fitScores: fitScoresIT,
      counselingNeed: { score: 45 },
    },
    {
      profile: { self_designed_reason: "SCORE_MATCH", preferred_dept_1: "BIZ_MGT" },
      fitScores: fitScoresWeak,
      counselingNeed: { score: 30 },
    },
  ];

  const r = groupByDesignedReason(mockStudents);

  assert(r.total === 4, "총 학생 수 4명");
  assert(r.groups.UNDECIDED.count === 2, "UNDECIDED 2명");
  assert(r.groups.EXPLORE.count === 1,    "EXPLORE 1명");
  assert(r.groups.SCORE_MATCH.count === 1, "SCORE_MATCH 1명");
  assert(r.groups.OTHER.count === 0,      "OTHER 0명");

  // UNDECIDED 평균 상담 필요도 = (75+60)/2 = 67.5
  assert(r.groups.UNDECIDED.avg_need_score === 67.5,
         "UNDECIDED 평균 상담필요도 67.5",
         r.groups.UNDECIDED);

  // UNDECIDED 1지망 입력률 = 2/2 = 1.0
  assert(r.groups.UNDECIDED.pref1_input_rate === 1.0,
         "UNDECIDED 1지망 입력률 100%");

  // UNDECIDED hit1_rate: 학생A 1지망=AISW_CS == TOP1 → hit, 학생B SMART_IE != TOP1 → miss
  // → 1/2 = 0.5
  assert(r.groups.UNDECIDED.hit1_rate === 0.5,
         "UNDECIDED hit@1 비율 50%",
         r.groups.UNDECIDED);

  // EXPLORE: 1지망 미입력자뿐이므로 hit1_rate = 0
  assert(r.groups.EXPLORE.pref1_input_rate === 0,
         "EXPLORE 1지망 입력률 0%");
  assert(r.groups.EXPLORE.hit1_rate === 0,
         "EXPLORE hit@1 0 (입력자 없음)");

  // 비율 합계 1.0 (UNDECIDED 0.5 + EXPLORE 0.25 + SCORE_MATCH 0.25 + OTHER 0)
  const ratioSum =
    r.groups.UNDECIDED.ratio + r.groups.EXPLORE.ratio +
    r.groups.SCORE_MATCH.ratio + r.groups.OTHER.ratio;
  assert(Math.abs(ratioSum - 1.0) < 0.001, "그룹 비율 합계 ≈ 1.0", ratioSum);
}

// 빈 입력에 대한 안전성
{
  const r = groupByDesignedReason([]);
  assert(r.total === 0, "빈 배열 입력 → total=0");
  assert(r.groups.UNDECIDED.count === 0, "모든 그룹 0으로 초기화");
}

/* ──────────────────────────────────────────────────────────────
 * Test 4: crossAnalyzeCareerVsRecommendation
 * ──────────────────────────────────────────────────────────── */
section("Test 4: crossAnalyzeCareerVsRecommendation — 진로방향 × 학부");

{
  const mockStudents = [
    { profile: { career_direction: "EMPLOYMENT" },     fitScores: fitScoresIT },
    { profile: { career_direction: "EMPLOYMENT" },     fitScores: fitScoresIT },
    { profile: { career_direction: "STARTUP" },        fitScores: fitScoresIT },
    { profile: { career_direction: "UNIV_TRANSFER" },  fitScores: fitScoresWeak },
    { profile: { career_direction: "UNDECIDED" },      fitScores: fitScoresWeak },
  ];

  const r = crossAnalyzeCareerVsRecommendation(mockStudents);

  assert(r.total === 5, "총 5명");
  assert(r.career_keys.length === 5, "career_keys 5개 보장");

  // 학부 키: AI.SW 융합학부(3명), 경영휴먼라이프학부(2명)
  assert(r.school_keys.includes("AI.SW 융합학부"),     "AI.SW 학부 등장");
  assert(r.school_keys.includes("경영휴먼라이프학부"),  "경영휴먼라이프학부 등장");
  assert(r.school_keys.length === 2, "등장 학부 2종", r.school_keys);

  // EMPLOYMENT × AI.SW 융합학부 = 2
  assert(r.matrix.EMPLOYMENT["AI.SW 융합학부"] === 2,
         "취업 지향 학생 2명이 AI.SW 학부로 매칭",
         r.matrix.EMPLOYMENT);
  // STARTUP × AI.SW = 1
  assert(r.matrix.STARTUP["AI.SW 융합학부"] === 1,
         "창업 지향 학생 1명이 AI.SW 학부로 매칭");
  // UNIV_TRANSFER × 경영휴먼라이프학부 = 1
  assert(r.matrix.UNIV_TRANSFER["경영휴먼라이프학부"] === 1,
         "편입 지향 학생 1명이 경영휴먼라이프학부로 매칭");

  // 0 채움 검증: STARTUP × 경영휴먼라이프학부 = 0
  assert(r.matrix.STARTUP["경영휴먼라이프학부"] === 0,
         "STARTUP×경영휴먼라이프학부 0으로 채워짐");
  // 등장하지 않은 진로(GRAD_SCHOOL)도 학부 키에 0이 채워져 있어야 함
  assert(r.matrix.GRAD_SCHOOL["AI.SW 융합학부"] === 0,
         "GRAD_SCHOOL × AI.SW 0 채움");
}

/* ──────────────────────────────────────────────────────────────
 * 결과 집계
 * ──────────────────────────────────────────────────────────── */
console.log("");
console.log("=".repeat(72));
console.log(`테스트 결과: ${passed} 통과 / ${failed} 실패 (전체 ${passed + failed})`);
console.log("=".repeat(72));

process.exit(failed === 0 ? 0 : 1);
