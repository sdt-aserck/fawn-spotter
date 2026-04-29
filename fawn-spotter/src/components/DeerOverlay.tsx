import { useState, useEffect, useRef, useCallback } from "react";
import deerGif from "../assets/deer.gif";
import "./DeerOverlay.css";

const DEER_SPEED_PX_PER_SEC = 300;
const TRIGGER_INTERVAL_MS = 8 * 60 * 1000;
const TRIGGER_VARIANCE_MS = 2 * 60 * 1000;
const DEER_WIDTH_PX = 100;

interface Run {
  fromRight: boolean;
  y: number;
}

export default function DeerOverlay() {
  const [run, setRun] = useState<Run | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const runRef = useRef<Run | null>(null);

  const startRun = useCallback(() => {
    if (runRef.current) return;
    const newRun: Run = {
      fromRight: Math.random() < 0.5,
      y: Math.random() * (window.innerHeight * 0.75) + window.innerHeight * 0.1,
    };
    runRef.current = newRun;
    setRun(newRun);
  }, []);

  // Auto-schedule timer
  useEffect(() => {
    function schedule() {
      const delay = TRIGGER_INTERVAL_MS + (Math.random() * 2 - 1) * TRIGGER_VARIANCE_MS;
      timerRef.current = setTimeout(() => {
        startRun();
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startRun]);

  // Keyboard trigger
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "~" || e.key === "`") startRun();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startRun]);

  // Animate when run starts
  useEffect(() => {
    if (!run || !imgRef.current) return;
    const img = imgRef.current;
    const vw = window.innerWidth;
    const startX = run.fromRight ? vw : -DEER_WIDTH_PX;
    const endX = run.fromRight ? -DEER_WIDTH_PX : vw;
    const dist = vw + DEER_WIDTH_PX;
    const duration = dist / DEER_SPEED_PX_PER_SEC;

    // Phase 1: place off-screen with no transition
    img.style.transition = "none";
    img.style.left = `${startX}px`;

    // Phase 2: next frame, kick off the linear slide
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        img.style.transition = `left ${duration}s linear`;
        img.style.left = `${endX}px`;
      });
    });
  }, [run]);

  function handleTransitionEnd() {
    runRef.current = null;
    setRun(null);
  }

  if (!run) return null;

  // Gif faces left natively → right-to-left = no flip; left-to-right = flip
  const scaleX = run.fromRight ? 1 : -1;

  return (
    <img
      ref={imgRef}
      src={deerGif}
      className="deer-overlay"
      style={{
        top: run.y,
        left: run.fromRight ? window.innerWidth : -DEER_WIDTH_PX,
        transform: `scaleX(${scaleX})`,
      }}
      onTransitionEnd={handleTransitionEnd}
      alt=""
    />
  );
}
