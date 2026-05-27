/**
 * 명지전문대학 학과추천 진단 PWA 공통 헤더
 * ───────────────────────────────────────
 * STEP 1·2·3 모든 화면 상단에 노출.
 * 로고 자리는 가안(텍스트 placeholder). 실제 MJC CI 이미지 확정 시 교체.
 */
export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        {/* 로고 자리 (가안: 텍스트). 추후 CI 이미지로 교체. */}
        <div className="app-header__logo" aria-label="명지전문대학 로고">
          명지전문대학
        </div>
        <div className="app-header__org">
          학생지원처 AI융합진로지원센터
        </div>
      </div>
    </header>
  );
}
