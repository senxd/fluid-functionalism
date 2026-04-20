# Graph

> A refined line graph component for Fluid Functionalism. Renders one primary series with area fill and optional overlay reference series on shared percent-normalized axes. Supports hover scrubbing, range selection, interactive legend, event annotations, sparkline mode, and full keyboard + screen-reader access.

## Goal

> Give the library a chart component that reads as a finished, at-a-glance story — where we started, where we are, how far we've moved, and how that compares to reference series — with motion that makes state changes legible rather than decorative.

## Scope

**In:**
- Single-series line with gradient area fill on a dotted-point background grid
- Dotted horizontal baseline at the primary's starting value
- Legend with directional triangle, signed % change, and series label
- Overlay series (thin reference lines without area, desaturated tones)
- Percent-change normalization so series with different magnitudes share one y-axis
- Hover / touch scrub dot with spring tracking, multi-row tooltip
- Configurable range selector (1D/1W/1M/3M/1Y/ALL) with morph between windows
- Sparkline mode for dense inline use
- Interactive legend (click/tap/keyboard to toggle overlays)
- Event annotations with popovers
- Keyboard scrubbing, focus ring, screen-reader summary + data table fallback
- Reduced-motion and dark-mode support
- Sign-aware coloring (gain vs loss) using theme tokens
- Optional right-edge fade for projected / stale data

**Out:**
- Brush / drag-to-zoom custom ranges
- Real-time streaming updates
- Small-multiples grid
- Bar, candlestick, or non-line chart types

## Feature description

### Layering (back to front)

1. **Dotted grid.** A uniform grid of low-contrast dots, density adapting to container width so it reads the same on phones and desktops.
2. **Baseline.** A dotted horizontal line across the graph at the primary series' first value (= 0% change). Denser than the grid dots so it reads as a line.
3. **Overlay series.** Thin strokes, no area fill, desaturated grayscale tones. Drawn in the order provided — the first overlay sits visually behind later ones.
4. **Primary area fill.** Vertical gradient from series color at the top to transparent at the bottom, anchored at the baseline.
5. **Primary line.** Bold stroke, sign-aware color (green up / red down, theme tokens).
6. **Annotation rules + dots.** Thin vertical rules at annotated x-positions, with a marker dot where they intersect the primary line.
7. **Hover / scrub dot + tooltip.** Springs to the nearest primary data point, shows value card.

### Percent normalization

Every series plots as **% change from its own first point**, not raw value. This lets a six-figure portfolio, an index around 500, and a crypto price coexist on one set of axes with the baseline at 0% representing *every* series' start. Y-extent uses the combined min/max across visible series with a small headroom pad.

### Primary vs overlay

Exactly one series is the primary. It gets:
- The bold stroke, area fill, and sign-aware color
- The hover dot and tooltip attachment (tooltip shows overlay values at the same x, interpolated)
- The right-edge fade (if enabled)

All other series are overlays:
- Thin stroke, no area fill, muted/grayscale tones
- Non-interactive for the scrub dot (but hoverable for focus in keyboard mode)
- Collapsible via legend toggle

### Legend

A single horizontal row below the chart. Each item is a button: `▲ 2.92% You`.

- Triangle: up for gain, down for loss, hidden if flat. Color matches the line.
- Percent: two decimals, sign-aware color for the primary, muted color for overlays.
- Label: free-form string.
- Click / tap / Enter / Space toggles the series:
  - Toggled-off: line fades, area collapses to baseline, legend item dims to ~40% opacity, percent goes muted.
  - The y-scale recomputes from remaining visible series and all remaining lines spring to fit.
- Primary cannot be hidden; attempt bounces without state change.
- Order mirrors draw order (primary first, overlays in provided order).
- Wrapping is graceful on narrow widths.

### Range selector

A segmented tabs control (styled to match `TabsSubtle` — pill indicator, spring physics). Default options `1D 1W 1M 3M 1Y ALL`, overridable.

On selection: **morph, don't redraw.**
- X-domain springs from old to new extent.
- Each series' path interpolates — points resample so transitions stay smooth.
- Baseline re-anchors to the new starting value.
- Legend percentages tween numerically; triangles rotate if the sign flipped.
- Morphs are interruptible — a rapid flip retargets mid-animation.

