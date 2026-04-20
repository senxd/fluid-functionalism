"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/springs";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { TabsSubtle, TabsSubtleItem } from "@/registry/default/tabs-subtle";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import type { IconComponent } from "@/lib/icon-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphSize = "sm" | "md" | "lg";
export type GraphRenderType = "line" | "smooth" | "step" | "area" | "bar";
export type GraphYMode = "percent" | "absolute";
export type GraphAxis = "left" | "right";
export type GraphKind = "neutral" | "positive" | "negative" | "info";

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphForecastPoint {
  x: number;
  upper: number;
  lower: number;
}

export interface GraphSeries {
  id: string;
  label: string;
  data: GraphPoint[];
  /** A Tailwind palette name (e.g. "blue", "emerald") OR a raw CSS color (hex / rgb / named). */
  color?: string;
  /** Optional icon shown in the legend. */
  icon?: IconComponent;
  /** Render style. Default `line` for primary, `line` for overlays (use `area` for fills, `smooth` for curves, `bar` for columns). */
  renderType?: GraphRenderType;
  /** Y-axis attachment in absolute mode. Ignored in percent mode. Default `left`. */
  axis?: GraphAxis;
  /** When true, individual points are clickable + keyboard-activatable; emits `onPointClick`. */
  interactive?: boolean;
  /** Upper/lower confidence bounds drawn as a ribbon behind the series. */
  forecast?: GraphForecastPoint[];
}

export interface GraphAnnotation {
  x: number;
  label: string;
  kind?: GraphKind;
}

export interface GraphRange {
  label: string;
  value: string;
}

export interface GraphThreshold {
  y: number;
  label?: string;
  kind?: GraphKind;
  /** In absolute dual-axis mode, which axis the y is in. Default `left`. */
  axis?: GraphAxis;
}

export interface GraphBand {
  yStart: number;
  yEnd: number;
  label?: string;
  kind?: GraphKind;
  /** In absolute dual-axis mode, which axis the y values are in. Default `left`. */
  axis?: GraphAxis;
}

export interface GraphPointEvent {
  seriesId: string;
  x: number;
  y: number;
  index: number;
}

export interface GraphBrushEvent {
  xStart: number;
  xEnd: number;
}

export interface GraphRefHandle {
  /** Trigger a PNG download of the current chart render. */
  exportPNG: (filename?: string) => Promise<void>;
  /** Trigger a CSV download with visible series. */
  exportCSV: (filename?: string) => void;
  /** Clear any active brush selection. */
  clearBrush: () => void;
}

interface GraphProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Series to plot. The first entry is the primary; the rest are overlays. */
  series: GraphSeries[];
  /** Size variant. Default `md`. */
  size?: GraphSize;
  /** Explicit pixel height. Wins over `size`. */
  height?: number;
  /** Compact sparkline mode. Strips baseline, legend, Y-axis and range selector. */
  compact?: boolean;
  /** Y-axis mode. `percent` (default) normalizes each series to its own start; `absolute` plots raw values. */
  yMode?: GraphYMode;
  /** Show the dotted baseline at 0% change (percent mode) or 0 (absolute mode). Default true. */
  showBaseline?: boolean;
  /** Show the legend row below the chart. Default true. */
  showLegend?: boolean;
  /** Show Y-axis tick labels. Default true (off in compact mode). */
  showYAxis?: boolean;
  /** Show X-axis tick labels. Off by default to preserve the calm aesthetic. */
  showXTicks?: boolean;
  /** Approximate number of X-axis ticks when `showXTicks` is true. Default 5. */
  xAxisTickCount?: number;
  /** Format an X-axis tick value. Falls back to the hovered-x formatter. */
  formatXAxis?: (x: number) => string;
  /** Which edge the Y-axis sits on (single-axis mode only). Default `left`. */
  yAxisSide?: "left" | "right" | "both";
  /** Format a Y-axis tick value (single axis). Falls back to signed percent in percent mode. */
  formatYAxis?: (v: number) => string;
  /** Format a left-axis tick (absolute mode). */
  formatYAxisLeft?: (v: number) => string;
  /** Format a right-axis tick (absolute mode). */
  formatYAxisRight?: (v: number) => string;
  /** Approximate number of Y-axis ticks. Default 4. */
  yAxisTickCount?: number;
  /** Range selector options. */
  ranges?: GraphRange[];
  activeRange?: string;
  onRangeChange?: (value: string) => void;
  /** Format the primary value in the tooltip. */
  formatValue?: (v: number) => string;
  /** Format the x-position in the tooltip. */
  formatX?: (x: number) => string;
  /** Event annotations rendered as vertical rules. */
  annotations?: GraphAnnotation[];
  /** Horizontal threshold lines with optional labels. */
  thresholds?: GraphThreshold[];
  /** Shaded Y-range zones. */
  bands?: GraphBand[];
  /** Fraction of the right edge (0..1) to fade to transparent on the primary. */
  rightEdgeFade?: number;
  /** Loading skeleton. Replaces lines with a shimmer placeholder. */
  loading?: boolean;
  /** Disabled state. Mutes everything and blocks interaction. */
  disabled?: boolean;
  /** Fires when an interactive point is clicked or keyboard-activated. */
  onPointClick?: (e: GraphPointEvent) => void;
  /** Enable drag-to-select a range. When `onBrush` is provided, fires the range; otherwise zooms in place. */
  brushEnabled?: boolean;
  /** Controlled brush range. When set, the chart renders the sub-range. Pass `null` / clear for full range. */
  brush?: GraphBrushEvent | null;
  /** Fires on brush release. If provided, the chart stays unzoomed; if omitted and `brushEnabled` is true, it zooms in place. */
  onBrush?: (e: GraphBrushEvent | null) => void;
  /** Shared-hover group id. Charts with the same id mirror scrub position by x-value. */
  syncGroup?: string;
  /** Streaming mode: new points append smoothly; a halo pulses at the trailing edge. */
  streaming?: boolean;
  /** Optional fixed x-window during streaming; older points slide out the left. */
  streamWindow?: number;
  /** Show an inline export menu next to the range selector. */
  showExportMenu?: boolean;
  /** Default filename (no extension) used by PNG/CSV export. */
  exportFilename?: string;
  /** Accessible name. Defaults to a generated summary. */
  title?: string;
}

// ---------------------------------------------------------------------------
// Defaults / constants
// ---------------------------------------------------------------------------

const DEFAULT_PRIMARY_UP = "#22C55E";
const DEFAULT_PRIMARY_DOWN = "#EF4444";
const OVERLAY_COLORS = ["#4B5563", "#A3A3A3", "#737373", "#D4D4D4"];

const PAD_X = 6;
const PAD_Y = 10;
const Y_AXIS_WIDTH = 44;

const SIZE_CONFIG: Record<
  GraphSize,
  {
    height: number;
    legendPrimary: number;
    legendSecondary: number;
    triangle: number;
    primaryStroke: number;
    overlayStroke: number;
    tickFontSize: number;
  }
> = {
  sm: {
    height: 180,
    legendPrimary: 13,
    legendSecondary: 11,
    triangle: 10,
    primaryStroke: 1.75,
    overlayStroke: 1,
    tickFontSize: 10,
  },
  md: {
    height: 280,
    legendPrimary: 15,
    legendSecondary: 13,
    triangle: 12,
    primaryStroke: 2,
    overlayStroke: 1.25,
    tickFontSize: 11,
  },
  lg: {
    height: 360,
    legendPrimary: 17,
    legendSecondary: 14,
    triangle: 13,
    primaryStroke: 2.25,
    overlayStroke: 1.5,
    tickFontSize: 12,
  },
};
const COMPACT_HEIGHT = 40;

// Tailwind palette → 500-shade hex (sufficient subset).
const TW_PALETTE: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  slate: "#64748b",
  gray: "#6b7280",
  zinc: "#71717a",
  neutral: "#737373",
  stone: "#78716c",
};

const KIND_COLOR: Record<GraphKind, string> = {
  neutral: "currentColor",
  positive: DEFAULT_PRIMARY_UP,
  negative: DEFAULT_PRIMARY_DOWN,
  info: "#6B97FF",
};

function resolveColor(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  return TW_PALETTE[input.toLowerCase()] ?? input;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePercent(points: GraphPoint[]): GraphPoint[] {
  if (points.length < 1) return [];
  const first = points[0].y;
  if (first === 0) return points.map((p) => ({ x: p.x, y: 0 }));
  return points.map((p) => ({ x: p.x, y: (p.y - first) / first }));
}

function computeLinePath(
  points: GraphPoint[],
  xScale: (x: number) => number,
  yScale: (y: number) => number,
): string {
  if (points.length < 2) return "";
  let d = `M ${xScale(points[0].x).toFixed(2)} ${yScale(points[0].y).toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${xScale(points[i].x).toFixed(2)} ${yScale(points[i].y).toFixed(2)}`;
  }
  return d;
}

function computeStepPath(
  points: GraphPoint[],
  xScale: (x: number) => number,
  yScale: (y: number) => number,
): string {
  if (points.length < 2) return "";
  let d = `M ${xScale(points[0].x).toFixed(2)} ${yScale(points[0].y).toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const px = xScale(points[i].x);
    const prevY = yScale(points[i - 1].y);
    const py = yScale(points[i].y);
    d += ` L ${px.toFixed(2)} ${prevY.toFixed(2)} L ${px.toFixed(2)} ${py.toFixed(2)}`;
  }
  return d;
}

/**
 * Collapse duplicate x values to the latest y. Keeps input order stable.
 * Required before smooth interpolation so the curve doesn't loop.
 */
function dedupeX(points: GraphPoint[]): GraphPoint[] {
  if (points.length < 2) return points;
  const latestByX = new Map<number, GraphPoint>();
  for (const p of points) latestByX.set(p.x, p);
  const out = Array.from(latestByX.values());
  out.sort((a, b) => a.x - b.x);
  return out;
}

/**
 * Fritsch–Carlson monotone cubic — no overshoot past data values.
 * Ported from https://en.wikipedia.org/wiki/Monotone_cubic_interpolation
 */
function computeSmoothPath(
  points: GraphPoint[],
  xScale: (x: number) => number,
  yScale: (y: number) => number,
): string {
  const src = dedupeX(points);
  if (src.length < 2) return "";
  const n = src.length;
  const xs = src.map((p) => xScale(p.x));
  const ys = src.map((p) => yScale(p.y));
  const dx = new Array<number>(n - 1);
  const dy = new Array<number>(n - 1);
  const m = new Array<number>(n - 1); // secant slopes
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    dy[i] = ys[i + 1] - ys[i];
    m[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }
  // Tangents at each point
  const t = new Array<number>(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      t[i] = (m[i - 1] + m[i]) / 2;
    }
  }
  // Monotonicity correction
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / m[i];
      const b = t[i + 1] / m[i];
      const h = a * a + b * b;
      if (h > 9) {
        const tau = 3 / Math.sqrt(h);
        t[i] = tau * a * m[i];
        t[i + 1] = tau * b * m[i];
      }
    }
  }
  let d = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    const cp1x = xs[i] + h / 3;
    const cp1y = ys[i] + (t[i] * h) / 3;
    const cp2x = xs[i + 1] - h / 3;
    const cp2y = ys[i + 1] - (t[i + 1] * h) / 3;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${xs[i + 1].toFixed(2)} ${ys[i + 1].toFixed(2)}`;
  }
  return d;
}

