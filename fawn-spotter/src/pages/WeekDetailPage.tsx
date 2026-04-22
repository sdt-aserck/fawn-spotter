import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { load } from "@tauri-apps/plugin-store";
import NavBar from "../components/NavBar";
import { EditScheduleDateModal } from "../components/EditScheduleDateModal";
import { StaffMember } from "../Model/StaffMember";
import type { WeekRecord, ScheduleRecord } from "./SchedulingPage";
import "../App.css";
import "./WeekDetailPage.css";

const STORE_FILE = "fawn-spotter.json";
const WEEKS_KEY = "weeks";
const STAFF_KEY = "staff";
const SCHEDULES_KEY = "schedules";

async function getStore() {
  return load(STORE_FILE, { defaults: {} });
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} - ${Number(month)}/${Number(day)}/${year.slice(2)}`;
}

function StaffPickerModal({
  available,
  onSelect,
  onClose,
}: {
  available: StaffMember[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const filtered = available.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Mark Staff Absent</h2>
        <input
          ref={searchRef}
          className="form-input"
          type="text"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <div className="week-staff-modal-list">
          {filtered.length === 0
            ? <span className="tag-empty">No staff match.</span>
            : filtered.map((s) => (
                <button
                  key={s.id}
                  className="week-staff-modal-item"
                  onClick={() => { onSelect(s.id); onClose(); }}
                >
                  {s.name}
                </button>
              ))
          }
        </div>
        <button className="btn btn--cancel modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function SchedulePickerModal({
  available,
  onSelect,
  onClose,
}: {
  available: ScheduleRecord[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Assign Schedule</h2>
        <div className="week-staff-modal-list">
          {available.length === 0
            ? <span className="tag-empty">No unassigned schedules.</span>
            : available.map((s) => (
                <button
                  key={s.id}
                  className="week-staff-modal-item"
                  onClick={() => { onSelect(s.id); onClose(); }}
                >
                  {formatDate(s.date)}
                </button>
              ))
          }
        </div>
        <button className="btn btn--cancel modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function WeekDetailPage() {
  const { weekId } = useParams<{ weekId: string }>();
  const navigate = useNavigate();
  const [week, setWeek] = useState<WeekRecord | null>(null);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [showStaffPicker, setShowStaffPicker] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);
  const [minOffPeriods, setMinOffPeriods] = useState(0);

  useEffect(() => {
    getStore().then(async (store) => {
      const savedWeeks = await store.get<WeekRecord[]>(WEEKS_KEY);
      const found = savedWeeks?.find((w) => w.id === weekId) ?? null;
      setWeek(found);
      setNewScheduleDate(found?.startDate ?? "");
      const savedStaff = await store.get<StaffMember[]>(STAFF_KEY);
      setAllStaff(savedStaff ?? []);
      const savedSchedules = await store.get<ScheduleRecord[]>(SCHEDULES_KEY);
      setSchedules(savedSchedules ?? []);
    });
  }, [weekId]);

  async function saveWeek(updated: WeekRecord) {
    const store = await getStore();
    const savedWeeks = await store.get<WeekRecord[]>(WEEKS_KEY);
    await store.set(WEEKS_KEY, (savedWeeks ?? []).map((w) => w.id === weekId ? updated : w));
    setWeek(updated);
  }

  async function saveSchedules(updated: ScheduleRecord[]) {
    const store = await getStore();
    await store.set(SCHEDULES_KEY, updated);
    setSchedules(updated);
  }

  async function deleteWeek() {
    const store = await getStore();
    const saved = await store.get<WeekRecord[]>(WEEKS_KEY);
    await store.set(WEEKS_KEY, (saved ?? []).filter((w) => w.id !== weekId));
    // unassign any schedules belonging to this week
    const savedSchedules = await store.get<ScheduleRecord[]>(SCHEDULES_KEY);
    if (savedSchedules) {
      const unassigned = savedSchedules.map((s) => s.weekId === weekId ? { ...s, weekId: null } : s);
      await store.set(SCHEDULES_KEY, unassigned);
    }
    navigate("/scheduling");
  }

  function setNumCampers(val: string) {
    if (!week) return;
    saveWeek({ ...week, numCampers: Math.max(0, parseInt(val, 10) || 0) });
  }

  function addExcluded(staffId: string) {
    if (!week) return;
    const ids = week.excludedStaffIds ?? [];
    if (!ids.includes(staffId)) saveWeek({ ...week, excludedStaffIds: [...ids, staffId] });
  }

  function removeExcluded(staffId: string) {
    if (!week) return;
    saveWeek({ ...week, excludedStaffIds: (week.excludedStaffIds ?? []).filter((id) => id !== staffId) });
  }

  function createAndAssignSchedule() {
    if (!newScheduleDate) return;
    const record: ScheduleRecord = { id: crypto.randomUUID(), date: newScheduleDate, weekId: weekId!, timeslotIds: [], activities: [] };
    const updated = [...schedules, record];
    saveSchedules(updated);
    setNewScheduleDate(week?.startDate ?? "");
  }

  function assignSchedule(scheduleId: string) {
    const updated = schedules.map((s) => s.id === scheduleId ? { ...s, weekId: weekId! } : s);
    saveSchedules(updated);
  }

  function updateScheduleDate(scheduleId: string, date: string) {
    const updated = schedules.map((s) => s.id === scheduleId ? { ...s, date } : s);
    saveSchedules(updated);
    setEditScheduleId(null);
  }

  function removeSchedule(scheduleId: string) {
    const updated = schedules.map((s) => s.id === scheduleId ? { ...s, weekId: null } : s);
    saveSchedules(updated);
  }

  const excludedIds = week?.excludedStaffIds ?? [];
  const excludedStaff = allStaff.filter((s) => excludedIds.includes(s.id));
  const availableStaff = allStaff.filter((s) => !excludedIds.includes(s.id));

  const weekSchedules = [...schedules.filter((s) => s.weekId === weekId)].sort((a, b) => a.date.localeCompare(b.date));
  const unassignedSchedules = [...schedules.filter((s) => s.weekId === null)].sort((a, b) => a.date.localeCompare(b.date));

  const offCounts = useMemo(() => {
    const map = new Map<string, number>(availableStaff.map((s) => [s.id, 0]));
    for (const sched of weekSchedules) {
      for (const tsId of sched.timeslotIds ?? []) {
        const slotActivities = (sched.activities ?? []).filter(
          (a) => (a.timeslot as unknown as { id: string }).id === tsId
        );
        const scheduledIds = new Set(
          slotActivities.flatMap((a) => [
            ...((a.leader as { id: string } | null) ? [(a.leader as { id: string }).id] : []),
            ...(a.staffMembers as { id: string }[]).map((sm) => sm.id),
          ])
        );
        for (const s of availableStaff) {
          if (!scheduledIds.has(s.id)) {
            map.set(s.id, (map.get(s.id) ?? 0) + 1);
          }
        }
      }
    }
    return map;
  }, [weekSchedules, availableStaff]);

  return (
    <div className="week-detail-bg">
      <NavBar />
      <div className="page">
        <div className="week-detail-back">
          <button className="btn btn--cancel" onClick={() => navigate("/scheduling")}>← Weeks</button>
        </div>
        <header className="site-header">
          <h1 className="site-title">{week ? week.name : "Week"}</h1>
          {week && (week.startDate || week.endDate) && (
            <p className="week-detail-dates">
              {week.startDate ? formatDate(week.startDate) : "?"}
              {" – "}
              {week.endDate ? formatDate(week.endDate) : "?"}
            </p>
          )}
          <hr className="divider" />
        </header>
        <main>
          <div className="week-detail-card">

            <div className="week-detail-card-top">
              <div className="form-row">
                <label className="form-label">Num. Campers</label>
                <input
                  className="form-input sched-num-input"
                  type="number"
                  min="0"
                  step="1"
                  value={week?.numCampers ?? 0}
                  onChange={(e) => setNumCampers(e.currentTarget.value)}
                />
              </div>
              <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
                Delete Week
              </button>
            </div>

            <div className="week-excluded-section">
              <div className="week-excluded-header">
                <span className="week-excluded-label">Staff Absent This Week</span>
                {availableStaff.length > 0 && (
                  <button className="btn btn--small" onClick={() => setShowStaffPicker(true)}>+ Add</button>
                )}
              </div>
              {allStaff.length === 0
                ? <span className="tag-empty">No staff added yet.</span>
                : excludedStaff.length === 0
                  ? <span className="tag-empty">None excluded.</span>
                  : (
                    <ul className="week-excluded-list">
                      {excludedStaff.map((s) => (
                        <li key={s.id} className="week-excluded-row">
                          <span className="week-excluded-name">{s.name}</span>
                          <button
                            className="btn btn--small week-excluded-remove"
                            onClick={() => removeExcluded(s.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
              }
            </div>

          </div>

          <div className="week-schedules-box">
            <div className="week-schedules-header">
              <span className="week-schedules-title">Schedules This Week</span>
              {unassignedSchedules.length > 0 && (
                <button className="btn btn--small" onClick={() => setShowSchedulePicker(true)}>+ Assign Existing</button>
              )}
            </div>

            <div className="week-schedules-create">
              <input
                className="form-input sched-date-input"
                type="date"
                value={newScheduleDate}
                onChange={(e) => setNewScheduleDate(e.currentTarget.value)}
              />
              <button
                className="btn btn--primary"
                onClick={createAndAssignSchedule}
                disabled={!newScheduleDate}
              >
                + New Schedule
              </button>
            </div>

            {weekSchedules.length === 0
              ? <span className="tag-empty">No schedules assigned to this week.</span>
              : (
                <ul className="week-excluded-list">
                  {weekSchedules.map((s) => (
                    <li key={s.id} className="week-excluded-row">
                      <Link to={`/scheduling/schedule/${s.id}`} className="week-excluded-name week-schedule-link">
                        {formatDate(s.date)}
                      </Link>
                      <button
                        className="btn btn--small week-excluded-remove"
                        onClick={() => setEditScheduleId(s.id)}
                      >
                        Edit Date
                      </button>
                      <button
                        className="btn btn--small week-excluded-remove"
                        onClick={() => removeSchedule(s.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>

          <div className="week-off-periods-box">
            <div className="week-off-periods-header">
              <span className="week-schedules-title">Counselor OFF Periods</span>
              <div className="week-off-periods-control">
                <label className="week-off-periods-label">Min. off periods</label>
                <input
                  className="form-input sched-num-input"
                  type="number"
                  min="0"
                  step="1"
                  value={minOffPeriods}
                  onChange={(e) => setMinOffPeriods(Math.max(0, parseInt(e.currentTarget.value, 10) || 0))}
                />
              </div>
            </div>
            {availableStaff.length === 0
              ? <span className="tag-empty">No active staff this week.</span>
              : weekSchedules.length === 0
                ? <span className="tag-empty">No schedules assigned yet.</span>
                : (
                  <ul className="week-excluded-list">
                    {[...availableStaff]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((s) => {
                        const count = offCounts.get(s.id) ?? 0;
                        const flag = minOffPeriods > 0 && count < minOffPeriods;
                        return (
                          <li key={s.id} className={`week-excluded-row${flag ? " week-off-periods-row--flagged" : ""}`}>
                            <span className="week-excluded-name">{s.name}</span>
                            <span className="week-off-periods-count">{count}</span>
                          </li>
                        );
                      })
                    }
                  </ul>
                )
            }
          </div>
        </main>
      </div>

      {showStaffPicker && (
        <StaffPickerModal
          available={availableStaff}
          onSelect={addExcluded}
          onClose={() => setShowStaffPicker(false)}
        />
      )}

      {showSchedulePicker && (
        <SchedulePickerModal
          available={unassignedSchedules}
          onSelect={assignSchedule}
          onClose={() => setShowSchedulePicker(false)}
        />
      )}

      {editScheduleId && (() => {
        const s = schedules.find((s) => s.id === editScheduleId)!;
        return (
          <EditScheduleDateModal
            currentDate={s.date}
            onSave={(date) => updateScheduleDate(editScheduleId, date)}
            onClose={() => setEditScheduleId(null)}
          />
        );
      })()}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete Week?</h2>
            <p className="week-delete-confirm-text">
              Are you sure you want to delete <strong>{week?.name}</strong>? This cannot be undone.
            </p>
            <div className="form-actions">
              <button className="btn btn--cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={deleteWeek}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeekDetailPage;
