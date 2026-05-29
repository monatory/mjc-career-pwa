# 단계 B 가이드 — 신규 3개 학과 추가 절차

> 이 문서는 **자료 입수 후** 신규 3개 학과를 데이터에 추가할 때 그대로 따라 하면 되는 체크리스트입니다.
> 작성: 2026-05-29 (작업 26 / CLAUDE.md §3.10·보류-1 연계)
> 전제: 추천 알고리즘(공식)·매칭축 24개·진단축 8개는 **변경하지 않습니다.** 학과 데이터만 추가합니다.
> 의심나면 멈추고 사용자(진로취업팀)에게 보고 — `CLAUDE.md §2` 절대 변경 금지 영역 준수.

---

## 0. 추가 대상 3개 학과

| 코드 | 학부(school) | 우리 시스템명 | 비고 |
|---|---|---|---|
| `BIZ_YOUTH` | 경영휴먼라이프학부 | 청소년교육상담과 | 자격증 데이터는 이미 선점됨 (§5 참조) |
| `ART_AIMD` | 예술건강학부 | AI미디어디자인학과 | — |
| `ART_BTY_MN` | 예술건강학부 | 뷰티매니지먼트과 (메이크업·네일전공) | 계획서 §3.1 "누락 1건" 학과 |

- 추가 후 학과 수: **31 → 34개**. (DNA·문항·테스트의 "31개" 가정을 모두 34로 갱신)
- 3개 모두 자유전공 **진입 가능(ACCESSIBLE)** 으로 분류.
- 우리 시스템명을 정식 명칭으로 유지(`CLAUDE.md §3.9`). 가이드북 표기가 다르면 `name_in_guidebook`으로 병기.

---

## 1. 자료 입수 시 학과별로 추출할 9개 항목

각 학과 가이드북 PDF에서 다음 9개를 뽑아 메모해 두면 이후 파일 편집이 기계적입니다.

1. **정식 학과명 / 가이드북 표기명** (둘이 다르면 둘 다)
2. **소속 학부** (위 표 확정값)
3. **수업 연한** — 2년제 / 3년제 (`duration_years`)
4. **인재상 / 한 줄 소개** (`intro_short`, `talent_type`)
5. **대표 직무 TOP3** (`top3_jobs`)
6. **취득 가능 자격증 목록** (`certifications`, 카드용 텍스트)
7. **자격증 1학기 필수 과목** — 1학기에 안 들으면 자격증이 막히는 과목이 있는지 (있으면 §5)
8. **1학기 추천 교과 목록** — 과목명·학점·강력추천(●) 여부 (`department_courses.json`)
9. **24개 매칭축 가중치** — 학과 성격을 0~5점(0.5 단위)으로 평가 (§3)

> **오타 주의**: 가이드북에 오타로 의심되는 표기(예: "프론트앤트"↔"프론트엔드")가 있어도 **임의 수정 금지**. 원문 그대로 입력하고 사용자에게 보고. (`CLAUDE.md` 작업 원칙)

---

## 2. 편집할 파일 5개 (+ 변경 금지 1개)

| 파일 | 작업 | 학과당 |
|---|---|---|
| `data/departments_dna.json` | DNA 24축 가중치 + `primary_axes` + `max_score` 추가 | 필수 |
| `data/department_cards.json` | 인재상·TOP3·자격증 카드 텍스트 추가 | 필수 |
| `data/department_courses.json` | 1학기 추천 교과 추가 | 필수 (진입 가능) |
| `data/departments_accessibility.json` | `"ACCESSIBLE"` 라벨 추가 | 필수 |
| `data/certification_requirements.json` | `BIZ_YOUTH` 플래그 해제 / 신규 자격증 학과면 추가 | 조건부 |
| `data/question_bank.json` | **변경 금지** — 240문항·매칭축은 그대로 | — |

문항(`question_bank.json`)을 건드리지 않는 이유: 매칭축 24개는 그대로이고, 신규 학과의 DNA는 기존 24축 위에서 표현되므로 문항 추가가 불필요합니다. (시범운영 변별도 분석 전까지 문항 보정 금지 — `CLAUDE.md §2`)

---

## 3. `departments_dna.json` 추가 (가장 신중하게)

### 3.1 24개 매칭축 (순서·코드 고정)

```
SW · AI · GAME · SEC · NET · SYS              (IT 6)
HW · EMB · MECH · ELEC                          (HW 4)
CIVIL · INDUST                                  (공간산업 2)
BIZ · ACC · ADMIN · SERVICE · LANG              (경영서비스 5)
EDU · WELFARE                                   (휴먼 2)
DESIGN · CONTENT · BEAUTY                       (예술콘텐츠 3)
HEALTH · MED                                    (보건체육 2)
```

