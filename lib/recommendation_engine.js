/**
 * 명지전문대학 학과추천 진단 PWA - 적합도 산출 엔진
 * ====================================================
 *
 * 계획서 Ⅷ장 산출 공식을 그대로 구현한 핵심 라이브러리.
 * Python 시뮬레이션 코드(가상 학생 5명 검증 통과)를 그대로 포팅함.
 *
 * **변경 금지**: 분자/분모 공식 수정은 CLAUDE.md 2장에 따라 사용자 승인 필요.
 *
 * 사용:
 *   import { calcAxisScores, calcFitScores, calcCounselingNeed }
 *     from './lib/recommendation_engine.js';
 *
 *   const axisScores = calcAxisScores(responses, questionBank);
 *   const fits = calcFitScores(axisScores, departmentsDna);
 *   const need = calcCounselingNeed(responses, questionBank);
 */

// 24개 매칭축 표준 순서 (departments_dna.json 과 동일해야 함)
export const AXES = [
  "SW", "AI", "GAME", "SEC", "NET", "SYS",
  "HW", "EMB", "MECH", "ELEC",
  "CIVIL", "INDUST",
  "BIZ", "ACC", "ADMIN", "SERVICE", "LANG",
  "EDU", "WELFARE",
  "DESIGN", "CONTENT", "BEAUTY",
  "HEALTH", "MED",
];

// 8개 진단축
export const DIAGNOSTIC_AXES = {
  INT:  "흥미",
  ACT:  "활동 선호",
  LRN:  "학습 방식",
  COMP: "역량 인식",
  JOB:  "직무 선호",
  VAL:  "진로 가치",
  CONF: "선택 확신도",
  NEED: "상담 필요도",
};

// 2차 적응형 검사 6개 분기 계열
export const BRANCHES = {
  ALL:    "전체 공통",
  IT:     "IT (SW/AI/게임/보안/통신/시스템)",
  HW:     "HW·공간산업 (전자/임베/기계/전기/토목/산업)",
  BIZ:    "경영·서비스·외국어",
  HUM:    "휴먼·교육·복지",
  ART:    "예술·디자인·콘텐츠·뷰티",
  HEALTH: "체육·보건의료",
};

// 매칭축 → 어느 분기 계열에 속하는지 (2차 라우팅용)
const AXIS_TO_BRANCH = {
  SW: "IT", AI: "IT", GAME: "IT", SEC: "IT", NET: "IT", SYS: "IT",
  HW: "HW", EMB: "HW", MECH: "HW", ELEC: "HW", CIVIL: "HW", INDUST: "HW",
  BIZ: "BIZ", ACC: "BIZ", ADMIN: "BIZ", SERVICE: "BIZ", LANG: "BIZ",
  EDU: "HUM", WELFARE: "HUM",
  DESIGN: "ART", CONTENT: "ART", BEAUTY: "ART",
  HEALTH: "HEALTH", MED: "HEALTH",
};

/* ──────────────────────────────────────────────────────────────
 * 1) 학생 응답 → 24개 매칭축 점수
 * ──────────────────────────────────────────────────────────── */

/**
 * 학생의 5점 척도 응답을 24개 매칭축 점수(0~5)로 환산.
 *
 * @param {Object} responses - {Q001: 5, Q002: 4, ...}
 * @param {Object} questionBank - question_bank.json 의 객체
 * @returns {Object} - {SW: 4.27, AI: 4.12, ...}
 *
 * 공식:
 *   매칭축 점수 = Σ(응답값 × 가중치) / Σ(가중치)
 *   (가중치 합으로 정규화하여 0~5점 척도 유지)
 *
 * 역채점(reverse=true) 문항은 응답값을 (6 - v)로 변환한 뒤 가중.
 * CONF/NEED 문항은 매칭축 매핑이 비어있어 자동으로 제외됨.
 */
export function calcAxisScores(responses, questionBank) {
  const itemLookup = {};
  for (const it of questionBank.items) {
    itemLookup[it.id] = it;
  }

  const axisSum = {};
  const axisWeight = {};
  for (const ax of AXES) {
    axisSum[ax] = 0;
    axisWeight[ax] = 0;
  }

  for (const [qid, resp] of Object.entries(responses)) {
    const item = itemLookup[qid];
    if (!item) continue;

    // 역채점 처리
    const v = item.reverse ? (6 - resp) : resp;

    for (const [ax, w] of Object.entries(item.mapping || {})) {
      if (AXES.includes(ax)) {
        axisSum[ax] += v * w;
        axisWeight[ax] += w;
      }
    }
  }

  const result = {};
  for (const ax of AXES) {
    result[ax] = axisWeight[ax] > 0 ? axisSum[ax] / axisWeight[ax] : 0;
  }
  return result;
}

/* ──────────────────────────────────────────────────────────────
 * 2) 매칭축 점수 → 31개 학과 적합도 (계획서 Ⅷ-1 공식)
 * ──────────────────────────────────────────────────────────── */

