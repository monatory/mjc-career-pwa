/**
 * 일관된 확인 모달 — confirm()을 대체.
 * STEP 1 "이어서 진행" 모달과 같은 .modal-backdrop / .modal 스타일 사용.
 *
 * 사용:
 *   const [open, setOpen] = useState(false);
 *   <ConfirmModal
 *     open={open}
 *     title="응답을 모두 초기화하시겠습니까?"
 *     body="진행 중인 응답이 모두 사라집니다."
 *     confirmText="초기화"
 *     onConfirm={() => { clearAll(); setOpen(false); }}
 *     onCancel={() => setOpen(false)}
 *     tone="danger"
 *   />
 */
interface Props {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  body,
  confirmText = "확인",
  cancelText = "취소",
  tone = "default",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {body && <div className="modal__body">{body}</div>}
        <div className="btn-row" style={{ marginTop: 18 }}>
          <button className="ghost" onClick={onCancel}>{cancelText}</button>
          <button
            onClick={onConfirm}
            style={tone === "danger" ? { background: "var(--c-danger)" } : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
