// recommendation_engine.js 의 TS 타입 선언 (소스 변경 없이 타입만 추가)
// CLAUDE.md 2장: 적합도 공식은 수정 금지. 본 파일은 형식 보조용일 뿐.

export type AxisCode =
  | "SW" | "AI" | "GAME" | "SEC" | "NET" | "SYS"
  | "HW" | "EMB" | "MECH" | "ELEC"
  | "CIVIL" | "INDUST"
  | "BIZ" | "ACC" | "ADMIN" | "SERVICE" | "LANG"
  | "EDU" | "WELFARE"
  | "DESIGN" | "CONTENT" | "BEAUTY"
  | "HEALTH" | "MED";

export type DiagnosticAxis =
  | "INT" | "ACT" | "LRN" | "COMP" | "JOB" | "VAL" | "CONF" | "NEED";

export type BranchCode = "ALL" | "IT" | "HW" | "BIZ" | "HUM" | "ART" | "HEALTH";

export interface QuestionItem {
  id: string;
  axis: DiagnosticAxis;
  stage: 1 | 2 | 3;
  branch: BranchCode;
  reverse: boolean;
  mapping: Partial<Record<AxisCode, number>>;
  text: string;
}

export interface QuestionBank {
  items: QuestionItem[];
}

export interface AxisMeta {
  code: AxisCode;
  category: string;
  name: string;
  desc: string;
}

export interface Department {
  code: string;
  school: string;
  name: string;
  dna: Record<AxisCode, number>;
  primary_axes: AxisCode[];
  max_score: number;
}

export interface DepartmentsDna {
  version: string;
  axes: AxisMeta[];
  departments: Department[];
}

export interface DepartmentCard {
  code: string;
  school: string;
  name: string;
  intro_short?: string;
  talent_type?: string;
  top3_jobs?: string;
  certifications?: string;
}

export type AxisScores = Record<AxisCode, number>;

export type Responses = Record<string, number>;

export interface FitResult {
  code: string;
  school: string;
  name: string;
  percent: number;
  rank: number;
  primary_axes: AxisCode[];
}

export interface CounselingNeed {
  score: number;
  category: "상담 우선 권장군" | "상담 권장군" | "상담 선택군";
  conf_avg: number;
  need_avg: number;
}

export interface UndecidedResult {
  is_undecided: boolean;
  top1_top5_gap: number;
  reason: string;
}

export const AXES: readonly AxisCode[];
export const DIAGNOSTIC_AXES: Record<DiagnosticAxis, string>;
export const BRANCHES: Record<BranchCode, string>;

export function calcAxisScores(
  responses: Responses,
  questionBank: QuestionBank
): AxisScores;

export function calcFitScores(
  axisScores: AxisScores,
  departmentsDna: DepartmentsDna
): FitResult[];

export function calcCounselingNeed(
  responses: Responses,
  questionBank: QuestionBank
): CounselingNeed;

export function detectUndecided(fitScores: FitResult[]): UndecidedResult;

export function routeToBranches(
  axisScores: AxisScores,
  options?: { threshold?: number }
): Exclude<BranchCode, "ALL">[];

export function selectStage2Items(
  questionBank: QuestionBank,
  activeBranches: Exclude<BranchCode, "ALL">[]
): QuestionItem[];

export function generateReason(
  axisScores: AxisScores,
  dept: Department
): string;
