# 명지전문대학 학과추천 진단 PWA — Claude Code 작업 컨텍스트

> 이 파일은 매 세션 자동으로 로딩되는 프로젝트 컨텍스트입니다.
> 코드를 작성하거나 데이터를 다루기 전에 반드시 전체를 읽고 시작하세요.

---

## 1. 프로젝트 개요

명지전문대학 자유전공 학생을 위한 **학과추천 진단 PWA(Progressive Web App)**.
학생이 모바일 QR로 접속해 20~25분 동안 진단 검사를 응답하면, 본교 31개 학과에 대한 적합도 점수(0~100)와 추천 TOP5를 즉시 제공한다. 관리자(AI융합진로지원센터)는 별도 대시보드로 참여 추이·상담 필요군·실제 선택 학과를 관리한다.

- **주관**: 학생지원처 AI융합진로지원센터
- **대상**: 자유전공 입학생 및 학과 탐색 희망 재학생
- **운영 시작**: 2027학년도 1차 모델 가동, 학기말 환류 → 2차 보정모델 고도화
- **법적 성격**: 학과 「배정」이 아닌 「탐색·상담 지원」 도구. 학생 선택을 강제하지 않으며 결과는 참고자료.

---

## 2. 절대 변경 금지(Read-Only) 영역

다음 항목은 **개발자(=Claude Code) 임의로 수정 금지**. 사용자(진로취업팀) 명시 지시가 있어야만 변경 가능.

| 영역 | 위치 | 사유 |
|---|---|---|
| 학과별 DNA 가중치 | `data/departments_dna.json` | 학과장 검토 보정 전까지 1차 초안 그대로 유지 |
| 240문항 텍스트 | `data/question_bank.json` | 시범운영 변별도 분석 전까지 보정 금지 |
| 24개 매칭축 코드 | 코드/스키마 전반 | 추가·삭제 시 DNA와 문항이 동시에 깨짐 |
| 8개 진단축 코드 | 코드/스키마 전반 | 동일 |
| 적합도 산출 공식 | `lib/recommendation_engine.js` | 계획서 Ⅷ장 공식 그대로 (분자/분모 변경 금지) |

수정이 필요해 보이면 **반드시 사용자에게 먼저 보고하고 승인 받기**. 데이터 보정은 운영 거버넌스(학과장 검토위원) 영역이지 개발 영역이 아니다.

---

## 3. 핵심 의사결정 (이미 확정된 사항)

### 3.1 학과 수: 31개 (계획서는 32개라고 명시되어 있으나 자료 누락 1건)

- **누락 학과**: 뷰티매니지먼트과(메이크업&네일전공)
- **대응**: 자료 입수 후 추가 예정. 현재 코드/데이터는 31개 기준으로 개발.
- 31개 학과의 코드/이름/학부는 `data/departments_dna.json`의 `departments` 배열 참조.

### 3.2 진단축 8개 (학생 측정용)

| 코드 | 이름 | 문항 수 | 매칭축 매핑 |
|---|---|---:|---|
| INT  | 흥미       | 40 | 다수 매칭축에 직접 가중치 |
| ACT  | 활동 선호  | 35 | 다수 매칭축에 직접 가중치 |
| LRN  | 학습 방식  | 25 | 다수 매칭축에 직접 가중치 |
| COMP | 역량 인식  | 40 | 다수 매칭축에 직접 가중치 |
| JOB  | 직무 선호  | 40 | 다수 매칭축에 직접 가중치 |
| VAL  | 진로 가치  | 30 | 약한 가중치로 다수 매칭축에 영향 |
| CONF | 선택 확신도| 15 | **매칭축 매핑 없음** → 상담필요도 산출 |
| NEED | 상담 필요도| 15 | **매칭축 매핑 없음** → 상담필요도 산출 |
| 합계 |            | 240 | — |

### 3.3 매칭축 24개 (학과 표현용)

```
SW · AI · GAME · SEC · NET · SYS              (IT 6)
HW · EMB · MECH · ELEC                          (HW 4)
CIVIL · INDUST                                  (공간산업 2)
BIZ · ACC · ADMIN · SERVICE · LANG              (경영서비스 5)
EDU · WELFARE                                   (휴먼 2)
DESIGN · CONTENT · BEAUTY                       (예술콘텐츠 3)
HEALTH · MED                                    (보건체육 2)
```

