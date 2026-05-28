// lib/courses.js 의 TS 타입 선언
// 결과지·수강계획서 화면 보조용. DNA·적합도 공식과 무관.

export interface CourseItem {
  name: string;
  credits: number;
  strongly_recommended?: boolean;
  is_pass_fail?: boolean;
  note?: string;
}

export interface CommonCourses {
  free_major_dedicated: CourseItem[];
  liberal_required: CourseItem[];
  strongly_recommended_liberal: CourseItem[];
}

export interface DepartmentCourseEntry {
  name_in_guidebook: string;
  duration_years: 2 | 3;
  courses: CourseItem[];
}

export interface CourseData {
  version: string;
  source: string;
  notes?: Record<string, string>;
  common_courses: CommonCourses;
  departments: Record<string, DepartmentCourseEntry>;
}

export interface CertificationItem {
  name: string;
  required_courses_1st_semester: string[];
  elective_courses_1st_semester?: string[];
}

export interface CertificationEntry {
  dept_name: string;
  warning_level: "HIGH" | "MEDIUM" | "LOW";
  warning_message: string;
  certifications: CertificationItem[];
  pending_dept_data?: boolean;
}

export interface CertificationData {
  version: string;
  source: string;
  notes?: Record<string, string>;
  departments: Record<string, CertificationEntry>;
}

export type AccessibilityLabel = "ACCESSIBLE" | "NOT_ACCESSIBLE";

export interface AccessibilityData {
  version: string;
  source: string;
  notes?: Record<string, string>;
  labels: Record<AccessibilityLabel, string>;
  not_accessible_notice: string;
  accessibility: Record<string, AccessibilityLabel>;
}

export interface CoursesForDeptResult {
  name_in_guidebook: string;
  duration_years: 2 | 3;
  courses: CourseItem[];
}

export interface CertificationRequirementsResult {
  warning_level: "HIGH" | "MEDIUM" | "LOW";
  warning_message: string;
  certifications: CertificationItem[];
  pending_dept_data?: boolean;
}

export interface CreditRangeResult {
  is_valid: boolean;
  status: "TOO_LOW" | "OK" | "TOO_HIGH";
  message: string;
}

export function getCoursesForDept(
  deptCode: string,
  courseData: CourseData,
): CoursesForDeptResult | null;

export function isFreeMajorAccessible(
  deptCode: string,
  accessibilityData: AccessibilityData,
): boolean;

export function getCertificationRequirements(
  deptCode: string,
  certData: CertificationData,
): CertificationRequirementsResult | null;

export function calcSelectedCredits(
  selectedCourses: Array<{ name?: string; credits?: number; is_pass_fail?: boolean }>,
): number;

export function validateCreditRange(totalCredits: number): CreditRangeResult;
