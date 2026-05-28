// lib/analytics.js 의 TS 타입 선언
// CLAUDE.md §5.2 메타 분석 4함수 시그너처 보조.
// 학과 매칭 가중치(DNA)·적합도 공식에는 영향 없음.

import type { FitResult, CounselingNeed } from "./recommendation_engine";

/* ─── 1) Hit 지표 ───────────────────────────────────────── */
export interface HitMetrics {
  hit_at_1: boolean;
  hit_at_3: boolean;
  hit_at_5: boolean;
  top1_in_preferences: boolean;
  preferences: string[];
  evaluable: boolean;
}

export function calcHitMetrics(
  profile: { preferred_dept_1?: string | null; preferred_dept_2?: string | null; preferred_dept_3?: string | null } | null | undefined,
  fitScores: FitResult[],
): HitMetrics;

/* ─── 2) 상담 우선군 ─────────────────────────────────────── */
export type CounselingPriorityLevel = "HIGH" | "MEDIUM" | "LOW";

export interface CounselingPriority {
  priority: CounselingPriorityLevel;
  triggered_rules: Array<"rule_a" | "rule_b" | "rule_c">;
  detail: Record<string, string>;
}

export function classifyCounselingPriority(
  profile:
    | { decision_maker?: string | null; preferred_dept_1?: string | null }
    | null
    | undefined,
  fitScores: FitResult[],
  counselingNeed: CounselingNeed | { score?: number } | null | undefined,
): CounselingPriority;

/* ─── 3) 자유전공 진학 이유 그룹핑 ────────────────────────── */
export interface DesignedReasonGroup {
  count: number;
  ratio: number;
  avg_need_score: number;
  pref1_input_rate: number;
  hit1_rate: number;
}

export interface DesignedReasonReport {
  total: number;
  groups: Record<"UNDECIDED" | "EXPLORE" | "SCORE_MATCH" | "OTHER", DesignedReasonGroup>;
}

export function groupByDesignedReason(
  students: Array<{
    profile?: { self_designed_reason?: string | null; preferred_dept_1?: string | null } | null;
    fitScores?: FitResult[];
    counselingNeed?: { score?: number } | null;
  }>,
): DesignedReasonReport;

/* ─── 4) 진로방향 × 학부 교차 ────────────────────────────── */
export interface CareerVsRecommendationReport {
  total: number;
  career_keys: Array<"EMPLOYMENT" | "STARTUP" | "UNIV_TRANSFER" | "GRAD_SCHOOL" | "UNDECIDED">;
  school_keys: string[];
  matrix: Record<string, Record<string, number>>;
}

export function crossAnalyzeCareerVsRecommendation(
  students: Array<{
    profile?: { career_direction?: string | null } | null;
    fitScores?: FitResult[];
  }>,
): CareerVsRecommendationReport;