전체 정의는 `data/departments_dna.json`의 `axes` 배열 참조.

### 3.4 적응형 검사 구조: 1차 90 + 2차 50 + 정밀 100 = 240문항

- **1차 기본검사** (90문항, 12~15분, 전체 공통): 흥미 24문항이 24개 매칭축을 1:1로 측정하는 척추 구조
- **2차 심화검사** (50문항, 7~10분, 계열별): 1차 결과로 학생을 IT/HW/BIZ/HUM/ART/HEALTH 6계열 중 1~3개에 자동 라우팅. 학생당 실제 응답량 평균 130~140문항
- **상담 정밀형** (100문항, 30분, 상담 신청자 한정): 학과 특이성 변별 강화

### 3.5 적합도 산출 공식 (계획서 Ⅷ-1, 변경 금지)

```
학과 적합도(%) = ( Σ(학생 매칭축 점수 × 학과 DNA 가중치) ÷ 학과 최대점수 ) × 100

  - 학생 매칭축 점수: 0~5점 (24개 축, 응답을 가중평균하여 환산)
  - 학과 DNA 가중치: 0~5점 (학과별 24축, departments_dna.json)
  - 학과 최대점수 = Σ(학과 DNA 가중치) × 5
```

31개 학과 동시 계산 → 상위 5개를 TOP5, 6~8위를 비교탐색 학과로 제시.

구현은 `lib/recommendation_engine.js`에 이미 작성되어 있음.

### 3.6 상담 필요도 (CONF + NEED → 0~100점)

- CONF(역채점 포함 15문항) 평균과 NEED(15문항) 평균을 종합
- 70점 이상은 「상담 우선 권장군」으로 자동 분류
- TOP1과 TOP5의 적합도 격차가 작거나, TOP5 적합도 자체가 낮은 학생도 「학과 결정 미정군」으로 보강 분류

### 3.7 학생용 화면 흐름 (STEP 1 → 2 → 3 → 결과지)

학생 진입 흐름은 3 STEP 구조 + 결과지로 구성. 모든 STEP 상단에는 공통 헤더(명지전문대학 로고 자리 + 학생지원처 AI융합진로지원센터)와 STEP 인디케이터(`STEP N / 3 · 단계명`)가 노출된다.

```
STEP 1 / 3  검사 소개            (/)
  - 검사명 "MJC-CAT" (Myongji College Career Aptitude Test)
  - 검사 구성 안내 (8축 / 90문항 / 31학과)
  - 안내사항 동의 체크
  - 닉네임은 STEP 1에서 받지 않음 → STEP 2로 이동

STEP 2 / 3  응답자 정보 입력      (/profile)
  - 16개 항목 (필수 7 + 선택 9)
  - 조건부 노출 4건 (자유전공이유 OTHER/고교유형 SPECIAL·MEISTER/직장·알바 분야/1·2·3지망 순차)
  - 1·2·3지망 중복 학과 자동 비활성
  - 익명 활용 동의 체크 (계획서 XI장 문구)
  - 검증 통과 시 STEP 3로 이동

STEP 3 / 3  진단 검사            (/exam → /stage2)
  - 1차 90문항 → 적합도 산출 + 2차 분기 라우팅
  - 2차 적응형 → 최종 결과 산출
  - 진입 가드: profile 없으면 자동으로 STEP 2로 강제 이동

결과지                            (/result)
  - 상담 필요도 + 8축 레이더 + TOP5 + 비교탐색 6~8위 + PDF 저장
```

**진행 상태 복귀**: 학생이 검사 중간에 새로고침/이탈 후 다시 들어오면, STEP 1 진입 시 "진행 중이던 검사가 있습니다 — 이어서 진행 / 처음부터 다시" 모달이 자동 표시된다. 진행 위치 판정은 `lib/sessionState.ts`의 `getResumeState()` 함수가 담당.

---

## 4. 데이터 파일 (data/)