### 3.2 가중치 기준 (0~5점, 0.5 단위)

| 점수 | 의미 |
|---:|---|
| 5.0 | 학과의 핵심 정체성 (전공의 본질) |
| 4.0~4.5 | 주력 역량 (`primary_axes`에 포함) |
| 3.0~3.5 | 중요하게 다룸 |
| 1.5~2.5 | 부분적으로 관련 |
| 0~1.0 | 거의/전혀 무관 |

> 점수는 **학과장 검토 영역**입니다. 개발자가 임의 확정하지 말고, 1차 초안을 만들어 사용자→학과장 검토 루트로 보고하세요. (`CLAUDE.md §2`)

### 3.3 추가 형식 (`departments` 배열에 객체 1개 push)

```json
{
  "code": "ART_AIMD",
  "school": "예술건강학부",
  "name": "AI미디어디자인학과",
  "dna": {
    "SW": 2.5, "AI": 4.0, "GAME": 1.5, "SEC": 0, "NET": 0, "SYS": 0,
    "HW": 0, "EMB": 0, "MECH": 0, "ELEC": 0, "CIVIL": 0, "INDUST": 0,
    "BIZ": 1.0, "ACC": 0, "ADMIN": 0, "SERVICE": 1.0, "LANG": 0,
    "EDU": 0, "WELFARE": 0,
    "DESIGN": 5.0, "CONTENT": 4.5, "BEAUTY": 0,
    "HEALTH": 0, "MED": 0
  },
  "primary_axes": ["DESIGN", "CONTENT", "AI"],
  "max_score": 0.0
}
```

위 숫자는 **형식 예시일 뿐 실제 값 아님** — 가이드북 기반으로 채우세요. 24개 키를 **모두** 적어야 합니다(0도 명시).

### 3.4 파생값 2개 자동 계산

`dna`를 채운 뒤 아래 스크립트로 `primary_axes`(가중치 ≥ 4.0)와 `max_score`(Σ가중치 × 5)를 다시 산출해 덮어쓰세요. 수기 계산 실수를 막습니다.

```bash
node -e "
const fs=require('fs');
const p='./data/departments_dna.json';
const d=JSON.parse(fs.readFileSync(p,'utf-8'));
for(const dept of d.departments){
  const sum=Object.values(dept.dna).reduce((a,b)=>a+b,0);
  dept.max_score=Math.round(sum*5*10)/10;
  dept.primary_axes=Object.entries(dept.dna).filter(([k,v])=>v>=4.0).map(([k])=>k);
}
fs.writeFileSync(p, JSON.stringify(d,null,2)+'\n');
console.log('recomputed', d.departments.length, 'depts');
"
```

> `dna` 키 개수가 24가 아니거나 0~5 범위를 벗어나면 즉시 멈추고 점검. `max_score`는 적합도 공식의 분모이므로 틀리면 그 학과 점수가 통째로 왜곡됩니다.

---

## 4. `department_cards.json` · `department_courses.json` · `departments_accessibility.json`

### 4.1 `department_cards.json` (배열에 객체 추가)

```json
{
  "code": "ART_AIMD",
  "school": "예술건강학부",
  "name": "AI미디어디자인학과",
  "intro_short": "...",
  "talent_type": "...",
  "top3_jobs": "1. ... 2. ... 3. ...",
  "certifications": "..."
}
```

### 4.2 `department_courses.json` (`departments` 객체에 키 추가)

진입 가능 학과이므로 1학기 추천 교과를 반드시 추가합니다(없으면 결과지·수강계획서에서 빈 화면).

```json
"ART_AIMD": {
  "name_in_guidebook": "AI미디어디자인학과",
  "duration_years": 2,
  "courses": [
    { "name": "디자인기초", "credits": 3, "strongly_recommended": true },
    { "name": "...", "credits": 3, "strongly_recommended": false }
  ]
}
```

- `credits` 정수, P/NP 과목은 `credits: 0` + `is_pass_fail: true`.
- 가이드북 ● 표시 과목은 `strongly_recommended: true` (결과지에서 ⭐).
- 공통 교과(`common_courses`)는 전 학과 공유이므로 학과별로 다시 적지 않습니다.

### 4.3 `departments_accessibility.json` (`accessibility` 객체에 키 추가)

```json
"BIZ_YOUTH": "ACCESSIBLE",
"ART_AIMD": "ACCESSIBLE",
"ART_BTY_MN": "ACCESSIBLE"
```

---

## 5. `certification_requirements.json` (조건부)

