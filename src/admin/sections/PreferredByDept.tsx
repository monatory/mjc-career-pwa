/**
 * 학과별 희망학생 명단 — 상담 초기 자료
 *
 * 학생이 STEP 2에서 입력한 1·2·3지망을 학과별로 모아
 * 해당 학과에 전달할 수 있는 명단으로 정리.
 *
 * 권한:
 *   CENTER     — 31개 학과 전체 명단 + CSV 다운로드
 *   DEPT_HEAD  — 본인 학과(시범운영 mock으로 AISW_CS 고정)만
 */
import { useState } from "react";
import {
  aggregatePreferredStudents,
  type DeptPreferenceGroup,
  type PreferredStudent,
} from "../../lib/firestoreAdmin";
import { exportPreferredStudentsByDeptCsv, exportSingleDeptPreferredCsv } from "../csvExport";
import { MOCK_DEPT_HEAD_OF, type Role } from "../permissions";
import type { SavedResponse } from "../../lib/firestoreClient";

interface Props { role: Role; responses: SavedResponse[] | null; }

export default function PreferredByDept({ role, responses }: Props) {
  const live = responses && responses.length > 0;
  const allGroups = live ? aggregatePreferredStudents(responses) : [];

  // 학과장은 본인 학과만
  const groups =
    role === "DEPT_HEAD"
      ? allGroups.filter((g) => g.code === MOCK_DEPT_HEAD_OF)
      : allGroups;

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selected = selectedCode ? groups.find((g) => g.code === selectedCode) ?? null : null;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <h2>학과별 희망학생 명단</h2>
        {role === "CENTER" && live && (
          <button className="ghost" onClick={() => exportPreferredStudentsByDeptCsv(groups)}>
            전체 학과 CSV 다운로드
          </button>
        )}
      </div>
      <p className="muted small">
        STEP 2에서 입력한 1·2·3지망을 학과별로 집계한 명단입니다.
        진로상담 초기 자료 및 학과 운영 참고 자료로 활용해 주세요.
      </p>

      {!live && (
        <p className="muted small">학생 응답이 누적되면 표시됩니다.</p>
      )}
      {live && groups.length === 0 && (
        <p className="muted small">아직 희망학과를 입력한 학생이 없습니다.</p>
      )}

      {groups.length > 0 && (
        <div className="card">
          <h3>학과 목록 ({groups.length}개 학과 · 클릭하면 학생 목록)</h3>
          <table className="admin-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>학과</th>
                <th>학부</th>
                <th style={{ textAlign: "right" }}>1지망</th>
                <th style={{ textAlign: "right" }}>2지망</th>
                <th style={{ textAlign: "right" }}>3지망</th>
                <th style={{ textAlign: "right" }}>고유</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.code} className={selectedCode === g.code ? "row-selected" : ""}>
                  <td>
                    <button className="link-btn" onClick={() => setSelectedCode(g.code)}>
                      {g.name}
                    </button>
                  </td>
                  <td className="muted small">{g.school}</td>
                  <td style={{ textAlign: "right" }}>{g.pref1.length}</td>
                  <td style={{ textAlign: "right" }}>{g.pref2.length}</td>
                  <td style={{ textAlign: "right" }}>{g.pref3.length}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{g.totalUnique}</td>
                  <td>
                    <button className="link-btn" onClick={() => exportSingleDeptPreferredCsv(g)}>
                      CSV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <DeptStudentList group={selected} />}
    </section>
  );
}

function DeptStudentList({ group }: { group: DeptPreferenceGroup }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h3>
          {group.school} · {group.name}
          <span className="muted small" style={{ marginLeft: 8 }}>
            총 {group.totalUnique}명 (1지망 {group.pref1.length} · 2지망 {group.pref2.length} · 3지망 {group.pref3.length})
          </span>
        </h3>
        <button className="ghost" onClick={() => exportSingleDeptPreferredCsv(group)}>
          이 학과 명단 CSV
        </button>
      </div>

      <StudentTable title={`1지망 — ${group.pref1.length}명`} students={group.pref1} />
      <StudentTable title={`2지망 — ${group.pref2.length}명`} students={group.pref2} />
      <StudentTable title={`3지망 — ${group.pref3.length}명`} students={group.pref3} />
    </div>
  );
}

function StudentTable({ title, students }: { title: string; students: PreferredStudent[] }) {
  if (students.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <h4 style={{ margin: "0 0 6px", fontSize: "0.92rem" }}>{title}</h4>
      <table className="admin-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>닉네임</th>
            <th>진로방향</th>
            <th style={{ textAlign: "right" }}>시스템 순위</th>
            <th style={{ textAlign: "right" }}>적합도</th>
            <th style={{ textAlign: "right" }}>상담 필요도</th>
            <th>우선순위</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.anonymousId}>
              <td>{s.nickname}</td>
              <td className="muted small">{s.careerDirection ?? "—"}</td>
              <td style={{ textAlign: "right" }}>
                {s.systemRank == null ? "—" : `${s.systemRank}위`}
              </td>
              <td style={{ textAlign: "right" }}>
                {s.systemPercent == null ? "—" : `${s.systemPercent.toFixed(1)}%`}
              </td>
              <td style={{ textAlign: "right" }}>{s.counselingScore.toFixed(1)}</td>
              <td>
                {s.priority !== "—" && (
                  <span className={`badge ${s.priority === "HIGH" ? "danger" : s.priority === "MEDIUM" ? "warn" : ""}`}>
                    {s.priority}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
