import { useState, useEffect } from "react";
import { load } from "@tauri-apps/plugin-store";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import NavBar from "../components/NavBar";
import { ActivityType } from "../Model/ActivityType";
import titleGif from "../assets/page-titles/activities.gif";
import type { Tag } from "../Model/Tag";
import "../App.css";
import "./ActivitiesPage.css";

const STORE_FILE = "fawn-spotter.json";
const ACTIVITIES_KEY = "activityTypes";
const TAGS_KEY = "tags";

async function getStore() {
  return load(STORE_FILE, { defaults: {} });
}

type SpecialRatioMode = "off" | "ratio" | "set";

interface FormState {
  name: string;
  counselorRatio: string;
  specialRatioMode: SpecialRatioMode;
  specialRatioTag: string;
  specialRatioValue: string;
  allCampersIncluded: boolean;
}

function emptyForm(firstTag = ""): FormState {
  return {
    name: "",
    counselorRatio: "",
    specialRatioMode: "off",
    specialRatioTag: firstTag,
    specialRatioValue: "",
    allCampersIncluded: false,
  };
}

function toActivityType(id: string, form: FormState): ActivityType {
  const specialRatio =
    form.specialRatioMode !== "off" && form.specialRatioTag
      ? { tag: form.specialRatioTag, type: form.specialRatioMode, value: parseFloat(form.specialRatioValue) || 0 }
      : null;
  return new ActivityType(id, form.name.trim(), parseFloat(form.counselorRatio) || 0, specialRatio, form.allCampersIncluded);
}

function toFormState(a: ActivityType): FormState {
  return {
    name: a.name,
    counselorRatio: String(a.counselorRatio),
    specialRatioMode: a.specialRatio ? a.specialRatio.type : "off",
    specialRatioTag: a.specialRatio ? a.specialRatio.tag : "",
    specialRatioValue: a.specialRatio ? String(a.specialRatio.value) : "",
    allCampersIncluded: a.allCampersIncluded ?? false,
  };
}

