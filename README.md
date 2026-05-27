# 명지전문대학 자유전공 학생 학과추천 진단 PWA

자유전공 학생이 모바일 QR로 접속해 약 20~25분 진단 응답 후, 본교 **31개 학과 중 본인에게 가장 적합한 5개 학과**를 적합도 점수와 함께 안내받는 학내 디지털 진로 진단 시스템.

- **주관**: 명지전문대학 학생지원처 AI융합진로지원센터
- **운영 예정**: 2027학년도 1차 모델 가동, 학기말 환류 → 2차 보정모델 고도화
- **법적 성격**: 학과 「배정」이 아닌 「탐색·상담 지원」 도구. 추천 결과는 학생의 학과 선택을 위한 참고자료로만 활용.

---

## 빠른 시작 (Claude Code)

이 프로젝트는 [Claude Code](https://docs.claude.com/en/docs/agents-and-tools/claude-code) 환경에서 개발하는 것을 전제로 정리되어 있습니다.

### 첫 세션 시작 절차

1. 이 폴더에서 터미널 열고 `claude` 실행
2. **`START_HERE.md`** 내용을 그대로 복사해 Claude Code 첫 메시지로 붙여넣기
3. Claude Code가 `CLAUDE.md`를 자동 로딩하고 컨텍스트를 잡은 뒤, 데이터 검증부터 1차 검사 화면 작성까지 단계별 진행

### 처음 사용자에게 권장 검토 순서

처음 프로젝트를 받았다면 다음 순서로 폴더 내용을 확인하세요:

1. **`CLAUDE.md`** — 프로젝트 명세서 (개발 시 항상 참조하는 단일 진실 공급원)
2. **`docs/dna_review.md`** — 31개 학과 DNA 가중치 + 근거 (가이드북 인재상·TOP3·자격증)
3. **`docs/questions_review.md`** — 240문항 전체 + 5명 가상 학생 시뮬레이션 결과
4. **`docs/dna_review.xlsx`** — 학과장 검토 회람용 워크북 (5시트)
5. **`docs/questions_review.xlsx`** — 문항 검토용 워크북 (7시트)

---

## 프로젝트 구조

```
mjc-career-pwa/
├── CLAUDE.md                       # Claude Code 매 세션 자동 로딩 컨텍스트 (★ 핵심)
├── README.md                       # 본 파일
├── START_HERE.md                   # Claude Code 첫 메시지로 복붙할 시작 프롬프트
│
├── data/                           # PWA 코드가 직접 import할 데이터 (read-only)
│   ├── departments_dna.json        # 31학과 × 24매칭축 DNA 가중치
│   ├── department_cards.json       # 결과지·학과상세 화면 텍스트
│   ├── question_bank.json          # 240문항 + 매칭축 매핑 + 적응형 메타
│   ├── dna_matrix.csv              # 엑셀 호환 사본 (참조용)
│   └── questions.csv               # 엑셀 호환 사본 (참조용)
│
├── lib/
│   └── recommendation_engine.js    # 적합도 산출 엔진 (계획서 Ⅷ장 공식 그대로)
│
├── docs/                           # 검토·참고 자료 (코드가 import하지 않음)
│   ├── dna_review.md
│   ├── questions_review.md
│   ├── dna_review.xlsx
│   ├── questions_review.xlsx
│   ├── source_pdfs/                # 31개 학과 가이드북 PDF 원본
│   └── project_plan.docx           # 원본 계획서
│
├── src/                            # PWA 개발 작업공간 (현재는 가이드만)
│   ├── student/                    # 학생용 진단 화면 (1차 작업 대상)
│   └── admin/                      # 관리자 대시보드 (2차 작업 대상)
│
└── tests/
    └── test_engine.js              # 적합도 엔진 회귀 테스트 (5명 가상 학생)
```

---

## 데이터 검증된 사항

지금까지 정리된 데이터는 **5명의 가상 학생 시나리오로 end-to-end 시뮬레이션 검증을 통과**했습니다.

| 학생 성향 | TOP1 추천 학과 (적합도) | 검증 결과 |
|---|---|---|
| IT·SW·AI 지향 | AI게임소프트웨어학과 (68.1%) | AI/SW학부 5개가 TOP5 독점 ✓ |
| 휴먼·교육·복지 | 사회복지과 (74.1%) | 휴먼/복지/행정/체육/의료 5개 ✓ |
| 디자인·뷰티·창작 | 뷰티(방송스타일) (73.3%) | 예술건강학부 5개, 뷰티 3전공 분산 변별 ✓ |
| 기계·전기·현장 | 기계공학과 (64.1%) | 스마트시스템 + 전자공학과 5개 ✓ |
| 항공·외국어 | 중국어학과 (70.1%) | TOP3 60%+ 깔끔 변별, 4위 이하 50% 미만 ✓ |

검증 코드는 `tests/test_engine.js`로 옮겨두었습니다. `node tests/test_engine.js`로 재실행 가능.

---

## 구현 진행 현황 (2026-05-27 기준)

| 영역 | 상태 | 비고 |
|---|---|---|
| 적합도 엔진 | ✅ | `lib/recommendation_engine.js` + 회귀 테스트 통과 |
| 학생 1차 검사 (90문항) | ✅ | `src/student/Start.tsx` · `Exam.tsx` |
| 2차 적응형 라우팅 | ✅ | `src/student/Stage2.tsx` (계열별 자동 분기) |
| 결과지 (TOP5 + 레이더 + PDF) | ✅ | `src/student/Result.tsx` (jsPDF, Recharts) |
| PWA (manifest + SW) | ✅ | `vite-plugin-pwa`, 오프라인 캐싱 16자산 |
| 관리자 대시보드 | ⏳ | 시범운영 데이터 누적 후 본격 구현 |
| QR 실기 테스트 | ⏳ | HTTPS 호스팅 환경 확보 후 |

### 개발 명령어

```bash
npm install          # 최초 1회
npm run dev          # http://localhost:5173 (SW 등록, 핫 리로드)
npm run build        # dist/ 산출 (sw.js + workbox-*.js 포함)
npm run preview      # 빌드 결과 로컬 미리보기
npm test             # 적합도 엔진 회귀 테스트
```

---

## 후속 작업이 필요한 사항

| 항목 | 비고 |
|---|---|
| 메이크업&네일전공 가이드북 입수 | 계획서는 32개 학과인데 자료는 31개. 학과로부터 추가 양식 수령 시 데이터에 행 추가 필요 |
| 드론정보공학과 2025학년도 개정본 | 현재는 2024학년도 가이드북 기준 |
| 학과장 DNA 가중치 보정 회신 | `docs/dna_review.xlsx`의 시트 4를 31개 학과에 회람·회신 받기 |
| 시범운영 50~100명 변별도 점검 | 1차 운영 후 문항별 변별도(item discrimination) 분석으로 보정 |
| 학과 홈페이지 URL 수집 | 결과지에서 학과별 외부 링크 연결용 |

---

## 라이선스·문의

- 본 시스템의 데이터·문항·DNA표는 명지전문대학 학생지원처 AI융합진로지원센터 소유
- 학내 운영 목적에 한해 사용. 외부 배포·상업적 이용 금지
- 문의: 명지전문대학 학생지원처 AI융합진로지원센터
