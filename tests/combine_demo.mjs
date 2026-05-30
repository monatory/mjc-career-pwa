/**
 * 워크스루 영상 2편 → 1편 합치기 — docs/demo/assets/walkthrough_full.mp4
 * ────────────────────────────────────────────────────────────
 * 학생(412×892 세로)·관리자(1440×900 가로) 해상도가 달라서,
 * 공통 캔버스(1280×720)에 비율 유지 + 흰 패딩으로 맞추고,
 * 각 구간 앞에 한글 타이틀 카드(네이비 배경)를 넣어 이어 붙인다.
 *
 * 사전: docs/demo/assets/walkthrough_student.mp4 · walkthrough_admin.mp4 존재
 *       npm i ffmpeg-static --no-save
 * 실행: node tests/combine_demo.mjs
 * 결과: docs/demo/assets/walkthrough_full.mp4  (약 41초, 1280×720, 무음)
 *
 * 메모: ffmpeg가 한글·공백 경로에서 실패하므로 모든 작업을 임시 ASCII 폴더에서
 *       수행한 뒤 결과만 fs로 복사한다.
 */
import { existsSync, mkdirSync, rmSync, copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import puppeteer from "puppeteer-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "docs", "demo", "assets");
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));
const W = 1280, H = 720, FPS = 25;

const work = join(tmpdir(), "mjc_combine");
if (existsSync(work)) rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

function ff(args, label) {
  const r = spawnSync(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf-8" });
  if (r.status !== 0) { console.error(`[${label}] ffmpeg 실패:\n`, r.stderr?.slice(-1500)); process.exit(1); }
}

// 0) 원본 2편을 ASCII 임시로 복사 (ffmpeg 입력 경로 한글 회피)
const srcStudent = join(work, "src_student.mp4");
const srcAdmin = join(work, "src_admin.mp4");
copyFileSync(join(OUT_DIR, "walkthrough_student.mp4"), srcStudent);
copyFileSync(join(OUT_DIR, "walkthrough_admin.mp4"), srcAdmin);

// 1) 타이틀 카드 — 브라우저로 렌더(한글 안전)해 PNG 캡처 → 정지영상 클립
const cardHtml = (title, subtitle) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0}.c{width:${W}px;height:${H}px;background:linear-gradient(135deg,#0b3d91,#1d5cd4);
display:flex;flex-direction:column;align-items:center;justify-content:center;
font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#fff}
.t{font-size:66px;font-weight:800;letter-spacing:-1px}
.s{font-size:30px;color:#cdd9f2;margin-top:26px}
.b{position:absolute;top:40px;font-size:20px;color:#9db8ec;letter-spacing:2px}</style></head>
<body><div class="c"><div class="b">명지전문대학 · MJC-CAT</div>
<div class="t">${title}</div><div class="s">${subtitle}</div></div></body></html>`;

async function renderTitles() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const cards = [
    ["title1.png", "① 학생 진단 흐름", "STEP 1·2·3  →  결과지  →  수강 계획서"],
    ["title2.png", "② 관리자 대시보드", "참여 현황 · 학과별 희망 명단 · 상담 필요군"],
  ];
  for (const [file, t, s] of cards) {
    await page.setContent(cardHtml(t, s), { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 350)); // 폰트 렌더 안정화
    await page.screenshot({ path: join(work, file) });
  }
  await browser.close();
}
function titleClip(png, out, dur = 1.8) {
  ff(["-loop", "1", "-i", join(work, png), "-t", String(dur),
      "-vf", `fps=${FPS},format=yuv420p`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", join(work, out)], `clip ${out}`);
}
await renderTitles();
titleClip("title1.png", "title1.mp4");
titleClip("title2.png", "title2.mp4");

// 2) 본편 2편을 공통 캔버스(1280×720, 흰 패딩)로 정규화
function normalize(src, out) {
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
             `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,fps=${FPS},format=yuv420p`;
  ff(["-i", src, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", join(work, out)], `norm ${out}`);
}
normalize(srcStudent, "n_student.mp4");
normalize(srcAdmin, "n_admin.mp4");

// 3) 4개 파트를 concat 필터로 이어 붙이기 (모두 1280×720·25fps·무음)
const parts = ["title1.mp4", "n_student.mp4", "title2.mp4", "n_admin.mp4"].map((p) => join(work, p));
const inputs = parts.flatMap((p) => ["-i", p]);
const fc = parts.map((_, i) => `[${i}:v]`).join("") + `concat=n=${parts.length}:v=1:a=0[v]`;
const finalTmp = join(work, "walkthrough_full.mp4");
ff([...inputs, "-filter_complex", fc, "-map", "[v]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-movflags", "+faststart", finalTmp], "concat");

// 4) 결과를 docs/demo/assets로 복사
const dest = join(OUT_DIR, "walkthrough_full.mp4");
copyFileSync(finalTmp, dest);
console.log(`✓ walkthrough_full.mp4 (${Math.round(readFileSync(dest).length / 1024)} KB)`);
