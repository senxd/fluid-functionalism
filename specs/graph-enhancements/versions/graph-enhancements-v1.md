# Graph Enhancements V1 — Alternate rendering modes

> Unlock the Graph for data shapes beyond "percent change over time." Add smooth curves, step lines, area-only and bar rendering, an absolute-value axis mode, and dual Y-axes.

## Scope

**In:** per-series render type (line / area / step / smooth / bar), chart-wide Y-axis mode (percent-normalized vs absolute), dual Y-axes, minimal axis tick labels for absolute mode.

**Out:** new interactions, annotations beyond what exists, live data, forecasting.

## Feature description

### Per-series render type
Each series opts into one of:

| Type | Description |
|---|---|
| `line` | Current behavior — straight segments between points. |
| `smooth` | Monotone cubic interpolation; no overshoot past data values. |
| `step` | Right-stepped line (value holds until the next point). Good for state changes. |
| `area` | No stroke; gradient fill only. Stacks visually under other series. |
| `bar` | Vertical bars. Only valid when the x-domain is discrete/categorical. |

The primary series still gets sign-aware color; area fills still drop out in `step` or `bar` as appropriate. Mixing types is allowed — e.g. primary `line`, overlay `step`.

### Y-axis mode
Chart-wide switch:

- **`percent`** (default, current behavior): every series is `(v - first) / first`, sharing a 0%-based scale.
- **`absolute`**: raw Y values. Series share one scale by default.

In absolute mode, the baseline becomes a subtle grid line at 0 (or the data's min if 0 isn't in range) rather than "start value." The legend replaces the `% change` with the series' latest raw value, formatted by the consumer.

### Dual Y-axis
For absolute mode only: a series can declare `axis: "right"`. The right axis takes over scaling for those series. One series per axis is enough to pin its scale; the chart pads each axis independently.

When dual axes are active:
- Left axis ticks align to the left edge; right axis ticks to the right edge.
- Ticks are *minimal* — 3 to 5 labels, aligned with gridlines that span the chart (replacing the baseline for this mode).
- The hover tooltip shows each series' raw value with the appropriate axis implied.

### Tick labels
In absolute mode (single or dual axis), ticks render as small muted labels. Type size follows the size variant from V0. Labels use the consumer's `formatValue` for the appropriate axis. X-axis ticks remain optional (add 2–4 x-labels near the bottom if `showXTicks` is true; keep off by default to preserve the minimal aesthetic).

### Bar mode specifics
- Bars share width inside each x-bucket; multiple bar series automatically dodge side-by-side.
- Hovering highlights the entire bucket (vertical guideline still draws), tooltip lists each bar value.
- Positive and negative bars render above/below the 0-axis in absolute mode, with sign-aware color applied per bar when it's the primary series.

## Edge cases

| Case | Behavior |
|---|---|
| Bar mode with continuous x data | Bars are evenly spaced using array index; original x values still label ticks. |
| Step line on the last point | Segment renders horizontally to the last point's x then stops (no phantom extension). |
| Smooth curve with duplicate x | Duplicates are collapsed to the latest y; curve does not loop back. |
| Dual axis with only `right` series | Left axis hides entirely; right axis behaves like a single-axis absolute chart. |
| Dual axis + percent mode | `axis: "right"` is ignored in percent mode — it's a single shared scale by design. |
| Mixing `bar` and `line` | Bars render in a back layer; lines draw on top. |
| Area series with no primary-style fill | Uses the series color at a reduced alpha; no sign flipping. |

## UI description

**Absolute mode with dual Y-axis:**
```
 $1.2M  ┤                             ● $93K            ┤ 520
        │         ╱╲                                    │
 $800K  ┤      ╱╱   ╲───                                ┤ 500
        │   ╱╱          ─────                           │
 $400K  ┤╱───                  ╲─────                   ┤ 480
        └─────────────────────────────────────────────┴
         Jan    Feb    Mar    Apr    May    Jun
     ▲ $93K Revenue (L)     ▲ 510 Visitors (R)
```

**Bar mode (categorical):**
```
┌─────────────────────────────────┐
│      ▇▇                         │
│      ▇▇         ▇▇              │
│ ▇▇   ▇▇   ▇▇   ▇▇   ▇▇          │
│ ▇▇   ▇▇   ▇▇   ▇▇   ▇▇   ▇▇     │
└─────────────────────────────────┘
  Mon  Tue  Wed  Thu  Fri  Sat
```

**Step overlay:**
```
         ─────┐            ┌──────
              │            │
         ─────┘      ┌─────┘
                     │
```

## What's NOT included

- Brush-to-select, cross-chart sync, per-point click handlers — V2
- Zoom / pan — V2
- Threshold lines, bands, forecast ribbons, streaming — V3

## Success criteria

- Switching a series from `line` to `smooth` changes only the curve, nothing else.
- A consumer with two series of different units (revenue $, visitors count) can render them legibly on one chart via dual Y-axes.
- Bar mode with 5–7 categorical buckets looks intentional, not stretched.
- Absolute-mode tick labels are calm and muted — they never compete with the line.