function ActivityForm({
  form,
  allTags,
  onChange,
  onSubmit,
  submitLabel,
  onDelete,
}: {
  form: FormState;
  allTags: Tag[];
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
  submitLabel: string;
  onDelete?: () => void;
}) {
  return (
    <div className="activity-form">
      <div className="form-row">
        <label className="form-label">Name</label>
        <input
          className="form-input"
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.currentTarget.value })}
        />
      </div>
      <div className="form-row">
        <label className="form-label">Staff Ratio</label>
        <input
          className="form-input form-input--short"
          type="number"
          min="0"
          step="0.1"
          value={form.counselorRatio}
          placeholder="e.g. 5.5"
          onChange={(e) => onChange({ counselorRatio: e.currentTarget.value })}
        />
      </div>

      <div className="form-row">
        <label className="form-label">Certification Ratio</label>
        <div className="special-ratio-controls">
          <div className="sort-bar">
            {(["off", "ratio", "set"] as const).map((opt) => (
              <button
                key={opt}
                className={`btn btn--sort${form.specialRatioMode === opt ? " btn--sort-active" : ""}`}
                onClick={() => onChange({ specialRatioMode: opt })}
              >
                {opt === "off" ? "Off" : opt === "ratio" ? "Ratio" : "Set Number"}
              </button>
            ))}
          </div>

          {form.specialRatioMode !== "off" && (
            <div className="special-ratio-inputs">
              <select
                className="form-input"
                value={form.specialRatioTag}
                onChange={(e) => onChange({ specialRatioTag: e.currentTarget.value })}
              >
                <option value="">— select tag —</option>
                {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                className="form-input form-input--short"
                type="number"
                min="0"
                step="0.1"
                placeholder="Value"
                value={form.specialRatioValue}
                onChange={(e) => onChange({ specialRatioValue: e.currentTarget.value })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-row">
        <label className="form-label" />
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={form.allCampersIncluded}
            onChange={(e) => onChange({ allCampersIncluded: e.currentTarget.checked })}
          />
          All Campers Included in Activity
        </label>
      </div>

      <div className="form-actions">
        {onDelete && (
          <button className="btn btn--danger" onClick={onDelete}>Delete</button>
        )}
        <button className="btn btn--primary" onClick={onSubmit} disabled={!form.name.trim()}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editTarget, setEditTarget] = useState<ActivityType | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [sort, setSort] = useState<"none" | "name">("none");

  useEffect(() => {
    getStore().then(async (store) => {
      const savedTags = await store.get<Tag[]>(TAGS_KEY);
      const tags = savedTags ?? [];
      setAllTags(tags);
      setAddForm(emptyForm(tags[0] ?? ""));
      const saved = await store.get<ActivityType[]>(ACTIVITIES_KEY);
      if (saved) setActivities(saved);
    });
  }, []);

  async function saveActivities(updated: ActivityType[]) {
    const store = await getStore();
    await store.set(ACTIVITIES_KEY, updated);
  }

  function addActivity() {
    if (!addForm.name.trim()) return;
    const activity = toActivityType(crypto.randomUUID(), addForm);
    const updated = [...activities, activity];
    setActivities(updated);
    saveActivities(updated);
    setAddForm(emptyForm(allTags[0] ?? ""));
  }

  function openEdit(activity: ActivityType) {
    setEditTarget(activity);
    setEditForm(toFormState(activity));
  }

  function saveEdit() {
    if (!editTarget) return;
    const updated = activities.map((a) =>
      a.id === editTarget.id ? toActivityType(a.id, editForm) : a
    );
    setActivities(updated);
    saveActivities(updated);
    setEditTarget(null);
  }

  function deleteActivity() {
    if (!editTarget) return;
    const updated = activities.filter((a) => a.id !== editTarget.id);
    setActivities(updated);
    saveActivities(updated);
    setEditTarget(null);
  }

  async function importFromTextFile() {
    const filePath = await open({ filters: [{ name: "Text Files", extensions: ["txt"] }], multiple: false });
    if (!filePath) return;
    const text = await readTextFile(filePath as string);
    const names = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const existingNames = new Set(activities.map((a) => a.name));
    const newActivities = names
      .filter((n) => !existingNames.has(n))
      .map((n) => new ActivityType(crypto.randomUUID(), n, 0, null, false));
    if (newActivities.length === 0) return;
    const updated = [...activities, ...newActivities];
    setActivities(updated);
    saveActivities(updated);
  }

  const sortedActivities = [...activities].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="activities-bg">
      <NavBar />
      <div className="page">
        <header className="site-header">
          <h1 className="site-title"><img src={titleGif} className="title-gif" alt="" />Activities<img src={titleGif} className="title-gif" alt="" /></h1>
          <hr className="divider" />
        </header>
        <main>

          <div style={{ marginBottom: 16 }}>
            <button className="btn btn--primary" onClick={importFromTextFile}>Upload Activity Text File</button>
          </div>

          {/* Add Activity */}
          <details className="collapsible">
            <summary className="collapsible-summary">Add Activity</summary>
            <div className="collapsible-body">
              <ActivityForm
                form={addForm}
                allTags={allTags}
                onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))}
                onSubmit={addActivity}
                submitLabel="Add Activity"
              />
            </div>
          </details>

          {/* Activity List */}
          <details className="collapsible" open>
            <summary className="collapsible-summary">Activity List</summary>
            <div className="collapsible-body">
              <div className="sort-bar">
                <span className="sort-label">Sort:</span>
                {(["none", "name"] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`btn btn--sort${sort === opt ? " btn--sort-active" : ""}`}
                    onClick={() => setSort(opt)}
                  >
                    {opt === "none" ? "No Sort" : "Name"}
                  </button>
                ))}
              </div>
              {activities.length === 0
                ? <span className="tag-empty">No activities yet.</span>
                : sortedActivities.map((activity) => (
                  <div key={activity.id} className="staff-row">
                    <span className="staff-name">{activity.name}</span>
                    <span className="activity-ratio">ratio: {activity.counselorRatio}</span>
                    <button className="btn btn--edit" onClick={() => openEdit(activity)}>Edit</button>
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
            <h2 className="modal-title">Edit Activity</h2>
            <ActivityForm
              form={editForm}
              allTags={allTags}
              onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              onSubmit={saveEdit}
              submitLabel="Save"
              onDelete={deleteActivity}
            />
            <button className="btn btn--cancel modal-cancel" onClick={() => setEditTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivitiesPage;