Positioning: above the graph (default) or inline with the legend (compact variant).

### Hover / scrub

On pointer enter (or touch-down):
- A dot in the primary's color fades in at the nearest primary data point.
- Dot follows pointer x, snapping to the nearest data point, movement driven by a spring.
- A compact tooltip card floats just above the dot:
  ```
  ┌─────────────────┐
  │  $124,503       │  ← primary value, formatted
  │ ● You    +2.92% │
  │ ● SPY    +0.10% │  ← overlays, interpolated at same x
  │ ● BTC    +0.27% │
  │  Apr 19, 2026   │  ← formatted x
  └─────────────────┘
  ```
- Card stays clamped within the graph horizontally and flips below the dot if near the top edge.
- Rows for overlays with no data at the current x are omitted (no `—`).
- On leave / touch-up: dot and tooltip fade out.
- Rapid resize while hovering: dot re-snaps on next frame.

### Event annotations

Consumer provides `[{ x, label, kind? }, ...]` where `kind` is `neutral | positive | negative | info` (colored via theme tokens). Each annotation:
- Renders a thin vertical rule at its x.
- Places a small marker dot where the rule crosses the primary line.
- Reveals a popover (reusing library `Tooltip` physics) on hover or keyboard focus.
- Dims if its x falls outside the active range but stays visible on the edge gutter.
- If two annotations share an x, rules offset slightly; popovers open side-by-side.

### Sparkline mode

A `compact` variant strips grid, baseline, legend, and range selector. Keeps the line, area fill, hover dot, and sign-aware color. Designed to fit in table cells or dashboard tiles. Default height ~32px, width fills container. Below ~40px wide the hover dot auto-disables.

### Enter animation

On first mount:
- Primary line draws left-to-right with a stroke-dash reveal (~600ms spring).
- Area fill fades in slightly behind the stroke.
- Overlays fade in together after the primary completes.
- Legend items stagger in with a small y-rise.

Respects `prefers-reduced-motion` — reduced users get a plain fade, no draw-on.

### Keyboard + accessibility

- Graph container is focusable with a visible focus ring.
- Arrow Left/Right scrubs the dot one data point at a time; Shift+Arrow jumps ~5%; Home/End jump to extents.
- Arrow Up/Down cycles through annotations when present.
- Escape clears the scrub dot.
- Accessible name comes from a `title` prop or auto-generates ("Line graph of You vs SPY, BTC").
- A visually hidden summary sentence describes the primary's start, end, direction, and % change.
- A visually hidden data table mirrors the series, exposed via a "View data" expander that sighted users can also open. This is the a11y source of truth.
- Annotations listed after the summary.

### Right-edge fade (optional)

When enabled on the primary, the last N% of the x-range fades the stroke and area fill to transparent. Useful for projected or stale tails. Does not apply to overlays.

### Theming

- All colors sourced from theme tokens: primary (gain), destructive (loss), muted variations for overlays.
- Consumer may supply a per-series palette override, but the component never hard-codes hex values.
- Dark mode: area gradient uses a higher-opacity bottom stop to stay visible; baseline and grid dots shift to a lighter-gray token.

## Edge cases

