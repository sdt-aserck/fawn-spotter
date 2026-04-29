import { useState } from "react";

interface Props {
  currentDate: string;
  onSave: (date: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EditScheduleDateModal({ currentDate, onSave, onDelete, onClose }: Props) {
  const [date, setDate] = useState(currentDate);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">Delete Schedule</h2>
          <p style={{ fontFamily: "Times New Roman, serif", fontSize: 18, color: "#3a1a1a", margin: 0 }}>
            Are you sure you want to delete the schedule for <strong>{currentDate}</strong>? This cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="btn btn--danger" onClick={onDelete}>Delete</button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

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
          <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
            Delete Schedule
          </button>
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
