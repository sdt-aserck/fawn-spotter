import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { load } from "@tauri-apps/plugin-store";
import NavBar from "../components/NavBar";
import ActivitySelectionModal from "../components/ActivitySelectionModal";
import { ActivityType } from "../Model/ActivityType";
import { StaffMember } from "../Model/StaffMember";
import { Villages } from "../Model/Villages";
import type { Activity } from "../Model/Activity";
import type { ScheduleRecord, WeekRecord } from "./SchedulingPage";
import "../App.css";
import "./ScheduleDetailPage.css";

const STORE_FILE = "fawn-spotter.json";
const SCHEDULES_KEY = "schedules";
const WEEKS_KEY = "weeks";
const TIMESLOTS_KEY = "timeSlots";
const ACTIVITIES_KEY = "activityTypes";
const STAFF_KEY = "staff";

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

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  return `${weekday} - ${Number(month)}/${Number(day)}/${year.slice(2)}`;
}

function activitySubtitle(a: Activity): string {
  const leader = a.leader as StaffMember | null;
  const staff = a.staffMembers as StaffMember[];
  const totalStaff = (leader ? 1 : 0) + staff.length;
  const camperPart = a.numCampers > 0 ? ` - ${a.numCampers} campers` : "";

  if (totalStaff === 0 && a.numCampers === 0) return "";

  let staffPart = "";
  if (leader) {
    const others = staff.length;
    staffPart = others > 0 ? `${leader.name} + ${others} other${others === 1 ? "" : "s"}` : leader.name;
  } else if (totalStaff > 0) {
    staffPart = `${totalStaff} Counselor${totalStaff === 1 ? "" : "s"}`;
  }

  return staffPart + camperPart;
}

function villageIcon(village: Villages): string {
  return village.split(" ")[0];
}

