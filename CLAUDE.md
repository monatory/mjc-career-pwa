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

### 3.8 자유전공 진입 가능성 라벨 (2026-05-29 확정)

학생이 결과지·수강계획서에서 보게 될 31개 학과 중 일부는 자유전공학과에서 **직접 진입할 수 없는 별도 모집 단위**다. 적합도 계산·추천 알고리즘은 31개 전부에 동일하게 적용하되(공식 변경 없음), 진입 불가 학과는 별도 안내 배너를 노출한다.

| 구분 | 학과 수 | 처리 |
|---|---:|---|
| 진입 가능 (ACCESSIBLE) | 27 | 결과지·수강계획서에 정상 노출 |
| 진입 불가 (NOT_ACCESSIBLE) | 4 | 적합도는 계산·표시하되 "별도 모집 학과" 안내 배너 노출, 수강계획서에서는 비노출 |

- **진입 불가 4개**: `BIZ_EDU` 유아교육과 · `ART_FILM` 연극영상과 · `ART_MUS` 실용음악과 · `ART_PE` 사회체육과
- 판정 데이터는 `data/departments_accessibility.json`, 판정 함수는 `lib/courses.js`의 `isFreeMajorAccessible()`.
- **안전 기본값**: 미등재 학과는 진입 가능으로 가정. 진입 불가는 반드시 데이터로 명시돼야 배너가 뜬다.

### 3.9 학과명 정책 (우리 시스템명 우선, 가이드북명 보조)

신입생 가이드북 표기와 우리 시스템 학과명이 다른 경우, **우리 시스템명을 그대로 유지**하고 가이드북 표기는 `name_in_guidebook`(부가 표기)로 병기한다.

| 코드 | 우리 시스템명 | 가이드북 표기 |
|---|---|---|
| `BIZ_PUBADM` | 공공행정서비스상담과 | 공공행정서비스과 |
| `BIZ_JP` | 일본어학과 | 일본어과 |
| `BIZ_CN` | 중국어학과 | 중국어비즈니스과 |
| `ART_FASH` | 패션디자인과 | 패션·리빙디자인과 |

### 3.10 단계 B 신규 3개 학과 보류 (PDF 입수 후)

가이드북 자료 미입수로 다음 3개 학과는 **단계 B**에서 추가 예정. 추가 절차는 별도 가이드 `docs/STAGE_B_GUIDE.md` 참조.

- `BIZ_YOUTH` 청소년교육상담과 (자격증 데이터는 `certification_requirements.json`에 `pending_dept_data: true`로 자리만 선점)
- `ART_AIMD` AI미디어디자인학과
- `ART_BTY_MN` 뷰티매니지먼트과 메이크업·네일전공

3개 모두 추가 시 진입 가능(ACCESSIBLE)으로 분류 예정. DNA·문항은 추가될 때까지 31개 기준 유지.

---

## 4. 데이터 파일 (data/)

| 파일 | 행/항목 수 | 용도 |
|---|---:|---|
| `departments_dna.json` | 학과 31, 매칭축 24 | 학과 DNA 가중치 + 메타 + 분기계열 |
| `department_cards.json` | 학과 31 | 결과지·상세화면용 인재상/TOP3/자격증 텍스트 |
| `question_bank.json` | 240문항 | 적응형 검사 문항 + 매칭축 매핑 |
| `student_profile_schema.json` | 16항목 | STEP 2 응답자 정보 입력 폼 정의 (메타) |
| `department_courses.json` | 학과 27 + 공통 | 1학기 추천 교과 (진입 가능 27개 + 자유전공 공통/교양) |
| `certification_requirements.json` | 학과 2 | 1학기 필수 과목 누락 시 자격증 취득 곤란 학과 경고 |
| `departments_accessibility.json` | 학과 31 | 자유전공 진입 가능성 라벨 (ACCESSIBLE / NOT_ACCESSIBLE) |
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

### 4.5 `department_courses.json` 스키마 (1학기 추천 교과 — 검사 후 부가 모듈)

결과지·수강계획서에서 "1학기에 어떤 과목을 들으면 좋은가"를 안내. **DNA·적합도와 무관한 부가 데이터**. 진입 불가 4개 학과는 항목 자체가 없다(27개만 등재).

```json
{
  "version": "1.0",
  "source": "2026 명지전문대학 자유전공학과 신입생 가이드북 (p.19~21)",
  "common_courses": {
    "free_major_dedicated": [{"name":"전공기초학문탐구","credits":1,"note":"선이수 가능"}, ...],
    "liberal_required": [{"name":"인성채플","credits":0,"is_pass_fail":true}, {"name":"성경과 삶","credits":2}],
    "strongly_recommended_liberal": [{"name":"진로탐색과 자기계발","credits":2}, ...]
  },
  "departments": {
    "AISW_GAME": {
      "name_in_guidebook": "AI게임소프트웨어학과",   // 가이드북 표기 (§3.9)
      "duration_years": 3,                          // 2 | 3
      "courses": [
        {"name": "게임프로그래밍", "credits": 3, "strongly_recommended": true}  // 원자료 ● = true
      ]
    }
  }
}
```

- `credits`는 정수, P/NP 과목(인성채플)은 `credits:0` + `is_pass_fail:true`.
- `strongly_recommended:true`는 가이드북 ● 표시 = 학과 강력추천(결과지에서 ⭐ 배지).

### 4.6 `certification_requirements.json` 스키마 (자격증 1학기 필수 과목)

1학기 필수 과목을 놓치면 자격증 취득이 어려운 학과만 등록. 시범운영 현재 2건(`BIZ_WELF`, `BIZ_YOUTH`). 결과지·카드의 경고 배너 근거.

```json
{
  "version": "1.0",
  "departments": {
    "BIZ_WELF": {
      "dept_name": "사회복지과",
      "warning_level": "HIGH",                     // HIGH만 배너 강조 (MEDIUM/LOW 예약)
      "warning_message": "사회복지사 2급 ... 수강 신청 전 반드시 학과 상담을 권장합니다.",
      "certifications": [
        {
          "name": "사회복지사 2급",
          "required_courses_1st_semester": ["사회복지학개론","정신건강론","아동복지론","지역사회복지론","노인복지론"]
        }
      ]
    },
    "BIZ_YOUTH": { "... pending_dept_data": true }  // 단계 B 대기 — 자격증 자리만 선점
  }
}
```

- `elective_courses_1st_semester`는 선택 항목(있을 수도, 없을 수도).
- `pending_dept_data:true`면 학과 본체 데이터(DNA·카드·교과)는 단계 B에서 추가 예정.

