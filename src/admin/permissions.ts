/**
 * 관리자 대시보드 권한 모델 (시범운영 mock)
 * ──────────────────────────────────────────
 * 본 운영 시 학내 SSO(Microsoft Entra ID / Keycloak 등)로 교체.
 * 시범운영 단계에서는 sessionStorage 기반 mock 권한 전환기를 사용한다.
 *
 * 계획서 Ⅹ장 권한별 메뉴 표:
 *   CENTER       (AI융합진로지원센터·최고권한) : 전 메뉴, 식별정보 포함 가능
 *   EDU_SUPPORT  (융합교육지원센터)          : 집계 요약만
 *   DEPT_HEAD    (학과장, 본인 학과 한정)     : 학과 관심도 집계만
 */

export type Role = "CENTER" | "EDU_SUPPORT" | "DEPT_HEAD";

export const ROLE_LABEL: Record<Role, string> = {
  CENTER: "AI융합진로지원센터",
  EDU_SUPPORT: "융합교육지원센터",
  DEPT_HEAD: "학과장",
};

export type SectionId =
  | "overview"
  | "profileStats"
  | "preferredByDept"
  | "recommendations"
  | "counseling"
  | "hitRate"
  | "satisfaction";

export interface SectionDef {
  id: SectionId;
  label: string;
  desc: string;
  visibleFor: Role[]; // 이 메뉴를 볼 수 있는 권한 목록
}

export const SECTIONS: SectionDef[] = [
  {
    id: "overview",
    label: "종합 현황",
    desc: "참여 추이·검사 완료율·KPI 요약",
    visibleFor: ["CENTER", "EDU_SUPPORT", "DEPT_HEAD"],
  },
  {
    id: "profileStats",
    label: "응답자 통계",
    desc: "STEP 2 일반사항 16항목 분포 + CSV",
    visibleFor: ["CENTER", "EDU_SUPPORT"],
  },
  {
    id: "preferredByDept",
    label: "학과별 희망학생",
    desc: "1·2·3지망 누적 명단, 상담 초기 자료",
    visibleFor: ["CENTER", "DEPT_HEAD"],
  },
  {
    id: "recommendations",
    label: "학과별 추천 분포",
    desc: "31개 학과별 TOP1 비율, TOP5 누적, 전년 대비",
    visibleFor: ["CENTER", "DEPT_HEAD"],
  },
  {
    id: "counseling",
    label: "상담 필요군",
    desc: "상담 필요도 70점 이상 자동 추출, 상담 우선 분류",
    visibleFor: ["CENTER"],
  },
  {
    id: "hitRate",
    label: "추천 적중률 (Hit@5)",
    desc: "학기말 실제 선택 학과 입력 → 시스템 TOP5 적중률",
    visibleFor: ["CENTER"],
  },
  {
    id: "satisfaction",
    label: "만족도·자유응답",
    desc: "5점 척도 평균, 자유 코멘트 워드 카운트",
    visibleFor: ["CENTER", "EDU_SUPPORT"],
  },
];

/** 권한별 노출 가능한 섹션 목록 */
export function visibleSections(role: Role): SectionDef[] {
  return SECTIONS.filter((s) => s.visibleFor.includes(role));
}

/** 학과장에게 보여줄 본인 학과(시범운영 mock — 단일 학과 고정) */
export const MOCK_DEPT_HEAD_OF = "AISW_CS";

/* ─── sessionStorage mock 권한 저장 ───────────────────────────── */
const KEY_ROLE = "mjc_cat_admin_mock_role";

export function getMockRole(): Role | null {
  const v = sessionStorage.getItem(KEY_ROLE);
  if (v === "CENTER" || v === "EDU_SUPPORT" || v === "DEPT_HEAD") return v;
  return null;
}
export function setMockRole(r: Role) {
  sessionStorage.setItem(KEY_ROLE, r);
}
export function clearMockRole() {
  sessionStorage.removeItem(KEY_ROLE);
}
