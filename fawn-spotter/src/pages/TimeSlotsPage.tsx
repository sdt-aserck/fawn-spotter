import { useState, useEffect } from "react";
import { load } from "@tauri-apps/plugin-store";
import NavBar from "../components/NavBar";
import ActivitySelectionModal from "../components/ActivitySelectionModal";
import { ActivityType } from "../Model/ActivityType";
import "../App.css";
import "./TimeSlotsPage.css";

const STORE_FILE = "fawn-spotter.json";
const TIMESLOTS_KEY = "timeSlots";
const ACTIVITIES_KEY = "activityTypes";

async function getStore() {
  return load(STORE_FILE, { defaults: {} });
}

interface TimeSlotRecord {
  id: string;
  timeStart: string;
  timeName: string;
  typicalActivityIds: string[];
  requiredActivityIds: string[];
}

interface FormState {
  timeStart: string;
  timeName: string;
  typicalActivityIds: string[];
  requiredActivityIds: string[];
}

function emptyForm(): FormState {
  return { timeStart: "", timeName: "", typicalActivityIds: [], requiredActivityIds: [] };
}

type ActivityListField = "typicalActivityIds" | "requiredActivityIds";
type ActivityModalTarget = { field: ActivityListField } | null;

function ActivityPills({
  ids,
  allActivities,
  onRemove,
  onAdd,
}: {
  ids: string[];
  allActivities: ActivityType[];
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="ts-activity-pills">
      {ids.map((id) => {
        const name = allActivities.find((a) => a.id === id)?.name ?? id;
        return (
          <span key={id} className="cabin-pill">
            {name}
            <button className="cabin-pill-remove" onClick={() => onRemove(id)}>✕</button>
          </span>
        );
      })}
      <button className="btn btn--small" onClick={onAdd}>+ Add Activity</button>
    </div>
  );
}

