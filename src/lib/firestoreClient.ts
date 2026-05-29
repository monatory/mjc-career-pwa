/**
 * Firestore 학생 응답·결과 저장 (시범운영 백엔드)
 * ─────────────────────────────────────────────────
 *
 * 컬렉션 설계:
 *   responses/{anonymousId}
 *     - anonymousId        : crypto.randomUUID() (학번·이름과 무관)
 *     - profile            : StudentProfile JSON (16항목, 학번·이름 없음)
 *     - axisScores         : 24개 매칭축 점수
 *     - fits               : 31개 학과 적합도 (TOP5 분석용)
 *     - counselingNeed     : 상담 필요도 점수 + 카테고리
 *     - hits               : Hit@1/3/5 (preferred_dept가 있을 때)
 *     - priority           : HIGH/MEDIUM/LOW
 *     - undecided          : 결정군 미정군 판정
 *     - completedAt        : ISO 8601 timestamp
 *     - schemaVersion      : 데이터 모델 버전 (스키마 진화 대비)
 *     - app                : { version, env } 메타
 *
 * 정책:
 *   - CLAUDE.md §7 7.2 시범운영 16항목 + 응답·결과만. 학번·이름 절대 저장 안 함.
 *   - 저장 실패해도 학생 진단 UX에 지장 없도록 fire-and-forget + try/catch.
 *   - 본 운영 시 학번·이름은 별도 컬렉션(students/{studentId})에 AES-256 암호화 저장,
 *     responses는 익명ID만 보유. (계획서 XI장)
 */

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";
import { getAnonymousId, type StudentProfile } from "./sessionState";
import {
  calcHitMetrics,
  classifyCounselingPriority,
} from "@lib/analytics";
import {
  detectUndecided,
  type AxisScores,
  type FitResult,
  type CounselingNeed,
} from "@lib/recommendation_engine";

const SCHEMA_VERSION = "1.0-pilot";

// 결과지 재진입(새로고침·뒤로가기) 시 같은 익명ID로 중복 저장을 막는 플래그.
// 한 번 저장 성공한 익명ID는 다시 쓰지 않는다(Firestore 규칙상 동일 문서 update는
// 차단되어 permission-denied가 반복 발생하던 문제 방지). clearAll()에서 함께 정리.
const SAVED_FLAG_KEY = "mjc_cat_saved";

export interface SavedResponse {
  anonymousId: string;
  profile: StudentProfile;
  axisScores: AxisScores;
  fits: FitResult[];
  counselingNeed: CounselingNeed;
  hits: ReturnType<typeof calcHitMetrics>;
  priority: ReturnType<typeof classifyCounselingPriority>;
  undecided: ReturnType<typeof detectUndecided>;
  completedAt: string;
  schemaVersion: string;
  app: { env: string };
}

/**
 * 결과지 진입 시 호출 — 학생 1명 분의 응답·결과를 Firestore에 저장.
 * 실패하면 콘솔 경고만 남기고 throw하지 않음 (UX 차단 금지).
 */
export async function saveResponseToFirestore(args: {
  profile: StudentProfile;
  axisScores: AxisScores;
  fits: FitResult[];
  counselingNeed: CounselingNeed;
}): Promise<{ ok: boolean; anonymousId?: string; skipped?: boolean; error?: unknown }> {
  try {
    const anonymousId = getAnonymousId();

    // 이미 이 익명ID로 저장에 성공했으면 재시도하지 않음.
    // (결과지 새로고침/재진입마다 동일 문서에 쓰기를 시도해 update가 거부되던 문제 방지)
    if (sessionStorage.getItem(SAVED_FLAG_KEY) === anonymousId) {
      return { ok: true, anonymousId, skipped: true };
    }

    const { profile, axisScores, fits, counselingNeed } = args;

    // 클라이언트 사이드 메타 분석 (lib/analytics.js)
    const hits = calcHitMetrics(profile, fits);
    const priority = classifyCounselingPriority(profile, fits, counselingNeed);
    const undecided = detectUndecided(fits);

    const payload: SavedResponse = {
      anonymousId,
      profile,
      axisScores,
      fits: fits.slice(0, 10), // TOP10만 저장 (저장량·읽기량 절감, 31개 전부는 분석에서 다시 계산 가능)
      counselingNeed,
      hits,
      priority,
      undecided,
      completedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      app: { env: import.meta.env.MODE },
    };

    await setDoc(doc(getDb(), "responses", anonymousId), {
      ...payload,
      // Firestore 서버 timestamp (정확한 정렬·집계용)
      _serverCreatedAt: serverTimestamp(),
    });

    // 저장 성공 표시 — 같은 익명ID 재진입 시 중복 쓰기 방지
    sessionStorage.setItem(SAVED_FLAG_KEY, anonymousId);
    return { ok: true, anonymousId };
  } catch (error) {
    // 네트워크 끊김·권한 오류 등 — UX 차단 금지
    console.warn("[Firestore] saveResponseToFirestore failed:", error);
    return { ok: false, error };
  }
}
