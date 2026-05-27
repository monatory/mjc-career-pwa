# src/student/ — 학생용 PWA 작업공간

이 폴더는 학생용 진단 검사 화면이 들어갈 작업공간입니다. **현재는 비어 있습니다.**
Claude Code가 첫 작업 단계로 여기에 `index.html` 등을 작성합니다.

---

## 권장 시작점: `index.html` 단일 파일

`CLAUDE.md` 12장의 작업 우선순위에 따라 1차 기본검사 화면부터 만듭니다.

### 단일 HTML 스타터의 권장 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
  <title>명지전문대학 학과추천 진단</title>
  <link rel="manifest" href="./manifest.webmanifest" />
  <style>
    /* 모바일 우선 (최소 320px) */
  </style>
</head>
<body>
  <main id="app"></main>

  <script type="module">
    import { calcAxisScores, calcFitScores, calcCounselingNeed }
      from "../../lib/recommendation_engine.js";

    // 1) 문항은행 로드
    const questionBank = await fetch("../../data/question_bank.json").then(r => r.json());
    const departmentsDna = await fetch("../../data/departments_dna.json").then(r => r.json());

    // 2) 1차 검사 90문항 추출
    const stage1Items = questionBank.items.filter(it => it.stage === 1);

    // 3) 화면당 1문항씩 출력, sessionStorage 누적, 5점 척도 버튼
    // 4) 90문항 완료 시 calcAxisScores 호출
  </script>
</body>
</html>
```

### 5점 척도 선택지 (계획서 Ⅵ-1, 변경 금지)

```
1. 전혀 그렇지 않다
2. 그렇지 않다
3. 보통이다
4. 그렇다
5. 매우 그렇다
```

### 결과지 안내문구 (계획서 Ⅸ ⑧, 변경 금지)

> "본 결과는 학과 선택을 위한 참고자료이며, 학과 배정과는 무관합니다.
> 최종 선택은 학생 본인의 권리이며, 진로·취업 컨설턴트가 추가 상담을 통해 충분히 지원합니다."

---

## 로컬에서 띄우는 법

`fetch()`로 데이터 파일을 불러오기 때문에 `file://` 프로토콜로는 동작하지 않습니다.
프로젝트 루트에서 다음 중 하나로 정적 서버를 띄우세요.

```bash
# Python 내장 서버 (별도 설치 불필요)
python3 -m http.server 8000

# Node.js 환경 (npx 사용 가능 시)
npx serve .

# 그 다음 브라우저에서 다음 주소 접속
# http://localhost:8000/src/student/
```

---

## 다음 단계

1. 1차 기본검사 화면 (90문항)
2. 결과지 화면 (TOP5, 8축 레이더차트, 추천사유, 상담 필요도)
3. 2차 적응형 라우팅 (계열별 자동 선별)
4. PWA manifest + service worker (오프라인 캐싱)
5. QR 접속 테스트

각 단계 작성 후 README.md를 갱신해 다음 세션 컨텍스트를 유지하세요.
