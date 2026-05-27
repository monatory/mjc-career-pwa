/**
 * 명지전문대학 학과추천 진단 PWA — 메타데이터 분석 함수 모음
 * ==============================================================
 *
 * STEP 2 에서 수집한 응답자 프로필(student_profile_schema.json)과
 * lib/recommendation_engine.js 가 산출한 적합도 결과를 결합해
 * 다음 4가지 메타 분석을 수행한다.
 *
 *   1) calcHitMetrics                — 학생 희망학과와 추천 TOP1/3/5 일치율
 *   2) classifyCounselingPriority    — 상담 우선군 자동 분류 (HIGH/MEDIUM/LOW)
 *   3) groupByDesignedReason         — 자유전공 진학 이유별 학생 그룹핑(집계)
 *   4) crossAnalyzeCareerVsRecommendation
 *                                    — 진로방향 × 추천학과 학부 단위 교차분석
 *
 * 중요: 이 파일의 어떤 함수도 학과 매칭 가중치(DNA)나 적합도 공식에
 *       영향을 주지 않는다. 모두 사후 메타 분석이다.
 *       lib/recommendation_engine.js 의 산출 공식은 변경 금지.
 *
 * 사용:
 *   import {
 *     calcHitMetrics,
 *     classifyCounselingPriority,
 *     groupByDesignedReason,
 *     crossAnalyzeCareerVsRecommendation,
 *   } from "./lib/analytics.js";
 */

/* ──────────────────────────────────────────────────────────────
 * 1) Hit 지표 — 학생 희망학과 vs 시스템 추천 TOP N
 * ──────────────────────────────────────────────────────────── */

/**
 * 학생이 STEP 2에서 입력한 1·2·3지망과
 * 시스템이 산출한 TOP1/3/5 사이의 일치 여부를 산출.
 *
 * @param {Object} profile - student_profile (preferred_dept_1/2/3 사용)
 * @param {Array}  fitScores - calcFitScores 결과 (정렬된 학과 배열)
 * @returns {Object} {
 *   hit_at_1, hit_at_3, hit_at_5,        // 1지망이 TOP1/3/5 안에 들었는가
 *   top1_in_preferences,                 // 시스템 TOP1이 학생 희망 3개 안에 들었는가
 *   preferences,                         // 학생이 입력한 희망 코드 배열
 *   evaluable                            // 희망학과 입력이 있어 평가 가능한지
 * }
 *
 * 평가 규칙:
 *   - preferred_dept_1 이 비어있으면 Hit 지표 계산 불가 (evaluable=false)
 *   - hit_at_N 은 1지망(preferred_dept_1)이 TOP N 안에 있는지 기준
 *   - top1_in_preferences 는 시스템 TOP1이 학생의 1~3지망 어딘가에 있는지
 */
export function calcHitMetrics(profile, fitScores) {
  const pref1 = profile?.preferred_dept_1 ?? null;
  const pref2 = profile?.preferred_dept_2 ?? null;
  const pref3 = profile?.preferred_dept_3 ?? null;
  const preferences = [pref1, pref2, pref3].filter((c) => c != null);

  if (pref1 == null) {
    return {
      hit_at_1: false,
      hit_at_3: false,
      hit_at_5: false,
      top1_in_preferences: false,
      preferences,
      evaluable: false,
    };
  }

  const topNCodes = (n) => fitScores.slice(0, n).map((d) => d.code);
  const top1Codes = topNCodes(1);
  const top3Codes = topNCodes(3);
  const top5Codes = topNCodes(5);

  return {
    hit_at_1: top1Codes.includes(pref1),
    hit_at_3: top3Codes.includes(pref1),
    hit_at_5: top5Codes.includes(pref1),
    top1_in_preferences: preferences.includes(fitScores[0]?.code),
    preferences,
    evaluable: true,
  };
}

/* ──────────────────────────────────────────────────────────────
 * 2) 상담 우선군 자동 분류
 * ──────────────────────────────────────────────────────────── */

