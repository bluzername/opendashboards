"use client";

import { useSyncExternalStore } from "react";

/**
 * Pins, recently opened dashboards and the Recents section's open state, kept
 * in this browser. Nothing here reaches the server, so it does not follow the
 * user to another browser; storage that fails (private mode, blocked site
 * data) leaves the sidebar working with empty lists.
 */
export type PinKind = "app" | "dashboard";
export type Pin = { kind: PinKind; id: string };
type Memory = { pins: Pin[]; recents: string[]; recentsOpen: boolean };

const KEY = "opendashboards:sidebar";
const RECENT_LIMIT = 5;
const EMPTY: Memory = { pins: [], recents: [], recentsOpen: true };

let memory: Memory | null = null;
const listeners = new Set<() => void>();

function read(): Memory {
  if (memory) return memory;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Memory> | null;
    memory = {
      pins: Array.isArray(parsed?.pins) ? parsed.pins.filter((pin) => pin && (pin.kind === "app" || pin.kind === "dashboard") && typeof pin.id === "string") : [],
      recents: Array.isArray(parsed?.recents) ? parsed.recents.filter((id) => typeof id === "string").slice(0, RECENT_LIMIT) : [],
      recentsOpen: parsed?.recentsOpen !== false,
    };
  } catch {
    memory = EMPTY;
  }
  return memory;
}

function write(next: Memory) {
  memory = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* the in-memory copy still updates */ }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const sync = (event: StorageEvent) => { if (event.key === KEY) { memory = null; listener(); } };
  window.addEventListener("storage", sync);
  return () => { listeners.delete(listener); window.removeEventListener("storage", sync); };
}

export function useSidebarMemory(): Memory {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function isPinned(pins: Pin[], kind: PinKind, id: string) {
  return pins.some((pin) => pin.kind === kind && pin.id === id);
}

export function togglePin(kind: PinKind, id: string) {
  const current = read();
  const pins = isPinned(current.pins, kind, id)
    ? current.pins.filter((pin) => !(pin.kind === kind && pin.id === id))
    : [...current.pins, { kind, id }];
  write({ ...current, pins });
}

/** Moves a dashboard to the front of Recents. */
export function rememberDashboard(id: string) {
  const current = read();
  if (current.recents[0] === id) return;
  write({ ...current, recents: [id, ...current.recents.filter((recent) => recent !== id)].slice(0, RECENT_LIMIT) });
}

export function setRecentsOpen(open: boolean) {
  write({ ...read(), recentsOpen: open });
}
