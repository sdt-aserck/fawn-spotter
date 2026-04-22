import { useState, useRef, useMemo, useEffect } from "react";
import { generateDocument } from "../utils/generateSharedExperienceDoc";
import NavBar from "../components/NavBar";
import "../App.css";
import "./SharedExperiencePage.css";

interface Camper {
  facilityName: string;
  nameFirst: string;
  nameLast: string;
  preferredName: string;
  isCIT: boolean;
}

function normalizeCell(s: string): string {
  return s.trim().replace(/\r/, "").replace(/^"|"$/g, "");
}

function parseCsv(text: string): Camper[] {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  const [headerLine, ...rows] = clean.trim().split("\n");
  const headers = headerLine.split(",").map((h) => normalizeCell(h).toLowerCase());
  return rows
    .map((row) => {
      const cols = row.split(",").map(normalizeCell);
      return {
        facilityName: cols[headers.indexOf("facilityname")] ?? "",
        nameFirst: cols[headers.indexOf("namefirst")] ?? "",
        nameLast: cols[headers.indexOf("namelast")] ?? "",
        preferredName: "",
        isCIT: false,
      };
    })
    .filter((c) => c.nameFirst || c.nameLast);
}

interface Cabin {
  name: string;
  campers: Camper[];
}

interface Activity {
  name: string;
}

interface SlotValue {
  day: string;
  activity: string;
  leader: string;
}