| Case | Behavior |
|---|---|
| Empty data array | Empty SVG frame, no render, no crash. |
| Single data point | Nothing renders. |
| All identical values | Flat line centered vertically; legend reads `0.00%` muted, no triangle. |
| NaN / null points | Skipped silently (no segmented gaps in V0–V2; future versions may render true gaps if requested). |
| Series of different lengths | Each renders over its own x-range; missing tails end early. |
| Series with different start x | Union x-axis; each normalizes from its own first point. |
| Empty overlay | Omitted from chart and legend. |
| Hover x with no overlay data | Overlay row omitted from tooltip. |
| Tooltip near right / top edge | Anchors left of the dot / flips below. |
| Rapid range flips | Each click retargets; no queue. |
| Range change during hover | Dot stays at same relative x fraction during morph, re-snaps at end. |
| Data changes during morph | Morph interrupts, retargets to latest. |
| User tries to hide the primary | Blocked with a subtle bounce; no state change. |
| User hides all overlays | Works; legend items dim but remain clickable. |
| Annotations at same x | Rules offset; popovers open side-by-side. |
| Annotation outside active range | Dimmed edge marker; hover still functional. |
| Keyboard scrub past extent | Stops at the end; no wrap. |
| Very narrow width (< ~120px) | Grid sparsens; sub-40px sparkline disables hover. |
| Value formatter not provided | Locale-aware number with up to two decimals. |
| Reduced-motion preference | Enter uses fade; range swap uses cross-fade; springs critically damped. |
| Screen reader / no JS | Static data table renders as fallback. |
| Server-rendered | Initial frame renders server-side; enter animation runs on hydration. |

## UI description

**Full chart (overlay mode, reference image):**
```
                                 [1D] 1W  1M  3M  1Y  ALL
┌──────────────────────────────────────────────────────┐
│ · · · · · · · · · · · · · · · · · · · ╱▔╲· · · · · · │
│ · · · · · · · · · · · · · · · · ·╱▔╲╱   ╲╱▔●· · · · │  primary (bold green)
│ · · · · · · · · · · · · · · · · ╱               · · ·│
│ · · · · · · · · ·╱▔▔▔▔▔▔▔▔╲╱▔▔▔╲╱                · ·│  overlay A (graphite)
│ · · · ─ ─ ─ ─ ─ ╱─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  baseline
│ · · ─ ╲▁▁▁▁▁▁▁╱─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │  overlay B (light gray)
│ · · · ·╲░░░░░╱░░░░░░░░░░░░░░░░░░░░░░░░░░· · · · · · │
│ · · ╲░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░· · · · ·│  primary area (gradient)
│ · ░░╲░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░· · · │
└──────────────────────────────────────────────────────┘
  ▲ 2.92% You      ▲ 0.10% SPY      ▲ 0.27% BTC
```

**Hover tooltip:**
```
     ┌─────────────────┐
     │  $124,503       │
     │ ● You    +2.92% │
     │ ● SPY    +0.10% │
     │ ● BTC    +0.27% │
     │  Apr 19, 2026   │
     └─────────────────┘
              │
              ●
              │
```

**Sparkline mode:**
```
  ╱╲╱╲╱▔╲╱▔╲╱   ▲ 2.92%
```

**With annotations:**
```
│ · · · · ┆ · · · · · · · · · ┆ · · · · · │
│ · · · · ● earnings · ·╱╲· · ● guidance  │
│ · · · · ┆ · · · · ·╱╲╱  ╲· ·┆· · · · · ·│
```

## Success criteria

- A consumer can reproduce the reference image (You / SPY / BTC) with one component and a series array.
- At a glance, a reader can answer: where did we start, where are we now, how far did we move, and how does that compare to benchmarks.
- Switching ranges, toggling overlays, and resizing all feel continuous — the chart morphs, never flashes.
- Sparkline mode drops into a table cell without any additional styling.
- A keyboard-only user can scrub the full line and navigate annotations.
- A screen-reader user gets the summary story (start, end, direction, %) without parsing pixels.
- Respects `prefers-reduced-motion` without losing function.
- Dark mode looks intentional, not tinted.
- Uses only theme tokens for color; no hex-hardcoded values.

## Version summary

| Version | Adds |
|---|---|
| **V0** | Single line, fit to container, no decoration. |
| **V1** | Dotted grid background, gradient area fill, springy hover dot. |
| **V2** | Dotted baseline, legend with direction triangle + signed %, labeled tooltip, sign-aware coloring. |
| **V3** | Multiple series overlays, percent normalization, thin desaturated overlay lines, multi-item legend, optional right-edge fade. |
| **V4** | Range selector with smooth morph between windows, enter animation, multi-row tooltip, sparkline mode. |
| **V5** | Interactive legend (toggle series), event annotations, keyboard scrubbing, focus ring, screen-reader summary + data table, reduced motion, theme-aware dark mode. |
