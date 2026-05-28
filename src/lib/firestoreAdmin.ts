/**
 * 관리자 대시보드용 Firestore 조회·집계
 * ─────────────────────────────────────────
 * 시범운영 100명 수준에서는 한 번에 전체 fetch + 클라이언트 집계로 충분.
 * 본 운영(수천 명)에서는 Cloud Functions로 사전 집계 + 페이지네이션 권장.
 *
 * 권한: 현재는 Security Rules로 read 차단(관리자 인증 미구현).
 *       Phase 4 이후 Anonymous Auth + custom claims 또는 별도 관리자 SDK로 교체.
 */

import { collection, getDocs } from "firebase/firestore";
import { getDb } from "./firebase";
import { getDepartment } from "./dataLoader";
import type { SavedResponse } from "./firestoreClient";

/** 모든 응답 fetch — 실패 시 빈 배열 (mock 폴백 트리거) */
export async function fetchAllResponses(): Promise<SavedResponse[]> {
  try {
    const snap = await getDocs(collection(getDb(), "responses"));
    return snap.docs.map((d) => d.data() as SavedResponse);
  } catch (error) {
    console.warn("[Firestore] fetchAllResponses failed:", error);
    return [];
  }
}

/* ──────────────────────────────────────────────────────────────
 * 응답 배열 → 관리자 KPI / 분포 / 상담군 / Hit / 만족도 집계
 * ──────────────────────────────────────────────────────────── */

export function aggregateKpi(responses: SavedResponse[]) {
  const total = responses.length;
  if (total === 0) {
    return {
      participants: 0,
      completionRate: 0,
      avgMinutes: 0,
      counselingPriorityHigh: 0,
      hitAt5Rate: null as number | null,
      satisfactionAvg: null as number | null,
    };
  }
  const highCount = responses.filter((r) => r.priority?.priority === "HIGH").length;
  // 시범운영에서는 검사 시작 시간 미수집 → 완료율·소요시간 추정 어려움.
  // 결과 캐시가 존재한다는 것 자체가 완료 → 100%로 표시.
  return {
    participants: total,
    completionRate: 1,
    avgMinutes: 0,                    // 본 운영에서 startedAt 수집 시 산출
    counselingPriorityHigh: highCount,
    hitAt5Rate: null as number | null, // 실제 선택 학과 입력 후에야 산출
    satisfactionAvg: null as number | null, // 만족도 폼 본 구현 이후
  };
}

export function aggregateTrend(responses: SavedResponse[], days = 14) {
  // 최근 N일 일자별 카운트
  const counts = new Map<string, number>();
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts.set(formatMD(d), 0);
  }
  for (const r of responses) {
    const d = new Date(r.completedAt);
    const key = formatMD(d);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}

