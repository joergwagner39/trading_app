"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/data";
import { useWatchlist } from "@/lib/watchlist";

/**
 * Aktiensuche mit Vorschlägen.
 * - mode "navigate" (Kopfzeile): Klick öffnet die Aktie, der +-Knopf nimmt sie direkt in die Watchlist auf.
 * - mode "add" (Watchlist-Seite): Klick/Enter fügt die Aktie zur Watchlist hinzu, das Feld bleibt offen für die nächste.
 */
export default function SearchBox({
  mode = "navigate",
  placeholder = "Aktie suchen (Name oder Symbol)…",
  onAdded,
}: {
  mode?: "navigate" | "add";
  placeholder?: string;
  onAdded?: (hit: SearchHit) => void;
}) {
  const router = useRouter();
  const wl = useWatchlist();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) return setHits([]);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => Array.isArray(j) && (setHits(j), setActive(0)))
        .catch(() => {});
    }, 200);
    return () => (clearTimeout(t), ctrl.abort());
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (h: SearchHit) => {
    if (mode === "add") {
      wl.add(h.symbol);
      onAdded?.(h);
      setQ("");
      setHits([]);
      input.current?.focus();
      return;
    }
    setOpen(false);
    setQ("");
    router.push(`/stock/${encodeURIComponent(h.symbol)}`);
  };

  return (
    <div className={`search ${mode === "add" ? "search-add" : ""}`} ref={box}>
      <input
        ref={input}
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={q}
        onChange={(e) => (setQ(e.target.value), setOpen(true))}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, hits.length - 1)));
          if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
          if (e.key === "Enter") {
            if (hits[active]) pick(hits[active]);
            else if (mode === "navigate" && q.trim()) pick({ symbol: q.trim().toUpperCase(), name: "", exchange: "", type: "" });
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul className="search-results" role="listbox">
          {hits.map((h, i) => {
            const on = wl.has(h.symbol);
            return (
              <li key={h.symbol} role="option" aria-selected={i === active} className={i === active ? "on" : ""}
                onMouseDown={(e) => (e.preventDefault(), pick(h))} onMouseEnter={() => setActive(i)}>
                <b>{h.symbol}</b>
                <span>{h.name}</span>
                <small>{h.exchange}</small>
                {mode === "navigate" ? (
                  <button
                    className={`wl-toggle ${on ? "on" : ""}`}
                    title={on ? "Von Watchlist entfernen" : "Zur Watchlist hinzufügen"}
                    aria-label={on ? `${h.symbol} von Watchlist entfernen` : `${h.symbol} zur Watchlist hinzufügen`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      wl.toggle(h.symbol);
                    }}
                  >
                    {on ? "✓" : "+"}
                  </button>
                ) : (
                  <span className={`wl-state ${on ? "on" : ""}`}>{on ? "✓ drin" : "+ hinzufügen"}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
