/**
 * 관리자 대시보드 — 스켈레톤
 * ──────────────────────────
 * 시범운영 데이터 누적 전(50~100명) 단계의 화면 자리잡기 구현.
 *
 * 본 운영 전환 시 교체 항목:
 *   - mock 권한 전환기 → 학내 SSO(Microsoft Entra ID / Keycloak 등)
 *   - mockData.ts      → 백엔드 API 호출
 *   - CSV 다운로드 버튼 → 진로취업팀 권한 + 개인정보 포함/제거 옵션
 *
 * CLAUDE.md §12, src/admin/README.md, 계획서 Ⅹ장 참조.
 */
import { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import {
  ROLE_LABEL,
  visibleSections,
  getMockRole,
  setMockRole,
  clearMockRole,
  type Role,
  type SectionId,
} from "./permissions";
import Overview from "./sections/Overview";
import ProfileStats from "./sections/ProfileStats";
import PreferredByDept from "./sections/PreferredByDept";
import Recommendations from "./sections/Recommendations";
import Counseling from "./sections/Counseling";
import HitRate from "./sections/HitRate";
import Satisfaction from "./sections/Satisfaction";
import { useAdminData } from "./useAdminData";
import type { SavedResponse } from "../lib/firestoreClient";

export default function AdminDashboard() {
  const [role, setRole] = useState<Role | null>(() => getMockRole());
  const [sectionId, setSectionId] = useState<SectionId>("overview");
  // 모바일 사이드 메뉴 접기 — 데스크탑(>720px)에서는 CSS로 강제 펼침
  const [sideOpen, setSideOpen] = useState(false);

  // Firestore 데이터 로딩 (권한 선택 후에만 호출)
  const adminData = useAdminData();

  // 권한이 바뀌면 첫 가시 섹션으로 자동 이동
  useEffect(() => {
    if (!role) return;
    const sections = visibleSections(role);
    if (!sections.some((s) => s.id === sectionId)) {
      setSectionId(sections[0]?.id ?? "overview");
    }
  }, [role, sectionId]);

  if (!role) return <RolePicker onPick={(r) => { setMockRole(r); setRole(r); }} />;

  const sections = visibleSections(role);

  const currentLabel = sections.find((s) => s.id === sectionId)?.label ?? "메뉴";

  return (
    <>
      <AppHeader />
      <div className="admin-shell">
        {/* 모바일에서만 보이는 메뉴 토글 바 */}
        <button
          className="admin-mobile-toggle"
          aria-expanded={sideOpen}
          onClick={() => setSideOpen((v) => !v)}
        >
          <span>{ROLE_LABEL[role]} · {currentLabel}</span>
          <span>{sideOpen ? "✕" : "☰"}</span>
        </button>

        <aside className={`admin-side ${sideOpen ? "open" : ""}`}>
          <div className="admin-side__role">
            <div className="admin-side__role-label muted small">로그인 권한 (mock)</div>
            <div className="admin-side__role-value">{ROLE_LABEL[role]}</div>
            <button
              className="ghost admin-side__role-switch"
              onClick={() => { clearMockRole(); setRole(null); }}
            >
              권한 전환
            </button>
          </div>

          <nav className="admin-side__nav">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`admin-nav-item ${s.id === sectionId ? "selected" : ""}`}
                onClick={() => { setSectionId(s.id); setSideOpen(false); }}
              >
                <span className="admin-nav-item__label">{s.label}</span>
                <span className="admin-nav-item__desc muted small">{s.desc}</span>
              </button>
            ))}
          </nav>

          <div className="admin-side__note muted small">
            본 운영 시 학내 SSO 연동 + 권한 자동 결정.
            <br />현재는 시범운영 mock — 새로고침해도 sessionStorage에 유지됩니다.
          </div>
        </aside>

        <main className="admin-main">
          {adminData.loading && (
            <div className="admin-data-banner admin-data-banner--loading">
              <span>⏳</span><span>데이터 불러오는 중…</span>
            </div>
          )}
          {!adminData.loading && !adminData.isLive && (
            <div className="admin-data-banner admin-data-banner--preview">
              <strong>미리보기</strong>
              <span>·</span>
              <span>실측 데이터가 없어 가상 데이터로 표시합니다. 학생 응답이 누적되면 자동 전환됩니다.</span>
            </div>
          )}
          {!adminData.loading && adminData.isLive && (
            <div className="admin-data-banner admin-data-banner--live">
              <strong>실측 데이터</strong>
              <span>·</span>
              <span>총 {adminData.responses.length}명 응답 누적</span>
            </div>
          )}
          <SectionRenderer
            id={sectionId}
            role={role}
            responses={adminData.isLive ? adminData.responses : null}
          />
        </main>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 권한별 섹션 라우팅
 * ──────────────────────────────────────────────────────────── */
function SectionRenderer({
  id, role, responses,
}: {
  id: SectionId;
  role: Role;
  responses: SavedResponse[] | null;
}) {
  switch (id) {
    case "overview":         return <Overview responses={responses} />;
    case "profileStats":     return <ProfileStats responses={responses} />;
    case "preferredByDept":  return <PreferredByDept role={role} responses={responses} />;
    case "recommendations":  return <Recommendations role={role} responses={responses} />;
    case "counseling":       return <Counseling responses={responses} />;
    case "hitRate":          return <HitRate responses={responses} />;
    case "satisfaction":     return <Satisfaction responses={responses} />;
  }
}

/* ──────────────────────────────────────────────────────────────
 * 첫 진입 시 권한 선택기 (mock SSO 대체)
 * ──────────────────────────────────────────────────────────── */
function RolePicker({ onPick }: { onPick: (r: Role) => void }) {
  const roles = useMemo<Role[]>(() => ["CENTER", "EDU_SUPPORT", "DEPT_HEAD"], []);
  return (
    <>
      <AppHeader />
      <main className="page">
        <h1>관리자 대시보드</h1>
        <p className="muted">
          시범운영 단계입니다. 학내 SSO 연동 전까지는 권한을 직접 선택해 주세요.
          본 운영 전환 시 이 화면은 사라지고 SSO 결과로 자동 진입합니다.
        </p>

        <div className="card">
          <h2>역할 선택</h2>
          <div className="role-grid">
            {roles.map((r) => (
              <button key={r} className="role-pick" onClick={() => onPick(r)}>
                <strong>{ROLE_LABEL[r]}</strong>
                <span className="muted small">{describeRole(r)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card muted small">
          본 대시보드의 본격 구현은 시범운영 데이터 50~100명 누적 후 시작됩니다.
          현재 화면은 권한 분리·메뉴 구조·차트 자리잡기를 위한 스켈레톤입니다.
          (CLAUDE.md §12, src/admin/README.md, 계획서 Ⅹ장)
        </div>
      </main>
    </>
  );
}

function describeRole(r: Role): string {
  switch (r) {
    case "CENTER":
      return "최고 권한 — 전 메뉴, 식별정보 포함 가능";
    case "EDU_SUPPORT":
      return "운영지표 요약 (집계 데이터만)";
    case "DEPT_HEAD":
      return "본인 학과 관심도 (집계만, 개별 학생 식별 불가)";
  }
}
