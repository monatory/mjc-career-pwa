/**
 * 명지전문대학 학과추천 진단 PWA — 1학기 추천 교과 헬퍼
 * ==============================================================
 *
 * 자유전공학과 학생이 결과지를 받은 뒤 "1학기에 어떤 과목을 들으면
 * 좋은가"까지 안내하기 위한 순수 함수 모음. 다음 3개 데이터 파일을
 * 입력으로 받아 결과지·수강계획서 화면이 필요로 하는 정보를 가공한다.
 *
 *   1) data/department_courses.json          — 학과별 1학기 추천 교과
 *   2) data/certification_requirements.json  — 자격증 1학기 필수 과목
 *   3) data/departments_accessibility.json   — 자유전공 진입 가능성
 *
 * 중요: 어떤 함수도 학과 매칭 가중치(DNA)나 적합도 공식(Ⅷ장)에
 *       영향을 주지 않는다. 모두 결과지·수강계획서 화면용 가공이다.
 *       lib/recommendation_engine.js 의 산출 공식은 변경 금지.
 *
 * 사용:
 *   import {
 *     getCoursesForDept,
 *     isFreeMajorAccessible,
 *     getCertificationRequirements,
 *     calcSelectedCredits,
 *     validateCreditRange,
 *   } from "./lib/courses.js";
 */

/* ──────────────────────────────────────────────────────────────
 * 1) 학과 코드 → 1학기 추천 교과
 * ──────────────────────────────────────────────────────────── */

/**
 * 학과 코드에 해당하는 1학기 추천 교과 객체를 반환.
 * 진입 불가 4개 학과(BIZ_EDU·ART_FILM·ART_MUS·ART_PE)는
 * department_courses.json 에 항목 자체가 없으므로 null 을 반환한다.
 *
 * @param {string} deptCode               학과 코드 (예: "AISW_CS")
 * @param {Object} courseData             data/department_courses.json
 * @returns {Object|null} {
 *   name_in_guidebook,                   // 가이드북 표기명
 *   duration_years,                      // 2 | 3
 *   courses: [{name, credits, strongly_recommended}]
 * }
 */
export function getCoursesForDept(deptCode, courseData) {
  if (!deptCode || !courseData || !courseData.departments) return null;
  const entry = courseData.departments[deptCode];
  if (!entry) return null;
  return {
    name_in_guidebook: entry.name_in_guidebook,
    duration_years: entry.duration_years,
    courses: Array.isArray(entry.courses) ? entry.courses.slice() : [],
  };
}

/* ──────────────────────────────────────────────────────────────
 * 2) 자유전공 진입 가능 여부
 * ──────────────────────────────────────────────────────────── */

/**
 * 학과가 자유전공학과에서 직접 진입할 수 있는지 판정.
 *
 * 정책:
 *   - "NOT_ACCESSIBLE" 로 명시된 학과만 false
 *   - "ACCESSIBLE" 또는 미등재(단계 B 추가 예정 학과 포함)는 true
 *     (안전 기본값: 모르는 학과는 진입 가능으로 가정해 표시. 진입 불가는
 *     반드시 데이터로 명시되어야 안내 배너가 노출된다.)
 *
 * @param {string} deptCode
 * @param {Object} accessibilityData      data/departments_accessibility.json
 * @returns {boolean}
 */
export function isFreeMajorAccessible(deptCode, accessibilityData) {
  if (!deptCode || !accessibilityData || !accessibilityData.accessibility) return true;
  const label = accessibilityData.accessibility[deptCode];
  return label !== "NOT_ACCESSIBLE";
}

/* ──────────────────────────────────────────────────────────────
 * 3) 자격증 요건 학과 조회
 * ──────────────────────────────────────────────────────────── */

/**
 * 학과 코드가 1학기 필수 과목 누락 시 자격증 취득이 어려운
 * "자격증 요건 학과"인지 조회. 일반 학과는 null 반환.
 *
 * @param {string} deptCode
 * @param {Object} certData               data/certification_requirements.json
 * @returns {Object|null} {
 *   warning_level,                       // "HIGH" 등
 *   warning_message,
 *   certifications: [{
 *     name,
 *     required_courses_1st_semester: [...],
 *     elective_courses_1st_semester?: [...]
 *   }],
 *   pending_dept_data?: boolean          // 단계 B 대기 학과 여부
 * }
 */
export function getCertificationRequirements(deptCode, certData) {
  if (!deptCode || !certData || !certData.departments) return null;
  const entry = certData.departments[deptCode];
  if (!entry) return null;
  return {
    warning_level: entry.warning_level,
    warning_message: entry.warning_message,
    certifications: Array.isArray(entry.certifications) ? entry.certifications.slice() : [],
    ...(entry.pending_dept_data ? { pending_dept_data: true } : {}),
  };
}

/* ──────────────────────────────────────────────────────────────
 * 4) 학생 선택 과목의 학점 합계
 * ──────────────────────────────────────────────────────────── */

/**
 * 학생이 수강계획서에서 체크한 과목들의 학점 합계.
 *
 * 규칙:
 *   - credits 가 숫자(0 포함)이면 그대로 합산
 *   - credits 가 누락/null/NaN 이면 0 으로 간주
 *   - 인성채플 같은 P/NP 과목은 데이터에서 credits=0 으로 정의되어
 *     자연스럽게 0 으로 합산된다. P/NP 과목 수는 호출 측에서
 *     selectedCourses.filter(c => c.is_pass_fail) 로 별도 계수.
 *
 * @param {Array<{name?:string, credits?:number, is_pass_fail?:boolean}>} selectedCourses
 * @returns {number} 학점 합계 (정수)
 */
export function calcSelectedCredits(selectedCourses) {
  if (!Array.isArray(selectedCourses) || selectedCourses.length === 0) return 0;
  let sum = 0;
  for (const c of selectedCourses) {
    const v = Number(c?.credits);
    if (Number.isFinite(v) && v > 0) sum += v;
  }
  return sum;
}

/* ──────────────────────────────────────────────────────────────
 * 5) 권장 학점 범위 검증
 * ──────────────────────────────────────────────────────────── */

/**
 * 누적 학점이 1학기 권장 범위(12~23학점)에 있는지 판정.
 *
 * 정책 근거: 일반적 대학 수강 신청 가이드 — 최소 12학점, 최대 23학점.
 * 자유전공 가이드북 문구와 별개로 시범운영 단계 기본값이며,
 * 본 운영 시 학사일정에 따라 조정 가능하다.
 *
 * @param {number} totalCredits
 * @returns {{is_valid: boolean, status: "TOO_LOW"|"OK"|"TOO_HIGH", message: string}}
 */
export function validateCreditRange(totalCredits) {
  const v = Number(totalCredits);
  const credits = Number.isFinite(v) ? v : 0;

  if (credits < 12) {
    return {
      is_valid: false,
      status: "TOO_LOW",
      message: `현재 ${credits}학점입니다. 권장 최소 12학점 이상으로 채워 주세요.`,
    };
  }
  if (credits > 23) {
    return {
      is_valid: false,
      status: "TOO_HIGH",
      message: `현재 ${credits}학점입니다. 권장 최대 23학점을 초과합니다. 과목을 줄여 주세요.`,
    };
  }
  return {
    is_valid: true,
    status: "OK",
    message: `현재 ${credits}학점입니다. 권장 12~23학점 범위 내입니다.`,
  };
}
