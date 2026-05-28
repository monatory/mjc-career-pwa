/**
 * 자격증 요건 학과 경고 배너
 * ─────────────────────────
 * BIZ_WELF 사회복지과처럼 1학기 필수 과목 누락 시 자격증 취득이
 * 어려운 학과를 학생에게 안내한다.
 *
 * 노출 정책:
 *   - placement="top"   : TOP1~3 에 자격증 요건 학과가 있을 때 결과지 상단
 *   - placement="modal" : TOP4~8 에 있을 때 해당 학과 카드 모달 안
 *
 * 톤: warning_level === "HIGH" 라도 위협적이지 않게. 빨간 강조는
 *     아이콘과 좌측 라인 정도로만 쓰고, 학생이 결정에 집중할 수 있도록
 *     "꼭 확인하세요" 정도의 어조 유지.
 */
import { getCertificationRequirements } from "@lib/courses";
import { certificationData } from "../lib/dataLoader";

interface Props {
  deptCode: string;
  deptName: string;
  placement: "top" | "modal";
}

export default function CertificationBanner({ deptCode, deptName, placement }: Props) {
  const req = getCertificationRequirements(deptCode, certificationData);
  if (!req) return null;

  const primary = req.certifications[0];
  if (!primary) return null;
  const additional = req.certifications.slice(1);

  function scrollToCta() {
    const target = document.getElementById("counseling-cta");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const level = (req.warning_level ?? "HIGH").toLowerCase();

  return (
    <div
      className={`cert-banner cert-banner--${level} cert-banner--${placement}`}
      role="region"
      aria-label={`${deptName} 1학기 자격증 요건 안내`}
    >
      <div className="cert-banner__head">
        <span className="cert-banner__icon" aria-hidden>
          ⚠️
        </span>
        <strong>
          {deptName}를 진지하게 고려하신다면 꼭 확인하세요
        </strong>
      </div>

      <p className="cert-banner__lead">
        <strong>{primary.name}</strong> 자격증을 취득하려면 1학기에 다음{" "}
        <strong>{primary.required_courses_1st_semester.length}개 과목</strong>을
        모두 수강해야 졸업 전 자격증 취득이 가능합니다.
      </p>

      <ul className="cert-banner__courses">
        {primary.required_courses_1st_semester.map((name) => (
          <li key={name}>
            <span className="cert-banner__dot" aria-hidden>
              ●
            </span>
            {name}
          </li>
        ))}
      </ul>

      {additional.length > 0 && (
        <p className="cert-banner__additional">
          + 추가로{" "}
          {additional
            .map(
              (c) =>
                `${c.name}(1학기 필수 ${c.required_courses_1st_semester.length}과목)`,
            )
            .join(" · ")}{" "}
          요건도 함께 검토가 필요합니다.
        </p>
      )}

      <p className="cert-banner__warning">
        ※ 1학기 누락 시 자격증 취득이 어려울 수 있으므로 수강신청 전 반드시
        학과 상담을 권장합니다.
      </p>

      <button
        type="button"
        className="cert-banner__cta"
        onClick={scrollToCta}
      >
        상담 신청하기 →
      </button>
    </div>
  );
}
