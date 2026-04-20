# Graph V4 — Range selector, range morph, sparkline mode

> Give users control over the time window. A segmented range control sits above or alongside the chart; changing it morphs the line smoothly between windows. Also introduce a compact sparkline mode for dense dashboards.

## Scope

**In:** range selector (1D, 1W, 1M, 3M, 1Y, ALL — configurable), spring morph between windows, enter animation on first mount, sparkline layout mode (no axes, no legend, tiny footprint), enriched tooltip showing overlay values alongside primary.

**Out:** custom user-drawn ranges (brush), clicking legend to hide/show series.

## Feature description

### Range selector
- A small segmented tabs control (reuses the library's `TabsSubtle` aesthetic — pill indicator, spring).
- Options are consumer-configurable; defaults: `1D 1W 1M 3M 1Y ALL`.
- Sits either above the graph (default) or inline with the legend (compact variant).
- Selecting a range triggers a morph, not a redraw.

### Range morph
- When the window changes:
  - X-domain springs from old to new extent.
  - Each series' line path interpolates between old and new shapes — points resample so paths stay smooth, no flicker.
  - Baseline re-anchors to the new starting value with a spring.
  - Legend percentages counts-up/counts-down to the new values (numeric tween).
  - Triangles flip with a quick rotate if the sign changed.
- Morph is interruptible: rapid range flips cancel mid-morph and retarget the new window.

### Enter animation
- On first mount, the primary line draws left to right with a stroke-dash reveal (~600ms spring).
- Area fill fades in slightly behind the stroke.
- Overlays fade in as a group, a beat after the primary finishes.
- Legend items stagger in with a small y-rise.

### Enriched tooltip
- The hover tooltip now shows the primary's value on top, with each overlay's value below it in muted tone, each prefixed by a small color dot matching its line.
- Hovering still snaps x to the primary's nearest data point; overlay values are interpolated at that x.
- If an overlay has no data at that x, its row is omitted (not shown as `—`).

### Sparkline mode
- A `compact` prop (or a dedicated sparkline variant) strips:
  - Grid dots
  - Baseline
  - Legend
  - Range selector
- Keeps: line, area fill, hover dot, sign-aware color.
- Designed for inline use in tables and dense dashboards. Default height ~32px, width fills container.

## Edge cases

| Case | Behavior |
|---|---|
| Range has fewer data points than previous | Path resamples to match point count for a clean interpolation. |
| Range change while hover dot is active | Dot stays pinned to the same *relative* x fraction during morph, re-snaps on end. |
| Rapid range flips (spam clicking) | Each click retargets; no queue. |
| Consumer changes data during morph | Morph interrupts and retargets to latest data. |
| Sparkline in a dark cell | Inherits theme tokens, so colors still read. |
| Sparkline narrower than ~40px | Hover dot disables automatically (too cramped). |

## UI description

**Full layout:**
```
                                 [1D] 1W  1M  3M  1Y  ALL
┌─────────────────────────────────────────┐
│ · · · · · · · · · · · · · · · · · · · · │
│     (graph as in V3, morphing)          │
│ · · · · · · · · · · · · · · · · · · · · │
└─────────────────────────────────────────┘
  ▲ 2.92% You    ▲ 0.10% SPY    ▲ 0.27% BTC
```

**Tooltip while hovering:**
```
     ┌─────────────────┐
     │  $124,503       │
     │ ● You    +2.92% │
     │ ● SPY    +0.10% │
     │ ● BTC    +0.27% │
     │  Apr 19, 2026   │
     └─────────────────┘
            ●
           ╱
```

**Sparkline mode:**
```
 ╱╲╱╲╱▔╲╱▔╲╱
```

## What's NOT included

- Brush / drag-to-zoom (out of scope for V5 too — belongs to a "pro" track)
- Clicking legend to toggle visibility (V5)
- Event annotations / markers (V5)
- Keyboard navigation (V5)
- Accessibility semantics beyond visual (V5)

## Success criteria

- Swapping ranges feels like the chart is alive — continuous, not jarring.
- The same component handles both a full portfolio view and a one-line sparkline in a table cell with only a mode flag.
- Tooltip's multi-row readout makes comparing primary vs overlays at a given point effortless.
