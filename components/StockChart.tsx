"use client";
import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { type Candle, rsi, sma, weeklySma } from "@/lib/indicators";
import type { Analysis } from "@/lib/analysis";
import { OverlayPrimitive } from "./chartOverlay";
import { buildOverlay, DEFAULT_LAYERS, type Layers } from "./overlayBuilder";

const LAYER_LABELS: [keyof Layers, string][] = [
  ["zones", "Unterstützung/Widerstand"],
  ["buy", "Kaufzonen"],
  ["fib", "Fibonacci"],
  ["patterns", "Muster"],
  ["targets", "Zielzonen"],
];

const RANGES = [
  { id: "3M", months: 3 },
  { id: "6M", months: 6 },
  { id: "1J", months: 12 },
  { id: "2J", months: 24 },
  { id: "Max", months: 0 },
] as const;

function css(name: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  // #abc → #aabbcc, damit Alpha-Suffixe (#rrggbbaa) gültig bleiben
  return /^#[0-9a-f]{3}$/i.test(v) ? "#" + [...v.slice(1)].map((c) => c + c).join("") : v;
}

export default function StockChart({ candles, analysis }: { candles: Candle[]; analysis?: Analysis }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("1J");
  const [theme, setTheme] = useState(0);
  const overlayRef = useRef<OverlayPrimitive | null>(null);
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  useEffect(() => {
    try {
      const s = localStorage.getItem("chart.layers.v1");
      if (s) setLayers({ ...DEFAULT_LAYERS, ...JSON.parse(s) });
    } catch {}
  }, []);
  const toggle = (k: keyof Layers) =>
    setLayers((l) => {
      const n = { ...l, [k]: !l[k] };
      try {
        localStorage.setItem("chart.layers.v1", JSON.stringify(n));
      } catch {}
      return n;
    });
  const lastC = candles[candles.length - 1];
  // Nur neu zeichnen, wenn sich die Daten wirklich ändern (nicht bei jedem Refresh)
  const sig = `${candles.length}|${lastC?.time}|${lastC?.close}|${lastC?.high}|${lastC?.low}`;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setTheme((t) => t + 1);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!el.current || !candles.length) return;
    const up = css("--up");
    const down = css("--down");
    const text = css("--text-2");
    const grid = css("--border");
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: text, fontFamily: "inherit", attributionLogo: false },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, rightOffset: el.current.clientWidth < 600 ? 18 : 48 },
      crosshair: { mode: 0 },
      localization: { locale: "de-DE", priceFormatter: (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    });
    chartRef.current = chart;
    const t = (c: Candle) => c.time as Time;
    const closes = candles.map((c) => c.close);
    const line = (vals: (number | null)[]) =>
      vals.flatMap((v, i) => (v == null ? [] : [{ time: t(candles[i]), value: v }]));

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down,
    });
    cs.setData(candles.map((c) => ({ time: t(c), open: c.open, high: c.high, low: c.low, close: c.close })));
    const ov = new OverlayPrimitive();
    cs.attachPrimitive(ov);
    overlayRef.current = ov;
    chart.addSeries(LineSeries, { color: css("--sma50"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: "SMA 50" })
      .setData(line(sma(closes, 50)));
    chart.addSeries(LineSeries, { color: css("--sma200"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: "SMA 200" })
      .setData(line(sma(closes, 200)));
    chart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 2, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, title: "200 W" })
      .setData(line(weeklySma(candles, 200)));

    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(candles.map((c) => ({ time: t(c), value: c.volume, color: (c.close >= c.open ? up : down) + "55" })));

    const rs = chart.addSeries(LineSeries, { color: css("--accent"), lineWidth: 2, priceLineVisible: false, title: "RSI 14" }, 1);
    rs.setData(line(rsi(closes, 14)));
    for (const [p, c] of [[70, down], [30, up]] as const)
      rs.createPriceLine({ price: p, color: c, lineStyle: LineStyle.Dashed, lineWidth: 1, axisLabelVisible: true, title: "" });
    chart.panes()[1]?.setHeight(110);

    return () => {
      chart.remove();
      chartRef.current = null;
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, theme]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candles.length) return;
    const r = RANGES.find((x) => x.id === range)!;
    const lastIdx = candles.length - 1;
    // Rechts Platz für Zielzonen lassen (Handy: weniger, damit die Kerzen nicht gequetscht werden)
    const off = (el.current?.clientWidth ?? 1000) < 600 ? 18 : 48;
    if (!r.months) return chart.timeScale().setVisibleLogicalRange({ from: 0, to: lastIdx + off });
    const from = new Date(candles[lastIdx].time);
    from.setMonth(from.getMonth() - r.months);
    const fromStr = from.toISOString().slice(0, 10);
    const fromIdx = Math.max(0, candles.findIndex((c) => c.time >= fromStr));
    chart.timeScale().setVisibleLogicalRange({ from: fromIdx, to: lastIdx + off });
  }, [range, sig, theme]);

  useEffect(() => {
    if (overlayRef.current && analysis) overlayRef.current.setData(buildOverlay(analysis, candles.length, layers, css("--surface") + "d9"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, layers, sig, theme]);

  return (
    <div className="chart-wrap">
      <div className="chart-toolbar">
        <div className="legend">
          <span><i style={{ background: "var(--sma50)" }} />SMA 50</span>
          <span><i style={{ background: "var(--sma200)" }} />SMA 200</span>
          <span><i style={{ background: "#ec4899" }} />200-Wochen</span>
          <span><i style={{ background: "var(--accent)" }} />RSI 14</span>
        </div>
        <div className="seg" role="tablist" aria-label="Zeitraum">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" aria-selected={range === r.id} className={range === r.id ? "on" : ""} onClick={() => setRange(r.id)}>
              {r.id}
            </button>
          ))}
        </div>
      </div>
      {analysis && (
        <div className="layers" role="group" aria-label="Einblendungen">
          {LAYER_LABELS.map(([k, label]) => (
            <label key={k} className={`chip ${layers[k] ? "on" : ""} chip-${k}`}>
              <input type="checkbox" checked={layers[k]} onChange={() => toggle(k)} />
              {label}
            </label>
          ))}
        </div>
      )}
      <div ref={el} className="chart" />
    </div>
  );
}