interface SharedExperience {
  id: string;
  groupNumber: number;
  slot1: SlotValue;
  slot2: SlotValue;
  slot3: SlotValue;
  slot4: SlotValue;
  cabinNames: string[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_ACTIVITIES: Activity[] = [
  { name: "Zipline" },
  { name: "Creek" },
  { name: "Fire" },
  { name: "Hike" },
];

function camperKey(c: Camper) {
  return `${c.facilityName.toLowerCase()}|${c.nameFirst.toLowerCase()}|${c.nameLast.toLowerCase()}`;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  angle: number; spin: number;
  size: number; life: number;
}

function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const COLORS = ["#f5c842", "#e84393", "#42b0f5", "#7ae842", "#f56042", "#c042f5", "#42f5b3"];
    const particles: Particle[] = [];
    let animId: number;
    const startTime = performance.now();
    const DURATION = 10000;

    function burst(cx: number, cy: number, count: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 10;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.3,
          size: 7 + Math.random() * 8,
          life: 1,
        });
      }
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Initial big burst from center
    burst(canvas.width / 2, canvas.height / 2, 180);

    let lastBurst = startTime;

    function frame(now: number) {
      const elapsed = now - startTime;
      if (elapsed > DURATION && particles.length === 0) {
        onDone();
        return;
      }

      // Periodic smaller bursts for 8s
      if (elapsed < 8000 && now - lastBurst > 600) {
        burst(
          canvas.width * (0.2 + Math.random() * 0.6),
          canvas.height * (0.1 + Math.random() * 0.4),
          40
        );
        lastBurst = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.99;
        p.angle += p.spin;
        p.life -= 0.008;
        if (p.life <= 0 || p.y > canvas.height + 20) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(p.life, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [onDone]);

  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

function makeSE(groupIndex: number, acts: Activity[]): SharedExperience {
  const a = (offset: number) => acts[(groupIndex + offset) % Math.max(acts.length, 1)]?.name ?? "";
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday"];
  return {
    id: crypto.randomUUID(),
    groupNumber: groupIndex + 1,
    slot1: { day: days[0], activity: a(0), leader: "" },
    slot2: { day: days[1], activity: a(1), leader: "" },
    slot3: { day: days[2], activity: a(2), leader: "" },
    slot4: { day: days[3], activity: a(3), leader: "" },
    cabinNames: [],
  };
}

function SharedExperiencePage() {
  const [campers, setCampers] = useState<Camper[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [sort, setSort] = useState<"none" | "facility" | "firstName" | "lastName">("none");
  const [activities, setActivities] = useState<Activity[]>(DEFAULT_ACTIVITIES);
  const [sharedExperiences, setSharedExperiences] = useState<SharedExperience[]>(() =>
    [0, 1, 2, 3].map((i) => makeSE(i, DEFAULT_ACTIVITIES))
  );
  const [newActivity, setNewActivity] = useState("");
  const [generating, setGenerating] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  const CELEBRATION_MESSAGES = [
    "You look cute today :)",
    "Look at you go!",
    "Saving time and being whimsical I see ;)",
    "Love your hair",
    "Time to celebrate with a Blue Moon",
    "A Fawn couldn't do it any faster!",
    "You're the best Fawn!",
    "Your spots are showing!",
    "Send a pic in the chair!",
    "Go jump in the rock bottom creek~",
    "🦌🦌🦌🦌🦌🦌🦌"
  ];
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsv(e.target!.result as string);
      setCampers((existing) => {
        const seen = new Set(existing.map(camperKey));
        const newCampers: Camper[] = [];
        for (const c of parsed) {
          const key = camperKey(c);
          if (!seen.has(key)) {
            seen.add(key);
            newCampers.push(c);
          }
        }
        return [...existing, ...newCampers];
      });
    };
    reader.readAsText(file);
  }

  const assignedCabins = useMemo(
    () => new Set(sharedExperiences.flatMap((se) => se.cabinNames)),
    [sharedExperiences]
  );

  const cabins: Cabin[] = useMemo(() => {
    const map = new Map<string, Camper[]>();
    for (const c of campers) {
      const group = map.get(c.facilityName) ?? [];
      group.push(c);
      map.set(c.facilityName, group);
    }
    return [...map.entries()]
      .map(([name, cs]) => ({ name, campers: cs }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [campers]);

  function updatePreferredName(index: number, value: string) {
    setCampers((existing) => existing.map((c, i) => (i === index ? { ...c, preferredName: value } : c)));
  }

  function updateCIT(index: number, value: boolean) {
    setCampers((existing) => existing.map((c, i) => (i === index ? { ...c, isCIT: value } : c)));
  }

  function addSE() {
    setSharedExperiences((prev) => [...prev, makeSE(prev.length, activities)]);
  }

  function updateSE(id: string, patch: Partial<SharedExperience>) {
    setSharedExperiences((prev) => prev.map((se) => se.id === id ? { ...se, ...patch } : se));
  }

  function removeSE(id: string) {
    setSharedExperiences((prev) => prev.filter((se) => se.id !== id));
  }

  function addCabinToSE(se: SharedExperience, cabinName: string) {
    updateSE(se.id, { cabinNames: [...se.cabinNames, cabinName] });
  }

  function removeCabinFromSE(se: SharedExperience, cabinName: string) {
    updateSE(se.id, { cabinNames: se.cabinNames.filter((n) => n !== cabinName) });
  }

  return (
    <div className="shared-experience-bg">
      <NavBar />
      <div className="page">
        <header className="site-header">
          <h1 className="site-title">🌟 Shared Experience 🌟</h1>
          <hr className="divider" />
        </header>
        <main>

          {/* Upload */}
          <details className="collapsible" open={campers.length === 0 || undefined}>
            <summary className="collapsible-summary">Upload Campers</summary>
            <div className="collapsible-body">
              <div
                className={`upload-box${dragOver ? " upload-box--over" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFile(file);
                }}
              >
                <span className="upload-box-text">
                  {dragOver ? "Drop to upload" : "Click to upload or drag a CSV file here"}
                </span>
                <span className="upload-box-hint">Columns: facilityName, nameFirst, nameLast</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="upload-input-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </details>

          {/* Cabins */}
          <details className="collapsible" open>
            <summary className="collapsible-summary">
              Cabins {cabins.length > 0 && <span className="camper-count">({cabins.length})</span>}
            </summary>
            <div className="collapsible-body">
              {cabins.length === 0
                ? <span className="tag-empty">No cabins yet. Upload campers to populate.</span>
                : cabins.map((cabin) => (
                  <div key={cabin.name} className="cabin-row">
                    <span className="cabin-name">{cabin.name}</span>
                    <span className="cabin-count">{cabin.campers.length} camper{cabin.campers.length !== 1 ? "s" : ""}</span>
                  </div>
                ))
              }
            </div>
          </details>

          {/* Camper List */}
          <details className="collapsible" open>
            <summary className="collapsible-summary">
              Camper List {campers.length > 0 && <span className="camper-count">({campers.length})</span>}
            </summary>
            <div className="collapsible-body">
              {campers.length === 0
                ? <span className="tag-empty">No campers uploaded yet.</span>
                : (
                  <>
                    <div className="sort-bar">
                      <span className="sort-label">Sort:</span>
                      {([
                        ["none", "No Sort"],
                        ["facility", "Cabin"],
                        ["firstName", "First Name"],
                        ["lastName", "Last Name"],
                      ] as const).map(([opt, label]) => (
                        <button
                          key={opt}
                          className={`btn btn--sort${sort === opt ? " btn--sort-active" : ""}`}
                          onClick={() => setSort(opt)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="camper-row camper-row--header">
                      <span className="camper-col camper-facility">Facility</span>
                      <span className="camper-col camper-name">Name</span>
                      <span className="camper-col camper-preferred">Preferred Name</span>
                      <span className="camper-col camper-cit">CIT</span>
                    </div>
                    {[...campers.entries()]
                      .sort(([, a], [, b]) => {
                        if (sort === "facility") return a.facilityName.localeCompare(b.facilityName);
                        if (sort === "firstName") return a.nameFirst.localeCompare(b.nameFirst);
                        if (sort === "lastName") return a.nameLast.localeCompare(b.nameLast);
                        return 0;
                      })
                      .map(([origIndex, camper]) => (
                        <div key={origIndex} className="camper-row">
                          <span className="camper-col camper-facility">{camper.facilityName}</span>
                          <span className="camper-col camper-name">{camper.nameFirst} {camper.nameLast}</span>
                          <input
                            className="camper-col camper-preferred form-input"
                            type="text"
                            value={camper.preferredName}
                            placeholder="Preferred name..."
                            onChange={(e) => updatePreferredName(origIndex, e.currentTarget.value)}
                          />
                          <div className="camper-col camper-cit">
                            <input
                              type="checkbox"
                              className="cit-checkbox"
                              checked={camper.isCIT}
                              onChange={(e) => updateCIT(origIndex, e.currentTarget.checked)}
                            />
                          </div>
                        </div>
                      ))
                    }
                  </>
                )
              }
            </div>
          </details>

          {/* Shared Experience Selection */}
          <details className="collapsible" open>
            <summary className="collapsible-summary">
              Shared Experience Selection {sharedExperiences.length > 0 && <span className="camper-count">({sharedExperiences.length})</span>}
            </summary>
            <div className="collapsible-body">
              <details className="collapsible se-activity-collapsible">
                <summary className="collapsible-summary">Activities ({activities.length})</summary>
                <div className="collapsible-body">
                  {activities.map((a, i) => (
                    <div key={i} className="se-activity-row">
                      <input
                        className="form-input se-activity-input"
                        type="text"
                        value={a.name}
                        onChange={(e) => { const val = e.currentTarget.value; setActivities((prev) => prev.map((v, j) => j === i ? { ...v, name: val } : v)); }}
                      />
                      <button
                        className="cabin-pill-remove se-activity-remove"
                        onClick={() => setActivities((prev) => prev.filter((_, j) => j !== i))}
                      >✕</button>
                    </div>
                  ))}
                  <div className="se-activity-row">
                    <input
                      className="form-input se-activity-input"
                      type="text"
                      value={newActivity}
                      placeholder="New activity..."
                      onChange={(e) => setNewActivity(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newActivity.trim()) {
                          setActivities((prev) => [...prev, { name: newActivity.trim() }]);
                          setNewActivity("");
                        }
                      }}
                    />
                    <button
                      className="btn btn--small"
                      onClick={() => { if (newActivity.trim()) { setActivities((prev) => [...prev, { name: newActivity.trim() }]); setNewActivity(""); } }}
                    >+</button>
                  </div>
                </div>
              </details>
              <div className="se-add-row">
                <button className="btn btn--primary" onClick={addSE}>+ Add Shared Experience</button>
              </div>
              {sharedExperiences.length === 0
                ? <span className="tag-empty">No shared experiences yet.</span>
                : sharedExperiences.map((se) => {
                  const availableCabins = cabins.filter((c) => !assignedCabins.has(c.name) || se.cabinNames.includes(c.name));
                  const addableCabins = availableCabins.filter((c) => !se.cabinNames.includes(c.name));
                  return (
                    <div key={se.id} className="se-item">
                      <div className="se-item-header">
                        <span className="se-group-label">Group {se.groupNumber}</span>
                        <button className="btn btn--danger btn--small" onClick={() => removeSE(se.id)}>✕ Remove</button>
                      </div>
                      <div className="se-slots">
                        <div className="se-slot-header-row">
                          <span className="se-slot-header-cell se-slot-header-label"></span>
                          <span className="se-slot-header-cell">Day</span>
                          <span className="se-slot-header-cell">Activity</span>
                          <span className="se-slot-header-cell">Leader</span>
                        </div>
                        {([["slot1", "1"], ["slot2", "2"], ["slot3", "3"], ["slot4", "4"]] as const).map(([field, label]) => (
                          <div key={field} className="se-slot-row">
                            <label className="se-slot-label">Activity {label}</label>
                            <select
                              className="form-input se-slot-select"
                              value={se[field].day}
                              onChange={(e) => updateSE(se.id, { [field]: { ...se[field], day: e.currentTarget.value } })}
                            >
                              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select
                              className="form-input se-slot-select"
                              value={se[field].activity}
                              onChange={(e) => updateSE(se.id, { [field]: { ...se[field], activity: e.currentTarget.value } })}
                            >
                              <option value="">— activity —</option>
                              {activities.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                            </select>
                            <input
                              className="form-input se-slot-leader"
                              type="text"
                              value={se[field].leader}
                              placeholder="Leader..."
                              onChange={(e) => { const val = e.currentTarget.value; updateSE(se.id, { [field]: { ...se[field], leader: val } }); }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="se-cabins-section">
                        <span className="se-cabins-label">Cabins:</span>
                        <div className="se-cabins">
                          {se.cabinNames.map((name) => (
                            <span key={name} className="cabin-pill">
                              {name}
                              <button className="cabin-pill-remove" onClick={() => removeCabinFromSE(se, name)}>✕</button>
                            </span>
                          ))}
                          {addableCabins.length > 0 && (
                            <select
                              className="se-add-cabin"
                              value=""
                              onChange={(e) => { if (e.currentTarget.value) addCabinToSE(se, e.currentTarget.value); }}
                            >
                              <option value="">+ cabin</option>
                              {addableCabins.map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          )}
                          {se.cabinNames.length === 0 && addableCabins.length === 0 && (
                            <span className="tag-empty">No cabins available.</span>
                          )}
                        </div>
                      </div>
                      <div className="se-total-campers">
                        Total Campers: {se.cabinNames.reduce((sum, name) => sum + (cabins.find((c) => c.name === name)?.campers.length ?? 0), 0)}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </details>

          {/* Generate Document */}
          <div className="generate-section">
            <button
              className="btn btn--primary btn--generate"
              disabled={campers.length === 0 || sharedExperiences.length === 0 || generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  await generateDocument(sharedExperiences, cabins);
                  const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
                  setCelebrationMessage(msg);
                }
                catch (err) { console.error("Document generation failed:", err); }
                finally { setGenerating(false); }
              }}
            >
              Generate Document
            </button>
            {(campers.length === 0 || sharedExperiences.length === 0) && (
              <ul className="generate-help">
                {campers.length === 0 && <li>Upload a camper CSV file to enable generation.</li>}
                {sharedExperiences.length === 0 && <li>Add at least one shared experience to enable generation.</li>}
              </ul>
            )}
          </div>

        </main>
      </div>

      {celebrationMessage && (
        <ConfettiOverlay onDone={() => { }} />
      )}

      {celebrationMessage && (
        <div className="modal-overlay" onClick={() => setCelebrationMessage(null)}>
          <div className="modal-box celebration-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="celebration-header">🎉 CONGRATULATIONS 🎉</h2>
            <p className="celebration-body">{celebrationMessage}</p>
            <button className="btn btn--primary" onClick={() => setCelebrationMessage(null)}>
              Yippeeee &lt;3
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SharedExperiencePage;