function computePathByType(
  type: GraphRenderType,
  points: GraphPoint[],
  xScale: (x: number) => number,
  yScale: (y: number) => number,
): string {
  switch (type) {
    case "smooth":
      return computeSmoothPath(points, xScale, yScale);
    case "step":
      return computeStepPath(points, xScale, yScale);
    default:
      return computeLinePath(points, xScale, yScale);
  }
}

function pathToAreaPath(path: string, points: GraphPoint[], xScale: (x: number) => number, floor: number): string {
  if (!path || points.length < 2) return "";
  const firstX = xScale(points[0].x);
  const lastX = xScale(points[points.length - 1].x);
  // Prepend a move to floor at start, append a line to floor at end + close.
  const stripped = path.replace(/^M [^ ]+ [^ ]+ /, "");
  return `M ${firstX.toFixed(2)} ${floor.toFixed(2)} L ${firstX.toFixed(2)} ${path.split(" ")[2]} ${stripped} L ${lastX.toFixed(2)} ${floor.toFixed(2)} Z`;
}

function nearestIndex(points: GraphPoint[], x: number): number {
  if (points.length === 0) return -1;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].x < x) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(points[lo - 1].x - x) < Math.abs(points[lo].x - x)) {
    return lo - 1;
  }
  return lo;
}