### 4.7 `departments_accessibility.json` 스키마 (자유전공 진입 가능성)

§3.8 정책의 데이터 출처. 31개 학과 전부 등재(라벨만).

```json
{
  "version": "2026-v1",
  "labels": { "ACCESSIBLE": "자유전공 진입 가능", "NOT_ACCESSIBLE": "별도 모집 학과" },
  "not_accessible_notice": "이 학과는 자유전공학과에서 직접 진입할 수 없습니다. ... 진로상담을 신청해 주세요.",
  "accessibility": {
    "AISW_CS": "ACCESSIBLE",
    "BIZ_EDU": "NOT_ACCESSIBLE",     // 유아교육과
    "ART_FILM": "NOT_ACCESSIBLE",    // 연극영상과
    "ART_MUS": "NOT_ACCESSIBLE",     // 실용음악과
    "ART_PE": "NOT_ACCESSIBLE"       // 사회체육과
  }
}
```

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
- `savePlanState / loadPlanState` — 수강계획서 선택 과목 (키 `mjc_cat_plan`)
- `clearAll()` — 신·구 키 모두 정리

학번·이름은 절대 저장하지 않음(7장 참조).

### 5.4 `lib/courses.js` (1학기 추천 교과 헬퍼)

§4.5~4.7 데이터 3종을 입력으로 받아 결과지·수강계획서가 필요로 하는 정보를 가공하는 **순수 함수 5종**. 어떤 함수도 DNA·적합도 공식에 영향을 주지 않는다. `tests/test_courses.js`로 44건 회귀 검증. strict TS 대응 `lib/courses.d.ts` 동반(§17.2).

```js
import {
  getCoursesForDept, isFreeMajorAccessible, getCertificationRequirements,
  calcSelectedCredits, validateCreditRange,
} from "./lib/courses.js";

getCoursesForDept(deptCode, courseData)
  // → {name_in_guidebook, duration_years, courses[]} | null (진입 불가 4개는 null)

isFreeMajorAccessible(deptCode, accessibilityData)
  // → boolean. NOT_ACCESSIBLE만 false, 그 외(미등재 포함)는 true (안전 기본값)

getCertificationRequirements(deptCode, certData)
  // → {warning_level, warning_message, certifications[], pending_dept_data?} | null

calcSelectedCredits(selectedCourses)
  // → number. credits 음수/NaN/누락은 0, P/NP(credits=0)는 자연히 0 합산

validateCreditRange(totalCredits)
  // → {is_valid, status:"TOO_LOW"|"OK"|"TOO_HIGH", message}. 권장 12~23학점(경계값 OK)
```

