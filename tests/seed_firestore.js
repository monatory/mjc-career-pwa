/**
 * Firestore 시드 — 시연용 가상 학생 5명
 * ────────────────────────────────────────
 *
 * tests/test_engine.js 의 5명 시나리오를 기반으로
 * STEP 2 일반사항(profile)과 16항목을 다양화해 Firestore에 push.
 *
 * 실행:
 *   node tests/seed_firestore.js          # 시드 (5건 추가)
 *   node tests/seed_firestore.js --clean  # 시드 삭제 (anonymousId 'seed-' 접두사로 식별)
 *
 * 시드된 문서는 anonymousId가 "seed-{nn}-..." 로 시작하므로
 * 시연 끝난 뒤 콘솔에서 검색·삭제 가능.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import {
  AXES,
  calcAxisScores,
  calcFitScores,
  calcCounselingNeed,
  detectUndecided,
} from "../lib/recommendation_engine.js";
import {
  calcHitMetrics,
  classifyCounselingPriority,
} from "../lib/analytics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const departmentsDna = JSON.parse(readFileSync(join(DATA_DIR, "departments_dna.json"), "utf-8"));
const questionBank   = JSON.parse(readFileSync(join(DATA_DIR, "question_bank.json"),   "utf-8"));

// 우리 src/lib/firebase.ts 와 동일 config (frontend 노출 정상)
const firebaseConfig = {
  apiKey: "AIzaSyBTfTs7K-DLcdGNvLYfsH2GDZs1olVDvTI",
  authDomain: "mjc-career-pwa.firebaseapp.com",
  projectId: "mjc-career-pwa",
  storageBucket: "mjc-career-pwa.firebasestorage.app",
  messagingSenderId: "278721966232",
  appId: "1:278721966232:web:76a524761514e821ce20ed",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ── 가상 학생 5명 — test_engine.js의 시나리오 + 다양한 프로필 ── */
const STUDENTS = [
  {
    nick: "민서",
    profile: {
      birth_year: 2008, gender: "F",
      academic_status: "FRESHMAN", self_designed_reason: "UNDECIDED",
      career_direction: "EMPLOYMENT", decision_maker: "FAMILY", wants_counseling: "AFTER_RESULT",
      high_school_type: "GENERAL", high_school_major: "",
      work_experience: { has: false, field: null }, part_time_experience: { has: true, field: "SERVICE" },
      prior_college: "NONE",
      preferred_dept_1: "AISW_CS", preferred_dept_2: "AISW_GAME", preferred_dept_3: "AISW_ICT",
    },
    axisProfile: { SW: 5, AI: 5, GAME: 4, SYS: 4, NET: 3, SEC: 3 },
    confResponse: 3,
    needResponse: 4,
  },
  {
    nick: "지훈",
    profile: {
      birth_year: 2008, gender: "M",
      academic_status: "FRESHMAN", self_designed_reason: "EXPLORE",
      career_direction: "EMPLOYMENT", decision_maker: "SELF", wants_counseling: "NO",
      high_school_type: "SPECIAL_PURPOSE", high_school_major: "사회복지과",
      work_experience: { has: false, field: null }, part_time_experience: { has: true, field: "EDUCATION_CARE" },
      prior_college: "NONE",
      preferred_dept_1: "BIZ_EDU", preferred_dept_2: "BIZ_WELF", preferred_dept_3: "BIZ_PUBADM",
    },
    axisProfile: { EDU: 5, WELFARE: 5, ADMIN: 3.5, SERVICE: 3, MED: 2.5 },
    confResponse: 4,
    needResponse: 2,
  },
  {
    nick: "수아",
    profile: {
      birth_year: 2007, gender: "F",
      academic_status: "ENROLLED", self_designed_reason: "SCORE_MATCH",
      career_direction: "STARTUP", decision_maker: "FRIEND_SENIOR", wants_counseling: "REGARDLESS",
      high_school_type: "GENERAL", high_school_major: "",
      work_experience: { has: true, field: "SERVICE" }, part_time_experience: { has: true, field: "SERVICE" },
      prior_college: "WITHDREW",
      preferred_dept_1: "BIZ_MGT", preferred_dept_2: "ART_FASH", preferred_dept_3: null,
    },
    // 일부러 디자인 지향 (1지망 경영학과와 미스매치 시나리오)
    axisProfile: { DESIGN: 5, BEAUTY: 4.5, CONTENT: 4, BIZ: 2.5 },
    confResponse: 2,   // 확신 부족
    needResponse: 5,   // 상담 요구 큼
  },
  {
    nick: "건우",
    profile: {
      birth_year: 2008, gender: "M",
      academic_status: "FRESHMAN", self_designed_reason: "EXPLORE",
      career_direction: "EMPLOYMENT", decision_maker: "SELF", wants_counseling: "AFTER_RESULT",
      high_school_type: "MEISTER", high_school_major: "기계과",
      work_experience: { has: false, field: null }, part_time_experience: { has: true, field: "MANUFACTURING" },
      prior_college: "NONE",
      preferred_dept_1: "SMART_MECH", preferred_dept_2: "SMART_ELEC", preferred_dept_3: "SMART_DRONE",
    },
    axisProfile: { MECH: 5, ELEC: 4.5, EMB: 4, INDUST: 3.5, CIVIL: 3 },
    confResponse: 4,
    needResponse: 2,
  },
  {
    nick: "예린",
    profile: {
      birth_year: 2008, gender: "F",
      academic_status: "FRESHMAN", self_designed_reason: "UNDECIDED",
      career_direction: "UNDECIDED", decision_maker: "TEACHER", wants_counseling: "REGARDLESS",
      high_school_type: "GENERAL", high_school_major: "",
      work_experience: { has: false, field: null }, part_time_experience: { has: false, field: null },
      prior_college: "NONE",
      // 1지망 미입력 시나리오
      preferred_dept_1: null, preferred_dept_2: null, preferred_dept_3: null,
    },
    axisProfile: { SERVICE: 5, LANG: 4.5, BIZ: 3, ADMIN: 2 },
    confResponse: 2,
    needResponse: 5,
  },
];

