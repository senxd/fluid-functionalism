"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Graph,
  type GraphBrushEvent,
  type GraphRefHandle,
  type GraphSeries,
} from "@/registry/default/graph";
import { ComponentPreview } from "@/lib/docs/ComponentPreview";
import { PropsTable, type PropDef } from "@/lib/docs/PropsTable";
import { DocPage, DocSection } from "@/lib/docs/DocPage";
import { useIcon } from "@/lib/icon-context";

// ---------------------------------------------------------------------------
// Demo data generators
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateWalk(
  seed: number,
  count: number,
  start: number,
  volatility: number,
  drift: number,
): { x: number; y: number }[] {
  const rand = seededRandom(seed);
  const out: { x: number; y: number }[] = [];
  let v = start;
  for (let i = 0; i < count; i++) {
    const step = (rand() - 0.5) * 2 * volatility + drift;
    v = Math.max(v * (1 + step / 100), 0.1);
    out.push({ x: i, y: v });
  }
  return out;
}

function generateJumpWalk(seed: number, count: number, start: number): { x: number; y: number }[] {
  const rand = seededRandom(seed);
  const jumpAt = Math.floor(count * 0.38);
  const out: { x: number; y: number }[] = [];
  let v = start;
  for (let i = 0; i < count; i++) {
    let step = (rand() - 0.5) * 1.6;
    if (i === jumpAt) step = 12 + rand() * 4;
    else if (i < jumpAt) step -= 0.3;
    else step += 0.2;
    v = Math.max(v * (1 + step / 100), 0.1);
    out.push({ x: i, y: v });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const basicCode = `import { Graph } from "./components";

<Graph
  series={[
    {
      id: "revenue",
      label: "Revenue",
      data: [
        { x: 0, y: 120 },
        { x: 1, y: 135 },
        { x: 2, y: 130 },
        { x: 3, y: 152 },
        { x: 4, y: 168 },
        { x: 5, y: 183 },
      ],
    },
  ]}
/>`;

const overlayCode = `import { Graph } from "./components";

<Graph
  series={[
    { id: "you", label: "You",  data: youData },
    { id: "spy", label: "SPY",  data: spyData },
    { id: "btc", label: "BTC",  data: btcData },
  ]}
  formatValue={(v) => \`\$\${v.toFixed(0)}\`}
  formatX={(x) => \`Day \${x}\`}
/>`;

const rangeCode = `import { useState } from "react";
import { Graph } from "./components";

const [range, setRange] = useState("24H");

<Graph
  series={[{ id: "you", label: "Price", data: rangeData[range] }]}
  ranges={[
    { label: "LIVE", value: "LIVE" },
    { label: "1H",   value: "1H"   },
    { label: "24H",  value: "24H"  },
    { label: "1W",   value: "1W"   },
    { label: "1M",   value: "1M"   },
    { label: "ALL",  value: "ALL"  },
  ]}
  activeRange={range}
  onRangeChange={setRange}
  formatValue={(v) => \`\$\${v.toFixed(2)}\`}
/>`;

const yAxisCode = `import { Graph } from "./components";

// Y-axis tick labels render by default.
// Pass formatYAxis to override the format (default: signed percent).
<Graph
  series={[{ id: "revenue", label: "Revenue", data: revenueData }]}
  formatYAxis={(v) => \`\${(v * 100).toFixed(0)}%\`}
  formatValue={(v) => \`\$\${v.toFixed(0)}\`}
/>`;

const yAxisSideCode = `import { Graph } from "./components";

{/* Right-aligned Y-axis */}
<Graph
  series={[{ id: "revenue", label: "Revenue", data: revenueData }]}
  yAxisSide="right"
/>

{/* Mirrored on both edges */}
<Graph
  series={[{ id: "revenue", label: "Revenue", data: revenueData }]}
  yAxisSide="both"
/>`;

const downtrendCode = `import { Graph } from "./components";

<Graph
  series={[{ id: "rev", label: "Revenue", data: decliningData }]}
/>
// Graph auto-colors red when the primary is net-negative.`;

const sparklineCode = `import { Graph } from "./components";

<div className="flex items-center gap-3">
  <span className="font-mono text-[13px]">AAPL</span>
  <div className="w-40">
    <Graph compact series={[{ id: "aapl", label: "AAPL", data: aaplData }]} />
  </div>
  <span className="tabular-nums text-[13px]">+1.42%</span>
</div>`;

const edgeFadeCode = `import { Graph } from "./components";

<Graph
  series={[{ id: "proj", label: "Projection", data: projectionData }]}
  rightEdgeFade={0.25}
/>`;

const annotationsCode = `import { Graph } from "./components";

<Graph
  series={[{ id: "you", label: "Portfolio", data: portfolioData }]}
  annotations={[
    { x: 18, label: "Earnings", kind: "info" },
    { x: 42, label: "Dividend", kind: "positive" },
  ]}
/>`;

const sizeCode = `import { Graph } from "./components";

<Graph size="sm" series={[...]} />
<Graph size="md" series={[...]} />  {/* default */}
<Graph size="lg" series={[...]} />`;

const renderTypeCode = `import { Graph } from "./components";

<Graph series={[{ ..., renderType: "line"   }]} />  {/* default */}
<Graph series={[{ ..., renderType: "smooth" }]} />
<Graph series={[{ ..., renderType: "step"   }]} />
<Graph series={[{ ..., renderType: "area"   }]} />`;

const paletteIconCode = `import { Graph } from "./components";
import { useIcon } from "@/lib/icon-context";

const Trend = useIcon("trending-up");

<Graph
  series={[
    { id: "you", label: "You", data: youData, color: "violet", icon: Trend },
    { id: "spy", label: "SPY", data: spyData, color: "slate" },
    { id: "btc", label: "BTC", data: btcData, color: "amber" },
  ]}
/>`;

const absoluteCode = `import { Graph } from "./components";

<Graph
  yMode="absolute"
  series={[{ id: "rev", label: "Revenue", data: revenueData }]}
  formatValue={(v) => \`\$\${v.toFixed(0)}\`}
/>`;

const dualAxisCode = `import { Graph } from "./components";

<Graph
  yMode="absolute"
  series={[
    { id: "rev",      label: "Revenue (L)",   data: revenueData                  },
    { id: "visitors", label: "Visitors (R)",  data: visitorsData, axis: "right", color: "blue" },
  ]}
  formatYAxisLeft={(v) => \`\$\${(v / 1000).toFixed(0)}k\`}
  formatYAxisRight={(v) => v.toFixed(0)}
/>`;

const interactiveCode = `import { Graph } from "./components";

<Graph
  series={[
    { id: "rev", label: "Revenue", data: revenueData, interactive: true },
  ]}
  onPointClick={(e) => console.log("clicked", e)}
/>`;

const thresholdsBandsCode = `import { Graph } from "./components";

<Graph
  yMode="absolute"
  series={[{ id: "rev", label: "Revenue", data: revenueData }]}
  thresholds={[
    { y: 1_000_000, label: "Target", kind: "info" },
  ]}
  bands={[
    { yStart: 0,         yEnd: 600_000,    kind: "negative" },
    { yStart: 600_000,   yEnd: 1_000_000,  kind: "neutral"  },
    { yStart: 1_000_000, yEnd: 2_000_000,  kind: "positive" },
  ]}
/>`;

const barCode = `import { Graph } from "./components";

<Graph
  yMode="absolute"
  series={[
    { id: "rev",  label: "Revenue",  data: weekly,  renderType: "bar" },
    { id: "plan", label: "Plan",     data: planned, renderType: "bar", color: "slate" },
  ]}
/>`;

const brushCode = `import { useState } from "react";
import { Graph, type GraphBrushEvent } from "./components";

const [range, setRange] = useState<GraphBrushEvent | null>(null);

// Callback mode: chart stays unzoomed, caller receives the range.
<Graph
  series={[{ id: "rev", label: "Revenue", data }]}
  brushEnabled
  brush={range}
  onBrush={setRange}
/>

// Zoom mode: no onBrush → the chart morphs into the sub-range.
<Graph brushEnabled series={[{ id: "rev", label: "Revenue", data }]} />`;

const syncCode = `import { Graph } from "./components";

{/* Two charts in the same sync group mirror each other's scrub position */}
<Graph syncGroup="dashboard" series={[{ id: "a", label: "Revenue",  data: a }]} />
<Graph syncGroup="dashboard" series={[{ id: "b", label: "Visitors", data: b }]} />`;

const forecastCode = `import { Graph } from "./components";

<Graph
  yMode="absolute"
  series={[
    {
      id: "rev",
      label: "Revenue",
      data: revenue,
      forecast: forecastBounds, // [{ x, upper, lower }, ...]
    },
  ]}
  rightEdgeFade={0.22}
/>`;

const streamingCode = `import { Graph } from "./components";

<Graph
  streaming
  streamWindow={60}
  series={[{ id: "live", label: "Pulse", data: liveData }]}
/>`;

const exportCode = `import { useRef } from "react";
import { Graph, type GraphRefHandle } from "./components";

const ref = useRef<GraphRefHandle>(null);

<Graph
  ref={ref}
  showExportMenu
  exportFilename="revenue-q3"
  series={[{ id: "rev", label: "Revenue", data }]}
/>

// Or trigger programmatically:
ref.current?.exportPNG("snapshot");
ref.current?.exportCSV("raw");`;

const xTicksCode = `import { Graph } from "./components";

<Graph
  showXTicks
  series={[{ id: "rev", label: "Revenue", data }]}
  formatXAxis={(x) => \`Day \${x}\`}
/>`;

const loadingCode = `import { Graph } from "./components";

<Graph loading series={[{ id: "rev", label: "Revenue", data: [] }]} />`;

const disabledCode = `import { Graph } from "./components";

<Graph disabled series={[{ id: "rev", label: "Revenue", data }]} />`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const graphProps: PropDef[] = [
  { name: "series", type: "GraphSeries[]", description: "Series to plot. First entry is primary (bold + area fill); rest are overlays. Each accepts color (Tailwind name or CSS), icon, renderType (line | smooth | step | area | bar), axis, interactive, forecast." },
  { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Size variant. Affects default height and legend type sizes." },
  { name: "height", type: "number", description: "Explicit pixel height. Wins over the size default." },
  { name: "compact", type: "boolean", default: "false", description: "Sparkline mode. Strips baseline, legend, Y-axis and range selector." },
  { name: "yMode", type: '"percent" | "absolute"', default: '"percent"', description: "Percent normalizes each series to its own start; absolute plots raw values." },
  { name: "showBaseline", type: "boolean", default: "true", description: "Show the dotted baseline at 0% change (or 0 in absolute mode)." },
  { name: "showLegend", type: "boolean", default: "true", description: "Show the legend row below the chart." },
  { name: "showYAxis", type: "boolean", default: "true", description: "Show Y-axis tick labels. Off in compact mode." },
  { name: "showXTicks", type: "boolean", default: "false", description: "Show X-axis tick labels. Off by default to preserve the calm aesthetic." },
  { name: "xAxisTickCount", type: "number", default: "5", description: "Approximate number of X-axis ticks when showXTicks is true." },
  { name: "formatXAxis", type: "(x: number) => string", description: "Formats each X-axis tick. Falls back to formatX, then to a compact numeric formatter." },
  { name: "yAxisSide", type: '"left" | "right" | "both"', default: '"left"', description: "Which edge the Y-axis sits on (single-axis mode)." },
  { name: "formatYAxis", type: "(v: number) => string", description: "Formats Y-axis ticks (single axis)." },
  { name: "formatYAxisLeft", type: "(v: number) => string", description: "Formats left-axis ticks in absolute mode." },
  { name: "formatYAxisRight", type: "(v: number) => string", description: "Formats right-axis ticks in absolute mode." },
  { name: "yAxisTickCount", type: "number", default: "4", description: "Approximate number of Y-axis ticks." },
  { name: "ranges", type: "GraphRange[]", description: "Range selector options shown as a segmented tabs control above the chart." },
  { name: "activeRange", type: "string", description: "Currently selected range value." },
  { name: "onRangeChange", type: "(value: string) => void", description: "Fired when the user selects a range." },
  { name: "formatValue", type: "(v: number) => string", description: "Formats the primary series' raw value in the hover tooltip." },
  { name: "formatX", type: "(x: number) => string", description: "Formats the hovered x-position in the tooltip." },
  { name: "annotations", type: "GraphAnnotation[]", description: "Event markers: vertical rules with a dot on the primary line and a hover label." },
  { name: "thresholds", type: "GraphThreshold[]", description: "Horizontal reference lines with optional labels. Each: { y, label?, kind?, axis? }." },
  { name: "bands", type: "GraphBand[]", description: "Shaded Y-range zones. Each: { yStart, yEnd, kind?, axis? }." },
  { name: "rightEdgeFade", type: "number", default: "0", description: "Fraction (0..1) of the right edge to fade to transparent on the primary." },
  { name: "loading", type: "boolean", default: "false", description: "Renders a skeleton shimmer in place of the chart." },
  { name: "disabled", type: "boolean", default: "false", description: "Mutes everything and blocks all interaction." },
  { name: "onPointClick", type: "(e: GraphPointEvent) => void", description: "Fires when an interactive point is clicked or activated via Enter/Space. Emits once per interactive series at the hovered x." },
  { name: "brushEnabled", type: "boolean", default: "false", description: "Enable drag-to-select. Release calls onBrush, or, if onBrush is not provided, zooms in place." },
  { name: "brush", type: "GraphBrushEvent | null", description: "Controlled brush range. Pass null to clear; undefined to let the component manage its own state." },
  { name: "onBrush", type: "(e: GraphBrushEvent | null) => void", description: "Fires on brush release with the normalized range, or null when cleared." },
  { name: "syncGroup", type: "string", description: "Graphs sharing the same id mirror each other's hover position by x-value." },
  { name: "streaming", type: "boolean", default: "false", description: "Streaming mode. A pulsing halo marks the trailing edge of the primary series." },
  { name: "streamWindow", type: "number", description: "Fixed x-window while streaming; older points slide out the left edge." },
  { name: "showExportMenu", type: "boolean", default: "false", description: "Show an inline Export menu (PNG / CSV) next to the range selector." },
  { name: "exportFilename", type: "string", default: '"graph"', description: "Default filename (without extension) for exported PNG/CSV files." },
  { name: "title", type: "string", description: "Accessible name. Auto-generated from series labels if omitted." },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GraphDoc() {
  // Basic single-series
  const basicData = useMemo(
    () => generateWalk(7, 36, 120, 1.2, 0.4).map((p) => ({ x: p.x, y: p.y })),
    [],
  );

  // Overlay demo (You vs SPY vs BTC)
  const youData = useMemo(() => generateJumpWalk(11, 90, 100000), []);
  const spyData = useMemo(() => generateWalk(3, 90, 540, 0.45, 0.01), []);
  const btcData = useMemo(() => generateWalk(29, 90, 60000, 0.9, 0.03), []);

  // Range demo
  const [range, setRange] = useState("24H");
  const rangeData = useMemo(() => {
    return {
      LIVE: generateWalk(100, 60, 100, 0.12, 0.02),
      "1H": generateWalk(101, 60, 100, 0.25, 0.05),
      "24H": generateWalk(102, 96, 100, 0.6, 0.08),
      "1W": generateWalk(103, 84, 100, 1.0, 0.12),
      "1M": generateWalk(104, 120, 100, 1.2, 0.18),
      ALL: generateJumpWalk(105, 260, 100),
    } as Record<string, { x: number; y: number }[]>;
  }, []);

  // Downtrend
  const declining = useMemo(
    () => generateWalk(23, 36, 160, 1.1, -0.7),
    [],
  );

  // Sparkline
  const aaplData = useMemo(() => generateWalk(58, 40, 200, 0.6, 0.15), []);

  // Edge-fade / projection
  const projection = useMemo(() => generateWalk(71, 60, 50, 1.0, 0.35), []);

  // Annotations
  const annotated = useMemo(() => generateJumpWalk(88, 60, 1000), []);

  // Reference-image demo data (You/SPY/BTC) — curated pattern
  const overlaySeries: GraphSeries[] = useMemo(
    () => [
      { id: "you", label: "You", data: youData },
      { id: "spy", label: "SPY", data: spyData },
      { id: "btc", label: "BTC", data: btcData },
    ],
    [youData, spyData, btcData],
  );

  // Render-type / palette / dual-axis data
  const trendUp = useMemo(() => generateWalk(201, 36, 100, 1.0, 0.5), []);
  const visitorsData = useMemo(() => generateWalk(303, 36, 480, 1.0, 0.3), []);
  const revenueAbsolute = useMemo(() => generateWalk(404, 36, 800_000, 1.4, 0.6), []);

  // Interactive demo
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  // Bar demo (weekly buckets)
  const barWeekly = useMemo(
    () =>
      [
        { x: 0, y: 42 },
        { x: 1, y: 58 },
        { x: 2, y: 71 },
        { x: 3, y: 64 },
        { x: 4, y: 83 },
        { x: 5, y: 79 },
        { x: 6, y: 96 },
      ],
    [],
  );
  const barPlan = useMemo(
    () =>
      [
        { x: 0, y: 50 },
        { x: 1, y: 55 },
        { x: 2, y: 60 },
        { x: 3, y: 65 },
        { x: 4, y: 70 },
        { x: 5, y: 75 },
        { x: 6, y: 80 },
      ],
    [],
  );
  const weekdayLabel = (x: number) =>
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][x] ?? String(x);

  // Brush demo
  const brushData = useMemo(() => generateJumpWalk(42, 120, 5000), []);
  const [brushRange, setBrushRange] = useState<GraphBrushEvent | null>(null);

  // Sync group demo data
  const syncA = useMemo(() => generateWalk(501, 48, 100, 0.8, 0.2), []);
  const syncB = useMemo(() => generateWalk(502, 48, 540, 0.5, 0.1), []);

  // Forecast demo
  const forecastSeries = useMemo(() => {
    const histCount = 30;
    const projCount = 12;
    const hist = generateWalk(777, histCount, 800_000, 1.2, 0.4);
    const projected = generateWalk(778, projCount, hist[hist.length - 1].y, 1.4, 0.6).map(
      (p) => ({ x: p.x + histCount, y: p.y }),
    );
    const data = [...hist, ...projected];
    const forecast = projected.map((p) => ({
      x: p.x,
      upper: p.y * (1 + 0.08 + (p.x - histCount) * 0.008),
      lower: p.y * (1 - 0.08 - (p.x - histCount) * 0.008),
    }));
    return { data, forecast };
  }, []);

  // Streaming demo
  const [streamData, setStreamData] = useState(() =>
    generateWalk(200, 40, 50, 0.8, 0.05).map((p) => ({ x: p.x, y: p.y })),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setStreamData((prev) => {
        const last = prev[prev.length - 1];
        const nextX = last.x + 1;
        const nextY = Math.max(
          1,
          last.y * (1 + ((Math.sin(nextX * 0.35) + (Math.random() - 0.5)) * 0.02)),
        );
        const appended = [...prev, { x: nextX, y: nextY }];
        return appended.length > 80 ? appended.slice(-80) : appended;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Export demo
  const exportRef = useRef<GraphRefHandle>(null);

  // X-ticks demo
  const xTicksData = useMemo(() => generateWalk(331, 36, 200, 1.0, 0.4), []);

  // Icons (legend)
  const RocketIcon = useIcon("rocket");
  const GlobeIcon = useIcon("globe");
  const StarIcon = useIcon("star");

  return (
    <DocPage
      title="Graph"
      slug="graph"
      description="Line graph with a dotted grid, gradient area fill, and overlay reference series — designed for portfolio-style comparisons, dashboards, and sparklines."
    >
      <DocSection title="Basic">
        <ComponentPreview code={basicCode}>
          <div className="w-full max-w-xl">
            <Graph
              series={[
                {
                  id: "revenue",
                  label: "Revenue",
                  data: basicData,
                },
              ]}
              formatValue={(v) => `$${v.toFixed(0)}`}
              formatX={(x) => `Day ${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Overlay Series">
        <ComponentPreview code={overlayCode}>
          <div className="w-full max-w-2xl">
            <Graph
              series={overlaySeries}
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
              formatX={(x) => `Day ${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Time Ranges">
        <ComponentPreview code={rangeCode}>
          <div className="w-full max-w-2xl">
            <Graph
              series={[
                {
                  id: "price",
                  label: "Price",
                  data: rangeData[range],
                },
              ]}
              ranges={[
                { label: "LIVE", value: "LIVE" },
                { label: "1H", value: "1H" },
                { label: "24H", value: "24H" },
                { label: "1W", value: "1W" },
                { label: "1M", value: "1M" },
                { label: "ALL", value: "ALL" },
              ]}
              activeRange={range}
              onRangeChange={setRange}
              formatValue={(v) => `$${v.toFixed(2)}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Y-Axis Labels">
        <ComponentPreview code={yAxisCode}>
          <div className="w-full max-w-xl">
            <Graph
              series={[
                {
                  id: "revenue",
                  label: "Revenue",
                  data: basicData,
                },
              ]}
              formatYAxis={(v) => `${(v * 100).toFixed(0)}%`}
              formatValue={(v) => `$${v.toFixed(0)}`}
              formatX={(x) => `Day ${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Y-Axis Side">
        <ComponentPreview code={yAxisSideCode}>
          <div className="flex flex-col gap-6 w-full max-w-xl">
            <Graph
              series={[
                { id: "revenue", label: "Revenue (right)", data: basicData },
              ]}
              yAxisSide="right"
              formatYAxis={(v) => `${(v * 100).toFixed(0)}%`}
              formatValue={(v) => `$${v.toFixed(0)}`}
              formatX={(x) => `Day ${x}`}
            />
            <Graph
              series={[
                { id: "revenue", label: "Revenue (mirrored)", data: basicData },
              ]}
              yAxisSide="both"
              formatYAxis={(v) => `${(v * 100).toFixed(0)}%`}
              formatValue={(v) => `$${v.toFixed(0)}`}
              formatX={(x) => `Day ${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Downtrend">
        <ComponentPreview code={downtrendCode}>
          <div className="w-full max-w-xl">
            <Graph
              series={[
                { id: "rev", label: "Revenue", data: declining },
              ]}
              formatValue={(v) => `$${v.toFixed(0)}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Sparkline">
        <ComponentPreview code={sparklineCode}>
          <div className="flex flex-col gap-2 w-full max-w-sm">
            {[
              { ticker: "AAPL", data: aaplData, change: "+1.42%" },
              { ticker: "TSLA", data: generateWalk(37, 40, 240, 1.4, -0.1), change: "-0.38%" },
              { ticker: "NVDA", data: generateWalk(44, 40, 480, 1.0, 0.5), change: "+2.14%" },
            ].map((row) => (
              <div
                key={row.ticker}
                className="flex items-center gap-3 py-1"
              >
                <span className="w-12 font-mono text-[13px] text-foreground">
                  {row.ticker}
                </span>
                <div className="flex-1">
                  <Graph
                    compact
                    series={[
                      {
                        id: row.ticker,
                        label: row.ticker,
                        data: row.data,
                      },
                    ]}
                  />
                </div>
                <span className="w-16 text-right tabular-nums text-[13px] text-muted-foreground">
                  {row.change}
                </span>
              </div>
            ))}
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Right Edge Fade">
        <ComponentPreview code={edgeFadeCode}>
          <div className="w-full max-w-xl">
            <Graph
              series={[
                {
                  id: "proj",
                  label: "Projection",
                  data: projection,
                },
              ]}
              rightEdgeFade={0.22}
              formatValue={(v) => v.toFixed(1)}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Annotations">
        <ComponentPreview code={annotationsCode}>
          <div className="w-full max-w-xl">
            <Graph
              series={[
                {
                  id: "port",
                  label: "Portfolio",
                  data: annotated,
                },
              ]}
              annotations={[
                { x: 12, label: "Earnings", kind: "info" },
                { x: 28, label: "Rate cut", kind: "positive" },
                { x: 46, label: "Guidance miss", kind: "negative" },
              ]}
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Sizes">
        <ComponentPreview code={sizeCode}>
          <div className="flex flex-col gap-6 w-full max-w-xl">
            {(["sm", "md", "lg"] as const).map((s) => (
              <Graph
                key={s}
                size={s}
                series={[{ id: `r-${s}`, label: `size="${s}"`, data: trendUp }]}
                formatYAxis={(v) => `${(v * 100).toFixed(0)}%`}
                formatValue={(v) => `$${v.toFixed(0)}`}
              />
            ))}
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Render Types">
        <ComponentPreview code={renderTypeCode}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            {(["line", "smooth", "step", "area"] as const).map((rt) => (
              <Graph
                key={rt}
                size="sm"
                series={[
                  {
                    id: `rt-${rt}`,
                    label: `renderType="${rt}"`,
                    data: trendUp,
                    renderType: rt,
                  },
                ]}
                showYAxis={false}
              />
            ))}
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Palette + Icons in Legend">
        <ComponentPreview code={paletteIconCode}>
          <div className="w-full max-w-2xl">
            <Graph
              series={[
                { id: "you", label: "You", data: youData, color: "violet", icon: RocketIcon },
                { id: "spy", label: "SPY", data: spyData, color: "slate", icon: GlobeIcon },
                { id: "btc", label: "BTC", data: btcData, color: "amber", icon: StarIcon },
              ]}
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
              formatX={(x) => `Day ${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Absolute Mode">
        <ComponentPreview code={absoluteCode}>
          <div className="w-full max-w-xl">
            <Graph
              yMode="absolute"
              series={[{ id: "rev", label: "Revenue", data: revenueAbsolute }]}
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
              formatYAxis={(v) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${(v / 1000).toFixed(0)}k`
              }
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Dual Y-Axis">
        <ComponentPreview code={dualAxisCode}>
          <div className="w-full max-w-2xl">
            <Graph
              yMode="absolute"
              series={[
                { id: "rev", label: "Revenue (L)", data: revenueAbsolute },
                {
                  id: "visitors",
                  label: "Visitors (R)",
                  data: visitorsData,
                  axis: "right",
                  color: "blue",
                },
              ]}
              formatYAxisLeft={(v) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${(v / 1000).toFixed(0)}k`
              }
              formatYAxisRight={(v) => v.toFixed(0)}
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Thresholds & Bands">
        <ComponentPreview code={thresholdsBandsCode}>
          <div className="w-full max-w-xl">
            <Graph
              yMode="absolute"
              series={[
                { id: "rev", label: "Revenue", data: revenueAbsolute },
              ]}
              thresholds={[
                { y: 1_000_000, label: "Target", kind: "info" },
              ]}
              bands={[
                { yStart: 0, yEnd: 600_000, kind: "negative" },
                { yStart: 600_000, yEnd: 1_000_000, kind: "neutral" },
                { yStart: 1_000_000, yEnd: 2_000_000, kind: "positive" },
              ]}
              formatYAxis={(v) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${(v / 1000).toFixed(0)}k`
              }
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Interactive Points">
        <ComponentPreview code={interactiveCode}>
          <div className="w-full max-w-xl flex flex-col gap-2">
            <Graph
              series={[
                {
                  id: "rev",
                  label: "Revenue",
                  data: basicData,
                  interactive: true,
                },
              ]}
              onPointClick={(e) =>
                setLastClicked(`x=${e.x}, y=$${e.y.toFixed(0)}`)
              }
              formatValue={(v) => `$${v.toFixed(0)}`}
              formatX={(x) => `Day ${x}`}
            />
            <p className="text-[12px] text-muted-foreground px-1">
              {lastClicked
                ? `Last click → ${lastClicked}`
                : "Hover and click any point (or press Enter while focused)."}
            </p>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Loading">
        <ComponentPreview code={loadingCode}>
          <div className="w-full max-w-xl">
            <Graph
              loading
              series={[{ id: "rev", label: "Revenue", data: basicData }]}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Disabled">
        <ComponentPreview code={disabledCode}>
          <div className="w-full max-w-xl">
            <Graph
              disabled
              series={[
                { id: "rev", label: "Revenue", data: basicData },
              ]}
              formatValue={(v) => `$${v.toFixed(0)}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Bar Render Type">
        <ComponentPreview code={barCode}>
          <div className="w-full max-w-xl">
            <Graph
              yMode="absolute"
              size="sm"
              series={[
                { id: "rev", label: "Revenue", data: barWeekly, renderType: "bar" },
                { id: "plan", label: "Plan", data: barPlan, renderType: "bar", color: "slate" },
              ]}
              showXTicks
              formatXAxis={weekdayLabel}
              formatX={weekdayLabel}
              formatValue={(v) => `${v.toFixed(0)}k`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Brush (drag-to-select)">
        <ComponentPreview code={brushCode}>
          <div className="w-full max-w-2xl flex flex-col gap-2">
            <Graph
              series={[{ id: "rev", label: "Revenue", data: brushData }]}
              brushEnabled
              brush={brushRange}
              onBrush={setBrushRange}
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
              formatX={(x) => `Day ${x}`}
            />
            <p className="text-[12px] text-muted-foreground px-1">
              {brushRange
                ? `Selection → x ${brushRange.xStart.toFixed(0)} to ${brushRange.xEnd.toFixed(0)}. Click × on the Custom chip, or double-click the chart, to clear.`
                : "Click and drag across the chart to select a range."}
            </p>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Cross-Chart Sync">
        <ComponentPreview code={syncCode}>
          <div className="w-full max-w-2xl flex flex-col gap-4">
            <Graph
              size="sm"
              syncGroup="docs-sync-demo"
              series={[{ id: "a", label: "Revenue", data: syncA, color: "emerald" }]}
              formatValue={(v) => `$${v.toFixed(0)}`}
              formatX={(x) => `Day ${x}`}
            />
            <Graph
              size="sm"
              syncGroup="docs-sync-demo"
              series={[{ id: "b", label: "Visitors", data: syncB, color: "blue" }]}
              formatValue={(v) => v.toFixed(0)}
              formatX={(x) => `Day ${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Forecast Ribbon">
        <ComponentPreview code={forecastCode}>
          <div className="w-full max-w-xl">
            <Graph
              yMode="absolute"
              series={[
                {
                  id: "rev",
                  label: "Revenue",
                  data: forecastSeries.data,
                  forecast: forecastSeries.forecast,
                },
              ]}
              rightEdgeFade={0.22}
              formatYAxis={(v) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${(v / 1000).toFixed(0)}k`
              }
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Streaming">
        <ComponentPreview code={streamingCode}>
          <div className="w-full max-w-xl">
            <Graph
              streaming
              streamWindow={60}
              series={[{ id: "live", label: "Pulse", data: streamData, color: "cyan" }]}
              formatValue={(v) => v.toFixed(1)}
              formatX={(x) => `t=${x}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="PNG / CSV Export">
        <ComponentPreview code={exportCode}>
          <div className="w-full max-w-xl flex flex-col gap-2">
            <Graph
              ref={exportRef}
              yMode="absolute"
              showExportMenu
              exportFilename="revenue-demo"
              ranges={[
                { label: "7D", value: "7D" },
                { label: "30D", value: "30D" },
                { label: "ALL", value: "ALL" },
              ]}
              activeRange="30D"
              series={[{ id: "rev", label: "Revenue", data: revenueAbsolute }]}
              formatYAxis={(v) =>
                v >= 1_000_000
                  ? `$${(v / 1_000_000).toFixed(1)}M`
                  : `$${(v / 1000).toFixed(0)}k`
              }
              formatValue={(v) => `$${Math.round(v).toLocaleString()}`}
            />
            <p className="text-[12px] text-muted-foreground px-1">
              Open the Export menu above, or call{" "}
              <code className="font-mono text-[11px]">ref.current?.exportPNG()</code>{" "}
              /{" "}
              <code className="font-mono text-[11px]">ref.current?.exportCSV()</code>.
            </p>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="X-Axis Ticks">
        <ComponentPreview code={xTicksCode}>
          <div className="w-full max-w-xl">
            <Graph
              showXTicks
              series={[{ id: "rev", label: "Revenue", data: xTicksData }]}
              formatXAxis={(x) => `Day ${x}`}
              formatYAxis={(v) => `${(v * 100).toFixed(0)}%`}
              formatValue={(v) => `$${v.toFixed(0)}`}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="API Reference">
        <PropsTable props={graphProps} />
      </DocSection>
    </DocPage>
  );
}
