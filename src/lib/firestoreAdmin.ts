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
      const preferredName = preferredCode
        ? (r.fits?.find((f) => f.code === preferredCode)?.name ?? preferredCode)
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
