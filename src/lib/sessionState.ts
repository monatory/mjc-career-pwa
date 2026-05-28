/**
 * 학생 응답·임시 상태의 클라이언트 영속화
 * ────────────────────────────────────────
 * - 학번/이름은 시범운영 단계에서 LocalStorage 평문 저장 금지(CLAUDE.md 7장)
 * - 닉네임은 응답자 정보(profile) 안에 포함되어 sessionStorage에 저장
 * - 1차/2차 응답은 분리 저장 (stage 자동 분기)
 *
 * 키 컨벤션 (작업 4에서 통일):
 *   mjc_cat_consent          : "true"|"false" — STEP 1 안내 동의
 *   mjc_cat_profile          : StudentProfile JSON — STEP 2 결과
 *   mjc_cat_responses_stage1 : {Q001: 5, ...} — 1차 90문항 응답
 *   mjc_cat_responses_stage2 : {Q091: 4, ...} — 2차 적응형 응답
 *   mjc_cat_stage1_done      : "1" — 1차 완료 표시
 *   mjc_cat_active_branches  : ["IT", "ART"] — 2차 활성 계열
 *   mjc_cat_result           : ResultCache JSON — 최종 결과 캐시
 */

import type {
  Responses,
  FitResult,
  CounselingNeed,
  AxisScores,
} from "@lib/recommendation_engine";
import { questionBank } from "./dataLoader";

/* ── 키 정의 ──────────────────────────────────────────────── */
const KEY_CONSENT = "mjc_cat_consent";
const KEY_PROFILE = "mjc_cat_profile";
const KEY_RESP_S1 = "mjc_cat_responses_stage1";
const KEY_RESP_S2 = "mjc_cat_responses_stage2";
const KEY_S1_DONE = "mjc_cat_stage1_done";
const KEY_BRANCHES = "mjc_cat_active_branches";
const KEY_RESULT = "mjc_cat_result";
const KEY_ANON_ID = "mjc_cat_anonymous_id";

// 구(舊) 키 — clearAll에서 함께 정리(작업 4 이전 데이터 호환)
const LEGACY_KEYS = [
  "mjc.nickname",
  "mjc.responses",
  "mjc.stage1_done",
  "mjc.result_cache",
  "mjc.active_branches",
];

/* ── 문항 id → stage 1|2 lookup (sessionState 내부용) ─────── */
const STAGE_BY_QID: Record<string, 1 | 2 | 3> = (() => {
  const m: Record<string, 1 | 2 | 3> = {};
  for (const it of questionBank.items) m[it.id] = it.stage;
  return m;
})();

/* ────────────────────────────────────────────────────────────
 * 응답자 프로필 (STEP 2)
 * ────────────────────────────────────────────────────────── */
export interface StudentProfile {
  // A. 기본
  nickname: string;
  birth_year: number | null;
  gender: "M" | "F" | "NONE" | null;
  academic_status:
    | "FRESHMAN" | "ENROLLED" | "TRANSFER_HOPEFUL" | "POST_GRADUATION" | null;
  self_designed_reason:
    | "UNDECIDED" | "EXPLORE" | "SCORE_MATCH" | "OTHER" | null;
  self_designed_reason_other_text?: string;

  // B. 진로 방향
  career_direction:
    | "EMPLOYMENT" | "STARTUP" | "UNIV_TRANSFER" | "GRAD_SCHOOL" | "UNDECIDED" | null;
  decision_maker:
    | "SELF" | "FAMILY" | "FRIEND_SENIOR" | "TEACHER" | "OTHER" | null;
  decision_maker_other_text?: string;
  wants_counseling: "NO" | "AFTER_RESULT" | "REGARDLESS" | null;

  // C. 학습·경험 배경
  high_school_type:
    | "GENERAL" | "SPECIAL_PURPOSE" | "MEISTER" | "GED" | "OTHER" | null;
  high_school_type_other_text?: string;
  high_school_major: string;
  work_experience: { has: boolean | null; field: string | null; field_other_text?: string };
  part_time_experience: { has: boolean | null; field: string | null; field_other_text?: string };
  prior_college: "NONE" | "ENROLLED" | "GRADUATED" | "WITHDREW" | null;

  // D. 학과 선택 현황
  preferred_dept_1: string | null;
  preferred_dept_2: string | null;
  preferred_dept_3: string | null;
}

export function getProfile(): StudentProfile | null {
  try {
    const raw = sessionStorage.getItem(KEY_PROFILE);
    return raw ? (JSON.parse(raw) as StudentProfile) : null;
  } catch {
    return null;
  }
}

export function setProfile(p: StudentProfile) {
  sessionStorage.setItem(KEY_PROFILE, JSON.stringify(p));
}

/** 결과지 헤더 등에서 사용 — profile.nickname 단일 출처 */
export function getNickname(): string {
  return getProfile()?.nickname ?? "";
}

/* ────────────────────────────────────────────────────────────
 * 안내 동의 (STEP 1)
 * ────────────────────────────────────────────────────────── */
export function getConsent(): boolean {
  return sessionStorage.getItem(KEY_CONSENT) === "true";
}
export function setConsent(v: boolean) {
  sessionStorage.setItem(KEY_CONSENT, v ? "true" : "false");
}

/* ────────────────────────────────────────────────────────────
 * 1·2차 응답 — stage 자동 분기
 *   호출부(Exam·Stage2)는 통합 객체로 다루고,
 *   sessionState 내부에서 stage별 키에 분리 저장.
 * ────────────────────────────────────────────────────────── */