/**
 * 24개 매칭축 점수를 31개 학과의 적합도 백분율(0~100)로 환산.
 *
 * @param {Object} axisScores - calcAxisScores 결과
 * @param {Object} departmentsDna - departments_dna.json 객체
 * @returns {Array} - [{code, name, school, percent, rank, ...}] 내림차순 정렬
 *
 * 공식 (계획서 Ⅷ-1, 변경 금지):
 *   학과 적합도(%) = ( Σ(학생 매칭축 점수 × 학과 DNA 가중치) / 학과 최대점수 ) × 100
 *   학과 최대점수 = Σ(학과 DNA 가중치) × 5
 */
export function calcFitScores(axisScores, departmentsDna) {
  const results = departmentsDna.departments.map((dept) => {
    const dna = dept.dna;

    // 분자: Σ(학생 점수 × DNA 가중치)
    let numerator = 0;
    for (const ax of AXES) {
      numerator += (axisScores[ax] || 0) * (dna[ax] || 0);
    }

    // 분모: 학과 최대점수 (캐싱된 값 사용; 없으면 즉석 계산)
    const maxScore = dept.max_score
      ?? AXES.reduce((s, ax) => s + (dna[ax] || 0), 0) * 5;

    const percent = maxScore > 0 ? (numerator / maxScore) * 100 : 0;

    return {
      code: dept.code,
      school: dept.school,
      name: dept.name,
      percent: Math.round(percent * 10) / 10,  // 소수점 1자리
      primary_axes: dept.primary_axes || [],
    };
  });

  // 적합도 내림차순 정렬 + 순위 부여
  results.sort((a, b) => b.percent - a.percent);
  results.forEach((r, i) => (r.rank = i + 1));
  return results;
}

/* ──────────────────────────────────────────────────────────────
 * 3) 상담 필요도 (CONF + NEED → 0~100)
 * ──────────────────────────────────────────────────────────── */

/**
 * 선택 확신도(CONF)와 상담 필요도(NEED) 응답을 종합해 0~100점 산출.
 *
 * @param {Object} responses - {Q001: 5, ...}
 * @param {Object} questionBank
 * @returns {Object} - {score, category, conf_avg, need_avg}
 *
 * 산출 방식:
 *   1) CONF 15문항: 역채점 처리 후 평균. 점수가 낮을수록 확신 부족 → 상담 필요
 *      → 상담 가산 = (5 - conf_avg) / 4 × 50
 *   2) NEED 15문항: 직접 응답 평균. 높을수록 상담 요구가 큼
 *      → 상담 가산 = (need_avg - 1) / 4 × 50
 *   3) 합산 0~100, 70점 이상 "상담 우선 권장군"
 */
export function calcCounselingNeed(responses, questionBank) {
  const confItems = questionBank.items.filter((i) => i.axis === "CONF");
  const needItems = questionBank.items.filter((i) => i.axis === "NEED");

  // CONF: 역채점 적용 후 평균 ("확신 있음 = 5")
  let confSum = 0, confCount = 0;
  for (const it of confItems) {
    const resp = responses[it.id];
    if (resp == null) continue;
    const v = it.reverse ? (6 - resp) : resp;
    confSum += v;
    confCount++;
  }
  const confAvg = confCount > 0 ? confSum / confCount : 3;

  // NEED: 직접 평균 ("도움 요구 = 5")
  let needSum = 0, needCount = 0;
  for (const it of needItems) {
    const resp = responses[it.id];
    if (resp == null) continue;
    const v = it.reverse ? (6 - resp) : resp;
    needSum += v;
    needCount++;
  }
  const needAvg = needCount > 0 ? needSum / needCount : 3;

  // 0~100 환산: 확신 부족 50점 + 도움 요구 50점
  const lowConfidence = ((5 - confAvg) / 4) * 50;  // confAvg=1→50점, =5→0점
  const highNeed      = ((needAvg - 1) / 4) * 50;  // needAvg=1→0점, =5→50점
  const score = Math.max(0, Math.min(100, lowConfidence + highNeed));

  let category;
  if (score >= 70)      category = "상담 우선 권장군";
  else if (score >= 40) category = "상담 권장군";
  else                  category = "상담 선택군";

  return {
    score: Math.round(score * 10) / 10,
    category,
    conf_avg: Math.round(confAvg * 100) / 100,
    need_avg: Math.round(needAvg * 100) / 100,
  };
}

/* ──────────────────────────────────────────────────────────────
 * 4) 학과 결정 미정군 보강 분류
 * ──────────────────────────────────────────────────────────── */

/**
 * 추천 TOP5의 변별이 약한 학생을 「학과 결정 미정군」으로 보강.
 *
 * @param {Array} fitScores - calcFitScores 결과
 * @returns {Object} - {is_undecided, reason, top1_top5_gap}
 *
 * 판정 기준:
 *   - TOP1과 TOP5의 적합도 차이가 8점 미만 → 변별 약함
 *   - TOP5 적합도가 50점 미만 → 강한 매칭 없음
 *   둘 중 하나라도 해당하면 미정군
 */
