import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  Logical,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

// Zeichenobjekte in Kerzen-Indizes (logisch) und Preisen
export type Rect = { from: number; to: number; lo: number; hi: number; fill: string; stroke?: string; dashed?: boolean; label?: string; labelColor?: string; labelAlign?: "left" | "right"; bold?: boolean };
export type Poly = { pts: { i: number; p: number }[]; color: string; width?: number; dashed?: boolean; fill?: string };
export type HLine = { from: number; to: number; p: number; color: string; width?: number; dashed?: boolean; label?: string };
export type Tag = { i: number; p: number; text: string; color: string; below?: boolean };

export type OverlayData = { rects: Rect[]; polys: Poly[]; hlines: HLine[]; tags: Tag[]; autoscale: [number, number] | null; labelBg?: string };

export class OverlayPrimitive implements ISeriesPrimitive<Time> {
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  private requestUpdate: (() => void) | null = null;
  private data: OverlayData = { rects: [], polys: [], hlines: [], tags: [], autoscale: null };
  private views: IPrimitivePaneView[];

  constructor() {
    const self = this;
    const renderer: IPrimitivePaneRenderer = { draw: (t) => self.draw(t) };
    this.views = [{ renderer: () => renderer, zOrder: () => "bottom" }];
  }

  attached(p: SeriesAttachedParameter<Time>) {
    this.chart = p.chart as IChartApi;
    this.series = p.series;
    this.requestUpdate = p.requestUpdate;
  }
  detached() {
    this.chart = null;
    this.series = null;
  }
  setData(d: OverlayData) {
    this.data = d;
    this.requestUpdate?.();
  }
  paneViews() {
    return this.views;
  }
  // Nur kursnahe Zonen fließen in die Skalierung ein → keine gestauchten Kerzen
  autoscaleInfo() {
    const a = this.data.autoscale;
    return a ? { priceRange: { minValue: a[0], maxValue: a[1] } } : null;
  }

  private x(i: number) {
    return this.chart!.timeScale().logicalToCoordinate(i as Logical);
  }
  private y(p: number) {
    return this.series!.priceToCoordinate(p);
  }

  private draw(target: CanvasRenderingTarget2D) {
    if (!this.chart || !this.series) return;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      ctx.save();
      ctx.font = "11px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      // Beschriftungen mit Hintergrund; überlappende werden nach unten verschoben
      const placed: { x1: number; x2: number; y1: number; y2: number }[] = [];
      const bg = this.data.labelBg ?? "rgba(0,0,0,0.6)";
      const label = (text: string, x: number, y: number, align: "left" | "right", color: string, bold = false) => {
        ctx.font = `${bold ? "600 " : ""}11px system-ui, sans-serif`;
        const w = ctx.measureText(text).width + 8;
        let x1 = align === "right" ? x - w : x;
        x1 = Math.max(0, Math.min(x1, mediaSize.width - w));
        let yy = y;
        for (let k = 0; k < 8; k++) {
          const hit = placed.some((b) => x1 < b.x2 && x1 + w > b.x1 && yy - 7 < b.y2 && yy + 7 > b.y1);
          if (!hit) break;
          yy += 14;
        }
        placed.push({ x1, x2: x1 + w, y1: yy - 7, y2: yy + 7 });
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(x1, yy - 7.5, w, 15, 3);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.fillText(text, x1 + 4, yy + 0.5);
        ctx.font = "11px system-ui, sans-serif";
      };
      const pending: (() => void)[] = [];

      for (const r of this.data.rects) {
        const x1 = this.x(r.from);
        const x2 = this.x(r.to);
        const y1 = this.y(r.hi);
        const y2 = this.y(r.lo);
        if (x1 == null || x2 == null || y1 == null || y2 == null) continue;
        const h = Math.max(2, y2 - y1);
        ctx.fillStyle = r.fill;
        ctx.fillRect(x1, y1, x2 - x1, h);
        if (r.stroke) {
          ctx.strokeStyle = r.stroke;
          ctx.lineWidth = r.bold ? 1.5 : 1;
          ctx.setLineDash(r.dashed ? [5, 4] : []);
          ctx.strokeRect(x1, y1, x2 - x1, h);
        }
        if (r.label) {
          const right = r.labelAlign !== "left";
          const lx = right ? Math.min(x2, mediaSize.width) - 4 : Math.max(x1, 0) + 4;
          const txt = r.label;
          const col = r.labelColor ?? r.stroke ?? "#888";
          const bold = !!r.bold;
          pending.push(() => label(txt, lx, y1 + h / 2, right ? "right" : "left", col, bold));
        }
      }

      for (const pl of this.data.polys) {
        const pts = pl.pts.map((q) => [this.x(q.i), this.y(q.p)] as const);
        if (pts.some(([a, b]) => a == null || b == null)) continue;
        ctx.beginPath();
        pts.forEach(([a, b], k) => (k ? ctx.lineTo(a!, b!) : ctx.moveTo(a!, b!)));
        if (pl.fill) {
          ctx.fillStyle = pl.fill;
          ctx.fill();
        } else {
          ctx.strokeStyle = pl.color;
          ctx.lineWidth = pl.width ?? 2;
          ctx.setLineDash(pl.dashed ? [5, 4] : []);
          ctx.stroke();
        }
      }

      for (const l of this.data.hlines) {
        const x1 = this.x(l.from);
        const x2 = this.x(l.to);
        const y = this.y(l.p);
        if (x1 == null || x2 == null || y == null) continue;
        ctx.strokeStyle = l.color;
        ctx.lineWidth = l.width ?? 1;
        ctx.setLineDash(l.dashed ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        if (l.label) {
          const txt = l.label;
          const col = l.color;
          pending.push(() => label(txt, Math.max(x1, 0) + 4, y - 8, "left", col));
        }
      }

      ctx.setLineDash([]);
      // wichtigste Beschriftungen zuerst (Ziele, nächste Zonen) → die bekommen ihren Platz
      pending.forEach((f) => f());
      for (const t of this.data.tags) {
        const x = this.x(t.i);
        const y = this.y(t.p);
        if (x == null || y == null) continue;
        const w = ctx.measureText(t.text).width + 10;
        const ty = t.below ? y + 14 : y - 14;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, ty - 9, w, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(t.text, x, ty + 0.5);
      }
      ctx.restore();
    });
  }
}
