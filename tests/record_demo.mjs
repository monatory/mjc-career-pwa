/**
 * 시연 워크스루 영상 자동 녹화 — docs/demo/assets/*.mp4 생성
 * ────────────────────────────────────────────────────────────
 * NotebookLM 개념 영상과 달리 "앱이 실제로 구동되는 모습"을 보여주는 화면 녹화.
 * 시스템 Chrome을 puppeteer-core로 구동해 학생 흐름(STEP1→2→3→결과지→수강계획서)과
 * 관리자 대시보드를 자동 조작하며, 뷰포트를 프레임 단위로 캡처해 ffmpeg로 MP4 인코딩한다.
 *
 * 방식: puppeteer screencast가 이 환경에서 빈 파일을 내므로, 직접 프레임 캡처 +
 *       ffmpeg concat(이미지별 표시시간) 방식으로 안정적으로 인코딩한다.
 *
 * 사전 요건:
 *   1) dev 서버:   npm run dev   (http://localhost:5173)
 *   2) 일회성 설치: npm i puppeteer-core ffmpeg-static --no-save
 *      (CI/배포 의존성 아님. 반드시 한 줄에 함께 설치 — 따로 설치하면 서로 prune됨)
 *
 * 실행:
 *   node tests/record_demo.mjs            # 두 영상 모두
 *   node tests/record_demo.mjs --student  # 학생 흐름만
 *   node tests/record_demo.mjs --admin    # 관리자만
 *
 * 결과: docs/demo/assets/walkthrough_student.mp4 · walkthrough_admin.mp4
 *
 * 내레이션은 없음(무음). 자막·해설은 NotebookLM 대본(notebooklm_demo_3min.md)·
 * cue_sheet.md를 참고해 후가공(곰믹스/Clipchamp 등)으로 입힌다.
 */