| 파일 | 행/항목 수 | 용도 |
|---|---:|---|
| `departments_dna.json` | 학과 31, 매칭축 24 | 학과 DNA 가중치 + 메타 + 분기계열 |
| `department_cards.json` | 학과 31 | 결과지·상세화면용 인재상/TOP3/자격증 텍스트 |
| `question_bank.json` | 240문항 | 적응형 검사 문항 + 매칭축 매핑 |
| `student_profile_schema.json` | 16항목 | STEP 2 응답자 정보 입력 폼 정의 (메타) |
| `dna_matrix.csv` | 31×24 | 엑셀 호환 매트릭스 (참조용) |
| `questions.csv` | 240행 | 엑셀 호환 문항 평탄화 (참조용) |

### 4.1 `departments_dna.json` 스키마

```json
{
  "version": "1.0-draft",
  "axes": [{"code": "SW", "category": "기술·공학(IT)", "name": "소프트웨어 개발", "desc": "..."}],
  "departments": [
    {
      "code": "AISW_CS",
      "school": "AI.SW 융합학부",
      "name": "컴퓨터공학과",
      "dna": {"SW": 5.0, "AI": 3.5, ...},   // 24개 매칭축 가중치
      "primary_axes": ["SW", "SYS"],         // 가중치 ≥ 4.0인 축 (캐싱)
      "max_score": 135.0                     // Σ(dna) × 5 (적합도 계산용 최대값)
    }
  ]
}
```

### 4.2 `question_bank.json` 스키마

```json
{
  "items": [
    {
      "id": "Q001",
      "axis": "INT",         // 8개 진단축 중 하나
      "stage": 1,            // 1=기본, 2=심화, 3=정밀형
      "branch": "ALL",       // 2차 분기: ALL/IT/HW/BIZ/HUM/ART/HEALTH
      "reverse": false,      // 역채점 여부 (true면 응답값을 6-v로 처리)
      "mapping": {"SW": 1.0},// 매칭축별 가중치 (CONF/NEED는 빈 객체 {})
      "text": "컴퓨터 프로그램이나 앱을 직접 만들어 보는 일이 재미있다."
    }
  ]
}
```

### 4.3 `department_cards.json` 스키마

```json
[
  {
    "code": "AISW_CS",
    "school": "AI.SW 융합학부",
    "name": "컴퓨터공학과",
    "intro_short": "...",
    "talent_type": "응용소프트웨어 개발자 및 모바일콘텐츠 개발자",
    "top3_jobs": "1. 응용 소프트웨어 개발자 2. 웹&게임 개발자 3. 시스템 엔지니어",
    "certifications": "정보처리산업기사, 정보보안산업기사, ..."
  }
]
```

### 4.4 `student_profile_schema.json` 스키마

STEP 2 입력 폼의 16개 항목 정의. 코드에 옵션 텍스트 하드코딩 금지(9장 컨벤션). **학과 매칭 가중치에는 영향 없는 메타데이터**(분석·상담용).

```json
{
  "version": "1.0-draft",
  "sections": [
    { "key": "A", "title": "기본 정보", "fields": ["nickname", "birth_year", ...] },
    { "key": "B", "title": "진로 방향", "fields": ["career_direction", ...] },
    { "key": "C", "title": "학습·경험 배경", "fields": ["high_school_type", ...] },
    { "key": "D", "title": "학과 선택 현황", "fields": ["preferred_dept_1", ...] }
  ],
  "fields": {
    "gender": {
      "section": "A", "required": true, "type": "radio_buttons",
      "options": [
        { "value": "M",    "label_ko": "남성" },
        { "value": "F",    "label_ko": "여성" },
        { "value": "NONE", "label_ko": "응답하지 않음" }
      ]
    },
    "preferred_dept_2": {
      "section": "D", "required": false, "type": "department_dropdown",
      "visible_if": { "field": "preferred_dept_1", "not_null": true }
    }
  },
  "department_groups": [
    { "school": "AI.SW 융합학부",   "codes": ["AISW_CS", ...] },
    { "school": "스마트시스템공학부", "codes": [...] },
    { "school": "경영휴먼라이프학부", "codes": [...] },
    { "school": "예술건강학부",      "codes": [...] }
  ],
  "validation": {
    "required_field_keys": [
      "nickname", "birth_year", "gender", "academic_status", "self_designed_reason",
      "career_direction", "decision_maker"
    ],
    "duplicate_preference_check": { "fields": ["preferred_dept_1", "preferred_dept_2", "preferred_dept_3"] }
  }
}
```

