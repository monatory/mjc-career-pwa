// data/*.json 정적 import. Vite는 JSON을 ESM으로 자동 변환.
// 빌드 시 번들에 포함되어 오프라인에서도 작동 (CLAUDE.md 10장 Q&A 마지막 항목).

import questionBankRaw from "@data/question_bank.json";
import departmentsDnaRaw from "@data/departments_dna.json";
import departmentCardsRaw from "@data/department_cards.json";
import studentProfileSchemaRaw from "@data/student_profile_schema.json";

import type {
  QuestionBank,
  DepartmentsDna,
  DepartmentCard,
} from "@lib/recommendation_engine";

export const questionBank = questionBankRaw as unknown as QuestionBank;
export const departmentsDna = departmentsDnaRaw as unknown as DepartmentsDna;
export const departmentCards = departmentCardsRaw as unknown as DepartmentCard[];
export const studentProfileSchema = studentProfileSchemaRaw as unknown as StudentProfileSchema;

/* ── 응답자 정보(STEP 2) 스키마 타입 — student_profile_schema.json 과 1:1 매핑 ── */
export interface StudentProfileSchema {
  version: string;
  description: string;
  purpose: string;
  sections: Array<{ key: string; title: string; subtitle: string; fields: string[] }>;
  fields: Record<string, FieldDef>;
  department_groups: Array<{ school: string; codes: string[] }>;
  validation: {
    required_field_keys: string[];
    duplicate_preference_check: { fields: string[]; rule: string };
  };
  consent: { key: string; label_ko: string; required: boolean };
}

export interface FieldOption {
  value: string | number | boolean;
  label_ko: string;
  allow_text?: boolean;
}

export interface FieldDef {
  order: number;
  section: string;
  label_ko: string;
  help_ko?: string;
  type:
    | "text"
    | "dropdown"
    | "radio_buttons"
    | "department_dropdown"
    | "compound";
  required: boolean;
  min_length?: number;
  max_length?: number;
  placeholder?: string;
  range?: { min: number; max: number };
  label_format?: string;
  options?: FieldOption[];
  options_source?: string;
  visible_if?: {
    field?: string;
    in?: string[];
    not_null?: boolean;
    subfield?: string;
    equals?: unknown;
  };
  subfields?: Record<string, FieldDef>;
}

// 학과 코드로 카드 조회 (결과지에서 사용)
const cardByCode = new Map(departmentCards.map((c) => [c.code, c]));
export function getCard(code: string): DepartmentCard | undefined {
  return cardByCode.get(code);
}

// 학과 코드로 DNA 학과 객체 조회 (추천 사유 생성용)
const deptByCode = new Map(
  departmentsDna.departments.map((d) => [d.code, d])
);
export function getDepartment(code: string) {
  return deptByCode.get(code);
}
