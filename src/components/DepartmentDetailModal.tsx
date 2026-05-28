/**
 * 학과 카드 상세 모달
 * ───────────────────
 * 결과지 TOP5의 학과 카드를 클릭하면 열림.
 * department_cards.json 의 intro_short / talent_type / top3_jobs / certifications 노출.
 */
import { useEffect } from "react";
import { getCard } from "../lib/dataLoader";

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

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="dept-modal__head">
          <div>
            <p className="muted small" style={{ margin: 0 }}>{card.school}</p>
            <h2 style={{ margin: "2px 0 0" }}>{card.name}</h2>
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

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