16개 항목 = A(기본 5) + B(진로 3) + C(배경 5) + D(학과 3). 필수 7개, 선택 9개. 조건부 노출 4건은 `visible_if`로 정의.

---

## 5. 핵심 구현물 (lib/)

### 5.1 `lib/recommendation_engine.js`

이미 작성된 적합도 계산 엔진. 가상 학생 5명 시나리오로 검증 완료(TOP5 정확도 100%).

```js
import { calcAxisScores, calcFitScores, calcCounselingNeed } from './lib/recommendation_engine.js';

// 학생 응답 {Q001: 5, Q002: 4, ...}
const axisScores = calcAxisScores(responses, questionBank);  // 24축 0~5점
const fits = calcFitScores(axisScores, departmentsDna);      // 31학과 0~100점
const need = calcCounselingNeed(responses, questionBank);    // 0~100점
```

**변경 시 주의**: 계획서 Ⅷ장 공식과 일치해야 함. `tests/test_engine.js`로 회귀 검증.

### 5.2 `lib/analytics.js`

STEP 2 응답자 정보(profile)와 적합도 결과(fitScores)를 결합해 메타 분석을 수행. **학과 매칭 가중치(DNA)나 적합도 공식에는 영향을 주지 않는 사후 분석**. `tests/test_analytics.js`로 44건 회귀 검증.

```js
import {
  calcHitMetrics,
  classifyCounselingPriority,
  groupByDesignedReason,
  crossAnalyzeCareerVsRecommendation,
} from "./lib/analytics.js";

// 1) 학생 희망학과 vs 시스템 TOP1/3/5 일치율
calcHitMetrics(profile, fitScores)
  // → { hit_at_1, hit_at_3, hit_at_5, top1_in_preferences, preferences, evaluable }

// 2) 상담 우선군 자동 분류 (HIGH/MEDIUM/LOW)
classifyCounselingPriority(profile, fitScores, counselingNeed)
  // 트리거 규칙:
  //   rule_a: NEED 점수 >= 70
  //   rule_b: decision_maker in {FAMILY, FRIEND_SENIOR} AND !hit_at_1
  //   rule_c: TOP1 적합도 < 50
  // → { priority, triggered_rules, detail }

// 3) 자유전공 진학 이유별 그룹핑 (집계)
groupByDesignedReason(students)
  // → { total, groups: { UNDECIDED|EXPLORE|SCORE_MATCH|OTHER: {...} } }

// 4) 진로방향 × 추천학과 학부 교차분석
crossAnalyzeCareerVsRecommendation(students)
  // → { total, career_keys[5], school_keys[정렬], matrix[career][school] }
```

### 5.3 `src/lib/sessionState.ts`

학생 응답·임시 상태의 sessionStorage 영속화. 키 컨벤션 `mjc_cat_*` 통일.

- `setProfile / getProfile` — STEP 2 응답자 정보
- `setConsent / getConsent` — STEP 1 안내 동의
- `setResponse(qid, v) / getResponses()` — 1차/2차 stage 자동 분기 저장
- `getResumeState()` — 진행 위치 판정 (STEP 1 "이어서 진행" 모달이 사용)
- `clearAll()` — 신·구 키 모두 정리

학번·이름은 절대 저장하지 않음(7장 참조).

---

## 6. 권장 기술 스택 및 아키텍처

### 6.1 우선 가벼운 옵션 (시범운영용)
- **Vanilla JS + 단일 HTML** 또는 **Vite + Vanilla**
- 데이터 파일은 빌드 시 `import` 또는 `fetch('./data/...')`
- 상태 관리: 단순 객체 + sessionStorage (검사 도중 새로고침 방지)
- PWA 변환: `manifest.webmanifest` + service worker

### 6.2 본 운영 옵션
- **Vite + React + TypeScript**
- 차트: Recharts (8축 레이더차트)
- PWA: `vite-plugin-pwa`
- 빌드 산출물은 학내 웹서버 정적 호스팅

### 6.3 권장 진행 순서
1. 학생용 1차 기본검사 화면 (Vanilla 단일 HTML)
2. 적합도 산출 + 결과지 (TOP5 + 레이더차트 + PDF 저장)
3. 2차 적응형 라우팅 + 정밀형 분기
4. PWA manifest + 오프라인 캐싱
5. 관리자 대시보드 (별도 페이지, 권한 분리)

