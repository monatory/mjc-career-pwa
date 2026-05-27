/**
 * 관리자 대시보드 — 시범운영 누적 전 더미 데이터
 * ───────────────────────────────────────────────
 * 실제 학생 데이터가 50~100명 누적되기 전에 화면 자리잡기를 위한 가짜 데이터.
 * 본격 구현 시 백엔드 API 호출로 교체.
 *
 * 모든 함수는 결정적(seed 기반)으로 동작 — 화면 새로고침 시에도 같은 값 유지.
 */

import { departmentsDna } from "../lib/dataLoader";

/* ─── 결정적 PRNG (Mulberry32) ────────────────────────────────── */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── 종합 현황 KPI ───────────────────────────────────────────── */
export interface KpiSummary {
  participants: number;            // 참여 학생 수
  completionRate: number;          // 검사 완료율 0~1
  avgMinutes: number;              // 평균 소요시간
  counselingPriorityHigh: number;  // 상담 우선군 인원
  hitAt5Rate: number | null;       // 적중률 (학기말 전이면 null)
  satisfactionAvg: number | null;  // 만족도 평균 (응답 누적 전이면 null)
}

export function mockKpi(): KpiSummary {
  return {
    participants: 0,
    completionRate: 0,
    avgMinutes: 0,
    counselingPriorityHigh: 0,
    hitAt5Rate: null,
    satisfactionAvg: null,
  };
}

/* ─── 참여 추이 (최근 14일 시계열) ─────────────────────────────── */
export interface TrendPoint {
  date: string;   // "MM-DD"
  count: number;  // 그 날 참여자 수
}

export function mockTrend(days = 14): TrendPoint[] {
  const r = rng(42);
  const out: TrendPoint[] = [];
  const today = new Date("2026-05-28");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push({ date: `${mm}-${dd}`, count: Math.floor(r() * 12) });
  }
  return out;
}

/* ─── 학과별 추천 분포 (31개 학과 TOP1 비율) ──────────────────── */
export interface DeptDist {
  code: string;
  name: string;
  school: string;
  top1Count: number;   // TOP1으로 추천된 횟수
  top5Count: number;   // TOP5 안에 포함된 횟수
}

export function mockDeptDistribution(): DeptDist[] {
  const r = rng(7);
  return departmentsDna.departments.map((d) => ({
    code: d.code,
    name: d.name,
    school: d.school,
    top1Count: Math.floor(r() * 8),
    top5Count: Math.floor(r() * 25),
  }));
}

/* ─── 상담 필요군 ────────────────────────────────────────────── */
export interface CounselingRow {
  nickname: string;
  needScore: number;        // 0~100 상담 필요도
  priority: "HIGH" | "MEDIUM" | "LOW";
  triggeredRules: string[];
  top1Name: string;
  preferredName: string | null;
}

export function mockCounselingList(): CounselingRow[] {
  // 시범운영 누적 전이므로 빈 배열 반환
  return [];
}

/* ─── 추천 적중률 ────────────────────────────────────────────── */
export interface HitMetricsSummary {
  evaluableCount: number;  // Hit 계산 가능한 학생 수 (실제 선택 학과 입력 완료)
  hitAt1: number;
  hitAt3: number;
  hitAt5: number;
}

export function mockHitSummary(): HitMetricsSummary {
  return { evaluableCount: 0, hitAt1: 0, hitAt3: 0, hitAt5: 0 };
}

/* ─── 만족도 ──────────────────────────────────────────────── */
export interface SatisfactionRow {
  question: string;
  avg: number | null;       // 1~5 평균
  responseCount: number;
}

export function mockSatisfaction(): SatisfactionRow[] {
  return [
    { question: "결과가 진로 탐색에 도움이 되었다", avg: null, responseCount: 0 },
    { question: "문항이 이해하기 쉬웠다",            avg: null, responseCount: 0 },
    { question: "검사 소요 시간이 적절했다",         avg: null, responseCount: 0 },
    { question: "결과지의 학과 정보가 충실했다",     avg: null, responseCount: 0 },
  ];
}

/* ─── 공통: 데이터 누적 안내 메시지 ──────────────────────────── */
export const PILOT_NOT_STARTED_MSG =
  "시범운영 데이터가 아직 누적되지 않았습니다. 50~100명 응답 누적 후 실측 데이터로 자동 갱신됩니다.";