function formatTime(hhmm: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Timeslot picker modal ──────────────────────────────────────────
function TimeslotPickerModal({
  available,
  onSelect,
  onClose,
}: {
  available: TimeSlotRecord[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const filtered = available.filter((s) =>
    s.timeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add Timeslot</h2>
        <input
          ref={searchRef}
          className="form-input"
          type="text"
          placeholder="Search timeslots..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <div className="week-staff-modal-list">
          {filtered.length === 0
            ? <span className="tag-empty">No timeslots available.</span>
            : filtered.map((s) => (
              <button
                key={s.id}
                className="week-staff-modal-item"
                onClick={() => { onSelect(s.id); onClose(); }}
              >
                <span style={{ fontWeight: "bold" }}>{s.timeName}</span>
                {s.timeStart && <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 14 }}>{formatTime(s.timeStart)}</span>}
              </button>
            ))
          }
        </div>
        <button className="btn btn--cancel modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── Staff picker modal (single select) ───────────────────────────
function StaffPickerModal({
  allStaff,
  onSelect,
  onClose,
}: {
  allStaff: StaffMember[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const filtered = allStaff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Select Staff</h2>
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
                <span style={{ marginRight: 6 }}>{villageIcon(s.village)}</span>{s.name}
              </button>
            ))
          }
        </div>
        <button className="btn btn--cancel modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ── Ratio warning computation (shared by modal + alerts box) ─────
function computeWarnings(
  activityType: ActivityType,
  numCampers: number,
  leaderId: string | null,
  staffMemberIds: string[],
  allStaff: StaffMember[]
): string[] {
  if (numCampers === 0) return [];
  const warnings: string[] = [];
  const totalStaff = (leaderId ? 1 : 0) + staffMemberIds.length;

  if (activityType.counselorRatio > 0) {
    const required = Math.ceil(numCampers / activityType.counselorRatio);
    if (totalStaff < required) {
      warnings.push(`Staff ratio not met: need ${required} for ${numCampers} campers (1:${activityType.counselorRatio}), have ${totalStaff}`);
    }
  }

  if (activityType.specialRatio) {
    const sr = activityType.specialRatio;
    const allIds = [...(leaderId ? [leaderId] : []), ...staffMemberIds];
    const certCount = allIds
      .map((id) => allStaff.find((s) => s.id === id))
      .filter((s) => s?.tags?.includes(sr.tag)).length;
    if (sr.type === "ratio") {
      const required = Math.ceil(numCampers / sr.value);
      if (certCount < required) {
        warnings.push(`"${sr.tag}" certification ratio not met: need ${required}, have ${certCount}`);
      }
    } else {
      if (certCount < sr.value) {
        warnings.push(`"${sr.tag}" certification not met: need ${sr.value}, have ${certCount}`);
      }
    }
  }

  return warnings;
}

// ── Ratio warnings ────────────────────────────────────────────────
function RatioWarnings({
  activityType,
  numCampers,
  leaderId,
  staffMemberIds,
  allStaff,
}: {
  activityType: ActivityType | undefined;
  numCampers: number;
  leaderId: string | null;
  staffMemberIds: string[];
  allStaff: StaffMember[];
}) {
  if (!activityType || numCampers === 0) return null;

  const warnings = computeWarnings(activityType, numCampers, leaderId, staffMemberIds, allStaff);

  if (warnings.length === 0) return null;

  return (
    <div className="sched-ratio-warnings">
      {warnings.map((w, i) => (
        <div key={i} className="sched-ratio-warning-row">
          <span className="sched-ratio-warning-icon">⚠️</span>
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

// ── Activity entry modal (create + edit) ─────────────────────────
interface EntryModalProps {
  allActivityTypes: ActivityType[];
  allStaff: StaffMember[];
  alreadyScheduledIds: string[];
  weekNumCampers: number;
  typicalActivityIds: string[];
  initial: {
    activityTypeId: string;
    numCampers: number;
    leaderId: string | null;
    staffMemberIds: string[];
  } | null;
  onSave: (activityTypeId: string, numCampers: number, leaderId: string | null, staffMemberIds: string[]) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function ActivityEntryModal({ allActivityTypes, allStaff, alreadyScheduledIds, weekNumCampers, typicalActivityIds, initial, onSave, onDelete, onClose }: EntryModalProps) {
  const initialActTypeId = initial?.activityTypeId ?? (allActivityTypes[0]?.id ?? "");
  const initialActType = allActivityTypes.find((a) => a.id === initialActTypeId);

  const [activityTypeId, setActivityTypeId] = useState(initialActTypeId);
  const [numCampers, setNumCampers] = useState(
    initialActType?.allCampersIncluded ? weekNumCampers : (initial?.numCampers ?? 0)
  );
  const [leaderId, setLeaderId] = useState<string | null>(initial?.leaderId ?? null);
  const [staffMemberIds, setStaffMemberIds] = useState<string[]>(initial?.staffMemberIds ?? []);

  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showLeaderPicker, setShowLeaderPicker] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);

  const selectedActivity = allActivityTypes.find((a) => a.id === activityTypeId);
  const isAllCampers = selectedActivity?.allCampersIncluded ?? false;

  useEffect(() => {
    if (isAllCampers) setNumCampers(weekNumCampers);
  }, [activityTypeId]);
  const selectedLeader = allStaff.find((s) => s.id === leaderId) ?? null;
  const selectedStaff = allStaff.filter((s) => staffMemberIds.includes(s.id));

  const availableLeaderStaff = allStaff.filter((s) => !staffMemberIds.includes(s.id) && !alreadyScheduledIds.includes(s.id));
  const availableAdditionalStaff = allStaff.filter((s) => s.id !== leaderId && !staffMemberIds.includes(s.id) && !alreadyScheduledIds.includes(s.id));

  function removeStaffMember(id: string) {
    setStaffMemberIds((prev) => prev.filter((sid) => sid !== id));
  }

  if (showActivityPicker) {
    return (
      <ActivitySelectionModal
        allActivities={allActivityTypes}
        selectedIds={activityTypeId ? [] : []}
        typicalActivityIds={typicalActivityIds}
        onSelect={(id) => { setActivityTypeId(id); setShowActivityPicker(false); }}
        onClose={() => setShowActivityPicker(false)}
      />
    );
  }

  if (showLeaderPicker) {
    return (
      <StaffPickerModal
        allStaff={availableLeaderStaff}
        onSelect={(id) => { setLeaderId(id); setShowLeaderPicker(false); }}
        onClose={() => setShowLeaderPicker(false)}
      />
    );
  }

  if (showStaffPicker) {
    return (
      <StaffPickerModal
        allStaff={availableAdditionalStaff}
        onSelect={(id) => { setStaffMemberIds((prev) => [...prev, id]); setShowStaffPicker(false); }}
        onClose={() => setShowStaffPicker(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{initial ? "Edit Activity" : "Add Activity"}</h2>

        {/* Activity type */}
        <div className="form-row">
          <label className="form-label sched-entry-label">Activity</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, color: "#2a0a18" }}>{selectedActivity ? selectedActivity.name : <em style={{ color: "#7a3050" }}>None selected</em>}</span>
            <button className="btn sched-detail-btn--small" onClick={() => setShowActivityPicker(true)}>
              {selectedActivity ? "Change" : "Select"}
            </button>
          </div>
        </div>

        {/* Num campers */}
        <div className="form-row">
          <label className="form-label sched-entry-label">Num. Campers</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className="form-input sched-num-input"
              type="number"
              min="0"
              step="1"
              value={numCampers}
              disabled={isAllCampers}
              onChange={(e) => {
                if (isAllCampers) return;
                const val = e.currentTarget.value;
                setNumCampers(Math.max(0, parseInt(val, 10) || 0));
              }}
            />
            {isAllCampers && <span style={{ fontSize: 13, color: "#5a3050" }}>All campers</span>}
          </div>
        </div>

        {/* Leader */}
        <div className="form-row">
          <label className="form-label sched-entry-label">Leader</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, color: "#2a0a18" }}>
              {selectedLeader
                ? <><span style={{ marginRight: 6 }}>{villageIcon(selectedLeader.village)}</span>{selectedLeader.name}</>
                : <em style={{ color: "#7a3050" }}>None</em>}
            </span>
            <button className="btn sched-detail-btn--small" onClick={() => setShowLeaderPicker(true)}>
              {selectedLeader ? "Change" : "Select"}
            </button>
            {selectedLeader && (
              <button className="btn sched-detail-btn--small" onClick={() => setLeaderId(null)}>Clear</button>
            )}
          </div>
        </div>

        {/* Additional staff */}
        <div className="form-row form-row--top">
          <label className="form-label sched-entry-label">Staff</label>
          <div style={{ flex: 1 }}>
            {selectedStaff.length > 0 && (
              <ul className="week-excluded-list sched-staff-list" style={{ marginBottom: 6 }}>
                {selectedStaff.map((s) => (
                  <li key={s.id} className="week-excluded-row">
                    <span className="week-excluded-name"><span style={{ marginRight: 6 }}>{villageIcon(s.village)}</span>{s.name}</span>
                    <button className="btn sched-detail-btn--small" onClick={() => removeStaffMember(s.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
            {availableAdditionalStaff.length > 0 && (
              <button className="btn sched-detail-btn--small" onClick={() => setShowStaffPicker(true)}>+ Add Staff</button>
            )}
            {selectedStaff.length === 0 && availableAdditionalStaff.length === 0 && (
              <em style={{ color: "#7a3050", fontSize: 14 }}>No staff available.</em>
            )}
          </div>
        </div>

        <RatioWarnings
          activityType={selectedActivity}
          numCampers={numCampers}
          leaderId={leaderId}
          staffMemberIds={staffMemberIds}
          allStaff={allStaff}
        />

        <div className="form-actions sched-entry-actions">
          {onDelete && (
            <button className="btn btn--danger" onClick={onDelete}>Delete</button>
          )}
          <button
            className="btn btn--primary"
            onClick={() => onSave(activityTypeId, numCampers, leaderId, staffMemberIds)}
            disabled={!activityTypeId}
          >
            {initial ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CrossDragState {
  activityId: string;
  overSlotId: string | null;
  overActivityId: string | null;
}

// ── Calendar column ───────────────────────────────────────────────
function CalendarColumn({
  slot,
  activities,
  offStaff,
  onAdd,
  onEdit,
  onClear,
  onReorder,
  onMoveToSlot,
  crossDrag,
  onCrossDragUpdate,
}: {
  slot: TimeSlotRecord;
  activities: Activity[];
  offStaff: StaffMember[];
  onAdd: () => void;
  onEdit: (activity: Activity) => void;
  onClear: () => void;
  onReorder: (newOrder: Activity[]) => void;
  onMoveToSlot: (activityId: string, targetSlotId: string, insertBeforeActivityId: string | null) => void;
  crossDrag: CrossDragState | null;
  onCrossDragUpdate: (update: CrossDragState | null) => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showOff, setShowOff] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragStart = useRef<{ id: string; x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const wasDragging = useRef(false);

  function getTargetFromPoint(x: number, y: number): { slotId: string | null; activityId: string | null } {
    const els = document.elementsFromPoint(x, y);
    const colEl = els.find((el) => el instanceof HTMLElement && el.dataset.slotId) as HTMLElement | undefined;
    const entryEl = els.find((el) => el instanceof HTMLElement && el.dataset.activityId) as HTMLElement | undefined;
    return {
      slotId: colEl?.dataset.slotId ?? null,
      activityId: entryEl?.dataset.activityId ?? null,
    };
  }

  function handlePointerDown(e: React.PointerEvent, id: string) {
    dragStart.current = { id, x: e.clientX, y: e.clientY };
    isDragging.current = false;
  }

  function handlePointerMove(e: React.PointerEvent, id: string) {
    if (!dragStart.current || dragStart.current.id !== id) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 6) {
      isDragging.current = true;
      setDragId(id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (!isDragging.current) return;

    const { slotId, activityId } = getTargetFromPoint(e.clientX, e.clientY);
    if (!slotId || slotId === slot.id) {
      // same column
      onCrossDragUpdate(null);
      setOverId(activityId !== id ? activityId : null);
    } else {
      // different column
      setOverId(null);
      onCrossDragUpdate({ activityId: id, overSlotId: slotId, overActivityId: activityId });
    }
  }

  function handlePointerUp(e: React.PointerEvent, id: string) {
    if (isDragging.current && dragStart.current?.id === id) {
      const { slotId, activityId } = getTargetFromPoint(e.clientX, e.clientY);

      if (slotId && slotId !== slot.id) {
        // cross-column drop
        onMoveToSlot(id, slotId, activityId !== id ? activityId : null);
      } else {
        // same-column reorder
        const over = activityId !== id ? activityId : null;
        if (over) {
          const from = activities.findIndex((x) => x.id === id);
          const to = activities.findIndex((x) => x.id === over);
          if (from !== -1 && to !== -1) {
            const reordered = [...activities];
            reordered.splice(to, 0, reordered.splice(from, 1)[0]);
            onReorder(reordered);
          }
        }
      }

      onCrossDragUpdate(null);
      setDragId(null);
      setOverId(null);
      isDragging.current = false;
      wasDragging.current = true;
      dragStart.current = null;
      e.preventDefault();
      return;
    }
    isDragging.current = false;
    wasDragging.current = false;
    dragStart.current = null;
  }

  const isCrossTarget = crossDrag !== null && crossDrag.overSlotId === slot.id;

  return (
    <div className="sched-cal-column" data-slot-id={slot.id}>
      <div className="sched-cal-header">
        <div className="sched-cal-header-top">
          <div className="sched-cal-timename">{slot.timeName}</div>
          {activities.length > 0 && (
            <button
              className="btn sched-cal-clear-btn"
              onClick={() => setConfirmClear(true)}
              title="Clear all activities"
            >✕</button>
          )}
        </div>
        {slot.timeStart && <div className="sched-cal-time">{formatTime(slot.timeStart)}</div>}
      </div>
      <div className={`sched-cal-body${isCrossTarget ? " sched-cal-body--cross-target" : ""}`}>
        {activities.map((a) => (
          <button
            key={a.id}
            data-activity-id={a.id}
            className={`sched-cal-entry${dragId === a.id ? " sched-cal-entry--dragging" : ""}${overId === a.id ? " sched-cal-entry--drag-over" : ""}${isCrossTarget && crossDrag?.overActivityId === a.id ? " sched-cal-entry--drag-over" : ""}`}
            onClick={() => { if (wasDragging.current) { wasDragging.current = false; return; } onEdit(a); }}
            onPointerDown={(e) => handlePointerDown(e, a.id)}
            onPointerMove={(e) => handlePointerMove(e, a.id)}
            onPointerUp={(e) => handlePointerUp(e, a.id)}
          >
            <div className="sched-cal-entry-name">{a.activityType.name}</div>
            {activitySubtitle(a) && <div className="sched-cal-entry-notes">{activitySubtitle(a)}</div>}
          </button>
        ))}
        <div className="sched-cal-spacer" />
        <button className="btn sched-cal-add-btn" onClick={onAdd}>+ Add</button>
        <button className="btn sched-cal-off-btn" onClick={() => setShowOff(true)}>
          OFF{offStaff.length > 0 ? ` (${offStaff.length})` : ""}
        </button>
      </div>

      {confirmClear && (
        <div className="modal-overlay" onClick={() => setConfirmClear(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Clear Timeslot?</h2>
            <p style={{ fontFamily: '"Times New Roman", Times, serif', color: "#3a0818", marginBottom: 12 }}>
              Remove all {activities.length} {activities.length === 1 ? "activity" : "activities"} from <strong>{slot.timeName}</strong>? This cannot be undone.
            </p>
            <div className="form-actions sched-entry-actions">
              <button className="btn btn--danger" onClick={() => { onClear(); setConfirmClear(false); }}>Clear</button>
              <button className="btn btn--cancel" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showOff && (
        <div className="modal-overlay" onClick={() => setShowOff(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">OFF — {slot.timeName}</h2>
            {offStaff.length === 0
              ? <span className="tag-empty">All staff are scheduled.</span>
              : (
                <ul className="week-excluded-list sched-staff-list">
                  {offStaff.map((s) => (
                    <li key={s.id} className="week-excluded-row">
                      <span className="week-excluded-name">
                        <span style={{ marginRight: 6 }}>{villageIcon(s.village)}</span>{s.name}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }
            <div className="form-actions sched-entry-actions">
              <button className="btn btn--cancel" onClick={() => setShowOff(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
function ScheduleDetailPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState<ScheduleRecord | null>(null);
  const [week, setWeek] = useState<WeekRecord | null>(null);
  const [allTimeslots, setAllTimeslots] = useState<TimeSlotRecord[]>([]);
  const [allActivityTypes, setAllActivityTypes] = useState<ActivityType[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);

  const [showTimeslotPicker, setShowTimeslotPicker] = useState(false);
  // null = closed; { timeslotId, activity: null } = create; { timeslotId, activity } = edit
  const [entryModal, setEntryModal] = useState<{ timeslotId: string; activity: Activity | null; preselectedActivityTypeId?: string } | null>(null);
  const [crossDrag, setCrossDrag] = useState<CrossDragState | null>(null);

  useEffect(() => {
    getStore().then(async (store) => {
      const savedSchedules = await store.get<ScheduleRecord[]>(SCHEDULES_KEY);
      const found = savedSchedules?.find((s) => s.id === scheduleId) ?? null;
      setSchedule(found);
      if (found?.weekId) {
        const savedWeeks = await store.get<WeekRecord[]>(WEEKS_KEY);
        setWeek(savedWeeks?.find((w) => w.id === found.weekId) ?? null);
      }
      const savedTimeslots = await store.get<TimeSlotRecord[]>(TIMESLOTS_KEY);
      setAllTimeslots(savedTimeslots ?? []);
      const savedActivityTypes = await store.get<ActivityType[]>(ACTIVITIES_KEY);
      setAllActivityTypes(savedActivityTypes ?? []);
      const savedStaff = await store.get<StaffMember[]>(STAFF_KEY);
      setAllStaff(savedStaff ?? []);
    });
  }, [scheduleId]);

  async function saveSchedule(updated: ScheduleRecord) {
    const store = await getStore();
    const savedSchedules = await store.get<ScheduleRecord[]>(SCHEDULES_KEY);
    await store.set(SCHEDULES_KEY, (savedSchedules ?? []).map((s) => s.id === scheduleId ? updated : s));
    setSchedule(updated);
  }

  function addTimeslot(timeslotId: string) {
    if (!schedule) return;
    const ids = schedule.timeslotIds ?? [];
    if (!ids.includes(timeslotId)) saveSchedule({ ...schedule, timeslotIds: [...ids, timeslotId] });
  }

  function removeTimeslot(timeslotId: string) {
    if (!schedule) return;
    saveSchedule({ ...schedule, timeslotIds: (schedule.timeslotIds ?? []).filter((id) => id !== timeslotId) });
  }

  function moveTimeslot(timeslotId: string, direction: -1 | 1) {
    if (!schedule) return;
    const ids = [...(schedule.timeslotIds ?? [])];
    const idx = ids.indexOf(timeslotId);
    if (idx === -1) return;
    const next = idx + direction;
    if (next < 0 || next >= ids.length) return;
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    saveSchedule({ ...schedule, timeslotIds: ids });
  }

  function clearTimeslot(timeslotId: string) {
    if (!schedule) return;
    saveSchedule({ ...schedule, activities: (schedule.activities ?? []).filter((a) => (a.timeslot as unknown as { id: string }).id !== timeslotId) });
  }

  function addActivity(timeslotId: string, activityTypeId: string, numCampers: number, leaderId: string | null, staffMemberIds: string[]) {
    if (!schedule) return;
    const slot = allTimeslots.find((s) => s.id === timeslotId);
    const actType = allActivityTypes.find((a) => a.id === activityTypeId);
    if (!slot || !actType) return;

    const leader = leaderId ? (allStaff.find((s) => s.id === leaderId) ?? null) : null;
    const staffMembers = allStaff.filter((s) => staffMemberIds.includes(s.id));

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      activityType: actType,
      timeslot: slot as unknown as import("../Model/TimeSlot").TimeSlot,
      staffMembers,
      leader,
      numCampers,
    };
    saveSchedule({ ...schedule, activities: [...(schedule.activities ?? []), newActivity] });
  }

  function updateActivity(activityId: string, activityTypeId: string, numCampers: number, leaderId: string | null, staffMemberIds: string[]) {
    if (!schedule) return;
    const actType = allActivityTypes.find((a) => a.id === activityTypeId);
    if (!actType) return;
    const leader = leaderId ? (allStaff.find((s) => s.id === leaderId) ?? null) : null;
    const staffMembers = allStaff.filter((s) => staffMemberIds.includes(s.id));
    const updated = (schedule.activities ?? []).map((a) =>
      a.id === activityId ? { ...a, activityType: actType, numCampers, leader, staffMembers } : a
    );
    saveSchedule({ ...schedule, activities: updated });
  }

  function deleteActivity(activityId: string) {
    if (!schedule) return;
    saveSchedule({ ...schedule, activities: (schedule.activities ?? []).filter((a) => a.id !== activityId) });
  }

  function reorderActivities(timeslotId: string, reordered: Activity[]) {
    if (!schedule) return;
    const others = (schedule.activities ?? []).filter(
      (a) => (a.timeslot as unknown as { id: string }).id !== timeslotId
    );
    saveSchedule({ ...schedule, activities: [...others, ...reordered] });
  }

  function moveActivityToSlot(activityId: string, targetSlotId: string, insertBeforeActivityId: string | null) {
    if (!schedule) return;
    const targetSlot = allTimeslots.find((s) => s.id === targetSlotId);
    if (!targetSlot) return;
    const moving = (schedule.activities ?? []).find((a) => a.id === activityId);
    if (!moving) return;
    const updated = { ...moving, timeslot: targetSlot as unknown as import("../Model/TimeSlot").TimeSlot };
    const without = (schedule.activities ?? []).filter((a) => a.id !== activityId);
    if (insertBeforeActivityId) {
      const idx = without.findIndex((a) => a.id === insertBeforeActivityId);
      if (idx !== -1) {
        without.splice(idx, 0, updated);
        saveSchedule({ ...schedule, activities: without });
        return;
      }
    }
    saveSchedule({ ...schedule, activities: [...without, updated] });
  }

  const activeTimeslotIds = schedule?.timeslotIds ?? [];
  const activeTimeslots = activeTimeslotIds
    .map((id) => allTimeslots.find((s) => s.id === id))
    .filter((s): s is TimeSlotRecord => s !== undefined);
  const availableTimeslots = allTimeslots
    .filter((s) => !activeTimeslotIds.includes(s.id))
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart));

  return (
    <div className="schedule-detail-bg">
      <NavBar />
      <div className="page schedule-detail-wide">
        <div className="schedule-detail-back">
          <button className="btn schedule-detail-btn--back" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <header className="site-header">
          <h1 className="site-title">{schedule ? formatDate(schedule.date) : "Schedule"}</h1>
          {week && <p className="schedule-detail-week-sub">{week.name}</p>}
          <hr className="divider" />
        </header>
        <main>

          {/* Timeslots collapsible */}
          <details className="collapsible sched-collapsible">
            <summary className="collapsible-summary">Timeslots</summary>
            <div className="collapsible-body">
              {allTimeslots.length === 0
                ? <span className="tag-empty">No timeslots defined yet. Add them on the Timeslots page.</span>
                : (
                  <>
                    <div className="week-excluded-header" style={{ marginBottom: 8 }}>
                      {availableTimeslots.length > 0 && (
                        <button className="btn sched-detail-btn--small" onClick={() => setShowTimeslotPicker(true)}>+ Add Timeslot</button>
                      )}
                    </div>
                    {activeTimeslots.length === 0
                      ? <span className="tag-empty">No timeslots on this schedule yet.</span>
                      : (
                        <ul className="week-excluded-list">
                          {activeTimeslots.map((s, idx) => (
                            <li key={s.id} className="week-excluded-row">
                              <span className="week-excluded-name">
                                <strong>{s.timeName}</strong>
                                {s.timeStart && <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 15 }}>{formatTime(s.timeStart)}</span>}
                              </span>
                              <div className="sched-ts-reorder">
                                <button className="btn sched-detail-btn--small sched-detail-btn--arrow" disabled={idx === 0} onClick={() => moveTimeslot(s.id, -1)}>▲</button>
                                <button className="btn sched-detail-btn--small sched-detail-btn--arrow" disabled={idx === activeTimeslots.length - 1} onClick={() => moveTimeslot(s.id, 1)}>▼</button>
                              </div>
                              <button className="btn sched-detail-btn--small" onClick={() => removeTimeslot(s.id)}>Remove</button>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                  </>
                )
              }
            </div>
          </details>

          {/* Calendar */}
          {activeTimeslots.length > 0 && (
            <div className="sched-calendar">
              {activeTimeslots.map((slot) => {
                const slotActivities = (schedule?.activities ?? []).filter(
                  (a) => (a.timeslot as unknown as { id: string }).id === slot.id
                );
                const scheduledIds = new Set(
                  slotActivities.flatMap((a) => [
                    ...(a.leader ? [(a.leader as StaffMember).id] : []),
                    ...(a.staffMembers as StaffMember[]).map((s) => s.id),
                  ])
                );
                const weekExcludedIds = new Set(week?.excludedStaffIds ?? []);
                const offStaff = allStaff.filter(
                  (s) => !scheduledIds.has(s.id) && !weekExcludedIds.has(s.id)
                );
                return (
                  <CalendarColumn
                    key={slot.id}
                    slot={slot}
                    activities={slotActivities}
                    offStaff={offStaff}
                    onAdd={() => setEntryModal({ timeslotId: slot.id, activity: null })}
                    onEdit={(activity) => setEntryModal({ timeslotId: slot.id, activity })}
                    onClear={() => clearTimeslot(slot.id)}
                    onReorder={(reordered) => reorderActivities(slot.id, reordered)}
                    onMoveToSlot={moveActivityToSlot}
                    crossDrag={crossDrag}
                    onCrossDragUpdate={setCrossDrag}
                  />
                );
              })}
            </div>
          )}

          {/* Alerts */}
          {(() => {
            type RatioAlert = { kind: "ratio"; slot: TimeSlotRecord; activity: Activity; message: string };
            type RequiredAlert = { kind: "required"; slot: TimeSlotRecord; activityTypeId: string; activityTypeName: string };
            type AnyAlert = RatioAlert | RequiredAlert;

            const alerts: AnyAlert[] = [];

            for (const slot of activeTimeslots) {
              const slotActivities = (schedule?.activities ?? []).filter(
                (a) => (a.timeslot as unknown as { id: string }).id === slot.id
              );
              const presentTypeIds = new Set(slotActivities.map((a) => (a.activityType as ActivityType).id));

              // Required activity alerts
              for (const reqId of slot.requiredActivityIds ?? []) {
                if (!presentTypeIds.has(reqId)) {
                  const actType = allActivityTypes.find((t) => t.id === reqId);
                  if (actType) {
                    alerts.push({ kind: "required", slot, activityTypeId: reqId, activityTypeName: actType.name });
                  }
                }
              }

              // Ratio / staffing alerts
              for (const a of slotActivities) {
                const warnings = computeWarnings(
                  a.activityType as ActivityType,
                  a.numCampers,
                  (a.leader as StaffMember | null)?.id ?? null,
                  (a.staffMembers as StaffMember[]).map((s) => s.id),
                  allStaff
                );
                for (const msg of warnings) {
                  alerts.push({ kind: "ratio", slot, activity: a, message: msg });
                }
              }
            }

            return (
              <div className="sched-alerts-box">
                <h2 className="sched-alerts-title">Alerts</h2>
                {alerts.length === 0
                  ? <span className="tag-empty">No alerts.</span>
                  : (
                    <ul className="sched-alert-list">
                      {alerts.map((alert, i) => {
                        if (alert.kind === "required") {
                          return (
                            <li key={i} className="sched-alert-row">
                              <button
                                className="sched-alert-btn sched-alert-btn--required"
                                onClick={() => setEntryModal({ timeslotId: alert.slot.id, activity: null, preselectedActivityTypeId: alert.activityTypeId })}
                              >
                                <span className="sched-alert-icon">⛺</span>
                                <span className="sched-alert-slot">{alert.slot.timeName}</span>
                                <span className="sched-alert-sep">·</span>
                                <span className="sched-alert-message">Missing required activity: {alert.activityTypeName}</span>
                              </button>
                            </li>
                          );
                        }
                        return (
                          <li key={i} className="sched-alert-row">
                            <button
                              className="sched-alert-btn"
                              onClick={() => setEntryModal({ timeslotId: alert.slot.id, activity: alert.activity })}
                            >
                              <span className="sched-alert-icon">⚠️</span>
                              <span className="sched-alert-slot">{alert.slot.timeName}</span>
                              <span className="sched-alert-sep">·</span>
                              <span className="sched-alert-activity">{(alert.activity.activityType as ActivityType).name}</span>
                              <span className="sched-alert-sep">·</span>
                              <span className="sched-alert-message">{alert.message}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                }
              </div>
            );
          })()}

        </main>
      </div>

      {/* Timeslot picker modal */}
      {showTimeslotPicker && (
        <TimeslotPickerModal
          available={availableTimeslots}
          onSelect={addTimeslot}
          onClose={() => setShowTimeslotPicker(false)}
        />
      )}

      {/* Activity entry modal */}
      {entryModal && (() => {
        const timeslotActivities = (schedule?.activities ?? []).filter(
          (a) => (a.timeslot as unknown as { id: string }).id === entryModal.timeslotId
        );
        const otherActivities = timeslotActivities.filter((a) => a.id !== entryModal.activity?.id);
        const alreadyScheduledIds = [
          ...otherActivities.flatMap((a) => [
            ...(a.leader ? [(a.leader as StaffMember).id] : []),
            ...(a.staffMembers as StaffMember[]).map((s) => s.id),
          ]),
          ...(week?.excludedStaffIds ?? []),
        ];
        const currentSlot = allTimeslots.find((s) => s.id === entryModal.timeslotId);
        return (
          <ActivityEntryModal
            allActivityTypes={allActivityTypes}
            allStaff={allStaff}
            alreadyScheduledIds={alreadyScheduledIds}
            weekNumCampers={week?.numCampers ?? 0}
            typicalActivityIds={currentSlot?.typicalActivityIds ?? []}
            initial={entryModal.activity
              ? {
                activityTypeId: entryModal.activity.activityType.id,
                numCampers: entryModal.activity.numCampers ?? 0,
                leaderId: (entryModal.activity.leader as StaffMember | null)?.id ?? null,
                staffMemberIds: (entryModal.activity.staffMembers as StaffMember[]).map((s) => s.id),
              }
              : entryModal.preselectedActivityTypeId
                ? { activityTypeId: entryModal.preselectedActivityTypeId, numCampers: 0, leaderId: null, staffMemberIds: [] }
                : null
            }
            onSave={(activityTypeId, numCampers, leaderId, staffMemberIds) => {
              if (entryModal.activity) {
                updateActivity(entryModal.activity.id, activityTypeId, numCampers, leaderId, staffMemberIds);
              } else {
                addActivity(entryModal.timeslotId, activityTypeId, numCampers, leaderId, staffMemberIds);
              }
              setEntryModal(null);
            }}
            onDelete={entryModal.activity ? () => {
              deleteActivity(entryModal.activity!.id);
              setEntryModal(null);
            } : undefined}
            onClose={() => setEntryModal(null)}
          />
        );
      })()}
    </div>
  );
}

export default ScheduleDetailPage;