const SCHEMA_VERSION = "1.0-pilot";

function generateResponses(axisProfile, confResp, needResp, defaultScore = 1.5) {
  const responses = {};
  for (const it of questionBank.items) {
    if (it.axis === "CONF") {
      responses[it.id] = it.reverse ? (6 - confResp) : confResp;
      continue;
    }
    if (it.axis === "NEED") {
      responses[it.id] = it.reverse ? (6 - needResp) : needResp;
      continue;
    }
    if (it.mapping && Object.keys(it.mapping).length > 0) {
      let wsum = 0, total = 0;
      for (const [ax, w] of Object.entries(it.mapping)) {
        wsum += w;
        total += (axisProfile[ax] ?? defaultScore) * w;
      }
      let resp = Math.round(total / wsum);
      resp = Math.max(1, Math.min(5, resp));
      if (it.reverse) resp = 6 - resp;
      responses[it.id] = resp;
    } else {
      responses[it.id] = 3;
    }
  }
  return responses;
}

function emptyProfileTemplate(nick) {
  return {
    nickname: nick,
    birth_year: null, gender: null, academic_status: null, self_designed_reason: null,
    career_direction: null, decision_maker: null, wants_counseling: null,
    high_school_type: null, high_school_major: "",
    work_experience: { has: null, field: null },
    part_time_experience: { has: null, field: null },
    prior_college: null,
    preferred_dept_1: null, preferred_dept_2: null, preferred_dept_3: null,
  };
}

async function clean() {
  console.log("기존 시드 데이터 삭제 중…");
  const snap = await getDocs(collection(db, "responses"));
  let deleted = 0;
  for (const d of snap.docs) {
    if (d.id.startsWith("seed-")) {
      await deleteDoc(doc(db, "responses", d.id));
      deleted++;
    }
  }
  console.log(`삭제 완료: ${deleted}건`);
}

async function seed() {
  console.log(`Firestore 시드 시작 — ${STUDENTS.length}명`);

  // 학생 데이터 며칠에 걸쳐 누적된 것처럼 보이도록 completedAt을 분산
  const baseDate = new Date("2026-05-26T09:00:00.000Z");

  let i = 0;
  for (const s of STUDENTS) {
    i++;
    const profile = { ...emptyProfileTemplate(s.nick), ...s.profile };
    const fullAxis = { ...Object.fromEntries(AXES.map((a) => [a, 1.5])), ...s.axisProfile };
    const responses = generateResponses(fullAxis, s.confResponse, s.needResponse);

    const axisScores = calcAxisScores(responses, questionBank);
    const fits = calcFitScores(axisScores, departmentsDna);
    const counselingNeed = calcCounselingNeed(responses, questionBank);
    const hits = calcHitMetrics(profile, fits);
    const priority = classifyCounselingPriority(profile, fits, counselingNeed);
    const undecided = detectUndecided(fits);

    const completedAt = new Date(baseDate.getTime() + i * 6 * 3600 * 1000); // 6시간 간격
    const anonymousId = `seed-${String(i).padStart(2, "0")}-${s.nick}-${Math.random().toString(36).slice(2, 10)}`;

    const payload = {
      anonymousId,
      profile,
      axisScores,
      fits: fits.slice(0, 10),
      counselingNeed,
      hits,
      priority,
      undecided,
      completedAt: completedAt.toISOString(),
      schemaVersion: SCHEMA_VERSION,
      app: { env: "seed" },
      _serverCreatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "responses", anonymousId), payload);

    console.log(`  ${i}. ${s.nick.padEnd(4)} → TOP1: ${fits[0].name} (${fits[0].percent}%) · 상담 ${counselingNeed.score} (${priority.priority})`);
  }

  console.log("\n시드 완료. 관리자 대시보드에서 확인:");
  console.log("  https://monatory.github.io/mjc-career-pwa/#/admin");
}

const args = process.argv.slice(2);
if (args.includes("--clean")) {
  clean().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
} else {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