/**
 * 다음 3가지 규칙으로 상담 우선순위를 자동 판정.
 *
 *   rule_a (NEED_HIGH)        : counselingNeed.score >= 70 (상담 필요도 높음)
 *   rule_b (EXTERNAL_DECISION): decision_maker == FAMILY|FRIEND_SENIOR
 *                              AND hit_at_1 == false (외부 결정 + 미스매치)
 *   rule_c (NO_STRONG_MATCH)  : TOP1 적합도 < 50 (강한 매칭 없음)
 *
 * @param {Object} profile - student_profile
 * @param {Array}  fitScores - calcFitScores 결과
 * @param {Object} counselingNeed - calcCounselingNeed 결과
 * @returns {Object} {
 *   priority: "HIGH"|"MEDIUM"|"LOW",
 *   triggered_rules: ["rule_a", ...],
 *   detail: { ... }   // 사람이 읽을 수 있는 부가 설명
 * }
 *
 * 우선순위 결정:
 *   - 2건 이상 트리거 → HIGH
 *   - 1건 트리거       → MEDIUM
 *   - 0건                → LOW
 */
export function classifyCounselingPriority(profile, fitScores, counselingNeed) {
  const triggered = [];
  const detail = {};

  // rule_a: 상담 필요도 점수
  const needScore = counselingNeed?.score ?? 0;
  if (needScore >= 70) {
    triggered.push("rule_a");
    detail.rule_a = `상담 필요도 ${needScore}점 (≥70)`;
  }

  // rule_b: 외부 결정 의존 + 1지망 미스매치
  const dm = profile?.decision_maker;
  const isExternal = dm === "FAMILY" || dm === "FRIEND_SENIOR";
  const hits = calcHitMetrics(profile || {}, fitScores || []);
  if (isExternal && hits.evaluable && !hits.hit_at_1) {
    triggered.push("rule_b");
    detail.rule_b = `의사결정자=${dm}, 1지망(${profile.preferred_dept_1})이 TOP1과 불일치`;
  }

  // rule_c: 강한 매칭 없음
  const top1Percent = fitScores?.[0]?.percent ?? 0;
  if (top1Percent < 50) {
    triggered.push("rule_c");
    detail.rule_c = `TOP1 적합도 ${top1Percent}% (<50)`;
  }

  let priority;
  if (triggered.length >= 2) priority = "HIGH";
  else if (triggered.length === 1) priority = "MEDIUM";
  else priority = "LOW";

  return { priority, triggered_rules: triggered, detail };
}

/* ──────────────────────────────────────────────────────────────
 * 3) 자유전공 진학 이유별 그룹핑 (집계 분석용)
 * ──────────────────────────────────────────────────────────── */

/**
 * 학생 배열을 self_designed_reason 값으로 그룹화하여
 * 그룹별 통계(인원 수, 평균 상담 필요도, 1지망 입력률, Hit@1 비율)를 산출.
 *
 * @param {Array} students - [{profile, fitScores, counselingNeed}] 형태의 배열
 * @returns {Object} {
 *   total: <전체 학생 수>,
 *   groups: {
 *     UNDECIDED: { count, ratio, avg_need_score, pref1_input_rate, hit1_rate, students: [...] },
 *     EXPLORE:   { ... },
 *     SCORE_MATCH: { ... },
 *     OTHER:     { ... }
 *   }
 * }
 *
 * 데이터가 없는 그룹도 0으로 채워 반환(다운스트림 차트가 빈 분류로 깨지지 않도록).
 */
