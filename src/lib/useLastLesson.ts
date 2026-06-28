import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const STORAGE_KEY = "aura_last_lesson";

export interface LastLesson {
  path: string;
  label: string;
  section: string;
  ts: number;
}

const LESSON_LABELS: Record<string, { label: string; section: string }> = {
  "/schriftlich/vorbereitung/lesen/teil-1":           { label: "Lesen — Teil 1",           section: "Schriftlich" },
  "/schriftlich/vorbereitung/lesen/teil-2":           { label: "Lesen — Teil 2",           section: "Schriftlich" },
  "/schriftlich/vorbereitung/lesen/teil-3":           { label: "Lesen — Teil 3",           section: "Schriftlich" },
  "/schriftlich/vorbereitung/hoeren/teil-1":          { label: "Hören — Teil 1",           section: "Schriftlich" },
  "/schriftlich/vorbereitung/hoeren/teil-2":          { label: "Hören — Teil 2",           section: "Schriftlich" },
  "/schriftlich/vorbereitung/hoeren/teil-3":          { label: "Hören — Teil 3",           section: "Schriftlich" },
  "/schriftlich/vorbereitung/sprachbausteine/teil-1": { label: "Sprachbausteine — Teil 1", section: "Schriftlich" },
  "/schriftlich/vorbereitung/sprachbausteine/teil-2": { label: "Sprachbausteine — Teil 2", section: "Schriftlich" },
  "/schriftlich/vorbereitung/schreiben/beschwerde":   { label: "Schreiben — Beschwerde",   section: "Schriftlich" },
  "/schriftlich/vorbereitung/schreiben/bitte":        { label: "Schreiben — Bitte",         section: "Schriftlich" },
  "/schriftlich/pruefung":                            { label: "Prüfungssimulation",         section: "Schriftlich" },
  "/muendlich/vorbereitung/teil-1":                   { label: "Präsentation (Teil 1)",      section: "Mündlich" },
  "/muendlich/vorbereitung/teil-2":                   { label: "Thema sprechen (Teil 2)",    section: "Mündlich" },
  "/muendlich/vorbereitung/teil-3":                   { label: "Gemeinsam planen (Teil 3)", section: "Mündlich" },
  "/muendlich/pruefung":                              { label: "Prüfungssimulation",         section: "Mündlich" },
};

export function useTrackLesson() {
  const state = useRouterState();
  const pathname = state.location.pathname;

  useEffect(() => {
    const info = LESSON_LABELS[pathname];
    if (!info) return;
    const lesson: LastLesson = { path: pathname, label: info.label, section: info.section, ts: Date.now() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lesson));
    } catch {}
  }, [pathname]);
}

export function getLastLesson(): LastLesson | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const lesson = JSON.parse(raw) as LastLesson;
    // Expire after 14 days
    if (Date.now() - lesson.ts > 14 * 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return lesson;
  } catch {
    return null;
  }
}