function formatMD(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

export interface DeptDist {
  code: string;
  name: string;
  school: string;
  top1Count: number;
  top5Count: number;
}

export function aggregateDeptDistribution(responses: SavedResponse[]): DeptDist[] {
  const top1Map = new Map<string, number>();
  const top5Map = new Map<string, number>();
  const meta = new Map<string, { name: string; school: string }>();

  for (const r of responses) {
    const fits = r.fits ?? [];
    fits.forEach((f, i) => {
      meta.set(f.code, { name: f.name, school: f.school });
      if (i === 0) top1Map.set(f.code, (top1Map.get(f.code) ?? 0) + 1);
      if (i < 5) top5Map.set(f.code, (top5Map.get(f.code) ?? 0) + 1);
    });
  }

  const codes = new Set<string>([...top1Map.keys(), ...top5Map.keys()]);
  return [...codes]
    .map((code) => ({
      code,
      name: meta.get(code)?.name ?? code,
      school: meta.get(code)?.school ?? "",
      top1Count: top1Map.get(code) ?? 0,
      top5Count: top5Map.get(code) ?? 0,
    }))
    .sort((a, b) => b.top1Count - a.top1Count || b.top5Count - a.top5Count);
}

export interface CounselingRow {
  nickname: string;
  needScore: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  triggeredRules: string[];
  top1Name: string;
  preferredName: string | null;
}

export function aggregateCounselingList(responses: SavedResponse[]): CounselingRow[] {
  return responses
    .filter((r) => r.priority?.priority === "HIGH" || r.priority?.priority === "MEDIUM")
    .map((r) => {
      const top1 = r.fits?.[0];
      const preferredCode = r.profile?.preferred_dept_1 ?? null;
      // fits에 없으면(TOP10 밖) dataLoader의 정적 학과 메타로 폴백
      const preferredName = preferredCode
        ? (r.fits?.find((f) => f.code === preferredCode)?.name
            ?? getDepartment(preferredCode)?.name
            ?? preferredCode)
        : null;
      return {
        nickname: r.profile?.nickname ?? "익명",
        needScore: r.counselingNeed?.score ?? 0,
        priority: r.priority?.priority as "HIGH" | "MEDIUM" | "LOW",
        triggeredRules: r.priority?.triggered_rules ?? [],
        top1Name: top1?.name ?? "—",
        preferredName,
      };
    })
    .sort((a, b) => b.needScore - a.needScore);
}

export function aggregateHitSummary(responses: SavedResponse[]) {
  const evaluable = responses.filter((r) => r.hits?.evaluable);
  return {
    evaluableCount: evaluable.length,
    hitAt1: evaluable.filter((r) => r.hits?.hit_at_1).length,
    hitAt3: evaluable.filter((r) => r.hits?.hit_at_3).length,
    hitAt5: evaluable.filter((r) => r.hits?.hit_at_5).length,
  };
}

/* ──────────────────────────────────────────────────────────────
 * 응답자 통계 — STEP 2 일반사항 16항목 분포
 *   AI융합진로지원센터 권한에서만 노출. 학과 운영 자료·상담 초기 자료.
 * ──────────────────────────────────────────────────────────── */

export interface DistributionRow { label: string; count: number; ratio: number; }

function countBy<T extends string | number | null | undefined>(
  responses: SavedResponse[],
  picker: (p: SavedResponse["profile"]) => T,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of responses) {
    const v = picker(r.profile);
    const key = v == null || v === "" ? "(무응답)" : String(v);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return m;
}

function toRows(map: Map<string, number>, total: number, labelMap?: Record<string, string>): DistributionRow[] {
  return [...map.entries()]
    .map(([k, count]) => ({
      label: labelMap?.[k] ?? k,
      count,
      ratio: total > 0 ? count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

const LABEL_GENDER: Record<string, string> = { M: "남성", F: "여성", NONE: "응답하지 않음" };
const LABEL_ACADEMIC: Record<string, string> = {
  FRESHMAN: "신입생(2027학번)", ENROLLED: "재학생", TRANSFER_HOPEFUL: "편입 희망자", POST_GRADUATION: "졸업 후 진로 탐색",
};
const LABEL_REASON: Record<string, string> = {
  UNDECIDED: "아직 진로를 정하지 못해서", EXPLORE: "여러 분야를 두루 탐색하고 싶어서",
  SCORE_MATCH: "성적·입시 결과에 맞춰서", OTHER: "기타",
};
const LABEL_CAREER: Record<string, string> = {
  EMPLOYMENT: "취업", STARTUP: "창업", UNIV_TRANSFER: "4년제 편입",
  GRAD_SCHOOL: "대학원 진학", UNDECIDED: "아직 정하지 못함",
};
const LABEL_DECISION: Record<string, string> = {
  SELF: "본인", FAMILY: "가족(부모·형제 등)", FRIEND_SENIOR: "친구·선후배", TEACHER: "교사·교수·진로상담사", OTHER: "기타",
};
const LABEL_HS: Record<string, string> = {
  GENERAL: "일반계", SPECIAL_PURPOSE: "특성화·특수목적고", MEISTER: "마이스터고", GED: "검정고시", OTHER: "기타",
};
const LABEL_PRIOR: Record<string, string> = {
  NONE: "없음", ENROLLED: "재학 중(이중)", GRADUATED: "졸업 후 재입학", WITHDREW: "중도 포기 경험",
};
const LABEL_COUNSEL: Record<string, string> = {
  NO: "원하지 않음", AFTER_RESULT: "결과지 확인 후 결정", REGARDLESS: "결과와 무관하게 상담 희망",
};
const LABEL_HAS: Record<string, string> = { "true": "있음", "false": "없음" };

export interface ProfileStats {
  total: number;
  birthYear: DistributionRow[];
  gender: DistributionRow[];
  academicStatus: DistributionRow[];
  selfDesignedReason: DistributionRow[];
  careerDirection: DistributionRow[];
  decisionMaker: DistributionRow[];
  wantsCounseling: DistributionRow[];
  highSchoolType: DistributionRow[];
  workExperience: DistributionRow[];
  partTimeExperience: DistributionRow[];
  priorCollege: DistributionRow[];
}

export function aggregateProfileStats(responses: SavedResponse[]): ProfileStats {
  const total = responses.length;
  return {
    total,
    birthYear:        toRows(countBy(responses, (p) => p.birth_year), total),
    gender:           toRows(countBy(responses, (p) => p.gender), total, LABEL_GENDER),
    academicStatus:   toRows(countBy(responses, (p) => p.academic_status), total, LABEL_ACADEMIC),
    selfDesignedReason: toRows(countBy(responses, (p) => p.self_designed_reason), total, LABEL_REASON),
    careerDirection:  toRows(countBy(responses, (p) => p.career_direction), total, LABEL_CAREER),
    decisionMaker:    toRows(countBy(responses, (p) => p.decision_maker), total, LABEL_DECISION),
    wantsCounseling:  toRows(countBy(responses, (p) => p.wants_counseling), total, LABEL_COUNSEL),
    highSchoolType:   toRows(countBy(responses, (p) => p.high_school_type), total, LABEL_HS),
    workExperience:   toRows(countBy(responses, (p) => p.work_experience?.has), total, LABEL_HAS),
    partTimeExperience: toRows(countBy(responses, (p) => p.part_time_experience?.has), total, LABEL_HAS),
    priorCollege:     toRows(countBy(responses, (p) => p.prior_college), total, LABEL_PRIOR),
  };
}

/* ──────────────────────────────────────────────────────────────
 * 학과별 희망학생 명단 — 학과에 전달할 상담 초기 자료
 *   1지망/2지망/3지망 별로 학생 목록을 분리해 정리.
 * ──────────────────────────────────────────────────────────── */

export interface PreferredStudent {
  anonymousId: string;
  nickname: string;
  preferenceRank: 1 | 2 | 3;          // 학생이 이 학과를 몇 지망으로 두었는지
  systemRank: number | null;          // 시스템 추천에서 이 학과의 순위 (1~31)
  systemPercent: number | null;
  counselingScore: number;
  priority: "HIGH" | "MEDIUM" | "LOW" | "—";
  careerDirection: string | null;
  completedAt: string;
}

export interface DeptPreferenceGroup {
  code: string;
  name: string;
  school: string;
  pref1: PreferredStudent[];   // 이 학과를 1지망으로 둔 학생
  pref2: PreferredStudent[];
  pref3: PreferredStudent[];
  totalUnique: number;         // 어느 순위로든 한 번이라도 선택한 학생 수
}

export function aggregatePreferredStudents(responses: SavedResponse[]): DeptPreferenceGroup[] {
  const groups = new Map<string, DeptPreferenceGroup>();
  const meta = new Map<string, { name: string; school: string }>();

  // 학과 메타 수집 (fits에서)
  for (const r of responses) {
    for (const f of r.fits ?? []) {
      if (!meta.has(f.code)) meta.set(f.code, { name: f.name, school: f.school });
    }
  }

  function ensureGroup(code: string): DeptPreferenceGroup {
    let g = groups.get(code);
    if (!g) {
      // fits에 없으면 정적 학과 메타로 폴백
      const fromFits = meta.get(code);
      const fromStatic = getDepartment(code);
      const name = fromFits?.name ?? fromStatic?.name ?? code;
      const school = fromFits?.school ?? fromStatic?.school ?? "";
      g = { code, name, school, pref1: [], pref2: [], pref3: [], totalUnique: 0 };
      groups.set(code, g);
    }
    return g;
  }

  for (const r of responses) {
    const p = r.profile;
    const fits = r.fits ?? [];
    const findRank = (code: string) => {
      const idx = fits.findIndex((f) => f.code === code);
      return idx === -1 ? null : { rank: idx + 1, percent: fits[idx].percent };
    };
    const base = {
      anonymousId: r.anonymousId,
      nickname: p.nickname ?? "익명",
      counselingScore: r.counselingNeed?.score ?? 0,
      priority: (r.priority?.priority ?? "—") as "HIGH" | "MEDIUM" | "LOW" | "—",
      careerDirection: (p.career_direction as string | null) ?? null,
      completedAt: r.completedAt,
    };

    const ranks: Array<{ code: string | null; rank: 1 | 2 | 3 }> = [
      { code: p.preferred_dept_1, rank: 1 },
      { code: p.preferred_dept_2, rank: 2 },
      { code: p.preferred_dept_3, rank: 3 },
    ];

    for (const { code, rank } of ranks) {
      if (!code) continue;
      const g = ensureGroup(code);
      const sys = findRank(code);
      const student: PreferredStudent = {
        ...base,
        preferenceRank: rank,
        systemRank: sys?.rank ?? null,
        systemPercent: sys?.percent ?? null,
      };
      if (rank === 1) g.pref1.push(student);
      else if (rank === 2) g.pref2.push(student);
      else g.pref3.push(student);
    }
  }

  // totalUnique 계산 (anonymousId 중복 제거)
  for (const g of groups.values()) {
    const ids = new Set([...g.pref1, ...g.pref2, ...g.pref3].map((s) => s.anonymousId));
    g.totalUnique = ids.size;
  }

  return [...groups.values()].sort(
    (a, b) => b.totalUnique - a.totalUnique || b.pref1.length - a.pref1.length,
  );
}
