# Graph Enhancements V2 — Interaction depth

> Let users interact with the data itself. Drag-select a custom range, click data points to drill in, isolate a series by hovering its legend entry, and sync hover state across multiple charts on the same page.

## Scope

**In:** brush/drag-to-select an x-range, click and keyboard-activation handlers on data points, legend hover-to-isolate, cross-chart hover sync via a shared group id.

**Out:** pinch-zoom / two-finger gestures on touch (keep brush as the single interaction), data export, storytelling features (V3).

## Feature description

### Brush — drag to select a range
Dragging horizontally across the chart area draws a translucent selection band. On release:
- The chart either morphs into the selected sub-range (in-place zoom) or fires an `onBrush({ xStart, xEnd })` callback, depending on whether the consumer has opted into controlled mode.
- Double-click (or Escape while dragging) clears the selection and restores the full range.
- The range selector above the chart deselects any active preset and shows a "Custom" chip while a brushed range is active. Clicking any preset restores preset behavior.
- Brush works alongside hover: the user drags from a starting point; the scrub dot hides during drag and reappears after release.
- On touch: long-press-then-drag starts a brush (standard pan/scroll still works without the long-press).

### Clickable data points
Series can opt each point into interactivity. Clicking or pressing Enter/Space while focused on a point:
- Fires `onPointClick({ seriesId, x, y, index })`.
- Produces a brief ring pulse at the clicked point (spring scale + fade) to confirm activation.
- Keyboard: when the chart is focused and a scrub index exists, Enter/Space activates that point.

Only interactive points show a subtle hover affordance (a slightly larger dot outline) when the hover dot passes over them. Non-interactive charts behave as today.

### Legend hover-to-isolate
Hovering a legend item:
- Emphasizes that series (full opacity, line slightly thicker).
- Dims all other series to ~25% opacity.
- On leave, everything springs back to its natural state.
- Clicking still toggles as in the existing behavior; hover is purely visual.
- When a series is already hidden (toggled off), hover does nothing to it.

### Cross-chart sync
Multiple Graph instances can join a sync group by sharing the same group id. Behavior:
- Hovering in one chart mirrors the scrub position in every chart in the group (by matching x-value, not by pixel).
- Each chart shows its own tooltip at its own dot; tooltips don't follow across charts, only the x-position does.
- Brush is *not* synced by default — it's a per-chart selection unless the consumer also opts into brush sync.
- If a chart doesn't have data at the hovered x, its hover dot hides (but the implied x remains highlighted with a dimmed guideline).

## Edge cases

| Case | Behavior |
|---|---|
| Brush drag shorter than ~6px | Treated as a click, not a brush. |
| Brush starts outside data bounds | Clamp to the nearest valid edge. |
| Click on a non-interactive point | No-op; hover dot behaves normally. |
| Rapid clicks on the same point | Pulse restarts each time; callback fires each time. |
| Legend hover while a series is mid-fade-toggle | Isolate effect applies to the current opacity, not the target. |
| Sync group with charts of different sizes | Position matched by x-value, so a zoomed chart just shows its own sub-range's dot. |
| Sync across mobile + desktop side-by-side | Works; input source (pointer vs touch) doesn't matter — only x-values sync. |
| Brush + sync both enabled | Each chart keeps its own brush unless the consumer explicitly opts into brush-sync. |
| User navigates away mid-brush | Pending brush drops; no orphaned state. |

## UI description

**Brushing (mid-drag):**
```
┌──────────────────────────────────────┐
│      ╱╲       ░░░░░░░░░░              │
│     ╱  ╲   ░░░░░░░░░░░░░░             │
│ ╱╲╱    ╲╱░░░░░░░░░░░░░░░░             │
│          ↑            ↑               │
│         start drag   cursor          │
└──────────────────────────────────────┘
   [1W] 1M  3M  ... [Custom ×]
```

**Legend hover-to-isolate (hovering "SPY"):**
```
   ▲ 2.92% You  (dimmed)
   ▲ 0.10% SPY  (focused)
   ▲ 0.27% BTC  (dimmed)
```

**Synced charts:**
```
 Chart A: ─────●─────          Chart B: ──────●────
              │                              │
              └──── same x-value ────────────┘
```

## What's NOT included

- Pinch-zoom on touch — brush is the canonical range-select gesture.
- Data export (CSV / PNG) — V3.
- Threshold lines, bands, forecast, streaming — V3.

## Success criteria

- A user can drag a custom range and have it reflected either in-chart or in an app-level callback without the Graph imposing which.
- Hovering any legend item makes the relationship "this series vs the others" instantly readable.
- Two charts in a dashboard sharing a sync group feel like one instrument — move the mouse in one, watch the other follow.
- Clickable points are discoverable (the outline cue) without cluttering non-interactive charts.
