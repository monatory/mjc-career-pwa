/**
 * 시연 스크린샷 팩 자동 캡처 — docs/demo/assets/*.png 생성
 * ────────────────────────────────────────────────────────────
 * demo 스킬(§22)의 "스크린샷 팩" 산출물을 재현 가능하게 만드는 헬퍼.
 * 시스템에 설치된 Chrome/Edge를 puppeteer-core로 headless 구동해
 * 학생·관리자 핵심 화면을 실제 PNG로 저장한다.
 *
 * 사전 요건:
 *   1) dev 서버가 떠 있어야 함:  npm run dev   (기본 http://localhost:5173)
 *   2) puppeteer-core 설치:      npm i puppeteer-core --no-save
 *      (CI/배포 의존성 아님 — 캡처할 때만 일회성 설치)
 *
 * 실행:
 *   node tests/capture_demo.mjs
 *   node tests/capture_demo.mjs --port 5174 --chrome "C:\path\to\chrome.exe"
 *
 * 결과:  docs/demo/assets/01_step1_intro.png … 07_admin.png
 *
 * 결과지/수강계획서 화면은 완료된 검사 세션이 필요하므로,
 * seed_firestore.js 의 "민서"(IT 지향) 시나리오를 재사용해
 * sessionStorage 에 주입한 뒤 캡처한다(엔진 공식 무변경).
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer-core";
import {
  calcAxisScores,
  calcFitScores,
  calcCounselingNeed,
} from "../lib/recommendation_engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs", "demo", "assets");
const DATA_DIR = join(ROOT, "data");

/* ── 인자 파싱 ── */
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const PORT = getArg("port", "5173");
const BASE = `http://localhost:${PORT}/`;
const CHROME =
  getArg("chrome", "") ||
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].find((p) => existsSync(p));

if (!CHROME) {
  console.error("Chrome/Edge 실행 파일을 찾지 못했습니다. --chrome 으로 경로를 지정하세요.");
  process.exit(1);
}

/* ── 결과지용 데모 세션 생성 (seed_firestore "민서" 재사용) ── */
function buildDemoSession() {
  const departmentsDna = JSON.parse(readFileSync(join(DATA_DIR, "departments_dna.json"), "utf-8"));
  const questionBank = JSON.parse(readFileSync(join(DATA_DIR, "question_bank.json"), "utf-8"));
  const axisProfile = { SW: 5, AI: 5, GAME: 4, SYS: 4, NET: 3, SEC: 3 };
  const confResp = 3, needResp = 4, defaultScore = 1.5;

  const responses = {};
  for (const it of questionBank.items) {
    if (it.axis === "CONF") { responses[it.id] = it.reverse ? 6 - confResp : confResp; continue; }
    if (it.axis === "NEED") { responses[it.id] = it.reverse ? 6 - needResp : needResp; continue; }
    if (it.mapping && Object.keys(it.mapping).length > 0) {
      let wsum = 0, total = 0;
      for (const [ax, w] of Object.entries(it.mapping)) { wsum += w; total += (axisProfile[ax] ?? defaultScore) * w; }
      let resp = Math.max(1, Math.min(5, Math.round(total / wsum)));
      if (it.reverse) resp = 6 - resp;
      responses[it.id] = resp;
    } else responses[it.id] = 3;
  }
  const axisScores = calcAxisScores(responses, questionBank);
  const fits = calcFitScores(axisScores, departmentsDna);
  const counseling = calcCounselingNeed(responses, questionBank);
  const STAGE = {};
  for (const it of questionBank.items) STAGE[it.id] = it.stage;
  const s1 = {}, s2 = {};
  for (const [qid, v] of Object.entries(responses)) (STAGE[qid] === 2 ? s2 : s1)[qid] = v;

  const profile = {
    nickname: "민서", birth_year: 2008, gender: "F",
    academic_status: "FRESHMAN", self_designed_reason: "UNDECIDED",
    career_direction: "EMPLOYMENT", decision_maker: "FAMILY", wants_counseling: "AFTER_RESULT",
    high_school_type: "GENERAL", high_school_major: "",
    work_experience: { has: false, field: null }, part_time_experience: { has: true, field: "SERVICE" },
    prior_college: "NONE",
    preferred_dept_1: "AISW_CS", preferred_dept_2: "AISW_GAME", preferred_dept_3: "AISW_ICT",
  };
  return { profile, s1, s2, result: { axisScores, fits, counseling, computedAt: "2026-05-30T10:00:00.000Z" } };
}

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

/** sessionStorage 키를 설정 — 페이지 로드 후 호출, reload 는 호출부에서 */
async function setSession(page, entries) {
  await page.evaluate((kv) => {
    for (const [k, v] of Object.entries(kv)) {
      if (v === null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, entries);
}

async function gotoHash(page, hash) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 700)); // 차트·애니메이션 안정화
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function shoot(page, file, fullPage = true) {
  const path = join(OUT_DIR, file);
  await page.screenshot({ path, fullPage });
  console.log("  ✓", file);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const session = buildDemoSession();
  console.log(`캡처 시작 — ${BASE}  (chrome: ${CHROME})`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb"],
  });
  const page = await browser.newPage();

  const fullSession = {
    mjc_cat_consent: "true",
    mjc_cat_profile: session.profile,
    mjc_cat_responses_stage1: session.s1,
    mjc_cat_responses_stage2: session.s2,
    mjc_cat_stage1_done: "1",
    mjc_cat_result: session.result,
    mjc_cat_saved: "1",
  };
  const CLEAR = Object.fromEntries(
    ["mjc_cat_consent","mjc_cat_profile","mjc_cat_responses_stage1","mjc_cat_responses_stage2","mjc_cat_stage1_done","mjc_cat_active_branches","mjc_cat_result","mjc_cat_anonymous_id","mjc_cat_plan","mjc_cat_saved"].map((k)=>[k,null])
  );

  // 최초 1회 origin 진입(sessionStorage 접근 가능하게)
  await page.goto(BASE, { waitUntil: "networkidle2" });

  // 01 STEP1 검사 소개 (clean)
  await page.setViewport(MOBILE);
  await setSession(page, CLEAR);
  await gotoHash(page, "#/");
  await shoot(page, "01_step1_intro.png");

  // 02 STEP2 응답자 정보 입력
  await setSession(page, { mjc_cat_consent: "true" });
  await gotoHash(page, "#/profile");
  await shoot(page, "02_step2_profile.png");

  // 03 STEP3 진단 검사 (문항 1 — 프로필만, 응답 없음)
  await setSession(page, {
    mjc_cat_consent: "true",
    mjc_cat_profile: session.profile,
    mjc_cat_responses_stage1: null,
    mjc_cat_responses_stage2: null,
    mjc_cat_stage1_done: null,
    mjc_cat_result: null,
  });
  await gotoHash(page, "#/exam");
  await shoot(page, "03_step3_exam.png");

  // 04 결과지 (전체)
  await setSession(page, fullSession);
  await gotoHash(page, "#/result");
  await shoot(page, "04_result_full.png");

  // 05 수강 계획서
  await gotoHash(page, "#/plan");
  await shoot(page, "05_plan.png");

  // 06 관리자 대시보드 (데스크탑, CENTER 권한)
  await page.setViewport(DESKTOP);
  await setSession(page, { mjc_cat_admin_mock_role: "CENTER" });
  await gotoHash(page, "#/admin");
  await shoot(page, "06_admin.png");

  await browser.close();
  console.log(`완료 — ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
