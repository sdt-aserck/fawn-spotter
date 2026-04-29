import { useState, useEffect } from "react";
import { load } from "@tauri-apps/plugin-store";
import titleGif from "../assets/page-titles/staff.gif";
import NavBar from "../components/NavBar";
import { StaffMember } from "../Model/StaffMember";
import { ActivityType } from "../Model/ActivityType";
import { Villages } from "../Model/Villages";
import type { Tag } from "../Model/Tag";
import "../App.css";
import "./StaffPage.css";

const STORE_FILE = "fawn-spotter.json";
const TAGS_KEY = "tags";
const STAFF_KEY = "staff";
const ACTIVITIES_KEY = "activityTypes";

async function getStore() {
  return load(STORE_FILE, { defaults: {} });
}

function villageIcon(village: Villages): string {
  return village.split(" ")[0];
}

const ALL_VILLAGES = Object.values(Villages);

interface FormState {
  name: string;
  notes: string;
  village: Villages;
  selectedTags: Tag[];
}

function emptyForm(): FormState {
  return { name: "", notes: "", village: Villages.Plains, selectedTags: [] };
}

function StaffForm({
  form,
  allTags,
  onChange,
  onTagToggle,
  onSubmit,
  submitLabel,
  onDelete,
}: {
  form: FormState;
  allTags: Tag[];
  onChange: (patch: Partial<FormState>) => void;
  onTagToggle: (tag: Tag) => void;
  onSubmit: () => void;
  submitLabel: string;
  onDelete?: () => void;
}) {
  return (
    <div className="staff-form">
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
        <label className="form-label">Village</label>
        <select
          className="form-input"
          value={form.village}
          onChange={(e) => onChange({ village: e.currentTarget.value as Villages })}
        >
          {ALL_VILLAGES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="form-label">Notes</label>
        <textarea
          className="form-input form-textarea"
          value={form.notes}
          onChange={(e) => onChange({ notes: e.currentTarget.value })}
        />
      </div>
      <div className="form-row">
        <label className="form-label">Tags</label>
        <div className="tag-list">
          {allTags.length === 0
            ? <span className="tag-empty">No tags defined yet.</span>
            : allTags.map((tag) => (
                <span
                  key={tag}
                  className={`tag-chip${form.selectedTags.includes(tag) ? " tag-chip--selected" : ""}`}
                  onClick={() => onTagToggle(tag)}
                >
                  {tag}
                </span>
              ))
          }
        </div>
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

function StaffPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [addForm, setAddForm] = useState<FormState>(emptyForm());
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [sort, setSort] = useState<"none" | "name" | "village">("none");
  const [removeTagTarget, setRemoveTagTarget] = useState<Tag | null>(null);

  useEffect(() => {
    getStore().then(async (store) => {
      const savedTags = await store.get<Tag[]>(TAGS_KEY);
      if (savedTags) setTags(savedTags);
      const savedStaff = await store.get<StaffMember[]>(STAFF_KEY);
      if (savedStaff) setStaff(savedStaff);
    });
  }, []);

  async function saveStaff(updated: StaffMember[]) {
    const store = await getStore();
    await store.set(STAFF_KEY, updated);
  }

  async function addTag() {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) { setNewTag(""); return; }
    const updated = [...tags, trimmed];
    setTags(updated);
    setNewTag("");
    const store = await getStore();
    await store.set(TAGS_KEY, updated);
  }

  async function confirmRemoveTag(tag: Tag) {
    const updatedTags = tags.filter((t) => t !== tag);
    const updatedStaff = staff.map((s) =>
      s.tags.includes(tag)
        ? new StaffMember(s.id, s.name, s.notes, s.village, s.tags.filter((t) => t !== tag))
        : s
    );
    const store = await getStore();
    const savedActivities = await store.get<ActivityType[]>(ACTIVITIES_KEY);
    const activities: ActivityType[] = savedActivities ?? [];
    const updatedActivities = activities.map((a) =>
      a.specialRatio?.tag === tag
        ? new ActivityType(a.id, a.name, a.counselorRatio, null, a.allCampersIncluded)
        : a
    );
    setTags(updatedTags);
    setStaff(updatedStaff);
    setRemoveTagTarget(null);
    await store.set(TAGS_KEY, updatedTags);
    await store.set(STAFF_KEY, updatedStaff);
    await store.set(ACTIVITIES_KEY, updatedActivities);
  }

  function addStaff() {
    if (!addForm.name.trim()) return;
    const member = new StaffMember(
      crypto.randomUUID(), addForm.name.trim(), addForm.notes, addForm.village, addForm.selectedTags
    );
    const updated = [...staff, member];
    setStaff(updated);
    saveStaff(updated);
    setAddForm(emptyForm());
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member);
    setEditForm({ name: member.name, notes: member.notes, village: member.village, selectedTags: [...member.tags] });
  }

  function saveEdit() {
    if (!editTarget) return;
    const updated = staff.map((s) =>
      s.id === editTarget.id
        ? new StaffMember(s.id, editForm.name.trim(), editForm.notes, editForm.village, editForm.selectedTags)
        : s
    );
    setStaff(updated);
    saveStaff(updated);
    setEditTarget(null);
  }

  function deleteStaff() {
    if (!editTarget) return;
    const updated = staff.filter((s) => s.id !== editTarget.id);
    setStaff(updated);
    saveStaff(updated);
    setEditTarget(null);
  }

  function toggleTag(form: FormState, tag: Tag): Partial<FormState> {
    const selectedTags = form.selectedTags.includes(tag)
      ? form.selectedTags.filter((t) => t !== tag)
      : [...form.selectedTags, tag];
    return { selectedTags };
  }

  return (
    <div className="staff-bg">
      <NavBar />
      <div className="page">
        <header className="site-header">
          <h1 className="site-title"><img src={titleGif} className="title-gif" alt="" />Staff<img src={titleGif} className="title-gif" alt="" /></h1>
          <hr className="divider" />
        </header>
        <main>

          {/* Tags */}
          <details className="collapsible">
            <summary className="collapsible-summary">Tags</summary>
            <div className="collapsible-body">
              <div className="tag-create">
                <input
                  className="tag-input"
                  type="text"
                  value={newTag}
                  placeholder="New tag..."
                  onChange={(e) => setNewTag(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                />
                <button className="tag-add-btn" onClick={addTag}>Add</button>
              </div>
              <div className="tag-list">
                {tags.length === 0
                  ? <span className="tag-empty">No tags yet.</span>
                  : tags.map((tag) => (
                    <span key={tag} className="tag-chip tag-chip--removable">
                      {tag}
                      <button
                        className="tag-remove-btn"
                        onClick={(e) => { e.stopPropagation(); setRemoveTagTarget(tag); }}
                        title={`Remove tag "${tag}"`}
                      >×</button>
                    </span>
                  ))
                }
              </div>
            </div>
          </details>

          {/* Add Staff */}
          <details className="collapsible">
            <summary className="collapsible-summary">Add Staff</summary>
            <div className="collapsible-body">
              <StaffForm
                form={addForm}
                allTags={tags}
                onChange={(patch) => setAddForm((f) => ({ ...f, ...patch }))}
                onTagToggle={(tag) => setAddForm((f) => ({ ...f, ...toggleTag(f, tag) }))}
                onSubmit={addStaff}
                submitLabel="Add Staff Member"
              />
            </div>
          </details>

          {/* Staff List */}
          <details className="collapsible" open>
            <summary className="collapsible-summary">Staff List</summary>
            <div className="collapsible-body">
              <div className="sort-bar">
                <span className="sort-label">Sort:</span>
                {(["none", "name", "village"] as const).map((opt) => (
                  <button
                    key={opt}
                    className={`btn btn--sort${sort === opt ? " btn--sort-active" : ""}`}
                    onClick={() => setSort(opt)}
                  >
                    {opt === "none" ? "No Sort" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
              {staff.length === 0
                ? <span className="tag-empty">No staff members yet.</span>
                : [...staff]
                    .sort((a, b) => {
                      if (sort === "name") return a.name.localeCompare(b.name);
                      if (sort === "village") return a.village.localeCompare(b.village);
                      return 0;
                    })
                    .map((member) => (
                      <div key={member.id} className="staff-row">
                        <span className="staff-village-icon">{villageIcon(member.village)}</span>
                        <span className="staff-name">{member.name}</span>
                        <button className="btn btn--edit" onClick={() => openEdit(member)}>Edit</button>
                      </div>
                    ))
              }
            </div>
          </details>

        </main>
      </div>

      {/* Remove Tag Confirmation Modal */}
      {removeTagTarget && (
        <div className="modal-overlay" onClick={() => setRemoveTagTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Remove Tag</h2>
            <p className="modal-body-text">
              Remove tag <strong>"{removeTagTarget}"</strong>?
              This will also remove it from all staff members and clear any activity certification requirements using this tag.
            </p>
            <div className="form-actions">
              <button className="btn btn--cancel" onClick={() => setRemoveTagTarget(null)}>Cancel</button>
              <button className="btn btn--danger" onClick={() => confirmRemoveTag(removeTagTarget)}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit Staff Member</h2>
            <StaffForm
              form={editForm}
              allTags={tags}
              onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
              onTagToggle={(tag) => setEditForm((f) => ({ ...f, ...toggleTag(f, tag) }))}
              onSubmit={saveEdit}
              submitLabel="Save"
              onDelete={deleteStaff}
            />
            <button className="btn btn--cancel modal-cancel" onClick={() => setEditTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPage;
