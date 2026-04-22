import { useState } from "react";

interface Props {
  currentDate: string;
  onSave: (date: string) => void;
  onClose: () => void;
}

export function EditScheduleDateModal({ currentDate, onSave, onClose }: Props) {
  const [date, setDate] = useState(currentDate);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit Schedule Date</h2>
        <div className="form-row">
          <label className="form-label">Date</label>
          <input
            className="form-input sched-date-input"
            type="date"
            value={date}
            autoFocus
            onChange={(e) => setDate(e.currentTarget.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn--primary" disabled={!date} onClick={() => { if (date) onSave(date); }}>
            Save
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
