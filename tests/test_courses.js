/**
 * 1학기 추천 교과 헬퍼 회귀 테스트
 * ==============================================================
 * lib/courses.js 의 5개 함수를 실제 데이터 파일과 가상 입력으로
 * 검증한다. tests/test_engine.js · tests/test_analytics.js 와
 * 독립적으로 실행.
 *
 * 실행:
 *   node tests/test_courses.js
 *
 * 통과 기준:
 *   - 모든 어서션이 통과해야 PASS (exit code 0)
 *   - 하나라도 실패하면 메시지 출력 후 exit code 1
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  getCoursesForDept,
  isFreeMajorAccessible,
  getCertificationRequirements,
  calcSelectedCredits,
  validateCreditRange,
} from "../lib/courses.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, "../data");

const courseData = JSON.parse(
  readFileSync(resolve(dataDir, "department_courses.json"), "utf8"),
);
const certData = JSON.parse(
  readFileSync(resolve(dataDir, "certification_requirements.json"), "utf8"),
);
const accessibilityData = JSON.parse(
  readFileSync(resolve(dataDir, "departments_accessibility.json"), "utf8"),
);

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
 * Test 1: getCoursesForDept
 * ──────────────────────────────────────────────────────────── */
section("Test 1: getCoursesForDept — 학과 코드 → 1학기 추천 교과");

// 1-1. 정상 학과 (AISW_CS): 컴퓨터공학과 3년제 / 3과목 모두 강력추천
{
  const r = getCoursesForDept("AISW_CS", courseData);
  assert(r !== null, "AISW_CS 결과는 null 아님");
  assert(r.duration_years === 3, "AISW_CS duration_years === 3", r.duration_years);
  assert(r.courses.length === 3, "AISW_CS 과목 수 3", r.courses.length);
  assert(
    r.courses.every((c) => c.strongly_recommended === true),
    "AISW_CS 모든 과목 강력추천",
  );
}

// 1-2. 진입 불가 학과는 courseData 에 없으므로 null
{
  const r = getCoursesForDept("BIZ_EDU", courseData);
  assert(r === null, "BIZ_EDU(유아교육과) → null (진입 불가)");
  const r2 = getCoursesForDept("ART_FILM", courseData);
  assert(r2 === null, "ART_FILM(연극영상과) → null (진입 불가)");
}

// 1-3. 학과명이 다른 BIZ_PUBADM 은 name_in_guidebook 으로 보조 표기 가능
{
  const r = getCoursesForDept("BIZ_PUBADM", courseData);
  assert(r !== null, "BIZ_PUBADM 결과는 null 아님");
  assert(
    r.name_in_guidebook === "공공행정서비스과",
    "BIZ_PUBADM name_in_guidebook = '공공행정서비스과'",
    r.name_in_guidebook,
  );
  assert(r.courses.length === 4, "BIZ_PUBADM 과목 수 4", r.courses.length);
}

/* ──────────────────────────────────────────────────────────────
 * Test 2: isFreeMajorAccessible
 * ──────────────────────────────────────────────────────────── */
section("Test 2: isFreeMajorAccessible — 자유전공 진입 가능 여부");

// 2-1. ACCESSIBLE 학과는 true
{
  assert(isFreeMajorAccessible("AISW_CS", accessibilityData) === true, "AISW_CS → true");
  assert(isFreeMajorAccessible("BIZ_WELF", accessibilityData) === true, "BIZ_WELF → true");
  assert(isFreeMajorAccessible("ART_MED", accessibilityData) === true, "ART_MED → true");
}

// 2-2. NOT_ACCESSIBLE 4개 학과는 false
{
  assert(isFreeMajorAccessible("BIZ_EDU",  accessibilityData) === false, "BIZ_EDU → false");
  assert(isFreeMajorAccessible("ART_FILM", accessibilityData) === false, "ART_FILM → false");
  assert(isFreeMajorAccessible("ART_MUS",  accessibilityData) === false, "ART_MUS → false");
  assert(isFreeMajorAccessible("ART_PE",   accessibilityData) === false, "ART_PE → false");
}

// 2-3. 미등재 학과(단계 B 등)는 안전 기본값 true
{
  assert(
    isFreeMajorAccessible("BIZ_YOUTH", accessibilityData) === true,
    "BIZ_YOUTH (단계 B 미등재) → true (안전 기본값)",
  );
  assert(
    isFreeMajorAccessible("", accessibilityData) === true,
    "빈 문자열 → true (안전 기본값)",
  );
}

/* ──────────────────────────────────────────────────────────────
 * Test 3: getCertificationRequirements
 * ──────────────────────────────────────────────────────────── */
section("Test 3: getCertificationRequirements — 자격증 요건 학과 조회");

