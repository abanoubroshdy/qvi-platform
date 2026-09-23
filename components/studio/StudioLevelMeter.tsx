"use client";

import { useEffect, type RefObject } from "react";
import { useStudio } from "@/components/studio/studio-context";
import { decayMeter, STUDIO_METER_FRAME_MS } from "@/lib/studio/meters";

export function StudioLevelMeter({ id, axis = "y" }: { id: string; axis?: "x" | "y" }) {
  return (
    <div
      data-meter={id}
      data-meter-axis={axis}
      className={axis === "x" ? "studio-meter studio-meter-x" : "studio-meter studio-meter-y"}
      aria-hidden="true"
    >
      <span className="studio-meter-fill" />
    </div>
  );
}

/** One frame clock paints every meter. Levels never go through setState. */
export function useStudioMeterPaint(rootRef: RefObject<HTMLElement | null>) {
  const { readMeters } = useStudio();
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const held = new Map<string, number>();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const root = rootRef.current;
      if (!root || now - last < STUDIO_METER_FRAME_MS) return;
      last = now;
      const levels = readMeters();
      const groups = new Map<string, HTMLElement[]>();
      root.querySelectorAll<HTMLElement>("[data-meter]").forEach((node) => {
        const id = node.dataset.meter;
        if (!id) return;
        const list = groups.get(id);
        if (list) list.push(node);
        else groups.set(id, [node]);
      });
      const paint = (id: string, raw: number) => {
        const next = decayMeter(held.get(id) ?? 0, raw);
        if (next === 0) held.delete(id);
        else held.set(id, next);
        const targets = groups.get(id);
        if (!targets) return;
        const level = next > 0.92 ? "hot" : next > 0.72 ? "warm" : "ok";
        const scale = next.toFixed(4);
        for (const node of targets) {
          if (node.dataset.meterLevel !== level) node.dataset.meterLevel = level;
          const fill = node.firstElementChild as HTMLElement | null;
          if (!fill) continue;
          const axis = node.dataset.meterAxis === "x" ? "scaleX" : "scaleY";
          fill.style.transform = `${axis}(${scale})`;
        }
      };
      const seen = new Set<string>(["master"]);
      paint("master", levels.master);
      for (const [id, value] of Object.entries(levels.tracks)) {
        seen.add(id);
        paint(id, value);
      }
      groups.forEach((_targets, id) => {
        if (!seen.has(id)) paint(id, 0);
      });
      const stale: string[] = [];
      held.forEach((_level, id) => {
        if (!groups.has(id)) stale.push(id);
      });
      stale.forEach((id) => held.delete(id));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [readMeters, rootRef]);
}