- **`BIZ_YOUTH`**: 이미 자격증 데이터(평생교육사·청소년지도사)가 들어 있고 `pending_dept_data: true` 플래그만 붙어 있습니다. 학과 본체 데이터를 추가한 뒤 **`pending_dept_data` 줄만 삭제**하면 됩니다. (자격증 과목 텍스트가 가이드북과 다르면 그때 보정)
- **`ART_AIMD` / `ART_BTY_MN`**: 1학기에 안 들으면 자격증이 막히는 과목이 있을 때만 추가. 없으면 등록하지 않습니다(일반 학과 = 배너 없음).

```json
// BIZ_YOUTH — 본체 추가 후 이 줄만 삭제
"pending_dept_data": true
```

---

## 6. `tests/test_engine.js` 시나리오 1건 추가

신규 학과가 의도대로 추천되는지 회귀로 고정합니다. 기존 5명과 같은 형식으로, **그 학과 DNA에 강하게 맞는 24축 성향 프로필**을 만들어 TOP5에 그 학과가 들어오는지 검증하는 시나리오 1건을 추가하세요.

```js
// 예: AI미디어디자인학과를 노리는 학생
{
  name: "디자인 지향 학생",
  profile: { DESIGN: 5, CONTENT: 5, AI: 4 /* 나머지 낮게 */ },
  expectTop5: "ART_AIMD",
}
```

`expectTop5` 학과가 TOP5에 없으면 DNA 가중치를 재검토(개발자가 임의로 점수를 올리지 말 것 — 학과 성격을 반영했는지 점검).

---

## 7. 검증 → 커밋 (CLAUDE.md §17.2 준수)

세 가지가 모두 초록색일 때만 commit + push:

```bash
npm run build                  # tsc -b 까지 — strict 타입 통과 확인 (필수)
node tests/test_engine.js      # 회귀 5건 + 신규 시나리오
node tests/test_analytics.js   # 44건
node tests/test_courses.js     # 1학기 교과 헬퍼 44건
```

데이터 교차 검증(추가 직후 1회):

```bash
node -e "
const dna=require('./data/departments_dna.json');
const acc=require('./data/departments_accessibility.json');
const courses=require('./data/department_courses.json');
const cards=require('./data/department_cards.json');
const dnaCodes=dna.departments.map(d=>d.code);
console.log('DNA', dnaCodes.length, '| accessibility', Object.keys(acc.accessibility).length, '| cards', cards.length);
const missAcc=dnaCodes.filter(c=>!acc.accessibility[c]);
const missCard=dnaCodes.filter(c=>!cards.find(x=>x.code===c));
const accDepts=dnaCodes.filter(c=>acc.accessibility[c]==='ACCESSIBLE');
const missCourse=accDepts.filter(c=>!courses.departments[c]);
console.log('accessibility 누락:', missAcc.join(',')||'(none)');
console.log('cards 누락:', missCard.join(',')||'(none)');
console.log('진입가능인데 교과 누락:', missCourse.join(',')||'(none)');
"
```

세 줄 모두 `(none)`이어야 정상.

---

## 8. 문서 갱신 (마지막)

학과를 추가했으면 `CLAUDE.md`도 같은 커밋에서 갱신 (§19 살아있는 명세 원칙):

- §1 / §3.1 — "31개" → "34개" (본문 곳곳의 학과 수)
- §3.10 — 단계 B 보류 항목에서 추가 완료한 학과 제거
- §4 — 데이터 파일 표의 학과 수(`department_courses.json` 27→, `departments_accessibility.json` 31→34)
- §12 — 진행 현황에 "단계 B 학과 추가" 행 추가
- §18 — 보류-1에서 추가 완료 학과 제거 (3개 모두 끝나면 보류-1 삭제)
- `data/dna_matrix.csv` / `data/questions.csv` 참조용 CSV도 재생성(있으면)

---

## 부록 — 단계 B 빠른 순서 요약

```
1. PDF에서 학과당 9개 항목 추출 (§1)
2. departments_dna.json — dna 24축 채우기 → 스크립트로 primary_axes·max_score 재계산 (§3)
3. department_cards.json — 카드 텍스트 (§4.1)
4. department_courses.json — 1학기 교과 (§4.2)
5. departments_accessibility.json — "ACCESSIBLE" (§4.3)
6. certification_requirements.json — BIZ_YOUTH 플래그 해제 / 신규 자격증 학과 (§5)
7. tests/test_engine.js — 시나리오 1건 (§6)
8. npm run build + 테스트 3종 + 교차검증 (§7)
9. CLAUDE.md 갱신 후 커밋 (§8)
```