`src/lib/dataLoader.ts`가 데이터 3종을 import해 `courseData / certificationData / accessibilityData`로 export하고, `getAccessibilityLabel(code)` 헬퍼도 제공한다.

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
- 결과지 PDF 저장은 클라이언트 사이드에서 처리(서버 업로드 금지). 결과지·수강계획서 모두 `window.print()` + `@media print` 방식(한글 폰트 임베드 문제 회피). jsPDF·html2canvas 의존성은 2026-05-29 제거
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
mjc_cat_anonymous_id     mjc_cat_stage1_done        mjc_cat_plan
mjc_cat_saved            (결과 Firestore 저장 완료 플래그 — 중복 쓰기 방지)
```

sessionStorage는 탭 종료 시 자동 삭제. LocalStorage 사용 금지. 모든 키는 `clearAll()`에서 일괄 정리.

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

**Q. 진입 불가 학과(예: 유아교육과)를 1지망으로 적거나 TOP5에 뜨면?**
→ 적합도 계산·추천 알고리즘은 31개 전체에 그대로 적용한다(공식 변경 없음). 진입 불가 4개(`BIZ_EDU·ART_FILM·ART_MUS·ART_PE`)도 적합도 점수가 높으면 결과지 TOP5/비교탐색에 정상 표시되지만, 카드·모달에 "별도 모집 학과" 라벨과 안내 배너가 함께 뜬다. 희망학과 비교·상담 우선군 분류도 그대로 동작. 다만 **수강계획서(/plan)에는 이 4개 학과를 노출하지 않는다**(직접 진입 경로가 없으므로). 판정은 `isFreeMajorAccessible()`.

**Q. 자격증 요건 학과가 TOP5에 없으면 경고 배너를 안 보이나?**
→ 배너 위치가 순위에 따라 갈린다. TOP1~3이면 결과지 상단에 강조 배너(`CertificationBanner placement="top"`). TOP4~8(비교탐색)이면 평소엔 숨기고 **해당 학과 카드를 클릭해 모달을 펼쳤을 때만** 모달 내부에 배너 표시(`placement="modal"`). 중복 노출 방지를 위해 `fit.rank <= 3` 기준으로 상단/모달을 배타 분리한다. 자격증 데이터가 없는 일반 학과는 배너 자체가 없다.

**Q. 수강계획서 권장 학점 12~23은 어디서 정한 값인가?**
→ `validateCreditRange()`의 시범운영 기본값(일반적 대학 수강 가이드: 최소 12, 최대 23). 가이드북 문구와 별개이며 본 운영 시 학사일정에 맞춰 조정 가능. 경계값(12·23)은 OK로 처리.

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
| `docs/STAGE_B_GUIDE.md` | 단계 B 신규 3개 학과(청소년교육상담·AI미디어디자인·뷰티 메이크업네일) 추가 절차 |
| `docs/demo/` | **시연 영상·발표 자료 전용 폴더** (시스템 본체와 분리). `demo` 스킬로 호출 — §22 |

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
| 11 | QR 접속 실기 테스트 | ✅ 완료 (2026-05-28) | GitHub Pages HTTPS 자동 배포 충족 |
| 12 | 관리자 대시보드 본격 구현 | ✅ 완료 (2026-05-28) | 7개 섹션 + Firestore 실측 + CSV 4종 + 데스크탑 우선 디자인 |
| 13 | 뷰티매니지먼트과(메이크업&네일전공) 데이터 보강 | ⏳ 보류 | 자료 입수 후 |
| 14 | 학과 홈페이지 URL 필드 추가 | ⏳ 보류 | 학과별 회신 후 `homepage_url` 필드 |
| 15 | PWA 아이콘 MJC CI 교체 | ⏳ 보류 | 공식 CI 자산 입수 후 |
| 16 | 1·2차 UX 검토 + 17건 + 8건 개선 (P0/P1/P2 + 추가 P1) | ✅ 완료 (2026-05-28) | 결과지 1위 강조·상담 게이지·CTA·모달 ESC·터치영역·테이블 가로 스크롤 등 |
| 17 | GitHub 저장소 공개 푸시 | ✅ 완료 (2026-05-28) | `https://github.com/monatory/mjc-career-pwa` (Public, 22+ 커밋) |
| 18 | GitHub Pages 자동 배포 + 카톡 OG 카드 | ✅ 완료 (2026-05-28) | `https://monatory.github.io/mjc-career-pwa/` (HTTPS, QR 공유 가능) |
| 19 | Firebase Firestore 학생 응답 백엔드 (Phase 2~4) | ✅ 완료 (2026-05-28) | `responses/{anonymousId}`, Security Rules, CSV 4종 |
| 20 | 관리자 대시보드 통계·학과별 명단 + 검사 흐름 개선 + 결과지 희망 비교 | ✅ 완료 (2026-05-28) | A·B·C 묶음 (Exam 다음 미응답 점프·ProfileStats·PreferredByDept·PreferenceComparisonCard) |
| 21 | 가상 학생 5명 시드 + 시연 점검 | ✅ 완료 (2026-05-28) | `tests/seed_firestore.js` |
| 22 | 관리자 페이지 데스크탑 우선 재디자인 + 반응형 | ✅ 완료 (2026-05-28) | max-width 1440, KPI·차트·테이블·사이드바 격식 |
| 23 | 자율 점검 10라운드 — 가독성·색감·시연성 | ✅ 완료 (2026-05-28) | 헤더 그림자·검사 카드·1위 강조·분포 막대 그라데이션 등 |
| 24 | PWA SW 즉시 활성화 (skipWaiting + clientsClaim) | ✅ 완료 (2026-05-28) | 새 빌드 배포 시 새로고침 1회로 적용 |
| 25 | CI 빌드 실패 복구 — TS 타입 선언 추가 | ✅ 완료 (2026-05-28) | `lib/analytics.d.ts` 신설, 9회 누적 push 일괄 반영 |
| 26 | 검사 후 1학기 추천 교과 모듈 (작업 1~7) | ✅ 완료 (2026-05-29) | 데이터 3종 + `lib/courses.js`(44건) + 결과지 카드 확장·자격증 배너 + `/plan` 수강계획서 + §20 문서화 |
| 27 | 결과지 가독성 점검 + PDF 재구성 + 인쇄 미리보기 + 자율 점검 | ✅ 완료 (2026-05-29) | 비교탐색 접기·레이더·진입라벨 / PDF를 window.print 전용 문서로(§21, jsPDF 제거) / 앱 내 미리보기(§21.3) / Firestore 중복저장 가드·초소형 화면 넘침 수정 |
| 28 | 관리자 사이드바 "권한 전환" 버튼 가독성 수정 | ✅ 완료 (2026-05-30) | `button.ghost` specificity 충돌로 글자색이 네이비 배경에 묻히던 문제. 선택자 강도 동률 + font-weight 600·배경 0.18 보강 (`src/styles/global.css:1726`) |
| 29 | 시연 영상용 NotebookLM 소스 문서 작성 | ✅ 완료 (2026-05-30) | `docs/demo/notebooklm_demo_3min.md` — 7개 SCENE × 3분 구성, 핵심 수치 표, 슬라이드 보조 자료. NotebookLM Studio Video Overview용 |
| 30 | 시연 자료 전용 폴더 + `demo` 스킬 구축 | ✅ 완료 (2026-05-30) | `docs/demo/`(매니페스트 README + 대본) 분리 + `.claude/skills/demo/SKILL.md`. "시연 엠디"·"/demo" 호출 시 시연 레이어만 발동 (§22) |
| 31 | 시연 스크린샷 팩 6장 + 자동 캡처 스크립트 | ✅ 완료 (2026-05-30) | `docs/demo/assets/*.png`(STEP1·2·3·결과지·수강계획서·관리자) + `tests/capture_demo.mjs`(puppeteer-core+시스템 Chrome headless, `--no-save` 일회성, CI 무영향) |

> **작업 26 세부 (2026-05-29, 7개 하위 작업 단위 커밋)**
> - 1) 데이터 3종 신규 — `department_courses.json`(27), `certification_requirements.json`(2), `departments_accessibility.json`(31)
> - 2) `lib/courses.js` 헬퍼 5종 + `courses.d.ts` + `tests/test_courses.js` 44건
> - 3) 결과지 학과 카드 확장 — 1학기 추천 교과·진입 가능성 라벨 (`DepartmentDetailModal`)
> - 4) 자격증 요건 학과 경고 배너 (`CertificationBanner`, TOP1~3 상단 / TOP4~8 모달)
> - 5) 수강 계획서 페이지 `/plan` 신규 (`src/student/Plan.tsx`) + 결과지 진입 버튼
> - 6) 결과지 ↔ 수강계획서 라우팅·sessionStorage(`mjc_cat_plan`) 검증
> - 7) CLAUDE.md 갱신(§3.8~3.10·§4.5~4.7·§5.4·§10 FAQ·§20) + `docs/STAGE_B_GUIDE.md`
> - 자세한 화면 흐름은 §20 참조.

> **작업 27 세부 (2026-05-29, 6개 커밋 — 작업 1~7 포함 12커밋 일괄 푸시·배포 완료)**
> - 결과지 가독성: 비교탐색(6~8위) `<details>` 접기, 레이더 좌우 라벨 클리핑 수정, "별도 모집 학과" 라벨 앰버 ⓘ 톤
> - 결과 PDF: html2canvas 이미지 → `window.print()` + `@media print` 전용 문서(머리말·매 페이지 푸터·접힘 자동 펼침). **jsPDF 의존성 제거** → PWA precache 17→14항목(1846→1129KiB). §21
> - 인쇄 미리보기: `body.print-preview`로 A4 문서 카드 + 고정 툴바, ESC 닫기. §21.3
> - 자율 점검 수정 2건: ① Firestore 결과 저장 1회 보장(중복 쓰기→permission-denied 284건 해소, `mjc_cat_saved` 플래그) ② 초소형 화면(≤약 336px) 희망학과 비교표 가로 스크롤 래퍼(페이지 넘침 해소)
> - 점검·양호(변경 불요): 관리자 KPI·테이블·분포 정렬, /plan 진입가드, 진입불가 모달, STEP1 이어서진행 모달
> - **배포**: 작업 1~27의 12커밋을 `main`에 일괄 푸시(2026-05-29) → GitHub Actions 성공 → 라이브 반영 확인(자산 해시 일치). 사용자 측 PWA 캐시 갱신 필요(§17.3).

