# Graph V3 — Overlay series

> Support multiple series layered on the same axes. One primary series gets the full treatment (bold stroke, gradient area, sign-aware color); overlay series render as thinner, desaturated reference lines without area fill. Legend row grows to show all three.

## Scope

**In:** N series on shared x/y axes, a designated primary series with area fill, overlay series as thin reference strokes, shared y-scale normalized to percentage change from each series' own start, multi-item legend.

**Out:** toggling series on/off, range controls, per-series tooltips in a stacked card.

## Feature description

### Primary vs overlay series
- Exactly one series is marked primary. It renders with:
  - Bold stroke weight
  - Gradient area fill
  - Sign-aware color (green up, red down)
  - The hover dot + tooltip attaches to this series' values
- All other series render as overlays:
  - Thinner stroke weight
  - No area fill
  - Desaturated neutral tones (graphite and light gray by default, one shade per overlay)
  - Not interactive — the scrub dot does not snap to them

### Shared y-scale via percent normalization
- To put series of wildly different magnitudes (portfolio $, SPY index, BTC price) on one chart, every series is plotted as **% change from its own first point**, not raw value.
- The baseline dotted line at 0% sits at every series' starting position, so they all launch from the same horizontal.
- Y-axis extent uses the combined min/max across all series' normalized values, with a small headroom pad.

### Layering
- Back to front: grid dots → baseline → overlay series (in the order given) → primary area fill → primary line → hover dot + tooltip.
- Overlays darker → lighter if two or more, so the darker overlay reads as "more prominent reference."

### Legend row (multi-item)
- Legend becomes a horizontal row of items, each showing `▲ 0.10% Label`.
- Items are spaced evenly (flex layout). On narrow widths they wrap or shrink gracefully.
- Primary item's triangle + number flip color with sign; overlay items use their own line's color for the triangle, muted text for the number.
- Order in the legend mirrors draw order (primary first, then overlays as given).

### Right-edge fade (optional per series)
- A series can opt into a right-edge fade where the stroke and area fade to transparent over the last N% of the x-range. Useful when the tail represents projected or stale data.
- When enabled, the fade applies only to the primary's area fill and line, not to overlays.

## Edge cases

| Case | Behavior |
|---|---|
| Series have different lengths | Each series renders over its own x-range; missing tails simply end early. |
| Series start at different x-positions | Each normalizes from its own first point; x-axis is union of all ranges. |
| One overlay is empty | It's omitted from both the chart and the legend. |
| Only a primary given | Behaves exactly like V2 (single series with legend). |
| All series flat | Every legend triangle hides, each reads `0.00%` in muted tone. |
| More than ~5 series | No hard cap, but the component doesn't invent colors — consumer provides overlay tones or gets repeated defaults. |

## UI description

```
┌─────────────────────────────────────────┐
│ · · · · · · · · · · · · · · ╱╲· · · · · │
│ · · · · · · · · · · ·╱╲ ╱╲╱╱  ● · · · · │  primary (bold, green)
│ · · · · · · · · · · ╱  ╲╱    ╲· · · · · │
│ · ·▁▁▁▁▁▁▁▁▁▁▁▁·╱╲╱▁▁▁▁▁▁▁▁▁▁▁▁· · · · ·│  overlay A (graphite)
│···▁▁▁▁▁▁▁▁▁▁▁▁╱·╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌·│  overlay B (light gray)
│ · · · · · · ╱░░░░░░░░░░░░░░░░░░· · · · ·│  primary area (gradient)
│ · · · ·╱╲╱░░░░░░░░░░░░░░░░░░░░░░░░· · · │
└─────────────────────────────────────────┘
  ▲ 2.92% You    ▲ 0.10% SPY    ▲ 0.27% BTC
```

## What's NOT included

- Clicking a legend item to toggle that overlay (V5)
- Multi-row tooltip listing all three values at the scrub position (V5)
- Time range selector (V4)
- Stacked-card tooltip

## Success criteria

- A portfolio-vs-benchmarks chart (the reference image) is producible with one component and a small config.
- Reading left to right, primary series dominates visually; overlays support without competing.
- All three triangles and percentages fit on desktop, wrap sensibly on mobile.
- Series with wildly different raw magnitudes still sit correctly on shared axes.
