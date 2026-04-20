# Graph Enhancements

> Progressive upgrades to the Graph component: library-consistency parity, alternate rendering modes, richer interactions, and data-storytelling primitives. Takes the Graph from "a line chart with good overlays" to "a full charting surface that still feels like Fluid Functionalism."

## Goal

> Make the Graph as versatile as the data people actually want to plot — without losing the motion-as-information aesthetic that defines the rest of the library.

## Scope

**In:**
- Library-consistency features already standard elsewhere (size variants, color palette, icons, loading/disabled states, proximity hover, focus rings).
- Alternate chart render types per series (line / smooth / step / area / bar).
- Y-axis modes: percent-normalized (current) and absolute.
- Dual Y-axes for multi-unit comparisons.
- Minimal axis tick labels for absolute mode.
- Brush/drag-to-select an x-range with optional in-place zoom.
- Clickable / keyboard-activatable data points.
- Legend hover-to-isolate dimming.
- Cross-chart hover sync via shared group id.
- Horizontal threshold lines with labels.
- Shaded Y-range bands (zones).
- Forecast / confidence ribbons around a series.
- Live data streaming with trailing halo and optional time-window pan.
- PNG and CSV export, programmatic and optional UI.

**Out:**
- In-chart annotation authoring UI (drag to add a note).
- Pinch-zoom on touch (brush is the canonical range-select gesture).
- Multi-chart dashboards as a single component.
- AI-generated narrative.

## Feature description

### Library parity

**Size variants** — `sm` / `md` (default) / `lg`. Affects default chart height and legend type size. Explicit `height` still wins; sparkline (`compact`) is unchanged.

| Size | Chart height | Legend type | Baseline |
|---|---|---|---|
| `sm` | 180 | 12px | thinner |
| `md` | 280 | 13/15px | current |
| `lg` | 360 | 14/17px | current |

**Color palette** — A series can take a Tailwind-palette color name (same palette Badge uses) instead of raw hex. Primary keeps sign-aware red/green.

**Icons in legend** — Each series can carry an optional icon via the library's icon context. Icon renders before the direction triangle, tracks the series color, dims with the series.

