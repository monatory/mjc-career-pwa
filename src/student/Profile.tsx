/**
 * STEP 2 / 3 — 응답자 정보 입력
 * ────────────────────────────
 * 16개 항목을 4개 섹션(A·B·C·D)으로 묶어 수집.
 *
 * 데이터 정의 원본: data/student_profile_schema.json
 *   - 라벨·옵션·필수 여부·조건부 노출 규칙이 모두 그 JSON에 있음
 *   - 코드에 옵션 텍스트 하드코딩 금지(CLAUDE.md 9장 컨벤션)
 *
 * 학과 매칭 가중치(DNA)에는 영향 없음. 메타데이터일 뿐.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import StepIndicator from "../components/StepIndicator";
import {
  studentProfileSchema,
  departmentsDna,
  type FieldDef,
  type FieldOption,
} from "../lib/dataLoader";
import {
  type StudentProfile,
  getProfile,
  setProfile,
  setConsent,
  getConsent,
} from "../lib/sessionState";

/* ──────────────────────────────────────────────────────────────
 * 초기 빈 프로필
 * ──────────────────────────────────────────────────────────── */
function emptyProfile(): StudentProfile {
  return {
    nickname: "",
    birth_year: null,
    gender: null,
    academic_status: null,
    self_designed_reason: null,
    self_designed_reason_other_text: "",
    career_direction: null,
    decision_maker: null,
    decision_maker_other_text: "",
    wants_counseling: null,
    high_school_type: null,
    high_school_type_other_text: "",
    high_school_major: "",
    work_experience: { has: null, field: null, field_other_text: "" },
    part_time_experience: { has: null, field: null, field_other_text: "" },
    prior_college: null,
    preferred_dept_1: null,
    preferred_dept_2: null,
    preferred_dept_3: null,
  };
}

/* ──────────────────────────────────────────────────────────────
 * 컴포넌트: 라디오 버튼 그룹(가로 wrap, 모바일 친화)
 * ──────────────────────────────────────────────────────────── */