---

## 7. 개인정보·보안 (계획서 XI장 — 절대 위반 금지)

### 7.1 본 운영 시 수집 항목 (계획서 XI장)
- **7가지만** 수집 가능: 학번, 이름, 학부·학년, 진단 응답, 상담 이력, 만족도 (그 외 일체 불가)
- 학번·이름은 **AES-256 암호화**, 응답 데이터는 익명ID로 연결
- 외부 분석 도구(GA, Mixpanel 등) 절대 연결 금지
- 결과지 PDF 저장은 클라이언트 사이드에서 처리(서버 업로드 금지, jspdf 권장)
- 보관 기간: 졸업 후 3년

### 7.2 시범운영 단계 — 실제 PWA에서 수집하는 정보

시범운영에서는 학번·이름을 **수집하지 않는다**. 닉네임 + 일반사항 16개만 sessionStorage에 임시 저장.

| # | 항목 | 식별성 | 비고 |
|---|---|---|---|
| 1 | 닉네임 (자유입력 1~20자) | 비식별 | 결과지·집계 표시용 |
| 2 | 출생연도 | 비식별 | 연령대 통계용 |
| 3 | 성별 (M/F/응답하지 않음) | 비식별 | |
| 4 | 학적 상태 (신입/재학/편입/졸업) | 비식별 | |
| 5 | 자유전공 진학 이유 | 비식별 | 그룹 분석용 (UNDECIDED/EXPLORE/SCORE_MATCH/OTHER) |
| 6 | 진로방향 유형 | 비식별 | 취업/창업/편입/대학원/미정 |
| 7 | 의사결정 유형 | 비식별 | 본인/가족/친구·선후배/교사/기타 |
| 8 | 진로상담 희망 (선택) | 비식별 | |
| 9 | 고등학교 유형 (선택) | 비식별 | |
| 10 | 고교 전공 분야 (조건부 선택) | 비식별 | 특성화·마이스터고일 때만 |
| 11 | 직장 경험 + 분야 (선택) | 비식별 | |
| 12 | 아르바이트 경험 + 분야 (선택) | 비식별 | |
| 13 | 이전 대학 경험 (선택) | 비식별 | |
| 14~16 | 희망학과 1·2·3지망 (선택) | 비식별 | 추천 적중률 분석용 |
| + | 진단 응답 240문항 | 비식별 | 1차/2차 분리 저장 |

**학번·이름은 시범운영에서 일체 수집하지 않는다.** 본 운영 전환 시 7.1의 7개 항목 + 익명ID 매핑 방식으로 마이그레이션 예정.

### 7.3 클라이언트 저장 (sessionStorage) 키 컨벤션

```
mjc_cat_consent          mjc_cat_responses_stage1   mjc_cat_active_branches
mjc_cat_profile          mjc_cat_responses_stage2   mjc_cat_result
                         mjc_cat_stage1_done
```

sessionStorage는 탭 종료 시 자동 삭제. LocalStorage 사용 금지.

---

## 8. UI/UX 가이드라인

- **모바일 우선**: 학생 절대 다수가 QR로 모바일 접속. 데스크탑은 보조.
- **응답 부담 최소화**: 화면당 1~3문항. 진행률 바 필수. 뒤로가기 가능.
- **언어**: 모든 학생 인터페이스는 한국어. 기술 용어는 풀어쓰기(예: "DB" → "데이터베이스").
- **5점 척도 선택지**: "전혀 그렇지 않다 / 그렇지 않다 / 보통이다 / 그렇다 / 매우 그렇다" (계획서 Ⅵ-1)
- **결과지 안내문구(법적, 계획서 Ⅸ ⑧)**:
  > "본 결과는 학과 선택을 위한 참고자료이며, 학과 배정과는 무관합니다. 최종 선택은 학생 본인의 권리이며, 진로·취업 컨설턴트가 추가 상담을 통해 충분히 지원합니다."

이 문구는 **결과지 모든 페이지 하단에 고정 표시**.

---

## 9. 코드 컨벤션