**Loading state** — A `loading` prop renders: static baseline, shimmer path in place of the line (same treatment as ThinkingIndicator's shimmer), shimmer pills where legend items sit, disabled range selector.

**Disabled state** — Mutes series to ~40% opacity, desaturates primary to neutral, blocks hover/keyboard/legend/range interactions, suppresses the tooltip, keeps focus ring drawable for discoverability.

**Proximity hover on legend** — The legend row gains the TabsSubtle/Dropdown proximity pill: it slides between items as the mouse moves, landing softly on the hovered item.

**Focus ring consistency** — Every focusable element (container, legend buttons, range items, clickable points) draws the shared `#6B97FF` ring at the shape-context radius.

### Render types per series

| Type | Description |
|---|---|
| `line` | Current behavior — straight segments. |
| `smooth` | Monotone cubic; no overshoot past data. |
| `step` | Right-stepped; value holds to the next point. |
| `area` | No stroke; gradient fill only. |
| `bar` | Vertical bars. Only valid when x is discrete. |

Mixing is allowed — e.g. primary `line`, overlay `step`. In bar mode, multiple bar series auto-dodge side-by-side within each x-bucket; hovering highlights the whole bucket.

### Y-axis modes

- **`percent`** (default, current): each series plotted as `(v - first) / first`, sharing a 0%-based scale.
- **`absolute`**: raw Y values. Baseline becomes a subtle 0-line (or min-line if 0 isn't in range). Legend shows the latest raw value instead of the percent.

### Dual Y-axis (absolute mode only)
A series can declare `axis: "right"`. The right axis takes over scaling for those series; each axis pads independently. Minimal tick labels (3–5 per side) align to their respective edges; muted style. Tooltip shows each series' raw value at the hovered x.

### Tick labels
In absolute mode, optional compact ticks render on the chart edges using the consumer's value formatter. Type size follows the size variant. X-axis ticks are opt-in (`showXTicks`); off by default to preserve the calm aesthetic.

### Brush — drag-to-select a range
Dragging horizontally draws a translucent selection band. On release, either:
- The chart morphs into the sub-range (in-place zoom), or
- An `onBrush({ xStart, xEnd })` callback fires, depending on controlled/uncontrolled setup.

Double-click or Escape-while-dragging clears the selection. The range selector above the chart deselects any active preset while a brushed range is active and shows a dismissible "Custom" chip; clicking a preset restores preset behavior. Hover scrubbing pauses during a drag and resumes on release. On touch, long-press-then-drag initiates a brush so normal scrolling still works.

### Clickable data points
Points opted into interactivity:
- Show a subtle larger hover-outline when the scrub dot passes over them (not shown on non-interactive charts).
- Fire `onPointClick({ seriesId, x, y, index })` on click or Enter/Space when the chart is focused on that point.
- Pulse a ring (spring scale + fade) on activation.

### Legend hover-to-isolate
Hovering a legend item emphasizes that series (full opacity, slightly thicker stroke) and dims all others to ~25%. Leave returns to natural state. Click-to-toggle (existing behavior) is unchanged; isolate is purely visual.

### Cross-chart sync
Graph instances sharing a `syncGroup` id mirror each other's scrub position by matching x-value. Each chart draws its own dot and tooltip; only the x-position is shared. Missing-data x's hide that chart's dot but still show a dimmed guideline. Brush is not synced by default — opt in per chart.

### Threshold lines
Horizontal rules at a declared Y-value (`threshold: { y, label, kind? }`):
- Thin stroke, end-pinned label (right by default, left if crowded).
- `kind` (`neutral` / `positive` / `negative` / `info`) picks theme-token color.
- Label tooltip on hover carries the description.
- Nearby thresholds offset labels vertically to avoid collisions.

### Y-range bands (zones)
Shaded bands between `yStart` and `yEnd` across the full x-range:
- Low-opacity theme-token tint.
- Sits behind the baseline, above the background.
- Combines naturally with thresholds (e.g. green band below a target line).

### Forecast ribbons
A series can carry a `forecast` ribbon — upper and lower bounds per point:
- Fills between bounds at low opacity (lighter than the series area fill).
- If the ribbon starts mid-series, fades in — reinforces the existing right-edge fade as "this part is predicted."
- Tooltip inside a ribbon region adds an "between X and Y" line.

### Streaming
A `streaming` mode:
- Appends new points by extending the existing path with a spring (no full recompute).
- Optional fixed time window: as new data arrives, old points slide off the left edge at the same pace.
- Subtle radial halo pulses at the trailing edge of the primary to signal "live."
- Interruptible: switching to a preset range pauses the pulse and uses the normal range morph; re-enabling streaming re-attaches to the tail.

### Export
- **PNG** — renders the current chart state (including bands, thresholds, annotations, theme) to an image and downloads it.
- **CSV** — writes visible series as columns, one row per x-value, with axis indicators in headers when dual-axis is active (e.g. `Revenue (L)`).
- Callable programmatically via a ref handle. Optionally surfaced as a menu next to the range selector when the consumer enables it.

## Edge cases

| Case | Behavior |
|---|---|
| `loading` + data both provided | Skeleton wins until `loading` flips false; enter animation plays after. |
| `disabled` while hovering | Dot and tooltip fade out; no interactions accepted. |
| Icon provided for a hidden series | Icon dims with the rest of the item. |
| Color name not in palette | Falls back to default overlay neutrals; no throw. |
| Size changes at runtime | Heights and font sizes spring to new values. |
| Bar mode with continuous x | Bars are evenly spaced using array index; tick labels still use original x values. |
| Step line on last point | Segment renders to the last point's x then stops. |
| Smooth curve with duplicate x | Duplicates collapse to the latest y; curve doesn't loop. |
| Dual axis with only `right` series | Left axis hides; chart behaves like a single-axis absolute chart on the right. |
| `axis: "right"` in percent mode | Ignored — percent is a single shared scale. |
| Mixing `bar` and `line` | Bars in back, lines in front. |
| Brush drag < ~6px | Treated as a click, not a brush. |
| Brush starts outside data bounds | Clamps to nearest valid edge. |
| Click on non-interactive point | No-op. |
| Legend hover mid-toggle-fade | Isolate applies to current opacity, not target. |
| Sync charts of different sizes | Match by x-value; zoomed chart shows its sub-range's dot. |
| Sync across pointer + touch | Works; inputs are equivalent once mapped to x-values. |
| Brush + sync both on | Brush stays per-chart unless opted into brush-sync. |
| Threshold below current y-min | Chart auto-extends y-range (with small pad) unless consumer opts out. |
| Two thresholds near same y | Labels stack with a 2px nudge; lines draw separately. |
| Band outside current y-range | Clips to current extent; no layout glitch. |
| Forecast ribbon on a hidden series | Ribbon hides with the series. |
| Streaming with no data | Empty chart with subtle "awaiting data" affordance. |
| Streaming buffer overflow | Oldest points drop silently at a sensible cap. |
| PNG export on sparkline | Exports the sparkline at its rendered size. |
| CSV export with dual axes | Column headers indicate axis (`Revenue (L)`). |
| Export during range morph | Exports current frame; no retry. |

## UI description

**Size `sm` with icons + proximity hover on legend:**
```
┌──────────────────────────────────┐
│ (shorter chart area)             │
└──────────────────────────────────┘
  ░pill░    (slides between items on hover)
  📈 ▲ 2.92% You   📊 ▲ 0.10% SPY
```

**Loading:**
```
┌──────────────────────────────────┐
│ ░░░░░░░░░░░░░░ shimmer ░░░░░░░░  │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
└──────────────────────────────────┘
  ░░░░░░░░   ░░░░░░░░   ░░░░░░░░
```

**Absolute mode with dual Y-axis:**
```
 $1.2M ┤                             ● $93K  ┤ 520
       │         ╱╲                          │
 $800K ┤      ╱╱   ╲───                      ┤ 500
       │   ╱╱          ─────                 │
 $400K ┤╱───                  ╲─────         ┤ 480
       └─────────────────────────────────────┘
        Jan   Feb   Mar   Apr   May   Jun
      ▲ $93K Revenue (L)     ▲ 510 Visitors (R)
```

**Bar mode:**
```
┌─────────────────────────────────┐
│      ▇▇                         │
│      ▇▇         ▇▇              │
│ ▇▇   ▇▇   ▇▇   ▇▇   ▇▇          │
│ ▇▇   ▇▇   ▇▇   ▇▇   ▇▇   ▇▇     │
└─────────────────────────────────┘
  Mon  Tue  Wed  Thu  Fri  Sat
```

**Brushing mid-drag:**
```
┌──────────────────────────────────────┐
│      ╱╲       ░░░░░░░░░░              │
│     ╱  ╲   ░░░░░░░░░░░░░░             │
│ ╱╲╱    ╲╱░░░░░░░░░░░░░░░░             │
└──────────────────────────────────────┘
   [1W] 1M  3M  ... [Custom ×]
```

**Legend hover-to-isolate (hovering "SPY"):**
```
   ▲ 2.92% You   (dimmed)
   ▲ 0.10% SPY   (focused — thicker in chart)
   ▲ 0.27% BTC   (dimmed)
```

**Synced charts:**
```
 Chart A: ─────●─────          Chart B: ──────●────
              │                              │
              └──── same x-value ────────────┘
```

**Bands + thresholds + forecast:**
```
┌───────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░ warn zone ░░░░░░░░░░░░░░ ─── ── │ target: $1.0M
│                                               │
│        ╱▔▔╲   ╱▔▔╲ ╱▔▔╲  ░░░░╱▔╲░░░           │  forecast ribbon
│   ╱▔▔╲╱    ╲╱╱    ╲╱    ╲╱   ●   ╲            │
│░░░░░░░░░░░░░ ok zone ░░░░░░░░░░░─────────────│ baseline: $0
└───────────────────────────────────────────────┘
```

**Streaming:**
```
...─╱▔╲──╱▔╲───╱▔╲──╱▔╲──●⚬   ← pulsing halo
```

**Export menu (opt-in, next to the range selector):**
```
       [1W] 1M [3M] 1Y  ALL    [⇩ Export ▾]
                                  ├─ Download PNG
                                  └─ Download CSV
```

## Success criteria

- A dev using three random library components plus the Graph can't tell which requires "special" props — the vocabulary matches across the board.
- Switching a series from `line` to `smooth` changes only the curve.
- A consumer with two different-unit series (revenue $, visitor count) can render them legibly on one chart via dual axes.
- Bar mode with 5–7 buckets looks intentional, not stretched.
- A user can drag a custom range and have it reflected either in-chart or via callback, without the Graph imposing which.
- Hovering any legend item makes the "this vs the others" story instantly readable.
- Two charts in a shared sync group feel like one instrument.
- A revenue chart with green on-target / red below-target bands and a dashed goal threshold ships in under a dozen lines of config.
- Streaming at ~1 point/sec produces motion that reads as alive, not jittery.
- Forecast ribbons reinforce the right-edge fade — together they read as "this part is predicted."
- PNG exports match the rendered theme and include all visible layers.
- CSV exports open cleanly in a spreadsheet with recognizable headers.

## Version summary

| Version | Adds |
|---|---|
| **V0** | Library parity — size variants, Tailwind color palette, legend icons, loading/disabled states, proximity hover on legend, consistent focus rings. |
| **V1** | Render types per series (line / smooth / step / area / bar), percent vs absolute Y-axis mode, dual Y-axes, minimal tick labels. |
| **V2** | Brush drag-to-select, clickable data points, legend hover-to-isolate, cross-chart sync via group id. |
| **V3** | Threshold lines, Y-range bands, forecast ribbons, live streaming with trailing halo, PNG/CSV export. |

## Implementation status

| Status | Items |
|---|---|
| ✅ Implemented | Size variants (sm/md/lg), Tailwind color palette, legend icons, loading state, disabled state, render types (line/smooth/step/area/bar), monotone-safe smooth (no overshoot) with duplicate-x dedupe, percent vs absolute Y-mode (with min-line baseline fallback), dual Y-axes, minimal Y-tick labels, opt-in X-axis ticks (`showXTicks`), per-series clickable data points, legend hover-to-isolate, proximity-hover legend pill, threshold lines, Y-range bands, brush drag-to-select (callback + in-place zoom, Custom chip, Esc/double-click clear), cross-chart hover sync (`syncGroup`), forecast ribbons, streaming mode with trailing halo and optional `streamWindow`, PNG/CSV export via ref handle and inline menu, absolute-mode tooltip with raw per-series values. |
| ⏳ Deferred | — |
