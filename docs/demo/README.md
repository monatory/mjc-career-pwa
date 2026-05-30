# 시연(Demo) 작업 폴더

> 이 폴더는 **MJC-CAT 시연 영상·발표 자료**만 모아두는 별도 공간입니다.
> 본 시스템의 코드·데이터와 분리된, "보여주기"를 위한 산출물 전용입니다.
>
> **호출**: 대화에서 "시연 엠디", "시연 파일", "데모 영상", "/demo" 라고 하면
> 이 폴더와 [`.claude/skills/demo/SKILL.md`](../../.claude/skills/demo/SKILL.md)의
> 지침이 함께 불려옵니다. (스킬 개념 — §아래 설명)

---

## 1. 이 폴더가 따로 있는 이유

시연 자료는 다음 이유로 본체 코드/문서와 분리합니다.

- **수명이 다름**: 시연 대본·캡처는 발표 시점마다 갱신되는 임시 산출물. 코드처럼 영구 명세가 아님.
- **대상이 다름**: 코드는 개발자, 시연 자료는 의사결정자·학생·교수진.
- **호출 편의**: "시연 엠디" 한마디로 이 묶음만 빠르게 꺼내 쓰기 위함.

본 시스템의 정식 명세는 항상 루트의 [`CLAUDE.md`](../../CLAUDE.md)입니다. 이 폴더는 그 위에 얹는 발표 레이어입니다.

## 2. 파일 목록 (매니페스트)

| 파일 | 용도 | 상태 |
|---|---|---|
| `README.md` | 이 폴더 안내 + 시연 자료 목록 (지금 보는 파일) | ✅ |
| `notebooklm_howto.md` | **NotebookLM 전송·영상 생성 단계별 진행 순서** + 문제해결 | ✅ |
| `notebooklm_demo_3min.md` | NotebookLM Video Overview용 3분 시연 소스 (7 SCENE) | ✅ |
| `assets/` | 화면 스크린샷 팩 6장 + **워크스루 영상 2편(실제 구동 MP4)** + 캡처/녹화법 | ✅ |
| `cue_sheet.md` | 발표자 큐시트 — 라이브 녹화용 7컷 클릭·키·내레이션·타임라인 | ✅ |
| `demo_1min.md` | 1분 축소판 — 학생·학부모 대상 카톡/SNS 홍보 (4 SCENE) | ✅ |
| `demo_5min.md` | 5분 확장판 — 학과장·교수진·운영위 심화 (공식·거버넌스, 9 SCENE) | ✅ |

> 스크린샷 재생성: `npm run dev` 후 `npm i puppeteer-core --no-save && node tests/capture_demo.mjs` → `assets/*.png` 덮어쓰기. 자세히는 [`assets/README.md`](assets/README.md).

## 3. 시연 영상 만드는 법 (요약)

> **두 종류를 구분하세요.**
> - **개념 영상**(NotebookLM): 내레이션 슬라이드. 앱 구동 화면은 **안 나옴**. 소개·홍보용.
> - **구동 영상**(워크스루 MP4): 실제 클릭·전환·응답이 보이는 화면 녹화. **시연용**.
>   → 합본 1편: [`assets/walkthrough_full.mp4`](assets/walkthrough_full.mp4) (타이틀카드+학생+관리자, ~42초)
>   → 개별: [`assets/walkthrough_student.mp4`](assets/walkthrough_student.mp4) · [`assets/walkthrough_admin.mp4`](assets/walkthrough_admin.mp4)
> - **완성형**(권장): 구동 영상을 화면으로 깔고, 개념 영상의 대본을 음성·자막으로 얹기(영상편집기).

### 방법 0 — 구동 영상 그대로 쓰기 / 후가공
- `assets/*.mp4` 두 편을 그대로 카톡·발표에 쓰거나, 곰믹스·Clipchamp에서 자막·음성 추가.
- 재생성·페이스 조정: `node tests/record_demo.mjs` (자세히 [`assets/README.md`](assets/README.md) §0).

### 방법 A — NotebookLM 자동 생성 (개념 영상)
1. https://notebooklm.google.com → 새 노트북
2. `notebooklm_demo_3min.md` 업로드 (+ `CLAUDE.md` 같이 올리면 인용 풍부)
3. Studio → **Video Overview** → 한국어·3분·SCENE 1~7 순서 프롬프트
4. MP4 다운로드

> **단계별 자세한 진행 순서·문제해결**: [`notebooklm_howto.md`](notebooklm_howto.md)

### 방법 B — 직접 화면녹화 (OBS / Win+G)
1. 시드 학생 등록: `node tests/seed_firestore.js`
2. 라이브 URL 열고 STEP1 → 2 → 3 → 결과지 → /plan → /admin 순서로 클릭
3. `notebooklm_demo_3min.md`의 SCENE 1~7 내레이션을 그대로 낭독

## 4. 라이브 URL

| 용도 | URL |
|---|---|
| 학생용 PWA | https://monatory.github.io/mjc-career-pwa/ |
| 관리자 대시보드 | https://monatory.github.io/mjc-career-pwa/#/admin |

## 5. "시연 엠디" = 스킬 (개념)

Claude Code의 **Skill**은 *키워드로 호출하는 재사용 작업 묶음*입니다.
`.claude/skills/demo/SKILL.md`가 그 정의이며, 사용자가 "시연 엠디"·"/demo"라고 하면
이 폴더를 기준으로 시연 자료를 읽고·만들고·갱신하도록 동작합니다.
새 자료를 추가하면 위 **2. 매니페스트** 표에 한 줄을 더하는 것이 규칙입니다.
