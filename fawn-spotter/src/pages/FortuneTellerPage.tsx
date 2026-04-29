import { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import crystalBall from "../assets/fortune teller/crystal_ball.gif";
import wizard from "../assets/fortune teller/wizard.gif";
import dragon from "../assets/fortune teller/dragon.gif";
import fire from "../assets/fortune teller/fire.gif";
import "../App.css";
import "./FortuneTellerPage.css";

const DRAGON_W = 120;
const DRAGON_H = 80;
const SPEED = 2.2;

const WIZARD_THOUGHTS = [
  "This weather isn't actually too bad",
  "America has a fentanyl crisis",
  "Yellow is the best color",
  "That chicken in my fridge is starting to go bad",
  "I wish we could go back to a time before security cameras",
];

const FORTUNE_RESPONSES = [
  "No",
  "Yes",
  "Maybe",
  "Ask Again Later",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type ActiveModal = "fortune" | "importConfirm" | "deleteConfirm1" | "deleteConfirm2" | "credits" | null;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  angle: number; spin: number;
  size: number; life: number;
}

function ConfettiOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const COLORS = ["#f5c842", "#e84393", "#42b0f5", "#7ae842", "#f56042", "#c042f5", "#42f5b3"];
    const particles: Particle[] = [];
    let animId: number;
    const startTime = performance.now();

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
    burst(canvas.width / 2, canvas.height / 2, 180);

    let lastBurst = startTime;

    function frame(now: number) {
      const elapsed = now - startTime;
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
        p.vy += 0.25;
        p.vx *= 0.99;
        p.angle += p.spin;
        p.life -= 0.008;
        if (p.life <= 0 || p.y > canvas.height + 20) { particles.splice(i, 1); continue; }
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
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="ft-confetti-canvas" />;
}

function FireRow({ count }: { count: number }) {
  return (
    <div className="ft-fire-row">
      {Array.from({ length: count }).map((_, i) => (
        <img key={i} src={fire} className="ft-fire-img" alt="" />
      ))}
    </div>
  );
}

function FortuneTellerPage() {
  const dragonRefs = [
    useRef<HTMLImageElement>(null),
    useRef<HTMLImageElement>(null),
    useRef<HTMLImageElement>(null),
  ];
  const dragons = useRef([
    { pos: { x: 100, y: 200 }, vel: { x: SPEED,        y: SPEED * 0.6  } },
    { pos: { x: 400, y: 80  }, vel: { x: -SPEED * 0.8, y: SPEED * 1.1  } },
    { pos: { x: 700, y: 350 }, vel: { x: SPEED * 1.2,  y: -SPEED * 0.7 } },
  ]);
  const rafId = useRef<number>(0);

  const [thought, setThought] = useState(() => pick(WIZARD_THOUGHTS));
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    function tick() {
      const maxX = window.innerWidth - DRAGON_W;
      const maxY = window.innerHeight - DRAGON_H;

      dragons.current.forEach((d, i) => {
        const el = dragonRefs[i].current;
        if (!el) return;

        d.pos.x += d.vel.x;
        d.pos.y += d.vel.y;

        if (d.pos.x <= 0)         { d.pos.x = 0;    d.vel.x =  Math.abs(d.vel.x); }
        else if (d.pos.x >= maxX) { d.pos.x = maxX; d.vel.x = -Math.abs(d.vel.x); }
        if (d.pos.y <= 0)         { d.pos.y = 0;    d.vel.y =  Math.abs(d.vel.y); }
        else if (d.pos.y >= maxY) { d.pos.y = maxY; d.vel.y = -Math.abs(d.vel.y); }

        el.style.left = `${d.pos.x}px`;
        el.style.top  = `${d.pos.y}px`;
        el.style.transform = d.vel.x < 0 ? "scaleX(1)" : "scaleX(-1)";
      });

      rafId.current = requestAnimationFrame(tick);
    }

    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  async function handleExportSaveData() {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const { load } = await import("@tauri-apps/plugin-store");

    const store = await load("fawn-spotter.json", { defaults: {} });
    const entries = await store.entries();
    const data: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      data[key] = value;
    }

    const filePath = await save({
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      defaultPath: "fawn-spotter-backup.json",
    });
    if (!filePath) return;

    const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2));
    await writeFile(filePath, bytes);
  }

  async function handleImportConfirmed() {
    setActiveModal(null);
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const { load } = await import("@tauri-apps/plugin-store");

    const filePath = await open({ filters: [{ name: "JSON Files", extensions: ["json"] }], multiple: false });
    if (!filePath) return;

    const text = await readTextFile(filePath as string);
    const data: Record<string, unknown> = JSON.parse(text);

    const store = await load("fawn-spotter.json", { defaults: {} });
    for (const [key, value] of Object.entries(data)) {
      await store.set(key, value);
    }
    await store.save();
  }

  async function handleDeleteAllConfirmed() {
    setActiveModal(null);
    const { load } = await import("@tauri-apps/plugin-store");
    const store = await load("fawn-spotter.json", { defaults: {} });
    await store.clear();
    await store.save();
  }

  function handleCredits() { setActiveModal("credits"); }

  function openFortuneModal() {
    setQuestion("");
    setActiveModal("fortune");
  }

  function submitQuestion() {
    if (!question.trim()) return;
    setThought(pick(FORTUNE_RESPONSES));
    setActiveModal(null);
  }

  return (
    <div className="fortune-teller-bg">
      <NavBar />
      <div className="ft-side-buttons ft-side-buttons--left">
        <button className="ft-circle-btn ft-circle-btn--1" onClick={handleExportSaveData}>Export Save Data</button>
        <button className="ft-circle-btn ft-circle-btn--2" onClick={() => setActiveModal("importConfirm")}>Import Save Data</button>
      </div>
      <div className="ft-side-buttons ft-side-buttons--right">
        <button className="ft-circle-btn ft-circle-btn--3" onClick={() => setActiveModal("deleteConfirm1")}>Delete All Data</button>
        <button className="ft-circle-btn ft-circle-btn--4" onClick={handleCredits}>Credits</button>
      </div>
      {dragonRefs.map((ref, i) => (
        <img key={i} ref={ref} src={dragon} className="ft-dragon" alt="Dragon" />
      ))}
      <div className="page">
        <header className="site-header">
          <h1 className="site-title">
            <img src={crystalBall} className="title-gif" alt="" />
            Fortune Teller
            <img src={crystalBall} className="title-gif" alt="" />
          </h1>
          <hr className="divider" />
        </header>
        <main>
          <div className="ft-scene">
            <div className="ft-thought-bubble">
              <span className="ft-thought-label">The Wizard Thinks:</span>
              <span className="ft-thought-text">{thought}</span>
            </div>
            <div className="ft-thought-dots">
              <span />
              <span />
              <span />
            </div>
            <img src={wizard} className="ft-wizard" alt="Wizard" />
            <img
              src={crystalBall}
              className="ft-crystal-ball"
              alt="Crystal Ball"
              onClick={openFortuneModal}
            />
          </div>
        </main>
      </div>
      <div className="ft-bottom-prompt">Click the ball to recieve your fortune</div>

      {/* Fortune modal */}
      {activeModal === "fortune" && (
        <div className="ft-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="ft-modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="ft-modal-title">ASK YOUR QUESTION</h2>
            <input
              className="ft-modal-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitQuestion(); }}
              autoFocus
              placeholder="What do you wish to know?"
            />
            <button className="ft-modal-submit" onClick={submitQuestion} disabled={!question.trim()}>
              Submit
            </button>
          </div>
        </div>
      )}

      {/* Import confirmation modal */}
      {activeModal === "importConfirm" && (
        <div className="ft-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="ft-modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 className="ft-modal-title">Import Save Data</h2>
            <p className="ft-modal-warning">
              Warning: this will overwrite ALL existing save data including staff, activities, schedules, and timeslots. This cannot be undone.
            </p>
            <div className="ft-modal-actions">
              <button className="ft-modal-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="ft-modal-submit" onClick={handleImportConfirmed}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal 1 */}
      {activeModal === "deleteConfirm1" && (
        <div className="ft-modal-overlay">
          <div className="ft-modal-box ft-modal-box--delete" onClick={(e) => e.stopPropagation()}>
            <FireRow count={6} />
            <h2 className="ft-modal-title ft-modal-title--delete">DELETE ALL DATA?</h2>
            <p className="ft-modal-warning">
              You are about to permanently destroy ALL save data.<br />
              Every staff member, activity, schedule, and timeslot will be gone forever.
            </p>
            <FireRow count={6} />
            <div className="ft-delete-actions ft-delete-actions--1">
              <button className="ft-modal-submit ft-delete-no" onClick={() => setActiveModal(null)}>NO — Keep My Data</button>
              <button className="ft-delete-yes-small" onClick={() => setActiveModal("deleteConfirm2")}>yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal 2 */}
      {activeModal === "deleteConfirm2" && (
        <div className="ft-modal-overlay">
          <div className="ft-modal-box ft-modal-box--delete" onClick={(e) => e.stopPropagation()}>
            <div className="ft-fire-surround">
              <FireRow count={6} />
              <div className="ft-fire-sides">
                <img src={fire} className="ft-fire-side-img" alt="" />
                <div className="ft-delete-confirm-content">
                  <h2 className="ft-modal-title ft-modal-title--delete">ARE YOU SURE?</h2>
                  <p className="ft-modal-warning">
                    This is your last chance.<br />
                    All data will be consumed by the flames.
                  </p>
                </div>
                <img src={fire} className="ft-fire-side-img" alt="" />
              </div>
              <FireRow count={6} />
            </div>
            <div className="ft-delete-actions ft-delete-actions--2">
              <button className="ft-delete-yes-small" onClick={handleDeleteAllConfirmed}>yes, delete everything</button>
              <button className="ft-modal-submit ft-delete-no" onClick={() => setActiveModal(null)}>NO — I Changed My Mind</button>
            </div>
          </div>
        </div>
      )}
      {/* Credits modal */}
      {activeModal === "credits" && (
        <>
          <ConfettiOverlay />
          <div className="ft-modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="ft-modal-box ft-modal-box--credits" onClick={(e) => e.stopPropagation()}>
              <h2 className="ft-modal-title ft-credits-title">Credits</h2>
              <p className="ft-credits-text">
                This program was created with &lt;3 by AJ
              </p>
              <button className="ft-modal-submit ft-credits-close" onClick={() => setActiveModal(null)}>
                Thanks AJ
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FortuneTellerPage;
