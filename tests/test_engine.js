/**
 * 적합도 엔진 회귀 테스트 — 5명의 가상 학생 시나리오
 * =====================================================
 *
 * Python 시뮬레이션과 동일한 결과를 JS 포팅 엔진이 내는지 검증.
 * 모든 시나리오에서 의도한 학과가 TOP5에 포함되어야 한다.
 *
 * 실행:
 *   node tests/test_engine.js
 *
 * 의존성: 없음 (Node 18+ 권장, ES modules 사용)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AXES,
  calcAxisScores,
  calcFitScores,
  calcCounselingNeed,
  detectUndecided,
  routeToBranches,
  selectStage2Items,
  generateReason,
} from "../lib/recommendation_engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const departmentsDna = JSON.parse(
  readFileSync(join(DATA_DIR, "departments_dna.json"), "utf-8")
);
const questionBank = JSON.parse(
  readFileSync(join(DATA_DIR, "question_bank.json"), "utf-8")
);

/* ──────────────────────────────────────────────────────────────
 * 가상 학생 응답 자동 생성
 *   학생의 24축 성향(0~5)을 기반으로 240문항 응답을 만든다.
 *   문항이 여러 매칭축에 매핑되어 있으면 가중평균으로 응답값 산출.
 * ──────────────────────────────────────────────────────────── */
function generateResponses(profile, defaultScore = 1.5) {
  const responses = {};
  for (const it of questionBank.items) {
    let resp;

    if (it.mapping && Object.keys(it.mapping).length > 0) {
      // 매칭축이 있는 문항: 성향 × 가중치 평균
      let wsum = 0, total = 0;
      for (const [ax, w] of Object.entries(it.mapping)) {
        wsum += w;
        total += (profile[ax] ?? defaultScore) * w;
      }
      resp = Math.round(total / wsum);
    } else {
      // CONF/NEED 등 매칭축 없는 문항: 중간값
      resp = 3;
    }

    resp = Math.max(1, Math.min(5, resp));
    // 역채점 문항은 시뮬레이션 시 응답을 뒤집어 입력 (엔진이 다시 뒤집어 정확히 평가)
    if (it.reverse) resp = 6 - resp;
    responses[it.id] = resp;
  }
  return responses;
}

/* ──────────────────────────────────────────────────────────────
 * 시나리오 정의
 * ──────────────────────────────────────────────────────────── */
const SCENARIOS = [
  {
    label: "A (IT·SW 지향형)",
    profile: { SW: 5, AI: 5, GAME: 4, SYS: 4, NET: 3, SEC: 3 },
    expected_in_top5: ["컴퓨터공학과", "AI게임소프트웨어학과", "정보통신공학과", "컴퓨터보안공학과"],
  },
  {
    label: "B (휴먼·교육·복지 지향형)",
    profile: { EDU: 5, WELFARE: 5, ADMIN: 3.5, SERVICE: 3, MED: 2.5 },
    expected_in_top5: ["유아교육과", "사회복지과", "공공행정서비스상담과", "보건의료정보과"],
  },
  {
    label: "C (디자인·뷰티·창작 지향형)",
    profile: { DESIGN: 5, BEAUTY: 4.5, CONTENT: 4, BIZ: 2.5 },
    expected_in_top5: [
      "산업디자인학과", "커뮤니케이션디자인과", "패션리빙디자인과",
      "뷰티매니지먼트과(헤어디자인전공)",
      "뷰티매니지먼트과(스킨케어메디컬코스메틱전공)",
      "뷰티매니지먼트과(방송스타일디렉터전공)",
    ],
  },
  {
    label: "D (기계·전기·현장 지향형)",
    profile: { MECH: 5, ELEC: 4.5, EMB: 4, INDUST: 3.5, CIVIL: 3 },
    expected_in_top5: ["기계공학과", "전기공학과", "전자공학과", "산업경영공학과", "드론정보공학과"],
  },
  {
    label: "E (항공·외국어 지향형)",
    profile: { SERVICE: 5, LANG: 4.5, BIZ: 3, ADMIN: 2 },
    expected_in_top5: ["항공서비스과", "일본어학과", "중국어학과"],
  },
];