function RadioGroup<T extends string | number | boolean>({
  options,
  value,
  onChange,
  disabledValues,
}: {
  options: FieldOption[];
  value: T | null;
  onChange: (v: T) => void;
  disabledValues?: Array<T | null>;
}) {
  return (
    <div className="radio-row">
      {options.map((opt) => {
        const isSelected = value === (opt.value as unknown as T);
        const isDisabled = disabledValues?.includes(opt.value as unknown as T);
        return (
          <button
            key={String(opt.value)}
            type="button"
            className={`radio-btn ${isSelected ? "selected" : ""}`}
            onClick={() => onChange(opt.value as unknown as T)}
            disabled={!!isDisabled}
          >
            {opt.label_ko}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 컴포넌트: 학과 드롭다운 (학부별 optgroup)
 *   schema.department_groups + departmentsDna.departments 조합으로 옵션 생성
 *   already 배열에 포함된 코드는 disabled 처리(중복 선택 방지)
 * ──────────────────────────────────────────────────────────── */
function DepartmentSelect({
  value,
  onChange,
  already,
  placeholder,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  already?: Array<string | null>;
  placeholder?: string;
}) {
  const nameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departmentsDna.departments) m.set(d.code, d.name);
    return m;
  }, []);

  return (
    <select
      className="dept-select"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
    >
      <option value="">{placeholder ?? "선택하지 않음"}</option>
      {studentProfileSchema.department_groups.map((g) => (
        <optgroup key={g.school} label={g.school}>
          {g.codes.map((code) => {
            const name = nameByCode.get(code) ?? code;
            const disabled = already?.includes(code) && code !== value;
            return (
              <option key={code} value={code} disabled={!!disabled}>
                {name}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 헬퍼: 섹션 카드 래퍼
 * ──────────────────────────────────────────────────────────── */
function SectionCard({
  letter,
  title,
  subtitle,
  children,
}: {
  letter: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card profile-section">
      <div className="profile-section__head">
        <span className="profile-section__letter">{letter}</span>
        <div>
          <h2 className="profile-section__title">{title}</h2>
          <p className="profile-section__sub muted">{subtitle}</p>
        </div>
      </div>
      <div className="profile-section__body">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 헬퍼: 한 문항 행 (라벨 + 도움말 + 입력)
 * ──────────────────────────────────────────────────────────── */
function FieldRow({
  field,
  required,
  children,
}: {
  field: FieldDef;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="profile-field">
      <label className="profile-field__label">
        {field.label_ko}
        {required && <span className="profile-field__required"> *</span>}
      </label>
      {field.help_ko && <p className="profile-field__help muted">{field.help_ko}</p>}
      <div className="profile-field__input">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * 본체 컴포넌트
 * ──────────────────────────────────────────────────────────── */
export default function Profile() {
  const nav = useNavigate();
  const schema = studentProfileSchema;
  const F = schema.fields;

  // 출생연도 옵션 (1990~2010 역순)
  const birthYears = useMemo(() => {
    const { min, max } = F.birth_year.range!;
    const arr: number[] = [];
    for (let y = max; y >= min; y--) arr.push(y);
    return arr;
  }, [F.birth_year.range]);

  // 초기 상태 (sessionStorage에서 복원)
  const [p, setP] = useState<StudentProfile>(() => getProfile() ?? emptyProfile());
  const [consent, setConsentLocal] = useState<boolean>(() => getConsent());
  const [showErrors, setShowErrors] = useState(false);

  // 부분 업데이트 헬퍼
  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
  }

  // 필수 7개 + 동의
  const requiredKeys = schema.validation.required_field_keys;
  const missing = requiredKeys.filter((k) => {
    const v = (p as unknown as Record<string, unknown>)[k];
    return v == null || v === "";
  });
  // 닉네임 길이 검증(1~20자)
  const nicknameOk = p.nickname.trim().length >= (F.nickname.min_length ?? 1);
  // 1·2·3지망 중복 검증
  const prefs = [p.preferred_dept_1, p.preferred_dept_2, p.preferred_dept_3].filter(
    (c): c is string => c != null,
  );
  const hasDup = prefs.length !== new Set(prefs).size;

  const canSubmit = missing.length === 0 && nicknameOk && consent && !hasDup;

  function onSubmit() {
    if (!canSubmit) {
      setShowErrors(true);
      return;
    }
    setProfile(p);
    setConsent(consent);
    nav("/exam"); // STEP 3 (1차 검사)
  }

  function onPrev() {
    // 부분 입력을 보존하여 STEP 1로 복귀
    setProfile(p);
    setConsent(consent);
    nav("/");
  }

  const requiredDoneCount = requiredKeys.length - missing.length - (nicknameOk ? 0 : (missing.includes("nickname") ? 0 : 1));
  const safeDone = Math.max(0, Math.min(requiredKeys.length, requiredDoneCount));

  return (
    <>
      <AppHeader />
      <main className="page">
        <StepIndicator current={2} label="응답자 정보" />
        <h1>응답자 정보 입력</h1>
        <p className="muted">
          기본 정보와 진로 방향만 필수입니다. 나머지는 응답하지 않으셔도 진단을 진행할 수 있습니다.
          <br />수집 정보는 학과 운영·진로 상담 자료로만 사용되며, 학번·이름은 수집하지 않습니다.
        </p>

        <div className="profile-progress">
          <div className="profile-progress__label">
            <strong>필수 입력</strong> {safeDone} / {requiredKeys.length}
            {safeDone === requiredKeys.length && <span className="profile-progress__done">완료</span>}
          </div>
          <div className="profile-progress__bar">
            <div
              className="profile-progress__fill"
              style={{ width: `${(safeDone / requiredKeys.length) * 100}%` }}
            />
          </div>
        </div>

        {/* ─────────── A. 기본 정보 ─────────── */}
        <SectionCard letter="A" title="기본 정보" subtitle="필수 5개">
          <FieldRow field={F.nickname} required>
            <input
              type="text"
              className="text-input"
              value={p.nickname}
              onChange={(e) => update("nickname", e.target.value)}
              placeholder={F.nickname.placeholder}
              maxLength={F.nickname.max_length}
            />
          </FieldRow>

          <FieldRow field={F.birth_year} required>
            <select
              className="dept-select"
              value={p.birth_year ?? ""}
              onChange={(e) =>
                update("birth_year", e.target.value === "" ? null : Number(e.target.value))
              }
            >
              <option value="">선택</option>
              {birthYears.map((y) => (
                <option key={y} value={y}>{y}년생</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow field={F.gender} required>
            <RadioGroup<"M" | "F" | "NONE">
              options={F.gender.options!}
              value={p.gender}
              onChange={(v) => update("gender", v)}
            />
          </FieldRow>

          <FieldRow field={F.academic_status} required>
            <RadioGroup<StudentProfile["academic_status"] & string>
              options={F.academic_status.options!}
              value={p.academic_status}
              onChange={(v) => update("academic_status", v)}
            />
          </FieldRow>

          <FieldRow field={F.self_designed_reason} required>
            <RadioGroup<StudentProfile["self_designed_reason"] & string>
              options={F.self_designed_reason.options!}
              value={p.self_designed_reason}
              onChange={(v) => update("self_designed_reason", v)}
            />
            {p.self_designed_reason === "OTHER" && (
              <input
                type="text"
                className="text-input mt8"
                placeholder="직접 입력"
                maxLength={40}
                value={p.self_designed_reason_other_text ?? ""}
                onChange={(e) => update("self_designed_reason_other_text", e.target.value)}
              />
            )}
          </FieldRow>
        </SectionCard>

        {/* ─────────── B. 진로 방향 ─────────── */}
        <SectionCard letter="B" title="진로 방향" subtitle="필수 2개 + 선택 1개">
          <FieldRow field={F.career_direction} required>
            <RadioGroup<StudentProfile["career_direction"] & string>
              options={F.career_direction.options!}
              value={p.career_direction}
              onChange={(v) => update("career_direction", v)}
            />
          </FieldRow>

          <FieldRow field={F.decision_maker} required>
            <RadioGroup<StudentProfile["decision_maker"] & string>
              options={F.decision_maker.options!}
              value={p.decision_maker}
              onChange={(v) => update("decision_maker", v)}
            />
            {p.decision_maker === "OTHER" && (
              <input
                type="text"
                className="text-input mt8"
                placeholder="직접 입력"
                maxLength={40}
                value={p.decision_maker_other_text ?? ""}
                onChange={(e) => update("decision_maker_other_text", e.target.value)}
              />
            )}
          </FieldRow>

          <FieldRow field={F.wants_counseling}>
            <RadioGroup<StudentProfile["wants_counseling"] & string>
              options={F.wants_counseling.options!}
              value={p.wants_counseling}
              onChange={(v) => update("wants_counseling", v)}
            />
          </FieldRow>
        </SectionCard>

        {/* ─────────── C. 학습·경험 배경 ─────────── */}
        <SectionCard letter="C" title="학습·경험 배경" subtitle="모두 선택">
          <FieldRow field={F.high_school_type}>
            <RadioGroup<StudentProfile["high_school_type"] & string>
              options={F.high_school_type.options!}
              value={p.high_school_type}
              onChange={(v) => update("high_school_type", v)}
            />
            {p.high_school_type === "OTHER" && (
              <input
                type="text"
                className="text-input mt8"
                placeholder="직접 입력"
                maxLength={40}
                value={p.high_school_type_other_text ?? ""}
                onChange={(e) => update("high_school_type_other_text", e.target.value)}
              />
            )}
          </FieldRow>

          {(p.high_school_type === "SPECIAL_PURPOSE" || p.high_school_type === "MEISTER") && (
            <FieldRow field={F.high_school_major}>
              <input
                type="text"
                className="text-input"
                placeholder={F.high_school_major.placeholder}
                maxLength={F.high_school_major.max_length}
                value={p.high_school_major}
                onChange={(e) => update("high_school_major", e.target.value)}
              />
            </FieldRow>
          )}

          <FieldRow field={F.work_experience}>
            <RadioGroup<boolean>
              options={F.work_experience.subfields!.has.options!}
              value={p.work_experience.has}
              onChange={(v) =>
                update("work_experience", { has: v, field: v ? p.work_experience.field : null })
              }
            />
            {p.work_experience.has === true && (
              <div className="mt8">
                <p className="muted profile-field__help">근무 분야</p>
                <RadioGroup<string>
                  options={F.work_experience.subfields!.field.options!}
                  value={p.work_experience.field}
                  onChange={(v) =>
                    update("work_experience", { ...p.work_experience, field: v })
                  }
                />
                {p.work_experience.field === "OTHER" && (
                  <input
                    type="text"
                    className="text-input mt8"
                    placeholder="직접 입력"
                    maxLength={30}
                    value={p.work_experience.field_other_text ?? ""}
                    onChange={(e) =>
                      update("work_experience", {
                        ...p.work_experience,
                        field_other_text: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            )}
          </FieldRow>

          <FieldRow field={F.part_time_experience}>
            <RadioGroup<boolean>
              options={F.part_time_experience.subfields!.has.options!}
              value={p.part_time_experience.has}
              onChange={(v) =>
                update("part_time_experience", {
                  has: v,
                  field: v ? p.part_time_experience.field : null,
                })
              }
            />
            {p.part_time_experience.has === true && (
              <div className="mt8">
                <p className="muted profile-field__help">주된 분야</p>
                <RadioGroup<string>
                  options={F.part_time_experience.subfields!.field.options!}
                  value={p.part_time_experience.field}
                  onChange={(v) =>
                    update("part_time_experience", { ...p.part_time_experience, field: v })
                  }
                />
                {p.part_time_experience.field === "OTHER" && (
                  <input
                    type="text"
                    className="text-input mt8"
                    placeholder="직접 입력"
                    maxLength={30}
                    value={p.part_time_experience.field_other_text ?? ""}
                    onChange={(e) =>
                      update("part_time_experience", {
                        ...p.part_time_experience,
                        field_other_text: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            )}
          </FieldRow>

          <FieldRow field={F.prior_college}>
            <RadioGroup<StudentProfile["prior_college"] & string>
              options={F.prior_college.options!}
              value={p.prior_college}
              onChange={(v) => update("prior_college", v)}
            />
          </FieldRow>
        </SectionCard>

        {/* ─────────── D. 학과 선택 현황 ─────────── */}
        <SectionCard letter="D" title="학과 선택 현황" subtitle="모두 선택 · 순차 노출">
          <FieldRow field={F.preferred_dept_1}>
            <DepartmentSelect
              value={p.preferred_dept_1}
              onChange={(v) => {
                // 1지망 해제 시 2·3지망도 함께 초기화
                if (v == null) {
                  setP((prev) => ({
                    ...prev,
                    preferred_dept_1: null,
                    preferred_dept_2: null,
                    preferred_dept_3: null,
                  }));
                } else {
                  update("preferred_dept_1", v);
                }
              }}
              already={[p.preferred_dept_2, p.preferred_dept_3]}
              placeholder="아직 정하지 않음"
            />
          </FieldRow>

          {p.preferred_dept_1 != null && (
            <FieldRow field={F.preferred_dept_2}>
              <DepartmentSelect
                value={p.preferred_dept_2}
                onChange={(v) => {
                  if (v == null) {
                    setP((prev) => ({ ...prev, preferred_dept_2: null, preferred_dept_3: null }));
                  } else {
                    update("preferred_dept_2", v);
                  }
                }}
                already={[p.preferred_dept_1, p.preferred_dept_3]}
                placeholder="없음"
              />
            </FieldRow>
          )}

          {p.preferred_dept_2 != null && (
            <FieldRow field={F.preferred_dept_3}>
              <DepartmentSelect
                value={p.preferred_dept_3}
                onChange={(v) => update("preferred_dept_3", v)}
                already={[p.preferred_dept_1, p.preferred_dept_2]}
                placeholder="없음"
              />
            </FieldRow>
          )}
        </SectionCard>

        {/* ─────────── 동의 + 검증 안내 ─────────── */}
        <div className="card">
          <label className="profile-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsentLocal(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2 }}
            />
            <span>{schema.consent.label_ko}</span>
          </label>
        </div>

        {showErrors && !canSubmit && (
          <div className="card profile-errors">
            <strong>다음 항목을 확인해 주세요:</strong>
            <ul>
              {missing
                .filter((k) => k !== "nickname" || !nicknameOk)
                .map((k) => (
                  <li key={k}>{F[k]?.label_ko ?? k} — 필수 응답입니다.</li>
                ))}
              {hasDup && <li>1·2·3지망에 같은 학과를 선택할 수 없습니다.</li>}
              {!consent && <li>익명 활용 동의에 체크해 주세요.</li>}
            </ul>
          </div>
        )}

        <div className="btn-row">
          <button className="ghost" onClick={onPrev}>← 이전</button>
          {/* 항상 클릭 가능. 미완료 시 에러 안내 노출. */}
          <button onClick={onSubmit}>다음: 진단 시작하기 →</button>
        </div>
      </main>
    </>
  );
}