export function detectUndecided(fitScores) {
  const top1 = fitScores[0]?.percent ?? 0;
  const top5 = fitScores[4]?.percent ?? 0;
  const gap = top1 - top5;

  const lowGap = gap < 8;
  const lowMatch = top1 < 50;

  return {
    is_undecided: lowGap || lowMatch,
    top1_top5_gap: Math.round(gap * 10) / 10,
    reason: lowGap && lowMatch
      ? "TOP1~TOP5 변별 부족 + 강한 매칭 없음"
      : lowGap
      ? "TOP1~TOP5 변별 부족(< 8점)"
      : lowMatch
      ? "강한 매칭 없음(TOP1 < 50점)"
      : "정상 (결정군)",
  };
}

/* ──────────────────────────────────────────────────────────────
 * 5) 2차 적응형 검사 라우팅
 * ──────────────────────────────────────────────────────────── */

/**
 * 1차 검사 결과로 학생을 1~3개의 2차 분기 계열에 자동 라우팅.
 *
 * @param {Object} axisScores - 1차 검사 후 calcAxisScores 결과
 * @param {Object} options - {threshold: 3.0} (기본 3.0 이상 매칭축이 속한 계열 활성)
 * @returns {Array} - ["IT", "ART"] 활성화된 계열 (ALL 제외)
 *
 * 작동 방식:
 *   매칭축별 점수가 임계값(기본 3.0) 이상이면 그 축이 속한 계열을 활성.
 *   여러 매칭축이 같은 계열에 매핑되어도 중복 없이 1번만 활성.
 *   학생이 1~3개 계열에 분포하는 것이 보통.
 */
export function routeToBranches(axisScores, options = {}) {
  const threshold = options.threshold ?? 3.0;
  const activeBranches = new Set();

  for (const ax of AXES) {
    if ((axisScores[ax] ?? 0) >= threshold) {
      const br = AXIS_TO_BRANCH[ax];
      if (br) activeBranches.add(br);
    }
  }

  // 학생이 어느 계열도 활성화하지 않은 경우(매우 낮은 점수만): 모든 계열 활성
  // (= 약한 매칭이라도 모두 측정해 더 변별)
  if (activeBranches.size === 0) {
    return Object.keys(BRANCHES).filter((b) => b !== "ALL");
  }

  return [...activeBranches];
}

/**
 * 활성 계열에 맞춰 2차 검사 문항 목록 추출.
 *
 * @param {Object} questionBank
 * @param {Array} activeBranches - routeToBranches 결과
 * @returns {Array} - 2차에서 학생이 응답해야 할 item 배열 (ALL + 활성 계열)
 */
export function selectStage2Items(questionBank, activeBranches) {
  const branchesToInclude = new Set(["ALL", ...activeBranches]);
  return questionBank.items.filter(
    (it) => it.stage === 2 && branchesToInclude.has(it.branch)
  );
}

/* ──────────────────────────────────────────────────────────────
 * 6) 추천 사유 자동 생성 (결과지용)
 * ──────────────────────────────────────────────────────────── */

/**
 * 학생의 어떤 응답이 어떤 매칭축에 기여했고, 학과의 어떤 DNA와 일치했는지
 * 자연어로 설명하는 추천 사유 문장을 생성.
 *
 * @param {Object} axisScores - 학생 매칭축 점수
 * @param {Object} dept - 학과 객체 (departmentsDna.departments[i])
 * @returns {String} - 한국어 추천 사유 1~2문장
 */
export function generateReason(axisScores, dept) {
  const AXIS_LABEL = {
    SW: "소프트웨어 개발", AI: "인공지능·데이터 분석", GAME: "게임 개발",
    SEC: "정보보안", NET: "정보통신", SYS: "시스템·서버",
    HW: "전자·회로", EMB: "임베디드·IoT", MECH: "기계·제조", ELEC: "전기·에너지",
    CIVIL: "토목·공간정보", INDUST: "산업경영·생산관리",
    BIZ: "경영·마케팅", ACC: "회계·세무", ADMIN: "행정·공공서비스",
    SERVICE: "항공·호텔서비스", LANG: "외국어·국제실무",
    EDU: "유아교육·아동지도", WELFARE: "복지·상담",
    DESIGN: "디자인", CONTENT: "문예·영상·공연", BEAUTY: "뷰티·스타일링",
    HEALTH: "체육·건강관리", MED: "보건의료",
  };

  // 학생 점수와 학과 가중치가 모두 높은 매칭축 상위 3개 추출
  const matched = AXES
    .map((ax) => ({
      ax,
      label: AXIS_LABEL[ax] || ax,
      student: axisScores[ax] || 0,
      dept: dept.dna[ax] || 0,
      contribution: (axisScores[ax] || 0) * (dept.dna[ax] || 0),
    }))
    .filter((m) => m.student >= 3.0 && m.dept >= 3.0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);

  if (matched.length === 0) {
    return `${dept.name}는 전반적인 성향이 일부 부합하는 학과입니다.`;
  }

  const top = matched.map((m) => m.label);
  const label =
    top.length === 1 ? top[0]
    : top.length === 2 ? `${top[0]}, ${top[1]}`
    : `${top[0]}, ${top[1]}, ${top[2]}`;

  return `${label}에 대한 강한 관심·역량이 ${dept.name}의 교육과정 및 진출직업과 잘 부합합니다.`;
}
