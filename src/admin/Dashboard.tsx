// src/admin/README.md — 본격 개발은 학생용 PWA 완료 + 시범운영 데이터 50~100명
// 누적 후 진행. 현 단계는 화면 와이어프레임 자리만 유지.
export default function AdminDashboard() {
  return (
    <main className="page">
      <h1>관리자 대시보드</h1>
      <p className="muted">
        본 화면은 시범운영 데이터 누적 후 개발 예정입니다.
        (참여 추이 / 학과별 추천 분포 / 상담 필요군 / Hit@5 적중률 / 만족도)
      </p>
      <div className="card">
        <h2>구현 예정 메뉴</h2>
        <ul>
          <li>종합 현황 (KPI 대시보드)</li>
          <li>학과별 추천 분포 (TOP1 비율, TOP5 누적)</li>
          <li>상담 필요군 자동 추출 (70점 이상)</li>
          <li>실제 선택 학과 입력 → 추천 적중률(Hit@5)</li>
          <li>만족도·자유응답 분석</li>
          <li>데이터 다운로드 (개인정보 제거 / 포함 선택)</li>
        </ul>
      </div>
      <p className="muted">
        접근 권한·인증은 학내 SSO 연동 후 분리합니다 (계획서 Ⅹ장 / src/admin/README.md 참조).
      </p>
    </main>
  );
}
