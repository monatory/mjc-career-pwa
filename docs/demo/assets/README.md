# 시연 스크린샷 팩 + 워크스루 영상 (assets)

> MJC-CAT 핵심 화면의 실제 캡처 PNG + **앱이 구동되는 화면 녹화 MP4**.
> 발표 슬라이드·NotebookLM 시각 보조·카톡/메일 첨부용.
> **재생성 가능** — UI가 바뀌면 `node tests/capture_demo.mjs`(PNG)·`node tests/record_demo.mjs`(MP4)로 다시 만든다.

## 0. 워크스루 영상 (실제 구동 모습) ⭐

NotebookLM 자동 영상은 **개념 설명**(내레이션 슬라이드)이라 앱 구동이 안 보인다.
실제 클릭·전환·응답이 보이는 **화면 녹화 영상**은 이것:

| 파일 | 내용 | 크기·길이 |
|---|---|---|
| `walkthrough_student.mp4` | STEP1 소개 → STEP2 정보입력 → STEP3 검사(키 1~5 실응답) → 결과지 → 수강계획서 | 412×892 세로, 약 23초 |
| `walkthrough_admin.mp4` | 관리자 대시보드 — KPI·참여추이 → 사이드바 메뉴 전환(통계·희망명단·상담군) | 1440×900 가로, 약 15초 |

- **무음(내레이션 없음)** — 자막·음성 해설은 후가공으로 입힌다.
  대본은 [`../notebooklm_demo_3min.md`](../notebooklm_demo_3min.md)·[`../cue_sheet.md`](../cue_sheet.md).
- **활용**: 곰믹스/Clipchamp(윈도우 기본 영상편집)에서 이 영상을 화면으로 깔고,
  3분 대본을 음성·자막으로 얹으면 완성형 "내레이션 + 실제 구동" 시연 영상이 된다.
- **재생성/페이스 조정**: `node tests/record_demo.mjs` (학생만 `--student`, 관리자만 `--admin`).
  너무 빠르면 스크립트의 `hold(초)`·`scrollThrough(step, per)` 값을 키워 다시 녹화.

---

## 1. 파일 목록

| 파일 | 화면 | 뷰포트 | 히어로 프레임 |
|---|---|---|---|
| `01_step1_intro.png` | STEP 1 검사 소개 (`#/`) | 모바일 390@2x | MJC-CAT 두문자 + 8축 칩 + 90/+50/31/TOP5 통계 |
| `02_step2_profile.png` | STEP 2 응답자 정보 입력 (`#/profile`) | 모바일 | 필수입력 0/7 진행바 · A 기본정보 · "학번·이름 미수집" |
| `03_step3_exam.png` | STEP 3 진단 검사 (`#/exam`) | 모바일 | 문항 1/90 · INT·흥미 배지 · 5점 척도 |
| `04_result_full.png` | 결과지 (`#/result`) | 모바일 | 상담 게이지 62.5 · 희망학과 비교 · 8축 레이더 · TOP5 |
| `05_plan.png` | 수강 계획서 (`#/plan`) | 모바일 | 공통/강력추천 과목 · 하단 고정 누적 학점 |
| `06_admin.png` | 관리자 대시보드 (`#/admin`) | 데스크탑 1440 | KPI 6 · 14일 참여 추이 AreaChart · 3권한 사이드바 |

학생 화면(01~05)은 모바일 풀페이지(세로로 긴 한 장), 관리자(06)는 데스크탑.

## 2. 데모 데이터 출처

결과지·수강계획서(04·05)는 완료된 검사 세션이 필요하므로,
`tests/seed_firestore.js`의 **"민서"(IT 지향)** 시나리오를 재사용해 sessionStorage에 주입했다.
- TOP1 AI게임소프트웨어학과 68.1% · 희망 1·2·3지망 모두 TOP5 적중 · 상담 62.5점(권장군)
- 적합도 공식·엔진은 **변경 없음**. 시연용 입력값만 주입(§CLAUDE.md 2·5.1).

관리자(06)는 시연 시점의 **실측 Firestore 데이터**(누적 응답 N명)를 그대로 보여준다.

## 3. 다시 캡처하는 법

```bash
# 1) dev 서버 실행 (별도 터미널)
npm run dev                       # http://localhost:5173

# 2) 캡처용 puppeteer-core 일회성 설치 (CI/배포 의존성 아님)
npm i puppeteer-core --no-save

# 3) 캡처 실행 → docs/demo/assets/*.png 덮어쓰기
node tests/capture_demo.mjs
#   포트/브라우저 지정:
#   node tests/capture_demo.mjs --port 5174 --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"

# 4) 워크스루 영상(MP4) 재생성 — ffmpeg-static도 함께 설치(한 줄로!)
npm i puppeteer-core ffmpeg-static --no-save
node tests/record_demo.mjs            # 두 영상
#   node tests/record_demo.mjs --student   / --admin   (개별)
```

> ⚠️ `puppeteer-core`·`ffmpeg-static`은 **한 명령에 함께** 설치한다.
> `npm i ... --no-save`를 따로 두 번 하면 뒤 설치가 앞 패키지를 prune해 버린다.

- 시스템 Chrome 또는 Edge를 headless로 구동해 PNG로 저장(스크립트가 경로 자동 탐색).
- `puppeteer-core`는 크로미움을 내려받지 않는 경량 패키지. `--no-save`라 `package.json`·CI 빌드에 영향 없음.

## 4. 활용

- **NotebookLM**: 영상 자동 생성은 텍스트(`../notebooklm_demo_3min.md`) 기반이지만,
  이 PNG들을 같은 노트북에 함께 올리면 슬라이드 시각 정확도가 올라간다.
- **발표 슬라이드/OBS**: 풀페이지 PNG에서 필요한 구간을 잘라 b-roll·배경으로 사용.
- **카톡/메일**: `01`·`04`·`06` 세 장이면 "학생 진입 → 결과 → 관리자"를 한눈에 전달.
