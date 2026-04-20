# Graph V2 — Legend, baseline, direction indicators

> Turn the chart into a readable summary. Dotted horizontal baseline marks the starting value, a legend below the graph shows the current % change with a directional triangle, and the hover dot now carries a labeled value tooltip.

## Scope

**In:** dotted horizontal baseline at the series' start value, legend row below the chart with triangle + % + label, hover tooltip on the scrub dot, sign-based coloring for gains vs losses.

**Out:** multiple series, range selector, series toggling.

## Feature description

### Baseline
- A dotted horizontal line crosses the graph at the y-value of the first data point.
- Same muted tone as the grid dots but denser (reads as a line, not a row of dots).
- Line extends edge to edge.

### Legend
- A single row sits below the graph: `▲ 2.92% Label`.
- Triangle points up when the latest value is above baseline, down when below.
- Percent is `(latest - start) / start`, formatted with two decimals and a sign-aware color (green for positive, red for negative — tokens from the theme, not hardcoded).
- Label is a free-form string ("You", "Revenue", etc.) passed by the consumer.
- Triangle + percent share the same color as the line.

### Tooltip on hover dot
- When the scrub dot is visible, a compact card floats just above it.
- Card shows: formatted value on top, formatted x-position (usually a date) below in muted text.
- Card follows the dot with the same spring as the dot itself.
- On narrow screens, the card stays clamped inside the graph's horizontal bounds.

### Sign-aware coloring
- Positive trend: primary color (green token).
- Negative trend: destructive color (red token).
- The line, area fill, and legend triangle all flip together based on net direction (latest vs start).

## Edge cases

| Case | Behavior |
|---|---|
| Exactly flat (latest == start) | Triangle hidden, legend shows `0.00%` in neutral muted color. |
| Baseline equals min or max of series | Baseline still renders; line just hugs one side of it. |
| Tooltip near right edge | Card anchors to the left of the dot instead of center. |
| Tooltip near top edge | Card flips below the dot. |
| Value formatter not provided | Falls back to locale-aware number with up to two decimals. |

## UI description

```
┌─────────────────────────────────┐
│ · · · · · · · · · · · · · · · · │
│ · · · · · · · · · ╱╲·╱╲· · · · ·│
│ · · · · · · · ╱╲╱╱ ╲╱ ● · · · · │
│···············╱·····╌╌╌╌╌╌╌╌╌╌╌·│  ← baseline
│ · · · · ░░╱╲╱░░░░░░░░░░░░· · · ·│
│ · · ░░╱░░░░░░░░░░░░░░░░░░░░░· · │
└─────────────────────────────────┘
  ▲ 2.92% You
```

## What's NOT included

- Multi-series overlays (V3)
- Time range selector (V4)
- Clickable legend to toggle visibility (V5)
- Annotations

## Success criteria

- At a glance, a reader can tell: where we started (baseline), where we are (dot + tooltip), how far we moved (legend %).
- Trend direction is legible without reading numbers — the triangle + color carry the signal.
- Tooltip never clips outside the graph bounds.