function loadStage(key: string): Responses {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

export function getResponsesStage1(): Responses {
  return loadStage(KEY_RESP_S1);
}
export function getResponsesStage2(): Responses {
  return loadStage(KEY_RESP_S2);
}

/** 1차 + 2차 통합 응답 (engine 호출용) */
export function getResponses(): Responses {
  return { ...getResponsesStage1(), ...getResponsesStage2() };
}

/** stage 자동 판단해서 해당 키에 저장 */
export function setResponse(qid: string, value: number) {
  const stage = STAGE_BY_QID[qid] ?? 1;
  const key = stage === 2 ? KEY_RESP_S2 : KEY_RESP_S1;
  const cur = loadStage(key);
  cur[qid] = value;
  sessionStorage.setItem(key, JSON.stringify(cur));
}

/** 통째로 덮어쓰기(분리 저장) */
export function setResponses(r: Responses) {
  const s1: Responses = {};
  const s2: Responses = {};
  for (const [qid, v] of Object.entries(r)) {
    const stage = STAGE_BY_QID[qid] ?? 1;
    (stage === 2 ? s2 : s1)[qid] = v;
  }
  sessionStorage.setItem(KEY_RESP_S1, JSON.stringify(s1));
  sessionStorage.setItem(KEY_RESP_S2, JSON.stringify(s2));
}

/* ────────────────────────────────────────────────────────────
 * 단계 완료 플래그 / 2차 활성 계열
 * ────────────────────────────────────────────────────────── */
export function markStage1Done() {
  sessionStorage.setItem(KEY_S1_DONE, "1");
}
export function isStage1Done(): boolean {
  return sessionStorage.getItem(KEY_S1_DONE) === "1";
}

export function saveActiveBranches(b: string[]) {
  sessionStorage.setItem(KEY_BRANCHES, JSON.stringify(b));
}
export function loadActiveBranches(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY_BRANCHES) ?? "[]");
  } catch {
    return [];
  }
}

/* ────────────────────────────────────────────────────────────
 * 결과 캐시
 * ────────────────────────────────────────────────────────── */
export interface ResultCache {
  axisScores: AxisScores;
  fits: FitResult[];
  counseling: CounselingNeed;
  computedAt: string;
}

export function saveResultCache(r: ResultCache) {
  sessionStorage.setItem(KEY_RESULT, JSON.stringify(r));
}
export function loadResultCache(): ResultCache | null {
  try {
    const raw = sessionStorage.getItem(KEY_RESULT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────
 * 진행 상태 판단 (STEP 1 "이어서 진행" 모달용)
 * ────────────────────────────────────────────────────────── */
export type ResumeStage =
  | "none"       // 아무 진행 없음
  | "profile"    // STEP 2 일부 입력만 있음
  | "exam"       // 1차 응답 누적 중
  | "stage2"     // 1차 완료, 2차 진행 중
  | "result";    // 결과 캐시 있음

export interface ResumeState {
  stage: ResumeStage;
  nextPath: "/" | "/profile" | "/exam" | "/stage2" | "/result";
  s1Count: number;
  s2Count: number;
  hasProfile: boolean;
}

/** 어디까지 진행됐는지 판단해 다음 진입 경로를 반환 */
export function getResumeState(): ResumeState {
  const hasResult = !!loadResultCache();
  const s1Count = Object.keys(getResponsesStage1()).length;
  const s2Count = Object.keys(getResponsesStage2()).length;
  const s1Done = isStage1Done();
  const hasProfile = !!getProfile();

  let stage: ResumeStage = "none";
  let nextPath: ResumeState["nextPath"] = "/";

  if (hasResult) {
    stage = "result";
    nextPath = "/result";
  } else if (s1Done) {
    stage = "stage2";
    nextPath = "/stage2";
  } else if (s1Count > 0) {
    stage = "exam";
    nextPath = "/exam";
  } else if (hasProfile) {
    stage = "profile";
    nextPath = "/profile";
  }

  return { stage, nextPath, s1Count, s2Count, hasProfile };
}

/* ────────────────────────────────────────────────────────────
 * 전체 초기화 — 신·구 키 모두 정리
 * ────────────────────────────────────────────────────────── */
export function clearAll() {
  sessionStorage.removeItem(KEY_CONSENT);
  sessionStorage.removeItem(KEY_PROFILE);
  sessionStorage.removeItem(KEY_RESP_S1);
  sessionStorage.removeItem(KEY_RESP_S2);
  sessionStorage.removeItem(KEY_S1_DONE);
  sessionStorage.removeItem(KEY_BRANCHES);
  sessionStorage.removeItem(KEY_RESULT);
  sessionStorage.removeItem(KEY_ANON_ID);
  for (const k of LEGACY_KEYS) sessionStorage.removeItem(k);
}

/* ────────────────────────────────────────────────────────────
 * 익명 ID — Firestore 학생 레코드 식별용
 *   학번·이름 대신 사용하는 임의 UUID. 한 번 생성하면 sessionStorage에 유지.
 *   탭 종료 시 사라지므로 다음 진단은 새 익명ID로 시작 (반복 응답 분리 분석).
 * ────────────────────────────────────────────────────────── */
export function getAnonymousId(): string {
  let id = sessionStorage.getItem(KEY_ANON_ID);
  if (!id) {
    // crypto.randomUUID는 모든 HTTPS·localhost에서 지원
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY_ANON_ID, id);
  }
  return id;
}
