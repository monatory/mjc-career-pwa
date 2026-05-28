/**
 * 관리자 CSV 다운로드 유틸
 * ────────────────────────
 * Excel 한국어 호환을 위해 UTF-8 BOM(﻿) 포함.
 * 시범운영 단계 — 본 운영 시 학번·이름 추가되면 컬럼 확장 + 다운로드 권한 제한.
 */

import type { SavedResponse } from "../lib/firestoreClient";
import type { DeptPreferenceGroup, ProfileStats } from "../lib/firestoreAdmin";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── 1) 응답 전체 export ──────────────────────────────────── */
export function exportAllResponsesCsv(responses: SavedResponse[]) {
  const header = [
    "anonymousId", "completedAt",
    "nickname", "birth_year", "gender", "academic_status", "self_designed_reason",
    "career_direction", "decision_maker", "wants_counseling",
    "high_school_type", "high_school_major",
    "work_has", "work_field", "parttime_has", "parttime_field",
    "prior_college",
    "preferred_dept_1", "preferred_dept_2", "preferred_dept_3",
    "counseling_score", "counseling_category",
    "priority", "triggered_rules",
    "top1_code", "top1_name", "top1_percent",
    "top5_codes",
    "hit_at_1", "hit_at_3", "hit_at_5", "evaluable",
    "undecided",
  ];
  const rows = responses.map((r) => {
    const p = r.profile ?? ({} as any);
    const top1 = r.fits?.[0];
    return [
      r.anonymousId,
      r.completedAt,
      p.nickname ?? "",
      p.birth_year ?? "",
      p.gender ?? "",
      p.academic_status ?? "",
      p.self_designed_reason ?? "",
      p.career_direction ?? "",
      p.decision_maker ?? "",
      p.wants_counseling ?? "",
      p.high_school_type ?? "",
      p.high_school_major ?? "",
      String(p.work_experience?.has ?? ""),
      p.work_experience?.field ?? "",
      String(p.part_time_experience?.has ?? ""),
      p.part_time_experience?.field ?? "",
      p.prior_college ?? "",
      p.preferred_dept_1 ?? "",
      p.preferred_dept_2 ?? "",
      p.preferred_dept_3 ?? "",
      String(r.counselingNeed?.score ?? ""),
      r.counselingNeed?.category ?? "",
      r.priority?.priority ?? "",
      (r.priority?.triggered_rules ?? []).join("|"),
      top1?.code ?? "",
      top1?.name ?? "",
      String(top1?.percent ?? ""),
      (r.fits ?? []).slice(0, 5).map((f) => f.code).join("|"),
      String(r.hits?.hit_at_1 ?? ""),
      String(r.hits?.hit_at_3 ?? ""),
      String(r.hits?.hit_at_5 ?? ""),
      String(r.hits?.evaluable ?? ""),
      String(r.undecided?.is_undecided ?? ""),
    ];
  });
  downloadCsv(
    `MJC-CAT_responses_${new Date().toISOString().slice(0, 10)}.csv`,
    [header, ...rows],
  );
}

/* ── 2) 상담 필요군만 export ──────────────────────────────── */
export function exportCounselingCsv(responses: SavedResponse[]) {
  const targets = responses.filter(
    (r) => r.priority?.priority === "HIGH" || r.priority?.priority === "MEDIUM",
  );
  const header = [
    "anonymousId", "nickname", "counseling_score", "priority", "triggered_rules",
    "top1_name", "preferred_dept_1", "completedAt",
  ];
  const rows = targets.map((r) => [
    r.anonymousId,
    r.profile?.nickname ?? "익명",
    String(r.counselingNeed?.score ?? ""),
    r.priority?.priority ?? "",
    (r.priority?.triggered_rules ?? []).join("|"),
    r.fits?.[0]?.name ?? "",
    r.profile?.preferred_dept_1 ?? "",
    r.completedAt,
  ]);
  downloadCsv(
    `MJC-CAT_counseling_${today()}.csv`,
    [header, ...rows],
  );
}