function interpolateAtX(points: GraphPoint[], x: number): number | null {
  if (points.length === 0) return null;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  for (let i = 1; i < points.length; i++) {
    if (points[i].x >= x) {
      const a = points[i - 1];
      const b = points[i];
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return points[points.length - 1].y;
}

function formatPercent(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "" : "";
  return `${sign}${(v * 100).toFixed(2)}%`;
}

function formatPercentTick(v: number): string {
  const abs = Math.abs(v * 100);
  const digits = abs >= 10 ? 0 : abs >= 1 ? 1 : 2;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v * 100).toFixed(digits)}%`;
}

function formatNumberTick(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  if (abs >= 10) return v.toFixed(0);
  if (abs >= 1) return v.toFixed(1);
  return v.toFixed(2);
}

function niceStep(rawStep: number): number {
  if (rawStep <= 0 || !isFinite(rawStep)) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / exp;
  const nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  return nice * exp;
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function renderSvgToPng(
  svgEl: SVGSVGElement,
  filename: string,
  height: number,
  width: number,
) {
  const cloned = svgEl.cloneNode(true) as SVGSVGElement;
  // Inline computed fills / strokes / colors so the PNG matches the rendered theme.
  const srcEls = svgEl.querySelectorAll("*");
  const outEls = cloned.querySelectorAll("*");
  srcEls.forEach((src, i) => {
    const cs = window.getComputedStyle(src as Element);
    const out = outEls[i] as SVGElement | undefined;
    if (!out) return;
    (["fill", "stroke", "stop-color", "color", "opacity", "fill-opacity", "stroke-opacity"] as const).forEach((prop) => {
      const v = cs.getPropertyValue(prop);
      if (v) out.style.setProperty(prop, v);
    });
  });
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  cloned.setAttribute("width", String(width));
  cloned.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(cloned);
  const svgBlob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', xml], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
    img.src = svgUrl;
  });
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  // Paint the page background so the PNG isn't transparent.
  const bg = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(svgUrl);
  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png");
  });
}

// ---------------------------------------------------------------------------
// Cross-chart hover sync
// ---------------------------------------------------------------------------

type SyncListener = (xValue: number | null, senderId: string) => void;

const syncRegistry = new Map<string, Map<string, SyncListener>>();

function registerSyncListener(group: string, id: string, fn: SyncListener): () => void {
  let bucket = syncRegistry.get(group);
  if (!bucket) {
    bucket = new Map();
    syncRegistry.set(group, bucket);
  }
  bucket.set(id, fn);
  return () => {
    const b = syncRegistry.get(group);
    if (!b) return;
    b.delete(id);
    if (b.size === 0) syncRegistry.delete(group);
  };
}

function broadcastSync(group: string, senderId: string, xValue: number | null) {
  const bucket = syncRegistry.get(group);
  if (!bucket) return;
  bucket.forEach((fn, id) => {
    if (id !== senderId) fn(xValue, senderId);
  });
}

function niceTicks(min: number, max: number, targetCount: number): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min];
  const step = niceStep((max - min) / Math.max(1, targetCount));
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-6; v += step) {
    out.push(Math.round(v / step) * step);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Triangle glyph
// ---------------------------------------------------------------------------

function DirectionTriangle({
  direction,
  color,
  size = 10,
}: {
  direction: "up" | "down" | "flat";
  color: string;
  size?: number;
}) {
  if (direction === "flat") {
    return (
      <span
        aria-hidden
        className="inline-block shrink-0"
        style={{ width: size, height: size, opacity: 0.5 }}
      >
        <svg width={size} height={size} viewBox="0 0 10 10">
          <rect x="1" y="4.25" width="8" height="1.5" fill={color} rx="0.75" />
        </svg>
      </span>
    );
  }
  const rotate = direction === "down" ? 180 : 0;
  return (
    <motion.span
      aria-hidden
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      animate={{ rotate }}
      transition={springs.moderate}
    >
      <svg width={size} height={size} viewBox="0 0 10 10">
        <path d="M5 1 L9 8 L1 8 Z" fill={color} />
      </svg>
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Graph component
// ---------------------------------------------------------------------------

const Graph = forwardRef<GraphRefHandle | HTMLDivElement, GraphProps>(function Graph(
  {
    series,
    size = "md",
    height,
    compact = false,
    yMode = "percent",
    showBaseline = true,
    showLegend = true,
    showYAxis = true,
    showXTicks = false,
    xAxisTickCount = 5,
    formatXAxis,
    yAxisSide = "left",
    formatYAxis,
    formatYAxisLeft,
    formatYAxisRight,
    yAxisTickCount = 4,
    ranges,
    activeRange,
    onRangeChange,
    formatValue,
    formatX,
    annotations,
    thresholds,
    bands,
    rightEdgeFade = 0,
    loading = false,
    disabled = false,
    onPointClick,
    brushEnabled = false,
    brush,
    onBrush,
    syncGroup,
    streaming = false,
    streamWindow,
    showExportMenu = false,
    exportFilename = "graph",
    title,
    className,
    ...rest
  },
  ref,
) {
  const shape = useShape();
  const rawUid = useId();
  const uid = useMemo(() => rawUid.replace(/[^a-zA-Z0-9]/g, ""), [rawUid]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [width, setWidth] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPrimaryX, setHoverPrimaryX] = useState<number | null>(null);
  const [externalSyncX, setExternalSyncX] = useState<number | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [svgRect, setSvgRect] = useState<DOMRect | null>(null);
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState<number | null>(null);
  const [pulsePoint, setPulsePoint] = useState<{ seriesId: string; x: number; y: number } | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<number | null>(null);

  // Brush state
  const [uncontrolledBrush, setUncontrolledBrush] = useState<GraphBrushEvent | null>(null);
  const [dragBrush, setDragBrush] = useState<{ xStart: number; xEnd: number } | null>(null);
  const dragStartRef = useRef<{ px: number; xValue: number } | null>(null);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const sizeCfg = SIZE_CONFIG[size];
  const hasData = series.length > 0 && series[0].data.length >= 2;
  const effectiveHeight = compact ? COMPACT_HEIGHT : height ?? sizeCfg.height;
  const interactiveDisabled = disabled || loading;
  const sourceSeriesById = useMemo(
    () => new Map(series.map((entry) => [entry.id, entry])),
    [series],
  );

  // Track container width
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track SVG viewport rect for the portaled tooltip.
  const updateSvgRect = useCallback(() => {
    if (svgRef.current) setSvgRect(svgRef.current.getBoundingClientRect());
  }, []);
  useEffect(() => {
    if (hoverIndex === null && hoveredAnnotation === null) return;
    updateSvgRect();
    window.addEventListener("scroll", updateSvgRect, true);
    window.addEventListener("resize", updateSvgRect);
    return () => {
      window.removeEventListener("scroll", updateSvgRect, true);
      window.removeEventListener("resize", updateSvgRect);
    };
  }, [hoverIndex, hoveredAnnotation, updateSvgRect]);

  // Active brush (controlled wins over uncontrolled).
  const activeBrush = brush !== undefined ? brush : uncontrolledBrush;

  // Compute display data per series. Percent mode normalizes; absolute mode keeps raw.
  // Brush zoom (when `onBrush` not provided) and stream window both filter the x range.
  const isPercentMode = yMode === "percent";

  const sliceToWindow = useCallback(
    (data: GraphPoint[]): GraphPoint[] => {
      let out = data;
      if (activeBrush && !onBrush) {
        const lo = Math.min(activeBrush.xStart, activeBrush.xEnd);
        const hi = Math.max(activeBrush.xStart, activeBrush.xEnd);
        out = out.filter((p) => p.x >= lo && p.x <= hi);
      }
      if (streaming && streamWindow && out.length) {
        const lastX = out[out.length - 1].x;
        const lo = lastX - streamWindow;
        out = out.filter((p) => p.x >= lo);
      }
      return out;
    },
    [activeBrush, onBrush, streaming, streamWindow],
  );

  const displaySeries = useMemo(
    () =>
      series.map((s) => {
        const sliced = sliceToWindow(s.data);
        const visibleX = new Set(sliced.map((point) => point.x));
        const startX = sliced[0]?.x;
        const endX = sliced[sliced.length - 1]?.x;
        return {
          ...s,
          renderType: s.renderType ?? "line",
          axis: (s.axis ?? "left") as GraphAxis,
          rawData: sliced,
          displayData: isPercentMode ? normalizePercent(sliced) : sliced,
          forecast: s.forecast
            ? s.forecast.filter(
                (forecastPoint) =>
                  visibleX.has(forecastPoint.x) ||
                  (startX != null &&
                    endX != null &&
                    forecastPoint.x >= startX &&
                    forecastPoint.x <= endX),
              )
            : undefined,
        };
      }),
    [series, isPercentMode, sliceToWindow],
  );

  const primary = displaySeries[0];
  const overlays = displaySeries.slice(1);
  const visibleOverlays = overlays.filter((s) => !hidden.has(s.id));
  const allVisible = primary ? [primary, ...visibleOverlays] : visibleOverlays;

  // Axis activation: in percent mode, single shared scale; in absolute, per-axis scales.
  const hasLeftSeries = !isPercentMode
    ? allVisible.some((s) => s.axis === "left")
    : true;
  const hasRightSeries = !isPercentMode && allVisible.some((s) => s.axis === "right");

  // Y-axis visibility per side
  const yAxisVisible = showYAxis && !compact;
  const yAxisOnLeft =
    yAxisVisible &&
    (isPercentMode
      ? yAxisSide === "left" || yAxisSide === "both"
      : hasLeftSeries);
  const yAxisOnRight =
    yAxisVisible &&
    (isPercentMode
      ? yAxisSide === "right" || yAxisSide === "both"
      : hasRightSeries);

  // X-domain across all visible series
  const { xMin, xMax } = useMemo(() => {
    let xMin = Infinity;
    let xMax = -Infinity;
    for (const s of allVisible) {
      for (const p of s.displayData) {
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
      }
    }
    return { xMin, xMax };
  }, [allVisible]);

  // Y-domain per axis
  const { leftDomain, rightDomain } = useMemo(() => {
    function domainFor(seriesList: typeof allVisible): { min: number; max: number } {
      if (seriesList.length === 0) return { min: 0, max: 1 };
      let min = Infinity;
      let max = -Infinity;
      for (const s of seriesList) {
        for (const p of s.displayData) {
          if (p.y < min) min = p.y;
          if (p.y > max) max = p.y;
        }
      }
      // Threshold/band y values can extend the domain
      if (thresholds) {
        for (const t of thresholds) {
          if ((t.axis ?? "left") !== (seriesList[0]?.axis ?? "left")) continue;
          if (t.y < min) min = t.y;
          if (t.y > max) max = t.y;
        }
      }
      if (bands) {
        for (const b of bands) {
          if ((b.axis ?? "left") !== (seriesList[0]?.axis ?? "left")) continue;
          if (b.yStart < min) min = b.yStart;
          if (b.yEnd > max) max = b.yEnd;
        }
      }
      // Forecast ribbons also extend the domain, otherwise the ribbon gets clipped.
      for (const s of seriesList) {
        if (!s.forecast) continue;
        for (const f of s.forecast) {
          const lo = isPercentMode ? (f.lower - (s.data[0]?.y ?? 0)) / (s.data[0]?.y || 1) : f.lower;
          const hi = isPercentMode ? (f.upper - (s.data[0]?.y ?? 0)) / (s.data[0]?.y || 1) : f.upper;
          if (lo < min) min = lo;
          if (hi > max) max = hi;
        }
      }
      // Include 0 in percent mode so baseline always anchors.
      if (isPercentMode) {
        if (min > 0) min = 0;
        if (max < 0) max = 0;
      }
      const range = max - min || 1;
      return { min: min - range * 0.08, max: max + range * 0.08 };
    }
    if (isPercentMode) {
      const d = domainFor(allVisible);
      return { leftDomain: d, rightDomain: d };
    }
    return {
      leftDomain: domainFor(allVisible.filter((s) => s.axis === "left")),
      rightDomain: domainFor(allVisible.filter((s) => s.axis === "right")),
    };
  }, [allVisible, isPercentMode, thresholds, bands]);

  // Scales
  const padLeft = yAxisOnLeft ? Y_AXIS_WIDTH : PAD_X;
  const padRight = yAxisOnRight ? Y_AXIS_WIDTH : PAD_X;
  const innerWidth = Math.max(0, width - padLeft - padRight);
  const innerHeight = Math.max(0, effectiveHeight - PAD_Y * 2);

  const xScale = useCallback(
    (x: number) => {
      if (xMax === xMin) return padLeft + innerWidth / 2;
      return padLeft + ((x - xMin) / (xMax - xMin)) * innerWidth;
    },
    [xMin, xMax, innerWidth, padLeft],
  );
  const makeYScale = useCallback(
    (domain: { min: number; max: number }) => (y: number) => {
      if (domain.max === domain.min) return PAD_Y + innerHeight / 2;
      return PAD_Y + (1 - (y - domain.min) / (domain.max - domain.min)) * innerHeight;
    },
    [innerHeight],
  );
  const yScaleLeft = useMemo(() => makeYScale(leftDomain), [makeYScale, leftDomain]);
  const yScaleRight = useMemo(() => makeYScale(rightDomain), [makeYScale, rightDomain]);

  const yScaleFor = useCallback(
    (axis: GraphAxis) => (axis === "right" ? yScaleRight : yScaleLeft),
    [yScaleLeft, yScaleRight],
  );

  // Baseline: percent mode → 0%. Absolute mode → 0 if in range, otherwise the domain min (bottom of the chart).
  const baselineY = (() => {
    if (isPercentMode) return yScaleLeft(0);
    if (0 >= leftDomain.min && 0 <= leftDomain.max) return yScaleLeft(0);
    return yScaleLeft(leftDomain.min);
  })();
  const floorY = PAD_Y + innerHeight;

  // Y-axis ticks (per active axis)
  const leftTicks = useMemo(
    () => (yAxisOnLeft ? niceTicks(leftDomain.min, leftDomain.max, yAxisTickCount) : []),
    [yAxisOnLeft, leftDomain, yAxisTickCount],
  );
  const rightTicks = useMemo(
    () => (yAxisOnRight ? niceTicks(rightDomain.min, rightDomain.max, yAxisTickCount) : []),
    [yAxisOnRight, rightDomain, yAxisTickCount],
  );

  // Primary direction + color
  const primaryLatest =
    primary && primary.displayData.length
      ? primary.displayData[primary.displayData.length - 1].y
      : 0;
  const primaryStartY = isPercentMode ? 0 : primary?.displayData[0]?.y ?? 0;
  const primaryNetChange = primaryLatest - primaryStartY;
  const direction: "up" | "down" | "flat" =
    primaryNetChange > 0.00005 ? "up" : primaryNetChange < -0.00005 ? "down" : "flat";
  const primaryColor =
    resolveColor(primary?.color, direction === "down" ? DEFAULT_PRIMARY_DOWN : DEFAULT_PRIMARY_UP);

  // Resolve a color for an overlay (palette name → hex, fallback to neutral palette)
  const overlayColor = (s: (typeof displaySeries)[number], i: number) =>
    resolveColor(s.color, OVERLAY_COLORS[i % OVERLAY_COLORS.length]);

  // X position → x-value helper
  const pxToX = useCallback(
    (px: number) => xMin + ((px - padLeft) / (innerWidth || 1)) * (xMax - xMin),
    [xMin, xMax, padLeft, innerWidth],
  );

  // Hover handlers
  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (interactiveDisabled) return;
      if (compact && width < 40) return;
      if (!primary || primary.displayData.length === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;

      // Brush dragging: update range, suppress scrub until release.
      if (dragStartRef.current) {
        const clampedPx = Math.max(padLeft, Math.min(padLeft + innerWidth, px));
        const xEnd = pxToX(clampedPx);
        setDragBrush({ xStart: dragStartRef.current.xValue, xEnd });
        return;
      }

      if (px < padLeft || px > padLeft + innerWidth) {
        setHoverIndex(null);
        setHoverPrimaryX(null);
        if (syncGroup) broadcastSync(syncGroup, uid, null);
        return;
      }
      const xValue = pxToX(px);
      const idx = nearestIndex(primary.displayData, xValue);
      setHoverIndex(idx);
      setHoverPrimaryX(primary.displayData[idx].x);
      if (syncGroup) broadcastSync(syncGroup, uid, primary.displayData[idx].x);
    },
    [interactiveDisabled, compact, width, primary, innerWidth, padLeft, pxToX, syncGroup, uid],
  );

  const handlePointerLeave = useCallback(() => {
    if (dragStartRef.current) return; // keep scrub cleared; release handler commits brush
    setHoverIndex(null);
    setHoverPrimaryX(null);
    if (syncGroup) broadcastSync(syncGroup, uid, null);
  }, [syncGroup, uid]);

  // ---------------------- Brush pointer flow ----------------------
  const commitBrush = useCallback(
    (range: { xStart: number; xEnd: number } | null) => {
      if (!range) {
        setDragBrush(null);
        dragStartRef.current = null;
        return;
      }
      const lo = Math.min(range.xStart, range.xEnd);
      const hi = Math.max(range.xStart, range.xEnd);
      const normalized = { xStart: lo, xEnd: hi };
      setDragBrush(null);
      dragStartRef.current = null;
      // Treat < ~6px drags as clicks, not brushes.
      const pxDist = (innerWidth / Math.max(1e-9, xMax - xMin)) * (hi - lo);
      if (pxDist < 6) return;
      if (brush === undefined) setUncontrolledBrush(normalized);
      onBrush?.(normalized);
    },
    [innerWidth, xMax, xMin, brush, onBrush],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!brushEnabled || interactiveDisabled || compact || !primary) return;
      // Only left button / primary pointer.
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = Math.max(padLeft, Math.min(padLeft + innerWidth, e.clientX - rect.left));
      dragStartRef.current = { px, xValue: pxToX(px) };
      setDragBrush({ xStart: dragStartRef.current.xValue, xEnd: dragStartRef.current.xValue });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [brushEnabled, interactiveDisabled, compact, primary, padLeft, innerWidth, pxToX],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!dragStartRef.current) return;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      commitBrush(dragBrush);
    },
    [dragBrush, commitBrush],
  );

  const clearBrush = useCallback(() => {
    setDragBrush(null);
    dragStartRef.current = null;
    if (brush === undefined) setUncontrolledBrush(null);
    onBrush?.(null);
  }, [brush, onBrush]);

  // ---------------------- Export ----------------------
  const buildCSV = useCallback((): string => {
    const visibleForCsv = displaySeries.filter((s) => !hidden.has(s.id));
    const allXs = new Set<number>();
    for (const s of visibleForCsv) for (const p of s.rawData) allXs.add(p.x);
    const xs = Array.from(allXs).sort((a, b) => a - b);
    const header = ["x"];
    const hasDualAxis = !isPercentMode && visibleForCsv.some((s) => s.axis === "right") && visibleForCsv.some((s) => s.axis === "left");
    for (const s of visibleForCsv) {
      const tag = hasDualAxis ? ` (${s.axis === "right" ? "R" : "L"})` : "";
      header.push(`${s.label}${tag}`);
    }
    const rows: string[] = [header.map(csvEscape).join(",")];
    for (const x of xs) {
      const row: (string | number)[] = [x];
      for (const s of visibleForCsv) {
        const p = s.rawData.find((d) => d.x === x);
        row.push(p ? p.y : "");
      }
      rows.push(row.map(csvEscape).join(","));
    }
    return rows.join("\n");
  }, [displaySeries, hidden, isPercentMode]);

  const exportCSV = useCallback(
    (filename?: string) => {
      const csv = buildCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${filename ?? exportFilename}.csv`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    [buildCSV, exportFilename],
  );

  const exportPNG = useCallback(
    async (filename?: string) => {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      await renderSvgToPng(svgEl, `${filename ?? exportFilename}.png`, effectiveHeight, width);
    },
    [exportFilename, effectiveHeight, width],
  );

  useImperativeHandle(
    ref,
    () => ({ exportPNG, exportCSV, clearBrush }) as unknown as GraphRefHandle & HTMLDivElement,
    [exportPNG, exportCSV, clearBrush],
  );

  // Activate a scrub point on a specific series (click / Enter / Space on a hovered dot).
  const activatePoint = useCallback(
    (seriesId?: string) => {
      if (hoverIndex === null) return;
      const targetId = seriesId ?? primary?.id;
      if (!targetId) return;
      const ds = displaySeries.find((s) => s.id === targetId);
      if (!ds || !ds.interactive) return;
      const rawSource = sourceSeriesById.get(targetId);
      if (!rawSource) return;
      // Find nearest raw index to the hovered primary x
      const anchorX = primary?.displayData[hoverIndex]?.x ?? 0;
      const rawIdx = nearestIndex(rawSource.data, anchorX);
      const raw = rawSource.data[rawIdx];
      if (!raw) return;
      const dispIdx = nearestIndex(ds.displayData, anchorX);
      const dispPt = ds.displayData[dispIdx];
      if (dispPt) {
        setPulsePoint({ seriesId: targetId, x: dispPt.x, y: dispPt.y });
      }
      setPulseKey(Date.now());
      onPointClick?.({ seriesId: targetId, x: raw.x, y: raw.y, index: rawIdx });
    },
    [primary, hoverIndex, displaySeries, onPointClick, sourceSeriesById],
  );

  // Subscribe to sync group — mirror hovered x from peers.
  useEffect(() => {
    if (!syncGroup) return;
    const unsub = registerSyncListener(syncGroup, uid, (xValue) => {
      setExternalSyncX(xValue);
      if (xValue === null) {
        setHoverIndex(null);
        setHoverPrimaryX(null);
        return;
      }
      if (!primary || primary.displayData.length === 0) return;
      const idx = nearestIndex(primary.displayData, xValue);
      const p = primary.displayData[idx];
      // Only show our dot if the mirrored x is within our local domain (missing-data hides the dot).
      if (p && xValue >= primary.displayData[0].x && xValue <= primary.displayData[primary.displayData.length - 1].x) {
        setHoverIndex(idx);
        setHoverPrimaryX(p.x);
      } else {
        setHoverIndex(null);
        setHoverPrimaryX(null);
      }
    });
    return unsub;
  }, [syncGroup, uid, primary]);

  // Keyboard scrubbing
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (interactiveDisabled) return;
      if (!primary) return;
      const len = primary.displayData.length;
      if (len < 2) return;
      let idx = hoverIndex ?? Math.floor(len / 2);
      const jump = e.shiftKey ? Math.max(1, Math.floor(len * 0.05)) : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        idx = Math.max(0, idx - jump);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        idx = Math.min(len - 1, idx + jump);
      } else if (e.key === "Home") {
        e.preventDefault();
        idx = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        idx = len - 1;
      } else if (e.key === "Escape") {
        if (dragStartRef.current || dragBrush) {
          setDragBrush(null);
          dragStartRef.current = null;
        } else if (activeBrush) {
          clearBrush();
        } else {
          setHoverIndex(null);
          setHoverPrimaryX(null);
        }
        return;
      } else if (e.key === "Enter" || e.key === " ") {
        const interactiveSeries = displaySeries.filter((s) => s.interactive && !hidden.has(s.id));
        if (interactiveSeries.length > 0) {
          e.preventDefault();
          interactiveSeries.forEach((s) => activatePoint(s.id));
        }
        return;
      } else {
        return;
      }
      setHoverIndex(idx);
      setHoverPrimaryX(primary.displayData[idx].x);
    },
    [interactiveDisabled, primary, hoverIndex, activatePoint, activeBrush, dragBrush, clearBrush, displaySeries, hidden],
  );

  // Legend toggle (primary bounces instead of toggling)
  const toggleSeries = useCallback((id: string, isPrimary: boolean) => {
    if (isPrimary) {
      setShakeId(id);
      setTimeout(() => setShakeId((s) => (s === id ? null : s)), 500);
      return;
    }
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Paths for primary
  const primaryRenderType = primary?.renderType ?? "line";
  const primaryPath = useMemo(() => {
    if (!primary || primaryRenderType === "bar") return "";
    return computePathByType(primaryRenderType, primary.displayData, xScale, yScaleFor(primary.axis));
  }, [primary, primaryRenderType, xScale, yScaleFor]);

  const primaryAreaPath = useMemo(() => {
    if (!primary || primaryRenderType === "bar") return "";
    if (primaryRenderType === "step") {
      // Build step path then close to floor manually.
      const stepPath = computeStepPath(primary.displayData, xScale, yScaleFor(primary.axis));
      const firstX = xScale(primary.displayData[0].x);
      const lastX = xScale(primary.displayData[primary.displayData.length - 1].x);
      return `M ${firstX.toFixed(2)} ${floorY.toFixed(2)} L ${stepPath.slice(2)} L ${lastX.toFixed(2)} ${floorY.toFixed(2)} Z`;
    }
    return pathToAreaPath(primaryPath, primary.displayData, xScale, floorY);
  }, [primary, primaryRenderType, primaryPath, xScale, yScaleFor, floorY]);

  // Bar mode: collect all bar series; within each bucket, side-by-side dodge.
  const barSeries = useMemo(
    () => displaySeries.filter((s) => s.renderType === "bar" && !hidden.has(s.id)),
    [displaySeries, hidden],
  );
  const xBuckets = useMemo(() => {
    if (!barSeries.length) return [] as number[];
    const set = new Set<number>();
    for (const s of barSeries) for (const p of s.displayData) set.add(p.x);
    return Array.from(set).sort((a, b) => a - b);
  }, [barSeries]);
  const bucketWidth = useMemo(() => {
    if (xBuckets.length < 2) return innerWidth * 0.6;
    const sorted = [...xBuckets].sort((a, b) => a - b);
    let minGap = Infinity;
    for (let i = 1; i < sorted.length; i++) {
      const g = xScale(sorted[i]) - xScale(sorted[i - 1]);
      if (g < minGap) minGap = g;
    }
    return Math.max(4, minGap * 0.72);
  }, [xBuckets, xScale, innerWidth]);

  // Hover values
  const hoverPoint =
    primary && hoverIndex !== null ? primary.displayData[hoverIndex] : null;
  const hoverPrimaryRawPoint = useMemo(() => {
    const primarySource = series[0];
    if (!primarySource || !hoverPoint) return null;
    const rawIdx = nearestIndex(primarySource.data, hoverPoint.x);
    return primarySource.data[rawIdx] ?? null;
  }, [series, hoverPoint]);
  const hoverPrimaryRawValue =
    hoverPrimaryRawPoint?.y ?? null;

  // Accessible name
  const accessibleName =
    title ??
    (primary
      ? `Line graph of ${[primary.label, ...overlays.map((o) => o.label)]
          .filter(Boolean)
          .join(" vs ")}`
      : "Line graph");

  // Tick label renderer
  const renderTick = (
    tick: number,
    side: "left" | "right",
    formatter?: (v: number) => string,
  ) => {
    const yScale = side === "right" ? yScaleRight : yScaleLeft;
    const ty = yScale(tick);
    if (ty < PAD_Y - 1 || ty > PAD_Y + innerHeight + 1) return null;
    const text = formatter
      ? formatter(tick)
      : isPercentMode
        ? formatPercentTick(tick)
        : formatNumberTick(tick);
    const x = side === "left" ? padLeft - 8 : width - padRight + 8;
    return (
      <motion.text
        key={`${side}-${tick}`}
        x={x}
        y={ty}
        textAnchor={side === "left" ? "end" : "start"}
        dominantBaseline="middle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springs.moderate, delay: 0.15 }}
        className="fill-muted-foreground tabular-nums"
        style={{
          fontSize: sizeCfg.tickFontSize,
          fontVariationSettings: fontWeights.medium,
        }}
      >
        {text}
      </motion.text>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col gap-3 w-full", className)}
      aria-disabled={disabled || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* Range selector + Custom brush chip + optional Export menu */}
      {!compact && (ranges?.length || showExportMenu || (brushEnabled && activeBrush)) && (
        <div className={cn("flex items-center justify-between gap-3", interactiveDisabled && "opacity-40 pointer-events-none")}>
          <div className="flex items-center gap-2">
            {brushEnabled && activeBrush && onBrush && (
              <button
                type="button"
                onClick={clearBrush}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 text-[12px] text-foreground bg-accent/60 hover:bg-accent outline-none",
                  "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
                  shape.bg,
                )}
                style={{ fontVariationSettings: fontWeights.medium }}
                aria-label="Clear custom range"
              >
                Custom
                <span aria-hidden className="text-muted-foreground">×</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {ranges && ranges.length > 0 && (
              <TabsSubtle
                selectedIndex={
                  activeBrush && onBrush
                    ? -1
                    : Math.max(0, ranges.findIndex((r) => r.value === activeRange))
                }
                onSelect={(i) => {
                  if (activeBrush && brush === undefined) setUncontrolledBrush(null);
                  onRangeChange?.(ranges[i].value);
                }}
              >
                {ranges.map((r, i) => (
                  <TabsSubtleItem key={r.value} index={i} label={r.label} />
                ))}
              </TabsSubtle>
            )}
            {showExportMenu && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-[12px] text-foreground bg-transparent hover:bg-accent/60 outline-none",
                    "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
                    shape.bg,
                  )}
                  style={{ fontVariationSettings: fontWeights.medium }}
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                >
                  Export
                  <span aria-hidden className="text-muted-foreground">▾</span>
                </button>
                <AnimatePresence>
                  {exportMenuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
                      transition={springs.fast}
                      className={cn(
                        "absolute right-0 top-full mt-1 z-20 min-w-[160px]",
                        "bg-card border border-border/60 shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
                        "py-1",
                        shape.mergedBg,
                      )}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left px-3 py-1.5 text-[13px] text-foreground hover:bg-accent/60 outline-none focus-visible:bg-accent/60"
                        style={{ fontVariationSettings: fontWeights.medium }}
                        onClick={() => {
                          setExportMenuOpen(false);
                          void exportPNG();
                        }}
                      >
                        Download PNG
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full text-left px-3 py-1.5 text-[13px] text-foreground hover:bg-accent/60 outline-none focus-visible:bg-accent/60"
                        style={{ fontVariationSettings: fontWeights.medium }}
                        onClick={() => {
                          setExportMenuOpen(false);
                          exportCSV();
                        }}
                      >
                        Download CSV
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart area */}
      <motion.div
        tabIndex={compact || interactiveDisabled ? -1 : 0}
        role="img"
        aria-label={accessibleName}
        onKeyDown={compact || interactiveDisabled ? undefined : handleKeyDown}
        animate={{ opacity: disabled ? 0.45 : 1 }}
        transition={springs.moderate}
        className={cn(
          "relative w-full outline-none",
          !compact && "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
          !compact && shape.container,
          interactiveDisabled && "cursor-not-allowed",
        )}
        style={{ height: effectiveHeight }}
      >
        {(hasData || loading) && width > 0 && (
          <svg
            ref={svgRef}
            width={width}
            height={effectiveHeight}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={brushEnabled ? handlePointerDown : undefined}
            onPointerUp={brushEnabled ? handlePointerUp : undefined}
            onDoubleClick={brushEnabled && activeBrush ? clearBrush : undefined}
            onClick={
              displaySeries.some((s) => s.interactive)
                ? () => {
                    if (hoverIndex === null) return;
                    displaySeries
                      .filter((s) => s.interactive && !hidden.has(s.id))
                      .forEach((s) => activatePoint(s.id));
                  }
                : undefined
            }
            className={cn(
              "block overflow-visible",
              brushEnabled ? "touch-pan-y" : "touch-none",
              displaySeries.some((s) => s.interactive) && hoverPoint && !interactiveDisabled && "cursor-pointer",
              brushEnabled && !interactiveDisabled && !hoverPoint && "cursor-crosshair",
            )}
          >
            <defs>
              <linearGradient
                id={`fill-${uid}`}
                x1="0"
                y1={PAD_Y}
                x2="0"
                y2={floorY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={primaryColor} stopOpacity={loading ? 0 : 0.28} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              {rightEdgeFade > 0 && (
                <>
                  <linearGradient id={`edge-${uid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="white" stopOpacity={1} />
                    <stop offset={`${(1 - rightEdgeFade) * 100}%`} stopColor="white" stopOpacity={1} />
                    <stop offset="100%" stopColor="white" stopOpacity={0} />
                  </linearGradient>
                  <mask id={`mask-${uid}`}>
                    <rect x="0" y="0" width={width} height={effectiveHeight} fill={`url(#edge-${uid})`} />
                  </mask>
                </>
              )}
              {/* Shimmer gradient for loading — sweeping highlight */}
              {loading && (
                <linearGradient
                  id={`shimmer-${uid}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                  gradientUnits="objectBoundingBox"
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.18}>
                    <animate
                      attributeName="offset"
                      values="-1;1"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="40%" stopColor="currentColor" stopOpacity={0.55}>
                    <animate
                      attributeName="offset"
                      values="-0.6;1.4"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="60%" stopColor="currentColor" stopOpacity={0.55}>
                    <animate
                      attributeName="offset"
                      values="-0.4;1.6"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </stop>
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0.18}>
                    <animate
                      attributeName="offset"
                      values="0;2"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </stop>
                </linearGradient>
              )}
            </defs>

            {/* Bands (under everything) */}
            {bands &&
              !compact &&
              bands.map((b, i) => {
                const yScale = yScaleFor(b.axis ?? "left");
                const y1 = yScale(b.yEnd);
                const y2 = yScale(b.yStart);
                const top = Math.min(y1, y2);
                const bandH = Math.abs(y2 - y1);
                const fill = b.kind ? KIND_COLOR[b.kind] : "currentColor";
                return (
                  <motion.rect
                    key={`band-${i}`}
                    x={padLeft}
                    width={innerWidth}
                    y={top}
                    height={bandH}
                    fill={fill}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.08 }}
                    transition={{ ...springs.slow, delay: 0.05 + i * 0.03 }}
                  />
                );
              })}

            {/* Baseline */}
            {showBaseline && !compact && !loading && (
              <motion.line
                x1={padLeft}
                x2={padLeft + innerWidth}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="2 4"
                className="text-neutral-300 dark:text-neutral-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y1: baselineY, y2: baselineY }}
                transition={springs.slow}
              />
            )}

            {/* Y-axis tick labels */}
            {yAxisOnLeft &&
              leftTicks.length > 0 &&
              !loading && (
                <g aria-hidden="true">
                  {leftTicks.map((t) =>
                    renderTick(t, "left", isPercentMode ? formatYAxis : formatYAxisLeft ?? formatYAxis),
                  )}
                </g>
              )}
            {yAxisOnRight &&
              rightTicks.length > 0 &&
              !loading && (
                <g aria-hidden="true">
                  {rightTicks.map((t) =>
                    renderTick(t, "right", isPercentMode ? formatYAxis : formatYAxisRight ?? formatYAxis),
                  )}
                </g>
              )}

            {/* Thresholds */}
            {thresholds &&
              !compact &&
              !loading &&
              thresholds.map((t, i) => {
                const yScale = yScaleFor(t.axis ?? "left");
                const ty = yScale(t.y);
                if (ty < PAD_Y - 1 || ty > PAD_Y + innerHeight + 1) return null;
                const stroke = t.kind ? KIND_COLOR[t.kind] : "currentColor";
                const labelSide = t.axis === "right" ? "left" : "right";
                const labelX = labelSide === "right" ? padLeft + innerWidth - 4 : padLeft + 4;
                const anchor = labelSide === "right" ? "end" : "start";
                return (
                  <motion.g
                    key={`thr-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ ...springs.moderate, delay: 0.2 + i * 0.04 }}
                  >
                    <line
                      x1={padLeft}
                      x2={padLeft + innerWidth}
                      y1={ty}
                      y2={ty}
                      stroke={stroke}
                      strokeWidth={1}
                      strokeDasharray="3 4"
                      className={t.kind ? "" : "text-neutral-400 dark:text-neutral-500"}
                      opacity={0.7}
                    />
                    {t.label && (
                      <text
                        x={labelX}
                        y={ty - 4}
                        textAnchor={anchor}
                        className="fill-muted-foreground tabular-nums"
                        style={{
                          fontSize: sizeCfg.tickFontSize,
                          fontVariationSettings: fontWeights.medium,
                        }}
                      >
                        {t.label}
                      </text>
                    )}
                  </motion.g>
                );
              })}

            {/* Loading shimmer placeholder — gentle wavy graph silhouette */}
            {loading && (() => {
              const segments = 48;
              const amp = innerHeight * 0.18;
              const midY = PAD_Y + innerHeight * 0.55;
              const points: { x: number; y: number }[] = [];
              for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const x = padLeft + t * innerWidth;
                const y =
                  midY +
                  Math.sin(t * Math.PI * 2.4) * amp * 0.6 +
                  Math.sin(t * Math.PI * 5.1 + 1.3) * amp * 0.25 -
                  t * innerHeight * 0.15;
                points.push({ x, y });
              }
              const linePath = computeSmoothPath(
                points,
                (x) => x,
                (y) => y,
              );
              const areaPath = `M ${points[0].x.toFixed(2)} ${floorY.toFixed(2)} L ${linePath.slice(2)} L ${points[points.length - 1].x.toFixed(2)} ${floorY.toFixed(2)} Z`;
              return (
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  <path
                    d={areaPath}
                    fill={`url(#shimmer-${uid})`}
                    opacity={0.6}
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={`url(#shimmer-${uid})`}
                    strokeWidth={sizeCfg.primaryStroke}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </motion.g>
              );
            })()}

            {/* Forecast ribbons (behind lines, ahead of bands/baseline) */}
            {!loading &&
              !compact &&
              displaySeries.map((s, i) => {
                if (!s.forecast || s.forecast.length < 2) return null;
                if (hidden.has(s.id)) return null;
                const yScale = yScaleFor(s.axis);
                const color = i === 0 ? primaryColor : overlayColor(s, Math.max(0, i - 1));
                const pts = [...s.forecast].sort((a, b) => a.x - b.x);
                let d = `M ${xScale(pts[0].x).toFixed(2)} ${yScale(pts[0].upper).toFixed(2)}`;
                for (let k = 1; k < pts.length; k++) {
                  d += ` L ${xScale(pts[k].x).toFixed(2)} ${yScale(pts[k].upper).toFixed(2)}`;
                }
                for (let k = pts.length - 1; k >= 0; k--) {
                  d += ` L ${xScale(pts[k].x).toFixed(2)} ${yScale(pts[k].lower).toFixed(2)}`;
                }
                d += " Z";
                const fadeFirstX = xScale(pts[0].x);
                const fadeLastX = xScale(pts[pts.length - 1].x);
                const gradientId = `fc-${uid}-${s.id}`;
                return (
                  <g key={`fc-${s.id}`}>
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1={fadeFirstX}
                        y1="0"
                        x2={fadeLastX}
                        y2="0"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={color} stopOpacity={0} />
                        <stop offset="25%" stopColor={color} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d={d}
                      fill={`url(#${gradientId})`}
                      stroke="none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ ...springs.slow, delay: 0.1 }}
                    />
                  </g>
                );
              })}

            {/* Bars (behind lines) */}
            {!loading &&
              barSeries.length > 0 &&
              barSeries.map((s, barIdx) => {
                const yScale = yScaleFor(s.axis);
                const color = s.id === primary?.id ? primaryColor : overlayColor(s, Math.max(0, displaySeries.findIndex((x) => x.id === s.id) - 1));
                const group = barSeries.length;
                const seriesWidth = bucketWidth / group;
                const offset = -bucketWidth / 2 + barIdx * seriesWidth + seriesWidth / 2;
                const isolated = isolatedId === s.id;
                const otherIsolated = isolatedId !== null && !isolated;
                return (
                  <g key={`bar-${s.id}`}>
                    {s.displayData.map((p, pi) => {
                      const bx = xScale(p.x) + offset - seriesWidth / 2 + 1;
                      const by = yScale(Math.max(0, p.y));
                      const zeroY = yScale(Math.min(Math.max(0, leftDomain.min), leftDomain.max));
                      const baseY = isPercentMode ? yScaleLeft(0) : zeroY;
                      const top = Math.min(by, baseY);
                      const h = Math.abs(baseY - by);
                      return (
                        <motion.rect
                          key={pi}
                          x={bx}
                          width={Math.max(1, seriesWidth - 2)}
                          initial={{ opacity: 0, y: baseY, height: 0 }}
                          animate={{
                            opacity: otherIsolated ? 0.3 : 1,
                            y: top,
                            height: h,
                          }}
                          transition={{ ...springs.moderate, delay: 0.05 + pi * 0.01 }}
                          fill={color}
                          rx={2}
                          ry={2}
                        />
                      );
                    })}
                  </g>
                );
              })}

            {/* Overlays (underneath primary) */}
            {!loading &&
              visibleOverlays.map((s, i) => {
                if (s.renderType === "bar") return null;
                const color = overlayColor(s, i);
                const yScale = yScaleFor(s.axis);
                const isolated = isolatedId === s.id;
                const otherIsolated = isolatedId !== null && !isolated;
                const dimmed = otherIsolated ? 0.25 : 0.85;
                const path = computePathByType(s.renderType, s.displayData, xScale, yScale);
                const stroke = s.renderType === "area" ? "none" : color;
                const fill =
                  s.renderType === "area" ? color : "none";
                return (
                  <motion.path
                    key={s.id}
                    d={path}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isolated ? sizeCfg.overlayStroke + 0.5 : sizeCfg.overlayStroke}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fillOpacity={s.renderType === "area" ? (otherIsolated ? 0.05 : 0.15) : undefined}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: dimmed }}
                    transition={{
                      pathLength: { ...springs.slow, delay: 0.15 },
                      opacity: { ...springs.fast },
                    }}
                  />
                );
              })}

            {/* Annotation guide lines (behind primary) */}
            {annotations && !compact && !loading && (
              <g>
                {annotations.map((a, i) => {
                  const x = xScale(a.x);
                  const inside = a.x >= xMin && a.x <= xMax;
                  return (
                    <motion.line
                      key={`anno-line-${i}`}
                      x1={x}
                      y1={PAD_Y}
                      x2={x}
                      y2={floorY}
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                      className="text-neutral-400 dark:text-neutral-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: inside ? 0.5 : 0.2 }}
                      transition={{ ...springs.moderate, delay: 0.3 + i * 0.04 }}
                    />
                  );
                })}
              </g>
            )}

            {/* Primary area + line (skipped when primary is a bar series) */}
            {!loading && primary && primaryRenderType !== "bar" && (
              <g mask={rightEdgeFade > 0 ? `url(#mask-${uid})` : undefined}>
                {primaryRenderType !== "area" && (
                  streaming ? (
                    <motion.path
                      fill={`url(#fill-${uid})`}
                      initial={{ opacity: 0, d: primaryAreaPath }}
                      animate={{
                        d: primaryAreaPath,
                        opacity:
                          isolatedId !== null && isolatedId !== primary.id
                            ? 0.1
                            : 1,
                      }}
                      transition={springs.moderate}
                    />
                  ) : (
                    <motion.path
                      d={primaryAreaPath}
                      fill={`url(#fill-${uid})`}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity:
                          isolatedId !== null && isolatedId !== primary.id
                            ? 0.1
                            : 1,
                      }}
                      transition={{ ...springs.slow, delay: 0.15 }}
                    />
                  )
                )}
                {streaming ? (
                  <motion.path
                    fill={primaryRenderType === "area" ? primaryColor : "none"}
                    fillOpacity={primaryRenderType === "area" ? 0.3 : undefined}
                    stroke={primaryRenderType === "area" ? "none" : primaryColor}
                    strokeWidth={
                      isolatedId === primary.id
                        ? sizeCfg.primaryStroke + 0.5
                        : compact
                          ? 1.5
                          : sizeCfg.primaryStroke
                    }
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    initial={{ d: primaryPath, opacity: 0 }}
                    animate={{
                      d: primaryPath,
                      opacity:
                        isolatedId !== null && isolatedId !== primary.id ? 0.25 : 1,
                    }}
                    transition={springs.moderate}
                  />
                ) : (
                  <motion.path
                    d={primaryPath}
                    fill={primaryRenderType === "area" ? primaryColor : "none"}
                    fillOpacity={primaryRenderType === "area" ? 0.3 : undefined}
                    stroke={primaryRenderType === "area" ? "none" : primaryColor}
                    strokeWidth={
                      isolatedId === primary.id
                        ? sizeCfg.primaryStroke + 0.5
                        : compact
                          ? 1.5
                          : sizeCfg.primaryStroke
                    }
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{
                      pathLength: 1,
                      opacity:
                        isolatedId !== null && isolatedId !== primary.id ? 0.25 : 1,
                    }}
                    transition={springs.slow}
                  />
                )}
              </g>
            )}

            {/* Annotation dots + invisible hit-targets (on top of the primary) */}
            {annotations && !compact && !loading && (
              <g>
                {annotations.map((a, i) => {
                  const x = xScale(a.x);
                  const inside = a.x >= xMin && a.x <= xMax;
                  const markerY =
                    primary && primary.displayData.length
                      ? yScaleFor(primary.axis)(interpolateAtX(primary.displayData, a.x) ?? 0)
                      : baselineY;
                  const markColor = a.kind ? KIND_COLOR[a.kind] : "currentColor";
                  const isHovered = hoveredAnnotation === i;
                  return (
                    <motion.g
                      key={`anno-dot-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: inside ? 1 : 0.4 }}
                      transition={{ ...springs.moderate, delay: 0.3 + i * 0.04 }}
                    >
                      {isHovered && (
                        <motion.circle
                          cx={x}
                          cy={markerY}
                          r={8}
                          fill={markColor}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 0.2, scale: 1 }}
                          transition={springs.fast}
                        />
                      )}
                      <circle
                        cx={x}
                        cy={markerY}
                        r={isHovered ? 4.5 : 3.5}
                        fill={markColor}
                        stroke="var(--background)"
                        strokeWidth={1.5}
                      />
                      {/* Larger transparent hit target; hovering scrubs the primary to this x. */}
                      <circle
                        cx={x}
                        cy={markerY}
                        r={12}
                        fill="transparent"
                        style={{ cursor: "help" }}
                        onMouseEnter={() => {
                          setHoveredAnnotation(i);
                          if (primary && primary.displayData.length) {
                            const idx = nearestIndex(primary.displayData, a.x);
                            setHoverIndex(idx);
                            setHoverPrimaryX(primary.displayData[idx].x);
                            if (syncGroup) broadcastSync(syncGroup, uid, primary.displayData[idx].x);
                          }
                        }}
                        onMouseLeave={() =>
                          setHoveredAnnotation((cur) => (cur === i ? null : cur))
                        }
                      />
                    </motion.g>
                  );
                })}
              </g>
            )}

            {/* Scrub guideline */}
            <AnimatePresence>
              {!compact && hoverPoint && !loading && !disabled && (
                <motion.line
                  key="scrub-line"
                  stroke={primaryColor}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  opacity={0.35}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 0.35,
                    x1: xScale(hoverPoint.x),
                    x2: xScale(hoverPoint.x),
                    y1: PAD_Y,
                    y2: floorY,
                  }}
                  exit={{ opacity: 0 }}
                  transition={springs.fast}
                />
              )}
            </AnimatePresence>

            {/* Overlay hover dots (smaller, less emphasized; enlarged when series is interactive) */}
            <AnimatePresence>
              {hoverPoint &&
                !loading &&
                !disabled &&
                !compact &&
                visibleOverlays.map((s, i) => {
                  if (s.renderType === "bar") return null;
                  const interp = interpolateAtX(s.displayData, hoverPoint.x);
                  if (interp == null) return null;
                  const color = overlayColor(s, i);
                  const yScale = yScaleFor(s.axis);
                  return (
                    <motion.circle
                      key={`overlay-dot-${s.id}`}
                      r={s.interactive ? 4 : 2.75}
                      fill={color}
                      stroke="var(--background)"
                      strokeWidth={s.interactive ? 2 : 1.5}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: isolatedId !== null && isolatedId !== s.id ? 0.35 : 0.9,
                        cx: xScale(hoverPoint.x),
                        cy: yScale(interp),
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={springs.fast}
                    />
                  );
                })}
            </AnimatePresence>

            {/* Hover dot (primary) */}
            <AnimatePresence>
              {hoverPoint && !loading && !disabled && (
                <motion.circle
                  key="hover-dot"
                  r={primary?.interactive ? (compact ? 4 : 5.5) : compact ? 3 : 4.5}
                  fill={primaryColor}
                  stroke="var(--background)"
                  strokeWidth={2}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    cx: xScale(hoverPoint.x),
                    cy: yScaleFor(primary!.axis)(hoverPoint.y),
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={springs.fast}
                />
              )}
            </AnimatePresence>

            {/* Click pulse (anchored to the activated series' point) */}
            <AnimatePresence>
              {pulseKey && pulsePoint && (() => {
                const ps = displaySeries.find((s) => s.id === pulsePoint.seriesId);
                if (!ps) return null;
                const strokeColor = ps.id === primary?.id
                  ? primaryColor
                  : overlayColor(ps, Math.max(0, displaySeries.findIndex((d) => d.id === ps.id) - 1));
                return (
                  <motion.circle
                    key={pulseKey}
                    cx={xScale(pulsePoint.x)}
                    cy={yScaleFor(ps.axis)(pulsePoint.y)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2}
                    initial={{ r: 4, opacity: 0.7 }}
                    animate={{ r: 18, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                );
              })()}
            </AnimatePresence>

            {/* Brush band (during drag; or when onBrush callback keeps the chart unzoomed) */}
            {brushEnabled && (dragBrush || (activeBrush && onBrush)) && (() => {
              const range = dragBrush ?? activeBrush;
              if (!range) return null;
              const a = Math.min(range.xStart, range.xEnd);
              const b = Math.max(range.xStart, range.xEnd);
              const bx = xScale(a);
              const bw = xScale(b) - xScale(a);
              return (
                <g pointerEvents="none">
                  <rect
                    x={bx}
                    y={PAD_Y}
                    width={Math.max(0, bw)}
                    height={innerHeight}
                    fill={primaryColor}
                    opacity={0.12}
                  />
                  <line x1={bx} x2={bx} y1={PAD_Y} y2={floorY} stroke={primaryColor} strokeWidth={1} opacity={0.45} />
                  <line x1={bx + bw} x2={bx + bw} y1={PAD_Y} y2={floorY} stroke={primaryColor} strokeWidth={1} opacity={0.45} />
                </g>
              );
            })()}

            {/* Streaming halo pulse at the trailing edge of the primary */}
            {streaming && primary && !loading && primary.displayData.length > 0 && (() => {
              const last = primary.displayData[primary.displayData.length - 1];
              const cx = xScale(last.x);
              const cy = yScaleFor(primary.axis)(last.y);
              return (
                <g pointerEvents="none">
                  <motion.circle
                    fill={primaryColor}
                    initial={{ r: 6, opacity: 0.4, cx, cy }}
                    animate={{ r: [6, 16, 6], opacity: [0.4, 0, 0.4], cx, cy }}
                    transition={{
                      r: { duration: 1.6, repeat: Infinity, ease: "easeOut" },
                      opacity: { duration: 1.6, repeat: Infinity, ease: "easeOut" },
                      cx: springs.moderate,
                      cy: springs.moderate,
                    }}
                  />
                  <motion.circle
                    r={3.5}
                    fill={primaryColor}
                    initial={{ cx, cy }}
                    animate={{ cx, cy }}
                    transition={springs.moderate}
                  />
                </g>
              );
            })()}

            {/* X-axis ticks (opt-in) */}
            {showXTicks && !compact && !loading && (() => {
              // Snap ticks to actual data x-values so labels line up with plotted points.
              // Prefer the primary's data; fall back to any visible series; fall back to nice ticks.
              const sourceXs = (() => {
                const uniq = new Set<number>();
                const seed = (primary ?? allVisible[0])?.displayData ?? [];
                for (const p of seed) uniq.add(p.x);
                if (uniq.size < 2) {
                  for (const s of allVisible) for (const p of s.displayData) uniq.add(p.x);
                }
                return Array.from(uniq).sort((a, b) => a - b);
              })();

              let ticks: number[];
              if (sourceXs.length >= 2) {
                // When there are few enough buckets, show ALL of them (bar charts, weekly data, etc.).
                // Otherwise generate "nice" round tick values, then snap each to the nearest actual data x.
                const FEW = Math.max(xAxisTickCount, 10);
                if (sourceXs.length <= FEW) {
                  ticks = sourceXs;
                } else {
                  const candidates = niceTicks(sourceXs[0], sourceXs[sourceXs.length - 1], xAxisTickCount);
                  const snapped = new Set<number>();
                  for (const c of candidates) {
                    // Binary search for nearest sourceX
                    let lo = 0;
                    let hi = sourceXs.length - 1;
                    while (lo < hi) {
                      const mid = (lo + hi) >> 1;
                      if (sourceXs[mid] < c) lo = mid + 1;
                      else hi = mid;
                    }
                    const a = sourceXs[Math.max(0, lo - 1)];
                    const b = sourceXs[lo];
                    snapped.add(Math.abs(a - c) <= Math.abs(b - c) ? a : b);
                  }
                  ticks = Array.from(snapped).sort((a, b) => a - b);
                }
              } else {
                ticks = niceTicks(xMin, xMax, xAxisTickCount);
              }

              return (
                <g aria-hidden="true">
                  {ticks.map((t) => {
                    const tx = xScale(t);
                    if (tx < padLeft - 1 || tx > padLeft + innerWidth + 1) return null;
                    const text = formatXAxis ? formatXAxis(t) : formatX ? formatX(t) : formatNumberTick(t);
                    return (
                      <text
                        key={`xt-${t}`}
                        x={tx}
                        y={floorY + 14}
                        textAnchor="middle"
                        dominantBaseline="hanging"
                        className="fill-muted-foreground tabular-nums"
                        style={{
                          fontSize: sizeCfg.tickFontSize,
                          fontVariationSettings: fontWeights.medium,
                        }}
                      >
                        {text}
                      </text>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        )}

        {/* A11y data table */}
        {!compact && (
          <table className="sr-only">
            <caption>{accessibleName}</caption>
            <thead>
              <tr>
                <th>Point</th>
                {series.map((s) => (
                  <th key={s.id}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series[0]?.data.map((_, i) => (
                <tr key={i}>
                  <td>{series[0].data[i].x}</td>
                  {series.map((s) => (
                    <td key={s.id}>{s.data[i]?.y ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Legend — shimmer pills while loading */}
      {showLegend && !compact && loading && (
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-2"
          aria-hidden="true"
        >
          {Array.from({ length: Math.max(1, series.length || 1) }).map((_, i) => (
            <div
              key={i}
              className={cn("h-4", shape.bg)}
              style={{
                width: i === 0 ? 116 : 84 + ((i * 13) % 28),
                background:
                  "linear-gradient(90deg, var(--muted) 0%, var(--muted) 35%, var(--accent) 50%, var(--muted) 65%, var(--muted) 100%)",
                backgroundSize: "300% 100%",
                animation: "shimmer 1.6s ease-in-out infinite reverse",
              }}
            />
          ))}
        </div>
      )}

      {/* Legend (with proximity-hover sliding pill behind items) */}
      {showLegend && !compact && !loading && hasData && (
        <LegendRow
          series={series}
          primary={primary}
          overlays={overlays}
          hidden={hidden}
          disabled={disabled}
          interactiveDisabled={interactiveDisabled}
          isolatedId={isolatedId}
          setIsolatedId={setIsolatedId}
          toggleSeries={toggleSeries}
          shakeId={shakeId}
          sizeCfg={sizeCfg}
          primaryColor={primaryColor}
          overlayColor={overlayColor}
          isPercentMode={isPercentMode}
          formatValue={formatValue}
          shape={shape}
        />
      )}
      {/* Tooltip (portaled) */}
      {!compact &&
        !loading &&
        !disabled &&
        hoverPoint &&
        primary &&
        hoverPrimaryRawValue != null &&
        svgRect && (
          <HoverTooltip
            anchor={{
              left: svgRect.left + xScale(hoverPoint.x),
              top: svgRect.top + yScaleFor(primary.axis)(hoverPoint.y),
            }}
            primary={{
              label: primary.label,
              color: primaryColor,
              change: isPercentMode
                ? hoverPoint.y
                : hoverPoint.y - (primary.displayData[0]?.y ?? 0),
              changeIsPercent: isPercentMode,
              value: hoverPrimaryRawValue,
            }}
            overlays={visibleOverlays.map((s, i) => {
              // Interpolate raw y on the source (untransformed) series so absolute mode gets real values.
              const rawSource = series.find((src) => src.id === s.id);
              const rawInterp = rawSource ? interpolateAtX(rawSource.data, hoverPoint.x) ?? 0 : 0;
              const startY = s.displayData[0]?.y ?? 0;
              const interp = interpolateAtX(s.displayData, hoverPoint.x) ?? 0;
              return {
                id: s.id,
                label: s.label,
                color: overlayColor(s, i),
                change: isPercentMode ? interp : interp - startY,
                changeIsPercent: isPercentMode,
                value: isPercentMode ? null : rawInterp,
              };
            })}
            formatValue={formatValue}
            formatX={formatX}
            rawX={hoverPrimaryX ?? hoverPoint.x}
            showRawValues={!isPercentMode}
            annotations={
              annotations && primary
                ? annotations
                    .filter((a) => {
                      if (a.x < xMin || a.x > xMax) return false;
                      // Match annotations whose nearest-data-point is the current scrub point.
                      const idx = nearestIndex(primary.displayData, a.x);
                      return primary.displayData[idx]?.x === hoverPoint.x;
                    })
                    .map((a) => ({
                      label: a.label,
                      color: a.kind ? KIND_COLOR[a.kind] : "currentColor",
                    }))
                : []
            }
          />
        )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Hover tooltip card
// ---------------------------------------------------------------------------

interface HoverTooltipProps {
  anchor: { left: number; top: number };
  primary: {
    label: string;
    color: string;
    change: number;
    changeIsPercent: boolean;
    value: number;
  };
  overlays: {
    id: string;
    label: string;
    color: string;
    change: number;
    changeIsPercent: boolean;
    value: number | null;
  }[];
  formatValue?: (v: number) => string;
  formatX?: (x: number) => string;
  rawX: number;
}

function HoverTooltip({
  anchor,
  primary,
  overlays,
  formatValue,
  formatX,
  rawX,
  showRawValues,
  annotations,
}: HoverTooltipProps & {
  showRawValues?: boolean;
  annotations?: { label: string; color: string }[];
}) {
  const shape = useShape();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: 200, h: 100 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (cardRef.current) {
      setCardSize({
        w: cardRef.current.offsetWidth,
        h: cardRef.current.offsetHeight,
      });
    }
  }, [primary.value, overlays.length]);

  if (!mounted) return null;

  const GAP = 14;
  const VIEWPORT_PAD = 8;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  let top = anchor.top - GAP - cardSize.h;
  if (top < VIEWPORT_PAD) top = anchor.top + GAP;
  top = Math.min(Math.max(top, VIEWPORT_PAD), vh - cardSize.h - VIEWPORT_PAD);

  let left = anchor.left - cardSize.w / 2;
  left = Math.min(Math.max(left, VIEWPORT_PAD), vw - cardSize.w - VIEWPORT_PAD);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="graph-hover-tooltip"
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.96, y: 2 }}
        animate={{ opacity: 1, scale: 1, left, top, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.08 } }}
        transition={springs.fast}
        className={cn(
          "pointer-events-none fixed z-50 min-w-[180px]",
          "bg-card border border-border/60",
          "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)]",
          "px-3 py-2.5",
          shape.mergedBg,
        )}
      >
        <div
          className="text-foreground text-[14px] leading-tight tabular-nums"
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          {formatValue ? formatValue(primary.value) : primary.value}
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <TooltipRow
            color={primary.color}
            label={primary.label}
            change={primary.change}
            changeIsPercent={primary.changeIsPercent}
            bold
          />
          {overlays.map((o) => (
            <TooltipRow
              key={o.id}
              color={o.color}
              label={o.label}
              change={o.change}
              changeIsPercent={o.changeIsPercent}
              rawValue={showRawValues ? o.value : null}
              formatValue={formatValue}
            />
          ))}
        </div>
        {annotations && annotations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 flex flex-col gap-1">
            {annotations.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block rounded-full shrink-0"
                  style={{ width: 7, height: 7, background: a.color }}
                />
                <span
                  className="text-[12px] text-foreground"
                  style={{ fontVariationSettings: fontWeights.medium }}
                >
                  {a.label}
                </span>
              </div>
            ))}
          </div>
        )}
        <div
          className="mt-2 pt-2 border-t border-border/50 text-muted-foreground text-[11px] tabular-nums"
          style={{ fontVariationSettings: fontWeights.medium }}
        >
          {formatX ? formatX(rawX) : rawX}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

function TooltipRow({
  color,
  label,
  change,
  changeIsPercent,
  bold,
  rawValue,
  formatValue,
}: {
  color: string;
  label: string;
  change: number;
  changeIsPercent: boolean;
  bold?: boolean;
  rawValue?: number | null;
  formatValue?: (v: number) => string;
}) {
  const signColor =
    change > 0.00005
      ? DEFAULT_PRIMARY_UP
      : change < -0.00005
        ? DEFAULT_PRIMARY_DOWN
        : undefined;
  const changeText = changeIsPercent ? formatPercent(change) : formatNumberTick(change);
  const rawText =
    rawValue != null
      ? formatValue
        ? formatValue(rawValue)
        : formatNumberTick(rawValue)
      : null;
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 min-w-0">
        <span
          className="inline-block rounded-full shrink-0"
          style={{ width: 7, height: 7, background: color }}
        />
        <span
          className="text-[12px] text-foreground truncate"
          style={{ fontVariationSettings: fontWeights.medium }}
        >
          {label}
        </span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {rawText && (
          <span
            className="tabular-nums text-[12px] text-foreground"
            style={{ fontVariationSettings: fontWeights.semibold }}
          >
            {rawText}
          </span>
        )}
        <span
          className="tabular-nums text-[12px] text-foreground"
          style={{
            fontVariationSettings: bold ? fontWeights.semibold : fontWeights.medium,
            color: bold ? signColor : undefined,
          }}
        >
          {changeText}
        </span>
      </span>
    </div>
  );
}

Graph.displayName = "Graph";

// ---------------------------------------------------------------------------
// Legend row — sliding proximity pill behind items
// ---------------------------------------------------------------------------

interface LegendRowProps {
  series: GraphSeries[];
  primary: ReturnType<typeof Array.prototype.find> | any;
  overlays: any[];
  hidden: Set<string>;
  disabled: boolean;
  interactiveDisabled: boolean;
  isolatedId: string | null;
  setIsolatedId: (id: string | null) => void;
  toggleSeries: (id: string, isPrimary: boolean) => void;
  shakeId: string | null;
  sizeCfg: (typeof SIZE_CONFIG)[GraphSize];
  primaryColor: string;
  overlayColor: (s: any, i: number) => string;
  isPercentMode: boolean;
  formatValue?: (v: number) => string;
  shape: ReturnType<typeof useShape>;
}

function LegendRow({
  series,
  primary,
  overlays,
  hidden,
  disabled,
  interactiveDisabled,
  isolatedId,
  setIsolatedId,
  toggleSeries,
  shakeId,
  sizeCfg,
  primaryColor,
  overlayColor,
  isPercentMode,
  formatValue,
  shape,
}: LegendRowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    activeIndex: hoveredIndex,
    setActiveIndex: setHoveredIndex,
    itemRects,
    handlers,
    registerItem,
    measureItems,
  } = useProximityHover<HTMLDivElement>(containerRef, { axis: "x" });

  const items = [primary, ...overlays].filter(Boolean);

  useEffect(() => {
    measureItems();
  }, [measureItems, items.length]);

  const hoveredRect = hoveredIndex !== null ? itemRects[hoveredIndex] : null;

  const legendTriangle = (net: number): "up" | "down" | "flat" =>
    net > 0.00005 ? "up" : net < -0.00005 ? "down" : "flat";

  return (
    <div
      ref={containerRef}
      onMouseMove={handlers.onMouseMove}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={() => {
        handlers.onMouseLeave();
        setIsolatedId(null);
      }}
      className={cn(
        "relative flex flex-wrap items-center gap-x-4 gap-y-2 py-1",
        disabled && "opacity-50",
      )}
    >
      <AnimatePresence>
        {hoveredRect && !interactiveDisabled && (
          <motion.div
            key="legend-pill"
            aria-hidden
            className={cn("absolute bg-accent/50 dark:bg-accent/30 pointer-events-none", shape.bg)}
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: hoveredRect.left,
              top: hoveredRect.top,
              width: hoveredRect.width,
              height: hoveredRect.height,
            }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ ...springs.fast, opacity: { duration: 0.1 } }}
          />
        )}
      </AnimatePresence>

      {items.map((s: any, i: number) => {
        const isPrimary = i === 0;
        const idx = isPrimary ? 0 : i - 1;
        const baseColor = isPrimary ? primaryColor : overlayColor(s, idx);
        const isHidden = !isPrimary && hidden.has(s.id);
        const latestRaw = series.find((src) => src.id === s.id)?.data.slice(-1)[0]?.y ?? 0;
        const startRaw = series.find((src) => src.id === s.id)?.data[0]?.y ?? 0;
        const latestPercent = startRaw === 0 ? 0 : (latestRaw - startRaw) / startRaw;
        const latestForLabel = isPercentMode ? latestPercent : latestRaw;
        const latestForDirection = isPercentMode ? latestPercent : latestRaw - startRaw;
        const dir = legendTriangle(latestForDirection);
        const colorText = isPrimary ? "text-foreground" : "text-muted-foreground";
        const Icon = s.icon;
        const valueText = isPercentMode
          ? formatPercent(latestForLabel)
          : formatValue
            ? formatValue(latestForLabel)
            : formatNumberTick(latestForLabel);

        return (
          <motion.button
            key={s.id}
            ref={(node) => registerItem(i, node)}
            type="button"
            data-proximity-index={i}
            disabled={interactiveDisabled}
            onClick={() => !interactiveDisabled && toggleSeries(s.id, isPrimary)}
            onMouseEnter={() => !interactiveDisabled && setIsolatedId(s.id)}
            onFocus={() => !interactiveDisabled && setIsolatedId(s.id)}
            onBlur={() => setIsolatedId(null)}
            className={cn(
              "relative z-10 flex items-center gap-1.5 outline-none transition-opacity duration-100 px-2 py-1",
              "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
              shape.bg,
              interactiveDisabled ? "cursor-not-allowed" : "cursor-pointer",
            )}
            animate={{
              x: shakeId === s.id ? [0, -3, 3, -3, 3, 0] : 0,
              opacity: isHidden ? 0.4 : 1,
            }}
            transition={shakeId === s.id ? { duration: 0.3 } : springs.moderate}
            aria-pressed={!isHidden}
            aria-label={`${s.label}: ${valueText}${isPrimary ? " (primary)" : isHidden ? " (hidden)" : ""}`}
          >
            {Icon && (
              <span
                className={cn("inline-flex shrink-0", isHidden && "text-muted-foreground")}
                style={{ color: isHidden ? undefined : baseColor }}
              >
                <Icon
                  size={sizeCfg.legendSecondary + 1}
                  strokeWidth={isPrimary ? 2 : 1.75}
                />
              </span>
            )}
            <DirectionTriangle
              direction={dir}
              color={isHidden ? "currentColor" : baseColor}
              size={isPrimary ? sizeCfg.triangle : sizeCfg.triangle - 2}
            />
            <span
              className={cn("tabular-nums", colorText)}
              style={{
                fontSize: isPrimary ? sizeCfg.legendPrimary : sizeCfg.legendSecondary,
                fontVariationSettings: isPrimary ? fontWeights.semibold : fontWeights.medium,
                color: isPrimary && !isHidden ? baseColor : undefined,
              }}
            >
              {valueText}
            </span>
            <span
              className="text-muted-foreground"
              style={{
                fontSize: isPrimary ? sizeCfg.legendPrimary : sizeCfg.legendSecondary,
                fontVariationSettings: fontWeights.medium,
              }}
            >
              {s.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export { Graph };
export type { GraphProps };
export default Graph;