- 변수·함수명: 영문 camelCase
- 주석: 한국어 권장 (한국 운영진 인계용)
- 학과 코드 상수: 영문 대문자 SNAKE_CASE (예: `AISW_CS`)
- JSON 키: 영문 snake_case
- 모든 데이터 import는 `data/`에서 (코드에 가중치 하드코딩 금지)
- 적합도 공식은 `lib/recommendation_engine.js`에서만 정의 (중복 구현 금지)

---

## 10. 자주 묻는 질문 (개발 중 헷갈리기 쉬운 부분)

**Q. 학생이 답한 문항이 매칭축이 빈 객체({})면 무시해도 되나?**
→ 그렇다. CONF(선택확신도)와 NEED(상담필요도)의 30문항은 매칭축에 기여하지 않고 상담필요도 점수 계산에만 사용된다.

**Q. 역채점(reverse=true) 처리는 언제?**
→ `calcAxisScores`에서 응답값을 `6 - v`로 뒤집은 후 가중치를 곱한다. `calcCounselingNeed`에서도 마찬가지.

**Q. 2차 적응형 라우팅 임계값은?**
→ 1차 결과의 매칭축 점수가 **평균(3.0) + 0.5σ 이상**이면 해당 매칭축이 속한 계열을 활성. 학생당 1~3개 계열이 보통. 임계값은 시범운영 데이터로 조정 예정.

**Q. PWA에서 학생 응답 도중 네트워크가 끊기면?**
→ 응답은 sessionStorage에 누적. 결과 산출은 클라이언트에서 가능(서버 의존 없음). 상담 신청·관리자 저장만 네트워크 필요.

**Q. 학과 정보 페이지에서 학과 홈페이지로 어떻게 연결?**
→ 1차 프로토타입에서는 텍스트만 표시. 실제 URL은 학과별 회신 후 `department_cards.json`에 `homepage_url` 필드 추가 예정.

**Q. CONF/NEED 문항 중 일부에 reverse가 있는 이유?**
→ CONF는 "확신이 없다"는 문장이 일부 섞여 있어서. 역채점하면 모든 응답이 "높을수록 확신 있음"으로 통일됨.

**Q. 학생이 1지망을 "아직 정하지 않음"으로 두면 어떻게 처리하나?**
→ 2·3지망 입력란은 자동으로 닫힘(`preferred_dept_1`이 null이면 2지망 노출 조건 미충족). `preferred_dept_1/2/3` 모두 null로 저장. `calcHitMetrics`는 `evaluable: false`를 반환하므로 Hit@1/3/5 지표 자체를 계산하지 않으며, 집계에서도 "1지망 입력률" 분모에서 제외된다. `classifyCounselingPriority`의 rule_b(외부 결정 + 미스매치) 역시 트리거되지 않음.

**Q. decision_maker가 OTHER + 직접입력일 경우 분석에는?**
→ 자유 입력 문자열(`decision_maker_other_text`)은 학생별 상담 기록 LIKE 검색용으로만 보관. 집계 분석(`crossAnalyzeCareerVsRecommendation` 등)은 `OTHER` 묶음으로 일괄 처리하며 직접 입력 텍스트는 통계에 포함하지 않는다. 같은 규칙이 `self_designed_reason_other_text`, `high_school_type_other_text`, `work_experience.field_other_text`, `part_time_experience.field_other_text`에도 적용.

---

## 11. 참고 자료 (docs/)

| 파일 | 내용 |
|---|---|
| `docs/dna_review.md` | DNA표 31개 학과 전체 + 학과별 가중치 근거 |
| `docs/questions_review.md` | 240문항 전체 + 시뮬레이션 검증 결과 |
| `docs/dna_review.xlsx` | 학과장 회람용 워크북 (5시트) |
| `docs/questions_review.xlsx` | 문항 검토용 워크북 (7시트) |
| `docs/source_pdfs/` | 31개 학과 가이드북 PDF 원본 |
| `docs/project_plan.docx` | 계획서 원본 (있으면 자동 인식) |

---

## 12. 작업 우선순위 및 진행 현황

