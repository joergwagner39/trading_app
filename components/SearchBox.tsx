"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/data";

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

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

  const go = (symbol: string) => {
    setOpen(false);
    setQ("");
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  return (
    <div className="search" ref={box}>
      <input
        type="search"
        placeholder="Aktie suchen (Name oder Symbol)…"
        aria-label="Aktie suchen"
        value={q}
        onChange={(e) => (setQ(e.target.value), setOpen(true))}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, hits.length - 1)));
          if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
          if (e.key === "Enter") {
            if (hits[active]) go(hits[active].symbol);
            else if (q.trim()) go(q.trim().toUpperCase());
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul className="search-results" role="listbox">
          {hits.map((h, i) => (
            <li key={h.symbol} role="option" aria-selected={i === active} className={i === active ? "on" : ""}
              onMouseDown={(e) => (e.preventDefault(), go(h.symbol))} onMouseEnter={() => setActive(i)}>
              <b>{h.symbol}</b>
              <span>{h.name}</span>
              <small>{h.exchange}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
