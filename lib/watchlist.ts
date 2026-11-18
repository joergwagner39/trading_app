"use client";
import { useSyncExternalStore } from "react";

// Watchlist wird lokal im Gerät gespeichert (localStorage).
const KEY = "watchlist.v1";
const DEFAULT = ["SAP.DE", "SIE.DE", "AAPL", "NVDA", "MSFT"];
const listeners = new Set<() => void>();
let current: string[] | null = null;

function read(): string[] {
  if (current) return current;
  try {
    const raw = localStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as string[]) : DEFAULT;
  } catch {
    current = DEFAULT;
  }
  return current;
}

function write(list: string[]) {
  current = list;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  listeners.forEach((l) => l());
}

const EMPTY: string[] = [];

export function useWatchlist() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          current = null;
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => EMPTY,
  );
  return {
    list,
    has: (s: string) => list.includes(s),
    add: (s: string) => !list.includes(s) && write([...list, s]),
    remove: (s: string) => write(list.filter((x) => x !== s)),
    toggle: (s: string) => (list.includes(s) ? write(list.filter((x) => x !== s)) : write([...list, s])),
    replace: (l: string[]) => write(Array.from(new Set(l.map((x) => x.trim().toUpperCase()).filter(Boolean)))),
  };
}