function TimeSlotForm({
  form,
  allActivities,
  onChange,
  onSubmit,
  submitLabel,
  onDelete,
}: {
  form: FormState;
  allActivities: ActivityType[];
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
  submitLabel: string;
  onDelete?: () => void;
}) {
  const [modalTarget, setModalTarget] = useState<ActivityModalTarget>(null);

  function removeActivity(field: ActivityListField, id: string) {
    onChange({ [field]: form[field].filter((x) => x !== id) });
  }

  function addActivity(field: ActivityListField, id: string) {
    if (!form[field].includes(id)) {
      onChange({ [field]: [...form[field], id] });
    }
  }

  return (
    <div className="ts-form">
      <div className="form-row">
        <label className="form-label">Time</label>
        <input
          className="form-input form-input--short"
          type="time"
          value={form.timeStart}
          onChange={(e) => onChange({ timeStart: e.currentTarget.value })}
        />
      </div>
      <div className="form-row">
        <label className="form-label">Name</label>
        <input
          className="form-input"
          type="text"
          value={form.timeName}
          placeholder="e.g. Morning Activity"
          onChange={(e) => onChange({ timeName: e.currentTarget.value })}
        />
      </div>
      <div className="form-row form-row--top">
        <label className="form-label">Typical Activities</label>
        <ActivityPills
          ids={form.typicalActivityIds}
          allActivities={allActivities}
          onRemove={(id) => removeActivity("typicalActivityIds", id)}
          onAdd={() => setModalTarget({ field: "typicalActivityIds" })}
        />
      </div>
      <div className="form-row form-row--top">
        <label className="form-label">Required Activities</label>
        <ActivityPills
          ids={form.requiredActivityIds}
          allActivities={allActivities}
          onRemove={(id) => removeActivity("requiredActivityIds", id)}
          onAdd={() => setModalTarget({ field: "requiredActivityIds" })}
        />
      </div>
      <div className="form-actions">
        {onDelete && (
          <button className="btn btn--danger" onClick={onDelete}>Delete</button>
        )}
        <button className="btn btn--primary" onClick={onSubmit} disabled={!form.timeName.trim()}>
          {submitLabel}
        </button>
      </div>

      {modalTarget && (
        <ActivitySelectionModal
          allActivities={allActivities}
          selectedIds={form[modalTarget.field]}
          onSelect={(id) => addActivity(modalTarget.field, id)}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}

function TimeSlotsPage() {
  const [timeSlots, setTimeSlots] = useState<TimeSlotRecord[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityType[]>([]);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editTarget, setEditTarget] = useState<TimeSlotRecord | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [sort, setSort] = useState<"none" | "time" | "name">("none");

  useEffect(() => {
    getStore().then(async (store) => {
      const savedActs = await store.get<ActivityType[]>(ACTIVITIES_KEY);
      setAllActivities(savedActs ?? []);
      const savedSlots = await store.get<TimeSlotRecord[]>(TIMESLOTS_KEY);
      if (savedSlots) setTimeSlots(savedSlots);
    });
  }, []);

  async function saveTimeSlots(updated: TimeSlotRecord[]) {
    const store = await getStore();
    await store.set(TIMESLOTS_KEY, updated);
  }

  function addTimeSlot() {
    if (!addForm.timeName.trim()) return;
    const record: TimeSlotRecord = { id: crypto.randomUUID(), ...addForm, timeName: addForm.timeName.trim() };
    const updated = [...timeSlots, record];
    setTimeSlots(updated);
    saveTimeSlots(updated);
    setAddForm(emptyForm());
  }

  function openEdit(slot: TimeSlotRecord) {
    setEditTarget(slot);
    setEditForm({
      timeStart: slot.timeStart,
      timeName: slot.timeName,
      typicalActivityIds: slot.typicalActivityIds,
      requiredActivityIds: slot.requiredActivityIds,
    });
  }

  function saveEdit() {
    if (!editTarget) return;
    const updated = timeSlots.map((s) =>
      s.id === editTarget.id ? { ...s, ...editForm, timeName: editForm.timeName.trim() } : s
    );
    setTimeSlots(updated);
    saveTimeSlots(updated);
    setEditTarget(null);
  }

  function deleteTimeSlot() {
    if (!editTarget) return;
    const updated = timeSlots.filter((s) => s.id !== editTarget.id);
    setTimeSlots(updated);
    saveTimeSlots(updated);
    setEditTarget(null);
  }

  const sortedSlots = [...timeSlots].sort((a, b) => {
    if (sort === "time") return a.timeStart.localeCompare(b.timeStart);
    if (sort === "name") return a.timeName.localeCompare(b.timeName);
    return 0;
  });

  return (
    <div className="timeslots-bg">
      <NavBar />
      <div className="page">
        <header className="site-header">
          <h1 className="site-title">🕐 Timeslots 🕐</h1>
          <hr className="divider" />
        </header>
        <main>

          {/* Add Timeslot */}
          <details className="collapsible">
            <summary className="collapsible-summary">Add Timeslot</summary>
            <div className="collapsible-body">
              <TimeSlotForm
                form={addForm}
                allActivities={allActivities}
                onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))}
                onSubmit={addTimeSlot}
                submitLabel="Add Timeslot"
              />
            </div>
          </details>

          {/* Timeslot List */}
          <details className="collapsible" open>
            <summary className="collapsible-summary">
              Timeslot List {timeSlots.length > 0 && <span className="ts-count">({timeSlots.length})</span>}
            </summary>
            <div className="collapsible-body">
              <div className="sort-bar">
                <span className="sort-label">Sort:</span>
                {(["none", "time", "name"] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`btn btn--sort${sort === opt ? " btn--sort-active" : ""}`}
                    onClick={() => setSort(opt)}
                  >
                    {opt === "none" ? "No Sort" : opt === "time" ? "Time" : "Name"}
                  </button>
                ))}
              </div>
              {timeSlots.length === 0
                ? <span className="tag-empty">No timeslots yet.</span>
                : sortedSlots.map((slot) => (
                    <div key={slot.id} className="staff-row">
                      <span className="staff-name">{slot.timeName}</span>
                      <span className="ts-time">{slot.timeStart}</span>
                      <span className="ts-activity-summary">
                        {slot.typicalActivityIds.length > 0 && (
                          <span className="ts-badge">
                            {slot.typicalActivityIds.length} typical
                          </span>
                        )}
                        {slot.requiredActivityIds.length > 0 && (
                          <span className="ts-badge ts-badge--required">
                            {slot.requiredActivityIds.length} required
                          </span>
                        )}
                      </span>
                      <button className="btn btn--edit" onClick={() => openEdit(slot)}>Edit</button>
                    </div>
                  ))
              }
            </div>
          </details>

        </main>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Timeslot</h2>
            <TimeSlotForm
              form={editForm}
              allActivities={allActivities}
              onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              onSubmit={saveEdit}
              submitLabel="Save"
              onDelete={deleteTimeSlot}
            />
            <button className="btn btn--cancel modal-cancel" onClick={() => setEditTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeSlotsPage;