| # | 항목 | 상태 | 산출물 |
|---|---|---|---|
| 1 | 데이터 파일 무결성 검증 | ✅ 완료 | `tests/test_engine.js` 통과 |
| 2 | 적합도 엔진 회귀 테스트 (가상 학생 5명) | ✅ 완료 | 5/5 매칭 통과 |
| 3 | 학생용 1차 기본검사 화면 (90문항) | ✅ 완료 | `src/student/Start.tsx`, `Exam.tsx` |
| 4 | 결과지 화면 (TOP5 + 8축 레이더 + PDF) | ✅ 완료 | `src/student/Result.tsx` |
| 5 | 2차 적응형 라우팅 | ✅ 완료 | `src/student/Stage2.tsx` + `selectStage2Items()` |
| 6 | PWA manifest + service worker | ✅ 완료 (2026-05-27) | `public/manifest.webmanifest`, `vite-plugin-pwa` |
| 7 | STEP 1 검사 소개 격식 강화 (MJC-CAT) | ✅ 완료 (2026-05-28) | `AppHeader`, `StepIndicator`, `Start.tsx` 재설계 |
| 8 | STEP 2 응답자 정보 입력 (16항목) | ✅ 완료 (2026-05-28) | `Profile.tsx`, `student_profile_schema.json` |
| 9 | 메타 분석 함수 + 회귀 테스트 (44건) | ✅ 완료 (2026-05-28) | `lib/analytics.js`, `tests/test_analytics.js` |
| 10 | STEP 1↔2↔3 라우팅 + sessionStorage 정비 + 이어서 진행 모달 | ✅ 완료 (2026-05-28) | `sessionState.ts` 재작성, `Start.tsx` ResumeModal |
| 11 | QR 접속 실기 테스트 | ⏳ 보류 | HTTPS 호스팅 환경 확보 후 (iOS Safari SW 요건) |
| 12 | 관리자 대시보드 본격 구현 | ⏳ 보류 | 시범운영 데이터 50~100명 누적 후 |
| 13 | 뷰티매니지먼트과(메이크업&네일전공) 데이터 보강 | ⏳ 보류 | 자료 입수 후 |
| 14 | 학과 홈페이지 URL 필드 추가 | ⏳ 보류 | 학과별 회신 후 `homepage_url` 필드 |
| 15 | PWA 아이콘 MJC CI 교체 | ⏳ 보류 | 공식 CI 자산 입수 후 |

### PWA 구성 요약 (2026-05-27 적용)

- **빌드 도구**: `vite-plugin-pwa` 1.3.x (Workbox 기반 자동 SW 생성)
- **레지스트레이션**: `injectRegister: "auto"` — 별도 코드 없음
- **업데이트 전략**: `registerType: "autoUpdate"` — 새 빌드 배포 시 무중단 갱신
- **Precache 대상**: `**/*.{js,css,html,svg,woff2,json}` (data/*.json 포함, 약 1.3MB 16항목)
- **오프라인 폴백**: `navigateFallback: "index.html"` — HashRouter와 함께 동작
- **데브 SW**: `devOptions.enabled: true` — `npm run dev`에서도 SW 등록되어 검증 가능
- **매니페스트 수기 관리**: `public/manifest.webmanifest`를 직접 편집 (플러그인 자동 생성 비활성)

### 배포 시 체크리스트

- [ ] HTTPS 필수 (Service Worker 동작 요건, iOS Safari 특히 엄격)
- [ ] `npm run build` 산출물 `dist/`를 학내 정적 호스팅으로 업로드
- [ ] `public/icons/*.svg`를 실제 MJC CI 색·로고로 교체 (현재는 가안 네이비 #0b3d91 / 오렌지 #f5a623)
- [ ] HashRouter 사용 중이므로 서버 측 SPA 폴백 라우트 설정 불요
- [ ] 첫 접속 후 DevTools → Application → Cache Storage에서 16개 자산 캐싱 확인

각 단계마다 사용자에게 확인 후 다음 단계 진행.

---

## 13. 이 문서 유지보수

이 `CLAUDE.md`는 **프로젝트의 살아있는 명세**. 다음과 같은 변경이 있으면 반드시 갱신:

- 학과 추가·삭제 (예: 메이크업&네일전공 추가)
- 매칭축/진단축 변경
- DNA 가중치 학과장 보정 완료
- 적합도 공식 변경 (절대 없을 예정)
- 신규 데이터 파일 추가

문서가 코드보다 뒤처지면 다음 Claude Code 세션의 컨텍스트가 깨진다.