// 3-1. BIZ_WELF 사회복지과 — 사회복지사 2급 + 건강가정사
{
  const r = getCertificationRequirements("BIZ_WELF", certData);
  assert(r !== null, "BIZ_WELF 결과 null 아님");
  assert(r.warning_level === "HIGH", "BIZ_WELF warning_level=HIGH");
  assert(r.certifications.length === 2, "자격증 2종(사회복지사 2급·건강가정사)", r.certifications.length);
  const sw = r.certifications.find((c) => c.name === "사회복지사 2급");
  assert(
    sw && sw.required_courses_1st_semester.length === 5,
    "사회복지사 2급 1학기 필수 5과목",
    sw && sw.required_courses_1st_semester,
  );
  assert(!r.pending_dept_data, "BIZ_WELF 는 pending_dept_data 플래그 없음");
}

// 3-2. BIZ_YOUTH — pending_dept_data=true (단계 B 대기)
{
  const r = getCertificationRequirements("BIZ_YOUTH", certData);
  assert(r !== null, "BIZ_YOUTH 결과 null 아님");
  assert(r.pending_dept_data === true, "BIZ_YOUTH pending_dept_data=true");
  const lifeEdu = r.certifications.find((c) => c.name === "평생교육사");
  assert(
    lifeEdu && lifeEdu.elective_courses_1st_semester?.length === 2,
    "평생교육사 선택 2과목",
  );
}

// 3-3. 자격증 요건이 없는 일반 학과는 null
{
  assert(getCertificationRequirements("AISW_CS", certData) === null, "AISW_CS → null");
  assert(getCertificationRequirements("BIZ_MGT", certData) === null, "BIZ_MGT → null");
  assert(getCertificationRequirements("", certData) === null, "빈 문자열 → null");
}

/* ──────────────────────────────────────────────────────────────
 * Test 4: calcSelectedCredits
 * ──────────────────────────────────────────────────────────── */
section("Test 4: calcSelectedCredits — 선택 과목 학점 합계");

// 4-1. 일반 케이스 — 14학점
{
  const selected = [
    { name: "컴퓨터과학개론", credits: 3 },
    { name: "프로그래밍언어실습Ⅰ", credits: 3 },
    { name: "인터넷콘텐츠", credits: 3 },
    { name: "전공탐색동행세미나", credits: 2 },
    { name: "성경과 삶", credits: 2 },
    { name: "전공기초학문탐구", credits: 1 },
  ];
  assert(calcSelectedCredits(selected) === 14, "AISW_CS 1학기 표본 합계 14학점", calcSelectedCredits(selected));
}

// 4-2. P/NP 과목(인성채플 credits=0)은 0학점으로 합산
{
  const selected = [
    { name: "인성채플", credits: 0, is_pass_fail: true },
    { name: "성경과 삶", credits: 2 },
  ];
  assert(calcSelectedCredits(selected) === 2, "인성채플(0) + 성경과 삶(2) = 2학점");
}

// 4-3. 빈 배열 / 음수·NaN 가드
{
  assert(calcSelectedCredits([]) === 0, "빈 배열 → 0");
  assert(calcSelectedCredits(null) === 0, "null → 0");
  assert(
    calcSelectedCredits([{ name: "X", credits: -3 }, { name: "Y", credits: NaN }]) === 0,
    "음수·NaN 은 가드(0 으로 처리)",
  );
}

/* ──────────────────────────────────────────────────────────────
 * Test 5: validateCreditRange
 * ──────────────────────────────────────────────────────────── */
section("Test 5: validateCreditRange — 권장 12~23 범위 검증");

// 5-1. 정상 범위 14학점
{
  const r = validateCreditRange(14);
  assert(r.is_valid === true, "14학점 is_valid=true");
  assert(r.status === "OK", "14학점 status=OK");
}

// 5-2. 최소 미만 (8학점)
{
  const r = validateCreditRange(8);
  assert(r.is_valid === false, "8학점 is_valid=false");
  assert(r.status === "TOO_LOW", "8학점 status=TOO_LOW");
  assert(r.message.includes("최소 12"), "메시지에 최소 12 안내", r.message);
}

// 5-3. 최대 초과 (25학점) + 경계값 (12, 23, 11, 24)
{
  const tooHigh = validateCreditRange(25);
  assert(tooHigh.status === "TOO_HIGH", "25학점 status=TOO_HIGH");

  assert(validateCreditRange(12).status === "OK", "12학점(경계) → OK");
  assert(validateCreditRange(23).status === "OK", "23학점(경계) → OK");
  assert(validateCreditRange(11).status === "TOO_LOW", "11학점 → TOO_LOW");
  assert(validateCreditRange(24).status === "TOO_HIGH", "24학점 → TOO_HIGH");
}

/* ──────────────────────────────────────────────────────────────
 * 결과 집계
 * ──────────────────────────────────────────────────────────── */
console.log("");
console.log("=".repeat(72));
console.log(`테스트 결과: ${passed} 통과 / ${failed} 실패 (전체 ${passed + failed})`);
console.log("=".repeat(72));

process.exit(failed === 0 ? 0 : 1);