import { readFileSync, mkdirSync, existsSync, rmSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import ffmpegPath from "ffmpeg-static";
import {
  calcAxisScores, calcFitScores, calcCounselingNeed,
} from "../lib/recommendation_engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "docs", "demo", "assets");
const DATA_DIR = join(ROOT, "data");
const BASE = "http://localhost:5173/";
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

const argv = process.argv.slice(2);
const doStudent = argv.includes("--student") || (!argv.includes("--admin"));
const doAdmin = argv.includes("--admin") || (!argv.includes("--student"));
const FPS = 25;

/* ── 데모 세션(결과지/수강계획서용) — seed "민서" 재사용 ── */
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
  const STAGE = {}; for (const it of questionBank.items) STAGE[it.id] = it.stage;
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

/* ── 프레임 타임라인 ── */
class Timeline {
  constructor(page, framesDir) { this.page = page; this.dir = framesDir; this.n = 0; this.list = []; }
  async _snap() {
    this.n += 1;
    const f = join(this.dir, `f${String(this.n).padStart(5, "0")}.png`);
    await this.page.screenshot({ path: f }); // 뷰포트 캡처(고정 크기)
    return f;
  }
  /** 현재 화면을 sec초 동안 보여줌 */
  async hold(sec) { const f = await this._snap(); this.list.push({ f, sec }); }
  /** y=0→끝까지 step px씩 스크롤하며 각 프레임을 per초씩(부드러운 스크롤 모사) */
  async scrollThrough(step = 110, per = 0.06, settle = 250) {
    const h = await this.page.evaluate(() => document.body.scrollHeight);
    const vh = await this.page.evaluate(() => window.innerHeight);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await sleep(settle);
    for (let y = 0; y <= Math.max(0, h - vh); y += step) {
      await this.page.evaluate((yy) => window.scrollTo(0, yy), y);
      await sleep(30);
      const f = await this._snap();
      this.list.push({ f, sec: per });
    }
    // 맨 아래 잠깐 정지
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(settle);
    await this.hold(1.2);
  }
  /** concat 목록을 써서 ffmpeg로 mp4 인코딩 */
  encode(outPath) {
    const listFile = join(this.dir, "list.txt");
    let txt = "";
    for (const { f, sec } of this.list) {
      txt += `file '${f.replace(/\\/g, "/")}'\n`;
      txt += `duration ${sec}\n`;
    }
    // concat 데뮤서는 마지막 파일을 duration 없이 한 번 더 명시해야 마지막 컷이 보존됨
    if (this.list.length) txt += `file '${this.list[this.list.length - 1].f.replace(/\\/g, "/")}'\n`;
    writeFileSync(listFile, txt);

    const args = [
      "-y", "-f", "concat", "-safe", "0", "-i", listFile,
      "-vf", `fps=${FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-movflags", "+faststart",
      outPath,
    ];
    const r = spawnSync(ffmpegPath, args, { encoding: "utf-8" });
    if (r.status !== 0) { console.error(r.stderr?.slice(-1200)); throw new Error("ffmpeg 인코딩 실패"); }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setSession(page, entries) {
  await page.evaluate((kv) => {
    for (const [k, v] of Object.entries(kv)) {
      if (v === null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, entries);
}
async function gotoHash(page, hash, settle = 900) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(settle);
  await page.evaluate(() => window.scrollTo(0, 0));
}
function freshFramesDir(name) {
  const d = join(tmpdir(), `mjc_frames_${name}`);
  if (existsSync(d)) rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  return d;
}
/** 결과 mp4를 임시(ASCII)로 만든 뒤 docs/demo/assets로 복사 (한글 경로 ffmpeg 회피) */
function encodeAndPlace(tl, fileName) {
  const tmpOut = join(tmpdir(), fileName);
  tl.encode(tmpOut);
  const dest = join(OUT_DIR, fileName);
  copyFileSync(tmpOut, dest);
  const kb = Math.round(readFileSync(dest).length / 1024);
  console.log(`  ✓ ${fileName} (${kb} KB, 프레임 ${tl.n})`);
}

const CLEAR = Object.fromEntries(
  ["mjc_cat_consent","mjc_cat_profile","mjc_cat_responses_stage1","mjc_cat_responses_stage2","mjc_cat_stage1_done","mjc_cat_active_branches","mjc_cat_result","mjc_cat_anonymous_id","mjc_cat_plan","mjc_cat_saved"].map((k) => [k, null])
);

async function recordStudent(browser, session) {
  console.log("학생 흐름 녹화…");
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 892, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "networkidle2" });
  const dir = freshFramesDir("student");
  const tl = new Timeline(page, dir);

  // STEP1 검사 소개
  await setSession(page, CLEAR);
  await gotoHash(page, "#/");
  await tl.hold(2.5);
  await tl.scrollThrough(110, 0.05);

  // STEP2 응답자 정보 (스크롤로 폼 훑기)
  await setSession(page, { mjc_cat_consent: "true" });
  await gotoHash(page, "#/profile");
  await tl.hold(1.8);
  await tl.scrollThrough(120, 0.05);

  // STEP3 진단 검사 — 키 1~5로 6문항 응답(자동 진행) 시연
  await setSession(page, {
    mjc_cat_consent: "true", mjc_cat_profile: session.profile,
    mjc_cat_responses_stage1: null, mjc_cat_responses_stage2: null,
    mjc_cat_stage1_done: null, mjc_cat_result: null,
  });
  await gotoHash(page, "#/exam");
  await tl.hold(2.2);
  const keys = ["3", "5", "4", "2", "5", "4"];
  for (const k of keys) {
    await page.keyboard.press(k);
    await sleep(420);          // 자동 진행 애니메이션
    await tl.hold(0.55);
  }

  // 결과지 — 완료 세션 주입 후 천천히 스크롤
  await setSession(page, {
    mjc_cat_consent: "true", mjc_cat_profile: session.profile,
    mjc_cat_responses_stage1: session.s1, mjc_cat_responses_stage2: session.s2,
    mjc_cat_stage1_done: "1", mjc_cat_result: session.result, mjc_cat_saved: "1",
  });
  await gotoHash(page, "#/result", 1300);
  await tl.hold(2.5);
  await tl.scrollThrough(90, 0.06);

  // 수강 계획서
  await gotoHash(page, "#/plan", 1100);
  await tl.hold(2.2);
  await tl.scrollThrough(110, 0.06);

  encodeAndPlace(tl, "walkthrough_student.mp4");
  await page.close();
}

async function recordAdmin(browser) {
  console.log("관리자 대시보드 녹화…");
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: "networkidle2" });
  const dir = freshFramesDir("admin");
  const tl = new Timeline(page, dir);

  await setSession(page, { mjc_cat_admin_mock_role: "CENTER" });
  await gotoHash(page, "#/admin", 1200);
  await tl.hold(3);
  await tl.scrollThrough(120, 0.06);

  // 사이드바 메뉴 전환 시연
  for (const label of ["응답자 통계", "학과별 희망학생", "상담 필요군"]) {
    const clicked = await page.evaluate((lbl) => {
      const el = [...document.querySelectorAll(".admin-nav-item, nav button, a")].find((e) => e.textContent.includes(lbl));
      if (el) { el.click(); return true; } return false;
    }, label);
    await sleep(700);
    if (clicked) { await page.evaluate(() => window.scrollTo(0, 0)); await tl.hold(2.2); await tl.scrollThrough(140, 0.06); }
  }

  encodeAndPlace(tl, "walkthrough_admin.mp4");
  await page.close();
}

async function main() {
  if (!CHROME) { console.error("Chrome/Edge 미발견"); process.exit(1); }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const session = buildDemoSession();
  console.log(`녹화 시작 — ${BASE} (chrome: ${CHROME})`);
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: "new",
    args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  if (doStudent) await recordStudent(browser, session);
  if (doAdmin) await recordAdmin(browser);
  await browser.close();
  console.log(`완료 — ${OUT_DIR}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
