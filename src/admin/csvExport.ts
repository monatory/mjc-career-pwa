/**
 * 관리자 CSV 다운로드 유틸
 * ────────────────────────
 * Excel 한국어 호환을 위해 UTF-8 BOM(﻿) 포함.
 * 시범운영 단계 — 본 운영 시 학번·이름 추가되면 컬럼 확장 + 다운로드 권한 제한.
 */

import type { SavedResponse } from "../lib/firestoreClient";

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
    `MJC-CAT_counseling_${new Date().toISOString().slice(0, 10)}.csv`,
    [header, ...rows],
  );
}