### PWA 구성 요약 (2026-05-27 적용)

- **빌드 도구**: `vite-plugin-pwa` 1.3.x (Workbox 기반 자동 SW 생성)
- **레지스트레이션**: `injectRegister: "auto"` — 별도 코드 없음
- **업데이트 전략**: `registerType: "autoUpdate"` — 새 빌드 배포 시 무중단 갱신
- **Precache 대상**: `**/*.{js,css,html,svg,woff2,json}` (data/*.json 포함, 약 1.3MB 16항목)
- **오프라인 폴백**: `navigateFallback: "index.html"` — HashRouter와 함께 동작
- **데브 SW**: `devOptions.enabled: true` — `npm run dev`에서도 SW 등록되어 검증 가능
- **매니페스트 수기 관리**: `public/manifest.webmanifest`를 직접 편집 (플러그인 자동 생성 비활성)

### 배포 시 체크리스트

- [x] HTTPS 필수 (Service Worker 동작 요건, iOS Safari 특히 엄격) — GitHub Pages가 자동 제공
- [x] `npm run build` 산출물 `dist/`를 정적 호스팅으로 업로드 — Actions 워크플로 자동
- [ ] `public/icons/*.svg`를 실제 MJC CI 색·로고로 교체 (현재는 가안 네이비 #0b3d91 / 오렌지 #f5a623)
- [x] HashRouter 사용 중이므로 서버 측 SPA 폴백 라우트 설정 불요
- [x] 첫 접속 후 DevTools → Application → Cache Storage에서 17개 자산 캐싱 확인

각 단계마다 사용자에게 확인 후 다음 단계 진행.

---

## 14. 배포 정보 (시범운영)

### 14.1 저장소와 URL

| 항목 | 값 |
|---|---|
| **GitHub 저장소** | `https://github.com/monatory/mjc-career-pwa` (Public) |
| **학생용 PWA URL** | `https://monatory.github.io/mjc-career-pwa/` |
| **카톡 OG 카드** | `public/og-card.svg` → Actions에서 `librsvg`로 PNG 변환 후 배포 |
| **운영 주체** | 명지전문대학 학생지원처 AI융합진로지원센터 |

### 14.2 GitHub Pages 자동 배포 워크플로

`.github/workflows/deploy.yml` — main 브랜치 push 시 자동 동작:

```
on: push (main)
  ↓
1) actions/checkout@v4
2) actions/setup-node@v4 (node 20 + npm 캐시)
3) npm ci || npm install
4) node tests/test_engine.js                  ← 회귀 5건
5) node tests/test_analytics.js               ← 회귀 44건
6) GITHUB_PAGES=1 → npm run build             ← vite + PWA
7) librsvg2-bin 설치 → SVG OG 카드 → PNG 변환 → dist/og-card.png
8) actions/upload-pages-artifact@v3
9) actions/deploy-pages@v4                    ← Pages 배포
```

`vite.config.ts`의 `base` 경로:
- CI(GitHub Actions) 빌드: `/mjc-career-pwa/` (Pages 하위 경로)
- 로컬 dev: `/` (변경 없음)

### 14.3 본 운영 전환 시 절차

본 운영 단계에서는 학내 도메인(예: `https://career.mjc.ac.kr/`)으로 옮길 예정. 다음 4개만 변경:

1. `vite.config.ts` — `IS_PAGES_BUILD` 조건문 제거하고 `base = "/"` 고정
2. `.github/workflows/deploy.yml` — Pages 배포 단계를 학내 호스팅으로 교체 (rsync/SFTP 등)
3. `index.html`의 `og:url`과 `og:image` 도메인 갱신
4. `public/manifest.webmanifest`는 상대 경로(`./`) 그대로 두면 자동 대응

학내 SSO(Microsoft Entra ID / Keycloak 등) 연동도 본 운영 시 추가. `src/admin/permissions.ts`의 mock 권한 전환기를 SSO 결과로 교체.

### 14.4 카톡·SNS 공유 메타태그

`index.html`에 등록된 Open Graph + Twitter Card:

| 키 | 값 |
|---|---|
| `og:title` | MJC-CAT · 명지전문대학 학과 적합도 진단 |
| `og:description` | 자유전공 학생을 위한 학과 탐색 진단. 8개 진단축 90문항으로 31개 학과 중 가장 적합한 5개 학과를 안내합니다. |
| `og:image` | `https://monatory.github.io/mjc-career-pwa/og-card.png` (1200×630) |
| `og:site_name` | 명지전문대학 학생지원처 AI융합진로지원센터 |
| `og:locale` | `ko_KR` |

카톡 캐시 갱신: https://developers.kakao.com/tool/clear/og 에 URL 입력.

---

## 15. Firebase Firestore 백엔드 (시범운영)

### 15.1 프로젝트 정보

| 항목 | 값 |
|---|---|
| Firebase 프로젝트 ID | `mjc-career-pwa` |
| 요금제 | Spark (무료) |
| Firestore 위치 | `asia-northeast3` (서울) |
| Analytics | **사용 안 함** (CLAUDE.md §7 외부 분석 금지) |
| Hosting | **사용 안 함** (PWA는 GitHub Pages) |

`firebaseConfig`는 `src/lib/firebase.ts`에 직접 포함됨 (Firebase Web SDK 키는 frontend 노출이 정상 — Security Rules로 보호).

### 15.2 데이터 모델 (Firestore)

```
responses/{anonymousId}
  anonymousId       : crypto.randomUUID() (학번·이름과 무관)
  profile           : StudentProfile JSON (16항목)
  axisScores        : 24개 매칭축 점수
  fits              : 31학과 적합도 중 TOP10만 저장
  counselingNeed    : {score, category, conf_avg, need_avg}
  hits              : calcHitMetrics 결과 (1지망 있을 때만 evaluable=true)
  priority          : classifyCounselingPriority 결과 (HIGH/MEDIUM/LOW)
  undecided         : detectUndecided 결과
  completedAt       : ISO 8601
  schemaVersion     : "1.0-pilot"
  _serverCreatedAt  : Firestore server timestamp
  app               : { env: 'production'|'development' }
```

**학번·이름 절대 저장 안 함**(CLAUDE.md §7.2). 본 운영 전환 시 별도 `students/{studentId}` 컬렉션에 AES-256 암호화하여 보관하고, `responses`는 익명ID만 유지.

### 15.3 저장·조회 함수

| 위치 | 함수 | 용도 |
|---|---|---|
| `src/lib/firebase.ts` | `getApp() / getDb()` | Firebase 초기화 (lazy singleton) |
| `src/lib/firestoreClient.ts` | `saveResponseToFirestore({profile, axisScores, fits, counselingNeed})` | 결과지 진입 시 자동 저장(fire-and-forget) |
| `src/lib/firestoreAdmin.ts` | `fetchAllResponses()` | 관리자 대시보드 전체 fetch |
| `src/lib/firestoreAdmin.ts` | `aggregateKpi / Trend / DeptDistribution / CounselingList / HitSummary` | 클라이언트 사이드 집계 |
| `src/admin/useAdminData.ts` | `useAdminData()` 훅 | 대시보드 로딩·실측/mock 폴백 결정 |
| `src/admin/csvExport.ts` | `exportAllResponsesCsv / exportCounselingCsv` | CSV 다운로드 (UTF-8 BOM, Excel 한글 호환) |

### 15.4 관리자 대시보드 동작

```
권한 선택(mock) → useAdminData() → Firestore 전체 fetch
   ↓ (응답 >= 1건)
실측 데이터로 KPI·시계열·분포·상담군·Hit 자동 집계
   ↓ (응답 0건이거나 fetch 실패)
mockData.ts 가상 데이터로 폴백 (미리보기 모드 안내)
```

CSV 다운로드:
- 종합 현황 → "전체 응답 CSV 다운로드" (모든 16항목 + 결과)
- 상담 필요군 → "CSV 다운로드 (닉네임 + 응답)" (HIGH/MEDIUM 만)

### 15.5 Security Rules (`firestore.rules`)

```
service cloud.firestore {
  match /databases/{database}/documents {
    match /responses/{anonymousId} {
      allow create: if isValidResponse(...);  // 검증 통과 시 허용
      allow read:   if true;                   // ⚠ 시범운영 임시 허용
      allow update, delete: if false;          // 차단
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

`isValidResponse`가 검증하는 항목:
- 필수 키: `anonymousId`, `profile`, `completedAt`, `schemaVersion`
- 문서 ID와 `anonymousId` 일치
- `profile`에 학번·이름·전화·이메일·주민번호 등 **식별 정보 절대 금지**
- 필드 200개 상한, 닉네임 20자 상한

**본 운영 전환 시 필수 강화**:
1. Firebase Anonymous Auth 도입 → `request.auth.uid == anonymousId` 강제
2. 관리자 custom claim (`role:'admin'`) 부여 → read 권한 관리자로 한정
3. `read: if true`를 `read: if request.auth.token.role == 'admin'`로 교체

### 15.6 시범운영 → 본 운영 전환 체크리스트

- [ ] Anonymous Auth 활성화 (Firebase Console → Authentication → Sign-in method)
- [ ] custom claim 부여용 Cloud Function 작성 (관리자 이메일 화이트리스트)
- [ ] `firestore.rules` 강화 후 `firebase deploy --only firestore:rules`
- [ ] `students/{studentId}` 컬렉션 + AES-256 암호화 (학번·이름)
- [ ] 보관 기간 자동 삭제 Cloud Function (졸업 후 3년)
- [ ] Firestore 백업 스케줄 설정
- [ ] Authorized Domains에 학내 도메인 추가

---

## 16. 시범운영 1차 빌드 — 시연 가능 마일스톤 (2026-05-28)

### 16.1 라이브 URL

| 용도 | URL |
|---|---|
| **학생용 PWA** | https://monatory.github.io/mjc-career-pwa/ |
| **관리자 대시보드** | https://monatory.github.io/mjc-career-pwa/#/admin |
| **GitHub 저장소** | https://github.com/monatory/mjc-career-pwa (Public) |
| **Firebase Console** | https://console.firebase.google.com/project/mjc-career-pwa |
| **카톡 OG 카드** | `og:image` 자동 표시 (1200×630 PNG, librsvg 변환) |

### 16.2 학생 흐름 (완성)

```
STEP 1 검사 소개  (#/)
  · 명지전문대학 · AI융합진로지원센터 공통 헤더
  · MJC-CAT 두문자 강조 + 부제
  · 검사 구성 (8축 칩 + 90/+50/31/TOP5 4통계)
  · 안내사항 + 동의 → "다음: 응답자 정보 입력 →"
  · 진행 중인 검사 있으면 "이어서 진행" 모달

STEP 2 응답자 정보 입력  (#/profile)
  · A 기본(필수 5)·B 진로(필수 2+선택 1)·C 배경(선택 5)·D 학과 지망(선택 3)
  · 필수 입력 진행 카운터 + 그라데이션 막대
  · 라디오 그룹 균등 분배, 4 조건부 노출, 1·2·3지망 중복 방지
  · 익명 활용 동의 (계획서 XI장 문구)

STEP 3 진단 검사  (#/exam → #/stage2)
  · 1차 90문항: 진단축 한국어 라벨 배지 + 문항
  · 5점 척도 76px 터치, 자동 진행 500ms
  · "응답 N / 90 · X개 남음 · 다음 미응답으로 ↦" 보조 링크
  · 모두 응답 즉시 "1차 검사 제출 →" 그라데이션 강조
  · 키보드: 1~5 응답 · ← 이전 · → 다음 · ? 미응답 이동
  · 응답 5건 미만일 때만 "응답자 정보 수정" 링크

결과지  (#/result)
  · "검사 완료 · 결과지" 인디케이터
  · 상담 필요도 SVG 반원 게이지(70+ 빨강·40+ 주황·이하 초록)
  · 희망학과와의 비교 카드 (상담 필요도 직후)
      1·2·3지망 시스템 순위·적합도, TOP5 강조, 4단계 톤 상담 권유
  · 진단축 8개 레이더 + 점수 표 펼치기 토글
  · 추천 TOP 5 — 1위 "최적합 학과" 크라운 + 그라데이션 + 큰 rank
  · 비교탐색 학과 6~8위 (details 접기 — 클릭 모달)
  · 진로·취업 상담 신청 CTA (70+ 시 빨강 강조)
  · 다시 진단(ConfirmModal) / PDF 저장·인쇄(window.print + @media print 전용 문서, §21)
  · 결과지 진입 시 Firestore 자동 저장 (익명ID, fire-and-forget)
```

### 16.3 관리자 대시보드 (`/admin`)

#### 진입 방법
1. **URL 직접**: `https://monatory.github.io/mjc-career-pwa/#/admin`
2. **푸터 미니 링크**: 학생 측 어느 화면이든 푸터 맨 아래 작은 회색 "관리자" 텍스트

첫 진입 시 권한 선택기(센터·교지원·학과장 3카드) — `sessionStorage`에 저장되어 재진입 시 자동 적용. 사이드바 상단 "권한 전환" 버튼으로 재선택.

#### 7개 섹션 + 권한별 노출

| 섹션 | CENTER | EDU_SUPPORT | DEPT_HEAD |
|---|---|---|---|
| 종합 현황 (KPI 6 + 14일 AreaChart) | ✓ | ✓ | ✓ |
| 응답자 통계 (11종 분포) | ✓ | ✓ | — |
| 학과별 희망학생 명단 (1·2·3지망) | ✓ | — | ✓ (본인 학부) |
| 학과별 추천 분포 (BarChart + 표) | ✓ | — | ✓ (본인 학부) |
| 상담 필요군 자동 추출 (rule_a/b/c) | ✓ | — | — |
| 추천 적중률 Hit@1/3/5 | ✓ | — | — |
| 만족도·자유응답 (본 구현 전 mock) | ✓ | ✓ | — |

#### CSV 다운로드 4종 (UTF-8 BOM, Excel 한글 호환)

| 함수 | 결과 |
|---|---|
| `exportAllResponsesCsv` | 전체 응답 — 16항목 + 결과 + Hits |
| `exportCounselingCsv` | 상담 권장 학생 (HIGH/MEDIUM 한정) |
| `exportProfileStatsCsv` | 응답자 통계 11종 분포 |
| `exportPreferredStudentsByDeptCsv` / `exportSingleDeptPreferredCsv` | 학과별 희망학생 명단 (상담 초기 자료) |

#### 데이터 출처 표시
화면 상단 배너 — **live**(초록·실측 N명) / **preview**(주황·미리보기 mock) / **loading**(회색)

### 16.4 데스크탑 우선 디자인 (max-width 1440px)

- 사이드바 240px + 그라데이션 권한 카드 + 활성 메뉴 좌측 파란 막대
- KPI 카드 200px min · 1.9rem 800w 큰 숫자 · hover 부양 · warn/danger 톤
- AreaChart 그라데이션 fill, BarChart radius 4px
- 테이블 sticky header · UPPERCASE · hover 강조 · `tabular-nums`
- 1024 / 720 / 400px 3단계 반응형 (모바일 토글 사이드)

### 16.5 시드 데이터 (시연용)

```bash
node tests/seed_firestore.js          # 가상 학생 5명 등록
node tests/seed_firestore.js --clean  # seed- 접두사 ID 일괄 삭제
```

5명 시나리오 다양성:
- 민서 IT 지향 — 컴퓨터공학과 1지망 / 시스템 TOP1 AI게임소프트웨어학과 (TOP3 일치, MEDIUM)
- 지훈 휴먼 지향 — 유아교육과 1지망 / 시스템 TOP1 사회복지과 (TOP3 일치, LOW)
- 수아 ART 지향 — 경영학과 1지망(미스매치) / TOP1 뷰티매니지먼트과 (**HIGH** rule_a+b+c)
- 건우 기계 지향 — 기계공학과 1지망 == TOP1 (완벽 일치, LOW)
- 예린 항공 지향 — 1지망 미입력 + NEED 높음 (MEDIUM rule_a)

---

## 17. CI/CD 인프라

### 17.1 GitHub Actions 워크플로

`.github/workflows/deploy.yml` — main 브랜치 push 시 자동 빌드·배포:

```
checkout → setup-node 20 + npm cache → npm ci →
  test_engine.js (5건) → test_analytics.js (44건) →
  GITHUB_ACTIONS=true npm run build (= tsc -b && vite build) →
  librsvg2-bin 설치 → og-card.svg → og-card.png 1200×630 →
  upload-pages-artifact → deploy-pages
```

### 17.2 빌드 인계 — 반드시 지킬 점 (2026-05-28 9회 연속 실패 사고 회고)

**npm run build를 로컬에서 통과시킨 뒤에만 commit + push.**

`npx vite build`만 돌리면 TypeScript 단계(`tsc -b`)를 건너뛰어 strict 타입 에러를 발견하지 못한다. GitHub Actions는 `npm run build` 전체를 돌리므로 거기서 처음 에러가 드러나고, 그 사이의 모든 push가 라이브에 반영되지 않는다.

```bash
# 안전한 사전 검증
npm run build
node tests/test_engine.js
node tests/test_analytics.js
```

세 가지 모두 초록색이면 push.

특히 `lib/analytics.js`처럼 .js 파일을 .ts 코드에서 import할 때는 반드시 대응되는 `.d.ts` 파일이 있어야 strict 환경에서 안전. (`lib/recommendation_engine.d.ts`, `lib/analytics.d.ts`)

### 17.3 PWA 자동 갱신 정책

`vite.config.ts` workbox 옵션:
- `registerType: "autoUpdate"`
- `skipWaiting: true` + `clientsClaim: true` — 새 SW가 즉시 활성화, 한 번의 새로고침으로 새 빌드 적용

사용자 측에서 옛 캐시가 강하게 잡혀 있는 경우(시연 직전 등):
- 시크릿 창(Ctrl+Shift+N)으로 검증
- 또는 DevTools → Application → Storage → "Clear site data" → 새로고침

---

## 18. 보류 작업 (자료·결정 필요)

| # | 작업 | 필요 자료/결정 |
|---|---|---|
| 보류-1 | **단계 B** — 신규 3개 학과 추가 (청소년교육상담·AI미디어디자인·뷰티 메이크업네일). 절차는 `docs/STAGE_B_GUIDE.md` | 3개 학과 가이드북 PDF 또는 학과장 회신 |
| 보류-2 | 학과별 홈페이지 URL — `department_cards.json`에 `homepage_url` 필드 | 학과별 회신 |
| 보류-3 | PWA 아이콘 MJC CI 교체 | 공식 CI 자산 |
| 보류-4 | 만족도 폼 본 구현 (결과지 PDF 저장 후 5점 척도 4문항) | 계획서 Ⅸ ⑩ |
| 보류-5 | 결과지 PDF 헤더·푸터 — 헤더(센터명·발급일)·푸터(법적 문구) 완료(2026-05-29, §21). 남은 항목: 학교 로고(보류-3 CI 자산 후)·페이지 번호(현재 브라우저 인쇄 옵션 의존) | CI 자산 |
| 보류-6 | 본 운영 전환 — Anonymous Auth + custom claims + 학내 도메인 매핑 | 학내 SSO 일정 |
| 보류-7 | 수강계획서 "상담 신청" 실연동 (현재 시범운영 alert) | 상담 접수 채널 결정 |
| 보류-8 | `validateCreditRange` 권장 학점 범위 학사기준 확정 (현재 12~23 임시) | 학사일정·학칙 |
| 보류-9 | CI(`deploy.yml`)에 `tests/test_courses.js`(44건) 추가 — 현재 test_engine·test_analytics만 실행, 1학기 교과 모듈 회귀 미보호 | — (즉시 적용 가능) |
| 보류-10 | 수강계획서(/plan) PDF에도 결과지와 동일한 문서 머리말·푸터 통일 (결과지는 §21 완료) | — (즉시 적용 가능) |

---

## 19. 이 문서 유지보수

이 `CLAUDE.md`는 **프로젝트의 살아있는 명세**. 다음과 같은 변경이 있으면 반드시 갱신:

- 학과 추가·삭제 (예: 메이크업&네일전공 추가 → 단계 B, `docs/STAGE_B_GUIDE.md` 동시 갱신)
- 매칭축/진단축 변경
- DNA 가중치 학과장 보정 완료
- 적합도 공식 변경 (절대 없을 예정)
- 신규 데이터 파일 추가
- 진입 가능성 라벨(§3.8)·학과명 정책(§3.9) 변경
- 1학기 추천 교과·자격증 요건 데이터 갱신 (§4.5~4.7)
- 배포 URL·도메인 변경, 백엔드 도입 (Firebase 등)
- Firestore 데이터 모델 / Security Rules 변경

문서가 코드보다 뒤처지면 다음 Claude Code 세션의 컨텍스트가 깨진다.

---

## 20. 검사 후 부가 기능 — 1학기 추천 교과 모듈 (2026-05-29)

진단 결과지를 받은 학생에게 **"그래서 1학기에 어떤 과목을 들으면 좋은가"**까지 안내하는 후속 모듈. 추천 알고리즘(DNA·적합도 공식)에는 **일절 영향 없음** — 결과지 뒤에 붙는 안내·계획 레이어다. 데이터는 §4.5~4.7, 헬퍼는 §5.4(`lib/courses.js`), 진입 가능성·학과명 정책은 §3.8~3.10.

### 20.1 결과지(/result) 확장

```
결과지 상단
  └ 자격증 경고 배너 (TOP1~3 학과 중 자격증 요건 학과가 있으면)
       CertificationBanner placement="top"  ← certInTop3 로직

TOP5 / 비교탐색 카드
  └ 진입 불가 학과(NOT_ACCESSIBLE)면 "별도 모집 학과" 라벨 표시
       isFreeMajorAccessible(code, accessibilityData) === false

학과 상세 모달 (DepartmentDetailModal)
  ├ 헤더: 진입 가능성 라벨 (ACCESSIBLE / NOT_ACCESSIBLE 모두 표기)
  ├ 진입 가능 학과: 📚 1학기 추천 교과 섹션
  │     ⭐ = strongly_recommended, 가이드북 표기명·출처 각주
  ├ 진입 불가 학과: dept-modal__not-accessible 안내 박스 (교과 비노출)
  └ 자격증 경고 배너 (TOP4~8 학과면 모달 안에서만)
        CertificationBanner placement="modal"  ← certInModal = !isInTop3 && 자격증요건

상담 신청 CTA 카드  id="counseling-cta"  ← 배너 버튼이 스크롤 타깃으로 사용
  └ "📋 수강 계획 세우기 →" 버튼(.btn-plan) → /plan 이동
```

**자격증 배너 중복 방지**: `fit.rank <= 3`이면 결과지 상단(top), 4~8위면 모달(modal). `isInTop3` 기준으로 배타 분리되어 같은 학과가 두 곳에 동시에 뜨지 않는다.

### 20.2 수강 계획서(/plan)

`src/student/Plan.tsx`. 결과지 캐시(`mjc_cat_result`)가 있어야 진입. 없으면 **빈 안내 카드**(자동 리다이렉트 대신)로 "검사 시작하기" 유도 — QR로 `/plan`만 받은 학생 혼란 방지.

```
섹션 1 · 자유전공 공통       전용 2 + 교양필수 2 (기본 체크, 인성채플은 P/NP=0학점)
섹션 2 · 교양 강력추천       택1 권장 (첫 항목만 기본 체크)
섹션 3 · 희망 학과 전공탐색   TOP5 중 진입 가능 학과만(진입 불가 제외)
                            TOP1·2 펼침 / TOP3·4·5 접힘, ⭐ 강력추천 배지
자격증 배너                  TOP5 진입 가능 학과 중 자격증 요건 학과 있으면 노출
누적 학점(하단 고정)         calcSelectedCredits → validateCreditRange
                            TOO_LOW/OK/TOO_HIGH 3색 톤 (권장 12~23)
액션                        📄 PDF로 저장 / 🖨️ 인쇄 (window.print + @media print)
                            💬 상담사에게 보내기 (시범운영: alert 요약, 보류-7)
```

- 선택 상태는 `sessionState.savePlanState/loadPlanState`로 `mjc_cat_plan`에 자동 저장. 재진입 시 복원.
- 진입 불가 4개 학과는 §3.8 정책대로 수강계획서에서 **아예 노출하지 않음**(직접 진입 경로 없음).
- PDF는 jsPDF가 아니라 **`window.print()` + `@media print` CSS** — 한글 폰트 임베딩 문제 회피. `.no-print` 클래스로 버튼·토글 인쇄 제외.

### 20.3 회귀 검증

```bash
node tests/test_courses.js     # lib/courses.js 5함수 44건
npm run build                  # tsc -b 통과 (courses.d.ts 동반)
```

데이터 무결성: `department_courses.json`(27) = 진입 가능 27개, NOT_ACCESSIBLE 4개는 교과에서 제외, accessibility 31개 전체 등재 — 교차 검증 통과(2026-05-29).

---

## 21. 결과지 PDF·인쇄 (window.print 전용 문서, 2026-05-29)

결과지 PDF를 기존 **html2canvas 이미지 캡처** 방식에서 **`window.print()` + `@media print` 전용 문서** 방식으로 전환했다. 수강계획서(/plan)와 동일한 방식으로 일원화.

### 21.1 전환 배경

| 항목 | 기존(html2canvas+jsPDF) | 현재(window.print) |
|---|---|---|
| 텍스트 | 이미지(선택·검색 불가) | 실제 텍스트(선택·검색 가능) |
| 파일 크기 | 큼(고해상도 이미지) | 작음 |
| 접힌 섹션 | 캡처 시 누락(비교탐색 등) | beforeprint가 모두 펼침 |
| 버튼·UI | 화면째 찍혀 포함 | `.no-print`로 자동 제외 |
| 한글 | 이미지라 보존되나 흐림 가능 | 폰트 그대로(임베드 문제 없음) |
| 번들 | jsPDF+html2canvas ≈ +717KiB | **두 의존성 제거**(precache 17→14항목, 1846→1129KiB) |

### 21.2 구현 (`src/student/Result.tsx` + `global.css`)

- **트리거**: "PDF로 저장 / 인쇄" 버튼 → `window.print()` (별도 다운로드 라이브러리 없음).
- **접힌 details 자동 펼침**: `beforeprint`에서 `main.page details`를 모두 `open`, `afterprint`에서 원복. 버튼 인쇄와 Ctrl+P 모두 적용.
- **인쇄 전용 머리말**(`.print-only .print-doc-head`): 센터명 · "MJC-CAT 학과 적합도 진단 결과지" · 닉네임 · 발급일. 화면에선 `.print-only{display:none}`.
- **인쇄 전용 꼬리말**(`.print-doc-foot`): 법적 문구(계획서 Ⅸ⑧)를 `position:fixed; bottom:0`으로 **매 페이지 하단** 반복.
- **숨김(.no-print 외)**: `.cert-banner__cta`, `.top-card__more`(자세히 보기) 등 PDF에서 무의미한 인터랙션 요소.
- **색 보존**: `.page *`에 `print-color-adjust: exact`(게이지·배지·1위 강조 색).
- **페이지 나눔**: `.card / .top-card / 표`에 `break-inside: avoid`. `@page { margin: 14mm 12mm 18mm }`.

### 21.3 앱 내 인쇄 미리보기 (body.print-preview, 2026-05-29)

브라우저 인쇄 대화상자로 넘어가기 전에 **앱 화면에서 인쇄 문서 모양을 확인**하는 미리보기. 모바일에서 브라우저 기본 미리보기가 작고 답답한 점을 보완.

- 결과지 버튼 행: `다시 진단 / 미리보기 / PDF·인쇄` 3개. "미리보기" → `previewOpen` 상태 토글.
- 미리보기 진입 시 `document.body.classList.add("print-preview")` → `@media print`와 동일한 변환을 화면에서 재현(헤더·버튼 숨김, print-only 머리말/꼬리말 노출, 접힌 details 펼침).
- 문서는 **A4 96dpi 폭(794px) 흰 카드**를 회색 배경 위에 띄우고, 상단에 고정 툴바(`인쇄·PDF 저장` / `✕ 닫기`). 모바일(≤840px)에선 좌우 여백 축소.
- 닫기 또는 **ESC**로 종료 → body 클래스 제거 + 펼쳤던 details 원복.
- 미리보기 상태에서 "인쇄·PDF 저장" 클릭 시 `@media print`가 `body.print-preview .page`의 카드 스타일(폭·여백·그림자)을 `!important`로 무력화해 정상 A4 출력.

### 21.4 남은 항목 (보류-5)

- **학교 로고**: 머리말은 현재 텍스트(센터명)만. CI 자산 입수(보류-3) 후 로고 이미지 추가.
- **페이지 번호**: CSS `@page` 카운터는 브라우저 호환이 불안정하여 미적용. 현재는 브라우저 인쇄 다이얼로그의 머리말/꼬리말 옵션에 의존.

---

## 22. 시연(Demo) 자료 + `demo` 스킬 (2026-05-30)

시연 영상·발표 자료를 **시스템 본체(`data/`·`lib/`·`src/`)와 분리**해 별도 폴더에서 관리한다. "시연 엠디"라는 호출의 실체는 `demo` 스킬이다.

### 22.1 구조

```
.claude/skills/demo/SKILL.md   ← 스킬 정의 (호출 키워드 + 작업 지침)
docs/demo/
  README.md                    ← 매니페스트 (시연 자료 목록·상태) = 단일 진실 출처
  notebooklm_demo_3min.md      ← NotebookLM Video Overview용 3분 소스 (7 SCENE)
  assets/                      ← 스크린샷 팩 6장(PNG) + 캡처법 README
  (예정) cue_sheet.md · demo_1min.md · demo_5min.md
tests/capture_demo.mjs         ← 스크린샷 자동 캡처 (puppeteer-core + 시스템 Chrome headless)
```

### 22.4 스크린샷 팩 (`docs/demo/assets/`)

핵심 화면 6장을 실제 PNG로 캡처해 둔다. 발표 슬라이드·NotebookLM 시각 보조·카톡 첨부용.

- `01_step1_intro` · `02_step2_profile` · `03_step3_exam` · `04_result_full` · `05_plan` · `06_admin`
- **재생성**: `npm run dev` 후 `npm i puppeteer-core --no-save && node tests/capture_demo.mjs`.
  시스템 Chrome/Edge를 headless로 구동해 `assets/*.png` 덮어씀. `--no-save`라 `package.json`·CI 빌드 무영향.
- 결과지/수강계획서(04·05)는 `seed_firestore.js`의 "민서"(IT 지향) 세션을 sessionStorage에 주입해 캡처(엔진 공식 무변경). 관리자(06)는 실측 Firestore 데이터.

### 22.2 호출

- 사용자가 **"시연 엠디" · "시연 영상" · "데모 자료" · `/demo`** 라고 하면 `demo` 스킬이 발동.
- 발동 시 항상 `docs/demo/README.md`(매니페스트)를 먼저 읽고, 그 표를 기준으로 작업.
- 새 시연 파일을 추가하면 매니페스트 표에 한 줄 추가가 규칙.

### 22.3 분리 원칙

- 이 스킬은 **시연 산출물(보여주기 레이어)만** 만든다. 시스템 본체 변경이 필요하면
  일반 작업으로 전환하고 사용자에게 알린다(시연 자료는 `npm run build` 회귀 대상 아님).
- 시연 자료의 수치·URL·기능 설명은 루트 `CLAUDE.md`와 실제 코드를 진실 기준으로 삼는다
  (과장·미구현 "완성" 표기 금지).
- 영상 자동 생성 소스는 **SCENE 단위 + 화면 설명 + 내레이션** 구조 유지(NotebookLM 적합 형식).
