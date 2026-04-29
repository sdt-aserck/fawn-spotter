import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import titleGif from "../assets/page-titles/scheduling.gif";
import { load } from "@tauri-apps/plugin-store";
import NavBar from "../components/NavBar";
import { EditScheduleDateModal } from "../components/EditScheduleDateModal";
import type { Activity } from "../Model/Activity";
import "../App.css";
import "./SchedulingPage.css";

const STORE_FILE = "fawn-spotter.json";
const WEEKS_KEY = "weeks";
const SCHEDULES_KEY = "schedules";

async function getStore() {
  return load(STORE_FILE, { defaults: {} });
}

export interface WeekRecord {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  numCampers: number;
  excludedStaffIds: string[];
  staffUnits?: Record<string, string>;
}

export interface ScheduleRecord {
  id: string;
  date: string;
  weekId: string | null;
  timeslotIds: string[];
  activities: Activity[];
}

function SchedulingPage() {
  const [weeks, setWeeks] = useState<WeekRecord[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [weekName, setWeekName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<"none" | "startDate">("none");
  const [scheduleSort, setScheduleSort] = useState<"none" | "date">("none");
  const [confirmDuplicateId, setConfirmDuplicateId] = useState<string | null>(null);
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);
  const [editWeekId, setEditWeekId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  useEffect(() => {
    getStore().then(async (store) => {
      const savedWeeks = await store.get<WeekRecord[]>(WEEKS_KEY);
      if (savedWeeks) setWeeks(savedWeeks);
      const savedSchedules = await store.get<ScheduleRecord[]>(SCHEDULES_KEY);
      if (savedSchedules) setSchedules(savedSchedules);
    });
  }, []);

  async function saveWeeks(updated: WeekRecord[]) {
    const store = await getStore();
    await store.set(WEEKS_KEY, updated);
  }

  async function saveSchedules(updated: ScheduleRecord[]) {
    const store = await getStore();
    await store.set(SCHEDULES_KEY, updated);
  }

  function updateScheduleDate(scheduleId: string, date: string) {
    const updated = schedules.map((s) => s.id === scheduleId ? { ...s, date } : s);
    setSchedules(updated);
    saveSchedules(updated);
    setEditScheduleId(null);
  }

  function deleteSchedule(scheduleId: string) {
    const updated = schedules.filter((s) => s.id !== scheduleId);
    setSchedules(updated);
    saveSchedules(updated);
    setEditScheduleId(null);
  }

  function duplicateWeek(weekId: string) {
    const original = weeks.find((w) => w.id === weekId);
    if (!original) return;

    const newWeekId = crypto.randomUUID();

    const newWeek: WeekRecord = {
      ...original,
      id: newWeekId,
      name: `${original.name} - Copy`,
      startDate: "",
      endDate: "",
    };

    const weekSchedules = schedules.filter((s) => s.weekId === weekId);
    const newSchedules: ScheduleRecord[] = weekSchedules.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      date: "2026-03-04",
      weekId: newWeekId,
      activities: s.activities.map((a) => ({ ...a, id: crypto.randomUUID() })),
    }));

    const updatedWeeks = [...weeks, newWeek];
    const updatedSchedules = [...schedules, ...newSchedules];

    setWeeks(updatedWeeks);
    setSchedules(updatedSchedules);
    saveWeeks(updatedWeeks);
    saveSchedules(updatedSchedules);
    setConfirmDuplicateId(null);
  }

  function openEditWeek(week: WeekRecord) {
    setEditWeekId(week.id);
    setEditName(week.name);
    setEditStartDate(week.startDate);
    setEditEndDate(week.endDate);
  }

  function saveEditWeek() {
    if (!editWeekId || !editName.trim()) return;
    const updated = weeks.map((w) =>
      w.id === editWeekId
        ? { ...w, name: editName.trim(), startDate: editStartDate, endDate: editEndDate }
        : w
    );
    setWeeks(updated);
    saveWeeks(updated);
    setEditWeekId(null);
  }

  function addWeek() {
    const trimmed = weekName.trim();
    if (!trimmed) return;
    const record: WeekRecord = {
      id: crypto.randomUUID(),
      name: trimmed,
      startDate,
      endDate,
      numCampers: 0,
      excludedStaffIds: [],
    };
    const updated = [...weeks, record];
    setWeeks(updated);
    saveWeeks(updated);
    setWeekName("");
    setStartDate("");
    setEndDate("");
  }

  const sortedWeeks = [...weeks].sort((a, b) => {
    if (sort === "startDate") {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    }
    return 0;
  });

  const sortedSchedules = scheduleSort === "date"
    ? [...schedules].sort((a, b) => a.date.localeCompare(b.date))
    : schedules;

  return (
    <div className="scheduling-bg">
      <NavBar />
      <div className="page">
        <header className="site-header">
          <h1 className="site-title"><img src={titleGif} className="title-gif" alt="" />Scheduling<img src={titleGif} className="title-gif" alt="" /></h1>
          <hr className="divider" />
        </header>
        <main>

          <details className="collapsible">
            <summary className="collapsible-summary">Add a Week</summary>
            <div className="collapsible-body">
              <div className="form-row">
                <label className="form-label">Week Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={weekName}
                  placeholder="e.g. Extreme Camp"
                  onChange={(e) => setWeekName(e.currentTarget.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addWeek(); }}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Start Date</label>
                <input
                  className="form-input sched-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.currentTarget.value)}
                />
              </div>
              <div className="form-row">
                <label className="form-label">End Date</label>
                <input
                  className="form-input sched-date-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.currentTarget.value)}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn--primary" onClick={addWeek} disabled={!weekName.trim()}>
                  Add Week
                </button>
              </div>
            </div>
          </details>

          <details className="collapsible" open>
            <summary className="collapsible-summary">
              Weeks {weeks.length > 0 && <span className="sched-count">({weeks.length})</span>}
            </summary>
            <div className="collapsible-body">
              <div className="sort-bar">
                <span className="sort-label">Sort:</span>
                {(["none", "startDate"] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`btn btn--sort${sort === opt ? " btn--sort-active" : ""}`}
                    onClick={() => setSort(opt)}
                  >
                    {opt === "none" ? "No Sort" : "Start Date"}
                  </button>
                ))}
              </div>
              {weeks.length === 0
                ? <span className="tag-empty">No weeks yet.</span>
                : sortedWeeks.map((week) => (
                  <div key={week.id} className="sched-week-card">
                    <Link to={`/scheduling/${week.id}`} className="sched-week-link">
                      {week.name}
                    </Link>
                    {(week.startDate || week.endDate) && (
                      <span className="sched-date-range">
                        {week.startDate ? formatDate(week.startDate) : "?"}
                        {"–"}
                        {week.endDate ? formatDate(week.endDate) : "?"}
                      </span>
                    )}
                    <button
                      className="btn btn--small btn--edit-week"
                      onClick={() => openEditWeek(week)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--small btn--duplicate-week"
                      onClick={() => setConfirmDuplicateId(week.id)}
                    >
                      Duplicate
                    </button>
                  </div>
                ))
              }
            </div>
          </details>

          <details className="collapsible" open>
            <summary className="collapsible-summary">
              All Schedules {schedules.length > 0 && <span className="sched-count">({schedules.length})</span>}
            </summary>
            <div className="collapsible-body">
              <div className="sort-bar">
                <span className="sort-label">Sort:</span>
                {(["none", "date"] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`btn btn--sort${scheduleSort === opt ? " btn--sort-active" : ""}`}
                    onClick={() => setScheduleSort(opt)}
                  >
                    {opt === "none" ? "No Sort" : "Date"}
                  </button>
                ))}
              </div>
              {schedules.length === 0
                ? <span className="tag-empty">No schedules yet.</span>
                : sortedSchedules.map((s) => {
                  const week = weeks.find((w) => w.id === s.weekId);
                  return (
                    <div key={s.id} className="sched-schedule-row">
                      <Link to={`/scheduling/schedule/${s.id}`} className="sched-schedule-date sched-schedule-link">
                        {formatDate(s.date)}
                      </Link>
                      <span className="sched-schedule-week">
                        {week ? week.name : "— unassigned —"}
                      </span>
                      <button
                        className="btn btn--small sched-schedule-edit"
                        onClick={() => setEditScheduleId(s.id)}
                      >
                        Edit Date
                      </button>
                    </div>
                  );
                })
              }
            </div>
          </details>

        </main>
      </div>
      {editScheduleId && (() => {
        const s = schedules.find((sc) => sc.id === editScheduleId)!;
        return (
          <EditScheduleDateModal
            currentDate={s.date}
            onSave={(date) => updateScheduleDate(editScheduleId, date)}
            onDelete={() => deleteSchedule(editScheduleId)}
            onClose={() => setEditScheduleId(null)}
          />
        );
      })()}

      {editWeekId && (
        <div className="modal-overlay" onClick={() => setEditWeekId(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Week</h2>
            <div className="form-row">
              <label className="form-label">Week Name</label>
              <input
                className="form-input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEditWeek(); }}
                autoFocus
              />
            </div>
            <div className="form-row">
              <label className="form-label">Start Date</label>
              <input
                className="form-input sched-date-input"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.currentTarget.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label">End Date</label>
              <input
                className="form-input sched-date-input"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.currentTarget.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn--primary" onClick={saveEditWeek} disabled={!editName.trim()}>
                Save
              </button>
              <button className="btn" onClick={() => setEditWeekId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmDuplicateId && (() => {
        const week = weeks.find((w) => w.id === confirmDuplicateId)!;
        const count = schedules.filter((s) => s.weekId === confirmDuplicateId).length;
        return (
          <div className="modal-overlay" onClick={() => setConfirmDuplicateId(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Duplicate Week?</h2>
              <p className="modal-body">
                Howdy🐸 Want to duplicate <strong>{week.name}</strong>?
                {count > 0 && <> This will also copy {count} schedule{count !== 1 ? "s" : ""}.</>}
                {" "}All of the duplicated schedules will have their dates set the same. So you'll have to edit those to be correct for the new week!
              </p>
              <div className="modal-actions">
                <button className="btn btn--primary" onClick={() => duplicateWeek(confirmDuplicateId)}>
                  ✅Duplicate
                </button>
                <button className="btn" onClick={() => setConfirmDuplicateId(null)}>
                  ❌Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}/${year.slice(2)}`;
}

export default SchedulingPage;
