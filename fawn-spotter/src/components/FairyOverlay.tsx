import { useState, useEffect, useRef, useCallback } from "react";
import fairyGif from "../assets/page-titles/schedule_detail.gif";
import "./FairyOverlay.css";

const FAIRY_SPEED_PX_PER_SEC = 220;
const TRIGGER_INTERVAL_MS = 30 * 60 * 1000;
const TRIGGER_VARIANCE_MS = 2 * 60 * 1000;
const FAIRY_WIDTH_PX = 80;

interface Run {
  fromRight: boolean;
  y: number;
}

export default function FairyOverlay() {
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Home") startRun();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startRun]);

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

  useEffect(() => {
    if (!run || !imgRef.current) return;
    const img = imgRef.current;
    const vw = window.innerWidth;
    const startX = run.fromRight ? vw : -FAIRY_WIDTH_PX;
    const endX = run.fromRight ? -FAIRY_WIDTH_PX : vw;
    const dist = vw + FAIRY_WIDTH_PX;
    const duration = dist / FAIRY_SPEED_PX_PER_SEC;

    img.style.transition = "none";
    img.style.left = `${startX}px`;

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

  // Gif faces right natively → left-to-right = no flip; right-to-left = flip
  const scaleX = run.fromRight ? -1 : 1;

  return (
    <img
      ref={imgRef}
      src={fairyGif}
      className="fairy-overlay"
      style={{
        top: run.y,
        left: run.fromRight ? window.innerWidth : -FAIRY_WIDTH_PX,
        transform: `scaleX(${scaleX})`,
      }}
      onTransitionEnd={handleTransitionEnd}
      alt=""
    />
  );
}