/* ── 3) 응답자 통계 export (모든 분포를 한 CSV에 섹션별로) ──── */
export function exportProfileStatsCsv(stats: ProfileStats) {
  const rows: string[][] = [];
  rows.push(["MJC-CAT 응답자 통계", `총 ${stats.total}명`]);
  rows.push([]);

  function pushSection(title: string, dist: { label: string; count: number; ratio: number }[]) {
    rows.push([title, "응답수", "비율"]);
    for (const d of dist) {
      rows.push([d.label, String(d.count), `${(d.ratio * 100).toFixed(1)}%`]);
    }
    rows.push([]);
  }

  pushSection("[A] 출생연도",          stats.birthYear);
  pushSection("[A] 성별",              stats.gender);
  pushSection("[A] 학적 상태",         stats.academicStatus);
  pushSection("[A] 자유전공 진학 이유", stats.selfDesignedReason);
  pushSection("[B] 진로방향",          stats.careerDirection);
  pushSection("[B] 의사결정 유형",     stats.decisionMaker);
  pushSection("[B] 진로상담 희망",     stats.wantsCounseling);
  pushSection("[C] 고등학교 유형",     stats.highSchoolType);
  pushSection("[C] 직장 경험",         stats.workExperience);
  pushSection("[C] 아르바이트 경험",   stats.partTimeExperience);
  pushSection("[C] 이전 대학 경험",    stats.priorCollege);

  downloadCsv(`MJC-CAT_profile_stats_${today()}.csv`, rows);
}

/* ── 4) 학과별 희망학생 명단 export — 상담 초기 자료 ──────── */
export function exportPreferredStudentsByDeptCsv(groups: DeptPreferenceGroup[]) {
  const rows: string[][] = [];
  rows.push(["MJC-CAT 학과별 희망학생 명단", "1·2·3지망 누적, 상담 초기 자료"]);
  rows.push([]);
  const header = [
    "학과 코드", "학과", "학부",
    "닉네임", "희망 순위", "시스템 추천 순위", "시스템 적합도(%)",
    "상담 필요도", "상담 우선순위", "진로방향",
    "anonymousId", "completedAt",
  ];
  rows.push(header);
  for (const g of groups) {
    const all = [...g.pref1, ...g.pref2, ...g.pref3].sort((a, b) => a.preferenceRank - b.preferenceRank);
    for (const s of all) {
      rows.push([
        g.code, g.name, g.school,
        s.nickname, String(s.preferenceRank),
        s.systemRank == null ? "" : String(s.systemRank),
        s.systemPercent == null ? "" : s.systemPercent.toFixed(1),
        String(s.counselingScore),
        s.priority,
        s.careerDirection ?? "",
        s.anonymousId,
        s.completedAt,
      ]);
    }
    if (all.length > 0) rows.push([]);
  }
  downloadCsv(`MJC-CAT_preferred_by_dept_${today()}.csv`, rows);
}

/** 단일 학과의 희망학생 명단만 (학과장 전달용) */
export function exportSingleDeptPreferredCsv(g: DeptPreferenceGroup) {
  const rows: string[][] = [];
  rows.push([`${g.school} · ${g.name} 희망학생 명단`, `총 ${g.totalUnique}명 (중복 제외)`]);
  rows.push([]);
  const header = [
    "닉네임", "희망 순위", "시스템 추천 순위", "시스템 적합도(%)",
    "상담 필요도", "상담 우선순위", "진로방향", "anonymousId", "completedAt",
  ];
  rows.push(header);
  const all = [...g.pref1, ...g.pref2, ...g.pref3].sort((a, b) => a.preferenceRank - b.preferenceRank);
  for (const s of all) {
    rows.push([
      s.nickname,
      String(s.preferenceRank),
      s.systemRank == null ? "" : String(s.systemRank),
      s.systemPercent == null ? "" : s.systemPercent.toFixed(1),
      String(s.counselingScore),
      s.priority,
      s.careerDirection ?? "",
      s.anonymousId,
      s.completedAt,
    ]);
  }
  downloadCsv(
    `MJC-CAT_dept_${g.code}_${today()}.csv`,
    rows,
  );
}
