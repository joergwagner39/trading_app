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
import { type Candle, rsi, sma } from "@/lib/indicators";

const RANGES = [
  { id: "3M", months: 3 },
  { id: "6M", months: 6 },
  { id: "1J", months: 12 },
  { id: "2J", months: 24 },
  { id: "Max", months: 0 },
] as const;

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function StockChart({ candles }: { candles: Candle[] }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("1J");
  const [theme, setTheme] = useState(0);

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
      timeScale: { borderColor: grid },
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
    chart.addSeries(LineSeries, { color: css("--sma50"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: "SMA 50" })
      .setData(line(sma(closes, 50)));
    chart.addSeries(LineSeries, { color: css("--sma200"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false, title: "SMA 200" })
      .setData(line(sma(closes, 200)));

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
    };
  }, [candles, theme]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candles.length) return;
    const r = RANGES.find((x) => x.id === range)!;
    if (!r.months) return chart.timeScale().fitContent();
    const to = new Date(candles[candles.length - 1].time);
    const from = new Date(to);
    from.setMonth(from.getMonth() - r.months);
    chart.timeScale().setVisibleRange({ from: from.toISOString().slice(0, 10) as Time, to: candles[candles.length - 1].time as Time });
  }, [range, candles, theme]);

  return (
    <div className="chart-wrap">
      <div className="chart-toolbar">
        <div className="legend">
          <span><i style={{ background: "var(--sma50)" }} />SMA 50</span>
          <span><i style={{ background: "var(--sma200)" }} />SMA 200</span>
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
      <div ref={el} className="chart" />
    </div>
  );
}