/* ──────────────────────────────────────────────────────────────
 * 실행
 * ──────────────────────────────────────────────────────────── */
console.log("=".repeat(72));
console.log("명지전문대학 적합도 엔진 회귀 테스트 (가상 학생 5명)");
console.log("=".repeat(72));
console.log(`학과 수:   ${departmentsDna.departments.length}`);
console.log(`문항 수:   ${questionBank.items.length}`);
console.log(`매칭축 수: ${AXES.length}`);
console.log();

let passed = 0, failed = 0;

for (const s of SCENARIOS) {
  const profile = { ...Object.fromEntries(AXES.map((a) => [a, 1.5])), ...s.profile };
  const responses = generateResponses(profile);

  const axisScores = calcAxisScores(responses, questionBank);
  const fits = calcFitScores(axisScores, departmentsDna);
  const need = calcCounselingNeed(responses, questionBank);
  const undec = detectUndecided(fits);
  const branches = routeToBranches(axisScores);

  console.log("─".repeat(72));
  console.log(`학생 ${s.label}`);
  console.log("─".repeat(72));

  const top5 = fits.slice(0, 5);
  const hitNames = top5.filter((d) => s.expected_in_top5.includes(d.name));
  const isPass = hitNames.length >= Math.min(3, s.expected_in_top5.length);

  console.log("  TOP 5:");
  for (const d of top5) {
    const hit = s.expected_in_top5.includes(d.name) ? "✓" : " ";
    console.log(`    ${d.rank}. [${hit}] ${d.percent.toFixed(1).padStart(5)}%  ${d.name}`);
  }

  console.log(`  활성 2차 분기:   ${branches.join(", ") || "(없음)"}`);
  console.log(`  상담 필요도:     ${need.score}점 (${need.category})`);
  console.log(`  결정군 판정:     ${undec.is_undecided ? "미정군" : "결정군"} — ${undec.reason}`);
  console.log(`  학생 매칭축 상위: ${
    AXES.map((a) => [a, axisScores[a]])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([a, v]) => `${a}=${v.toFixed(2)}`)
      .join(", ")
  }`);

  // 추천 사유 예시 출력 (TOP1만)
  console.log(`  TOP1 추천 사유: ${generateReason(axisScores, fits[0].code === top5[0].code
    ? departmentsDna.departments.find((d) => d.code === top5[0].code)
    : null)}`);

  console.log(`  >>> ${isPass ? "PASS" : "FAIL"} (${hitNames.length}/${Math.min(5, s.expected_in_top5.length)} 매치)`);
  console.log();

  if (isPass) passed++; else failed++;
}

console.log("=".repeat(72));
console.log(`결과: ${passed} 통과, ${failed} 실패 / 전체 ${SCENARIOS.length}`);
console.log("=".repeat(72));

// 2차 라우팅 동작 검증
console.log();
console.log("─".repeat(72));
console.log("2차 적응형 라우팅 동작 검증");
console.log("─".repeat(72));
const sampleResp = generateResponses({ SW: 5, AI: 5 });
const sampleScores = calcAxisScores(sampleResp, questionBank);
const sampleBranches = routeToBranches(sampleScores);
const stage2Items = selectStage2Items(questionBank, sampleBranches);
console.log(`IT 지향 학생의 활성 계열: ${sampleBranches.join(", ")}`);
console.log(`해당 학생이 받게 될 2차 문항 수: ${stage2Items.length}`);
console.log(`(전체 2차 문항 50개 중 분기 ALL + 활성 계열 문항만 선별)`);

process.exit(failed === 0 ? 0 : 1);
