/**
 * 학과 카드 상세 모달
 * ───────────────────
 * 결과지 TOP5의 학과 카드를 클릭하면 열림.
 * department_cards.json 의 intro_short / talent_type / top3_jobs / certifications 노출.
 *
 * 1차 빌드 확장(2026-05-29):
 *   - 진입 가능성 라벨(헤더 우측)
 *   - 1학기 추천 교과목 섹션 (진입 가능 학과만)
 *   - 별도 모집 학과 안내 박스 (진입 불가 4개 학과)
 */
import { useEffect } from "react";
import {
  getCard,
  courseData,
  accessibilityData,
} from "../lib/dataLoader";
import {
  getCoursesForDept,
  isFreeMajorAccessible,
} from "@lib/courses";

interface Props {
  code: string | null;
  fit?: { percent: number; rank: number } | null;
  onClose: () => void;
}

export default function DepartmentDetailModal({ code, fit, onClose }: Props) {
  useEffect(() => {
    if (!code) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, onClose]);

  if (!code) return null;
  const card = getCard(code);
  if (!card) return null;

  const accessible = isFreeMajorAccessible(code, accessibilityData);
  const courses = accessible ? getCoursesForDept(code, courseData) : null;
  const nameDiffers =
    courses && courses.name_in_guidebook && courses.name_in_guidebook !== card.name;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="dept-modal__head">
          <div>
            <p className="muted small" style={{ margin: 0 }}>{card.school}</p>
            <h2 style={{ margin: "2px 0 0" }}>{card.name}</h2>
            <span
              className={`access-label ${accessible ? "access-label--ok" : "access-label--no"}`}
              style={{ marginTop: 8 }}
              title={accessible ? undefined : accessibilityData.not_accessible_notice}
            >
              {accessible ? accessibilityData.labels.ACCESSIBLE : accessibilityData.labels.NOT_ACCESSIBLE}
            </span>
          </div>
          {fit && (
            <div className="dept-modal__fit">
              <span className="dept-modal__rank">#{fit.rank}</span>
              <span className="dept-modal__percent">{fit.percent.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {card.intro_short && (
          <section className="dept-modal__section">
            <h3>학과 소개</h3>
            <p className="dept-modal__text">{card.intro_short}</p>
          </section>
        )}

        {card.talent_type && (
          <section className="dept-modal__section">
            <h3>인재상</h3>
            <p className="dept-modal__text">{card.talent_type}</p>
          </section>
        )}

        {card.top3_jobs && (
          <section className="dept-modal__section">
            <h3>주요 진출 직업 (TOP 3)</h3>
            <p className="dept-modal__text">{card.top3_jobs}</p>
          </section>
        )}

        {card.certifications && (
          <section className="dept-modal__section">
            <h3>관련 자격증</h3>
            <p className="dept-modal__text">{card.certifications}</p>
          </section>
        )}

        {/* 1학기 추천 교과목 — 진입 가능 학과만 */}
        {accessible && courses && courses.courses.length > 0 && (
          <section className="dept-modal__section dept-modal__courses">
            <h3>
              <span aria-hidden>📚</span> 1학기 추천 교과목
              <span className="dept-modal__courses-hint muted small">
                3과목 이상 권장
              </span>
            </h3>
            {nameDiffers && (
              <p className="muted small dept-modal__courses-alias">
                ※ 가이드북에는 ‘{courses.name_in_guidebook}’로 표기됩니다.
              </p>
            )}
            <ul className="course-list">
              {courses.courses.map((c) => (
                <li
                  key={c.name}
                  className={`course-item ${c.strongly_recommended ? "course-item--strong" : ""}`}
                >
                  <span className="course-item__star" aria-hidden>
                    {c.strongly_recommended ? "⭐" : "·"}
                  </span>
                  <span className="course-item__name">{c.name}</span>
                  <span className="course-item__credits">{c.credits}학점</span>
                  {c.strongly_recommended && (
                    <span className="course-item__badge">강력추천</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="muted small" style={{ margin: "10px 0 0" }}>
              ※ 출처: {courseData.source}
            </p>
          </section>
        )}

        {/* 별도 모집 학과 안내 — 진입 불가 4개 학과 */}
        {!accessible && (
          <section className="dept-modal__section dept-modal__not-accessible">
            <h3>
              <span aria-hidden>ⓘ</span> 별도 모집 학과 안내
            </h3>
            <p className="dept-modal__text">
              {accessibilityData.not_accessible_notice}
            </p>
          </section>
        )}

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
