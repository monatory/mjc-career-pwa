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
  // 시범운영 한 달차 누적된 가상 수치 (본격 구현 시 백엔드 API로 교체)
  return {
    participants: 87,
    completionRate: 0.83,
    avgMinutes: 22,
    counselingPriorityHigh: 11,
    hitAt5Rate: null,        // 학기말 입력 후 계산
    satisfactionAvg: 4.21,
  };
}

/* ─── 참여 추이 (최근 14일 시계열) ─────────────────────────────── */
export interface TrendPoint {
  date: string;   // "MM-DD"
  count: number;  // 그 날 참여자 수
}

export function mockTrend(days = 14): TrendPoint[] {
  // 학기 중반 평일 6~12명·주말 1~3명 자연스러운 패턴
  const r = rng(42);
  const out: TrendPoint[] = [];
  const today = new Date("2026-05-28");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? 1 : 6;
    const variance = weekend ? 2 : 6;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    out.push({ date: `${mm}-${dd}`, count: base + Math.floor(r() * variance) });
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
  // 시범운영 한 달차 가상 데이터 11명 (rule_a/b/c 트리거 다양)
  return [
    { nickname: "민서",  needScore: 86, priority: "HIGH",   triggeredRules: ["rule_a", "rule_c"], top1Name: "사회복지과",   preferredName: "유아교육과" },
    { nickname: "지훈",  needScore: 82, priority: "HIGH",   triggeredRules: ["rule_a", "rule_b"], top1Name: "컴퓨터공학과", preferredName: "경영학과"   },
    { nickname: "수아",  needScore: 78, priority: "HIGH",   triggeredRules: ["rule_a", "rule_b", "rule_c"], top1Name: "산업디자인학과", preferredName: "세무회계과" },
    { nickname: "건우",  needScore: 76, priority: "MEDIUM", triggeredRules: ["rule_a"],          top1Name: "기계공학과",   preferredName: "기계공학과" },
    { nickname: "예린",  needScore: 73, priority: "MEDIUM", triggeredRules: ["rule_a"],          top1Name: "패션리빙디자인과", preferredName: null     },
    { nickname: "도윤",  needScore: 71, priority: "MEDIUM", triggeredRules: ["rule_a"],          top1Name: "AI게임소프트웨어학과", preferredName: "AI게임소프트웨어학과" },
    { nickname: "다은",  needScore: 68, priority: "MEDIUM", triggeredRules: ["rule_b"],          top1Name: "정보통신공학과", preferredName: "유아교육과" },
    { nickname: "현우",  needScore: 64, priority: "MEDIUM", triggeredRules: ["rule_b"],          top1Name: "산업경영공학과", preferredName: "경영학과"  },
    { nickname: "서윤",  needScore: 49, priority: "MEDIUM", triggeredRules: ["rule_c"],          top1Name: "공공행정서비스상담과", preferredName: null  },
    { nickname: "윤서",  needScore: 47, priority: "MEDIUM", triggeredRules: ["rule_c"],          top1Name: "사회체육과",     preferredName: null     },
    { nickname: "하준",  needScore: 45, priority: "MEDIUM", triggeredRules: ["rule_c"],          top1Name: "토목공학과",     preferredName: "기계공학과" },
  ];
}

/* ─── 추천 적중률 ────────────────────────────────────────────── */
export interface HitMetricsSummary {
  evaluableCount: number;  // Hit 계산 가능한 학생 수 (실제 선택 학과 입력 완료)
  hitAt1: number;
  hitAt3: number;
  hitAt5: number;
}

export function mockHitSummary(): HitMetricsSummary {
  // 학기말 이후 실제 선택 학과 입력이 완료된 가상 시나리오
  // evaluableCount = 1지망 입력자 한정. 실제 학생 72명 중 1지망 입력자 58명 가정.
  return { evaluableCount: 58, hitAt1: 22, hitAt3: 39, hitAt5: 47 };
}

/* ─── 만족도 ──────────────────────────────────────────────── */
export interface SatisfactionRow {
  question: string;
  avg: number | null;       // 1~5 평균
  responseCount: number;
}

export function mockSatisfaction(): SatisfactionRow[] {
  return [
    { question: "결과가 진로 탐색에 도움이 되었다", avg: 4.35, responseCount: 72 },
    { question: "문항이 이해하기 쉬웠다",            avg: 4.18, responseCount: 72 },
    { question: "검사 소요 시간이 적절했다",         avg: 3.92, responseCount: 72 },
    { question: "결과지의 학과 정보가 충실했다",     avg: 4.41, responseCount: 71 },
  ];
}

/* ─── 공통: 더미 데이터 안내 메시지 ──────────────────────────── */
export const PILOT_NOT_STARTED_MSG =
  "시범운영 데이터가 아직 누적되지 않았습니다. 50~100명 응답 누적 후 실측 데이터로 자동 갱신됩니다.";

export const MOCK_PREVIEW_MSG =
  "본격 구현 미리보기용 가상 데이터입니다. 시범운영 응답이 누적되면 실측치로 자동 교체됩니다.";
