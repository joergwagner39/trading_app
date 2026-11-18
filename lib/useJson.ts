"use client";
import { useEffect, useState } from "react";

export function useJson<T>(url: string | null, refreshMs?: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!url || !refreshMs) return;
    const id = setInterval(() => document.visibilityState === "visible" && setTick((t) => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [url, refreshMs]);
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: !!url });
  useEffect(() => {
    if (!url) {
      setState({ loading: false });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ data: s.data, loading: !s.data || tick === 0 }));
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        setState({ data: j as T, loading: false });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setState({ error: e.message, loading: false });
      });
    return () => ctrl.abort();
  }, [url, tick]);
  return state;
}
