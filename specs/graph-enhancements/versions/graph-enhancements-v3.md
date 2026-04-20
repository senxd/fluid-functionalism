# Graph Enhancements V3 — Data storytelling

> Turn the Graph from a chart into a narrative surface. Threshold lines, range bands, forecast ribbons, live streaming, and one-click data/image export.

## Scope

**In:** horizontal threshold lines with labels, shaded Y-range bands, confidence/forecast ribbons around a series, live data streaming with trailing animation, export (PNG image and CSV data).

**Out:** annotation authoring UI (drag-to-add annotations in the chart itself), multi-chart dashboards as a component, AI-generated commentary.

## Feature description

### Threshold lines
Consumers can declare horizontal reference lines (e.g. "target: 0%", "goal: $1M", "SLA: 99.9%"). Each threshold:
- Renders a thin horizontal rule across the chart at its Y-value.
- Shows a small label pinned to one end (right by default, left if crowded).
- Uses a neutral tone by default; a `kind` (`positive` / `negative` / `info`) picks a theme-token color.
- Hovering the label brings up a tooltip with the threshold's description.
- Labels avoid collisions with each other — nearby thresholds offset their labels vertically.

### Y-range bands
Shaded horizontal bands between two Y-values to indicate "acceptable" vs "warning" vs "critical" zones. Each band:
- Fills the area between `yStart` and `yEnd` across the full x-range.
- Uses a low-opacity tint from theme tokens (positive/neutral/warning/negative).
- Renders behind the baseline but above the background — it's clearly environmental, not data.
- Combine with thresholds naturally (e.g. a green band below a target threshold).

### Forecast ribbons
A series can carry an optional `forecast` ribbon: an upper and lower bound at each point. The chart:
- Fills between upper and lower with the series color at low opacity (lighter than area fill).
- If the ribbon starts mid-series (past a certain x), fades into existence — this is the "the past is solid, the future is uncertain" effect, pairing well with the existing right-edge fade on the primary.
- Hover tooltip shows the point value plus an "between X and Y" range when inside a ribbon region.

### Streaming / live data
A `streaming` mode enables:
- Appending new points to a series without recomputing the entire chart — existing path extends to the new point with a spring.
- Optional fixed time window (e.g. last 60 points or last 5 minutes): as new points arrive, the oldest points slide off the left edge at the same pace.
- A subtle pulse at the trailing edge of the primary series (a soft radial halo around the last dot) to signal "live."
- Streaming is interruptible: switching to a range preset pauses the pulse and swaps into range-morph behavior; turning streaming back on re-attaches to the tail.

### Export
A small, optional action surfaces:
- **PNG export**: renders the current chart state (including baseline, bands, thresholds, annotations) to an image and triggers a download. Uses the computed theme at the time of export.
- **CSV export**: writes visible series as columns, one row per x-value.
- Exports are triggerable programmatically (`graphRef.exportPng() / exportCsv()`) and optionally surfaced via a dropdown menu beside the range selector when consumers opt in.

## Edge cases

| Case | Behavior |
|---|---|
| Threshold below current y-min | Chart auto-extends y-range to include the threshold (with a small pad). Consumer can opt out to keep the original bounds. |
| Two thresholds at nearly the same y | Labels stack vertically with a 2px nudge; lines still render separately. |
| Range band outside current y-range | Band clips to the chart's current y-extent (invisible band, no layout glitch). |
| Forecast ribbon at a point where the main series is hidden | Ribbon also hides (they track the same series). |
| Streaming with no data | Chart renders empty with a subtle "awaiting data" affordance (no error). |
| Streaming buffer overflow | Oldest points drop silently; internal buffer caps at a sensible default. |
| PNG export on a compact/sparkline chart | Exports just the sparkline at its current size. |
| CSV export with dual axes | Columns note axis in a header (e.g. `Revenue (L)`). |
| Export during a range morph | Exports the current frame, no retry. |

## UI description

**With bands, thresholds, and forecast:**
```
┌───────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░ warn zone ░░░░░░░░░░░░░░░░ ── │ target: $1.0M
│                                               │
│                                 ░╱▔╲░░░       │
│        ╱▔▔╲   ╱▔▔╲ ╱▔▔╲  ░░░░░▁▁▁░░╲░░        │  forecast ribbon
│   ╱▔▔╲╱    ╲╱╱    ╲╱    ╲╱    ↑    ╲          │
│░░░░░░░░░░░░ ok zone ░░░░░░░░░░ ───────────────│ baseline: $0
└───────────────────────────────────────────────┘
  ▲ 2.92% Revenue
```

**Streaming (trailing pulse):**
```
...─╱▔╲──╱▔╲───╱▔╲──╱▔╲──●⚬
                         ↑ pulsing halo
```

**Export menu (opt-in, appears next to the range selector):**
```
       [1W] 1M [3M] 1Y  ALL    [⇩ Export ▾]
                                  ├─ Download PNG
                                  └─ Download CSV
```

## What's NOT included

- In-chart annotation *authoring* (drag to add a note) — stays a consumer concern.
- Chart-to-chart dashboards as a single component.
- Automated narrative generation.

## Success criteria

- A consumer can render a revenue chart with green "on-target" and red "below-target" bands plus a dashed goal threshold in under a dozen lines of config.
- Streaming a metric at ~1 point/sec produces a line that feels alive, not jittery.
- Forecast ribbons reinforce the right-edge fade visually — together they read as "this part is predicted."
- PNG exports include all visual elements currently on screen (thresholds, bands, annotations) at the correct theme.
- CSV exports open cleanly in a spreadsheet with recognizable column names.