export function groupByDesignedReason(students) {
  const REASON_KEYS = ["UNDECIDED", "EXPLORE", "SCORE_MATCH", "OTHER"];
  const groups = {};
  for (const k of REASON_KEYS) {
    groups[k] = { count: 0, ratio: 0, avg_need_score: 0, pref1_input_rate: 0, hit1_rate: 0, students: [] };
  }

  const safeStudents = Array.isArray(students) ? students : [];
  for (const s of safeStudents) {
    const reason = s?.profile?.self_designed_reason || "OTHER";
    const bucket = groups[reason] || groups.OTHER;
    bucket.students.push(s);
  }

  const total = safeStudents.length;
  for (const k of REASON_KEYS) {
    const g = groups[k];
    g.count = g.students.length;
    g.ratio = total > 0 ? Math.round((g.count / total) * 1000) / 1000 : 0;

    if (g.count === 0) continue;

    // 평균 상담 필요도
    const needSum = g.students.reduce(
      (acc, s) => acc + (s.counselingNeed?.score ?? 0),
      0,
    );
    g.avg_need_score = Math.round((needSum / g.count) * 10) / 10;

    // 1지망 입력률
    const pref1Inputs = g.students.filter((s) => s.profile?.preferred_dept_1).length;
    g.pref1_input_rate = Math.round((pref1Inputs / g.count) * 1000) / 1000;

    // Hit@1 비율 (1지망 입력자 한정)
    if (pref1Inputs > 0) {
      const hit1 = g.students.filter((s) => {
        const h = calcHitMetrics(s.profile || {}, s.fitScores || []);
        return h.evaluable && h.hit_at_1;
      }).length;
      g.hit1_rate = Math.round((hit1 / pref1Inputs) * 1000) / 1000;
    }

    // 학생 raw 배열은 집계 결과에서 제외(메모리·전송량 절감)
    delete g.students;
  }

  return { total, groups };
}

/* ──────────────────────────────────────────────────────────────
 * 4) 진로방향 × 추천학과(학부) 교차분석
 * ──────────────────────────────────────────────────────────── */

/**
 * 진로방향(career_direction) × 추천 TOP1 학과의 학부(school) 교차표를 만든다.
 *
 * @param {Array} students - [{profile, fitScores}] 형태의 배열
 * @returns {Object} {
 *   total,
 *   career_keys: [...],      // 진로방향 5개 키 순서
 *   school_keys: [...],      // 등장한 학부 키 목록(정렬됨)
 *   matrix: {
 *     EMPLOYMENT: { "AI.SW 융합학부": 3, "스마트시스템공학부": 2, ... },
 *     STARTUP: { ... },
 *     ...
 *   }
 * }
 *
 * 활용:
 *   - "취업 지향 학생들이 어느 학부에 가장 많이 매칭되는가"
 *   - "창업 지향 학생들의 추천 학부 분포는 일반과 다른가" 같은 질문에 답.
 */
export function crossAnalyzeCareerVsRecommendation(students) {
  const CAREER_KEYS = ["EMPLOYMENT", "STARTUP", "UNIV_TRANSFER", "GRAD_SCHOOL", "UNDECIDED"];
  const matrix = {};
  for (const c of CAREER_KEYS) matrix[c] = {};

  const safeStudents = Array.isArray(students) ? students : [];
  const schoolSet = new Set();

  for (const s of safeStudents) {
    const career = s?.profile?.career_direction || "UNDECIDED";
    const careerBucket = matrix[career] || (matrix[career] = {});
    const top1 = s?.fitScores?.[0];
    if (!top1) continue;
    const school = top1.school || "(미상)";
    schoolSet.add(school);
    careerBucket[school] = (careerBucket[school] || 0) + 1;
  }

  // 학부 키는 정렬해서 안정적인 표 순서 보장
  const school_keys = [...schoolSet].sort();

  // 등장하지 않은 셀은 0으로 채움 (다운스트림 차트 안정성)
  for (const c of CAREER_KEYS) {
    for (const sch of school_keys) {
      if (matrix[c][sch] == null) matrix[c][sch] = 0;
    }
  }

  return {
    total: safeStudents.length,
    career_keys: CAREER_KEYS,
    school_keys,
    matrix,
  };
}
