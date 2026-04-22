import { useState, useRef, useEffect } from "react";
import { ActivityType } from "../Model/ActivityType";
import "./ActivitySelectionModal.css";

interface ActivitySelectionModalProps {
  allActivities: ActivityType[];
  selectedIds: string[];
  typicalActivityIds?: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

function ActivitySelectionModal({ allActivities, selectedIds, typicalActivityIds, onSelect, onClose }: ActivitySelectionModalProps) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const available = allActivities.filter(
    (a) => !selectedIds.includes(a.id) && a.name.toLowerCase().includes(search.toLowerCase())
  );

  const typicalSet = new Set(typicalActivityIds ?? []);
  const typical = available.filter((a) => typicalSet.has(a.id));
  const others = available.filter((a) => !typicalSet.has(a.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box activity-selection-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Select Activity</h2>
        <input
          ref={searchRef}
          className="form-input activity-selection-search"
          type="text"
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <div className="activity-selection-list">
          {available.length === 0
            ? <span className="activity-selection-empty">No activities match.</span>
            : (
              <>
                {typical.map((a) => (
                  <button key={a.id} className="activity-selection-item" onClick={() => { onSelect(a.id); onClose(); }}>
                    {a.name}
                  </button>
                ))}
                {typical.length > 0 && others.length > 0 && (
                  <div className="activity-selection-divider" />
                )}
                {others.map((a) => (
                  <button key={a.id} className="activity-selection-item" onClick={() => { onSelect(a.id); onClose(); }}>
                    {a.name}
                  </button>
                ))}
              </>
            )
          }
        </div>
        <button className="btn btn--cancel modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default ActivitySelectionModal;
