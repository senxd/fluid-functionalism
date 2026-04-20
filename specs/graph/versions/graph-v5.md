# Graph V5 — Interactive legend, annotations, keyboard nav, a11y

> Final form. The legend becomes interactive (click or tap to toggle a series with animated reflow), event markers anchor to x-positions, keyboard users can scrub the line with arrow keys, and screen readers get a meaningful summary.

## Scope

**In:** series toggling via legend, event annotations with hover popovers, keyboard scrubbing, focus ring on graph, screen-reader summary and data table fallback, reduced-motion respect, theme-aware color palette.

**Out:** brush-to-zoom, real-time streaming (an adjacent concern, not part of this spec).

## Feature description

### Interactive legend
- Each legend item is a button.
- Click / tap / Enter / Space toggles its series.
- Hidden series: its line fades + area fill collapses (height springs to baseline), its legend item dims to ~40% opacity, its % turns muted.
- Re-showing reverses the animation.
- Y-scale recomputes based on only-visible series, and all remaining lines spring to the new scale. Baseline moves with them.
- At least one series must remain visible; if the user tries to hide the last one, the toggle bounces (brief shake, no state change).

### Event annotations
- Consumer can pass an `annotations` array: `[{ x, label, kind? }, ...]`.
- Each annotation renders as a thin vertical rule at its x-position, with a small dot on the primary series line where it intersects.
- Hover or focus on the dot opens a compact popover (reuses library `Tooltip` physics) with the label.
- Annotations dim when their x is outside the active range; they don't disappear, so scrubbing the range reveals them.
- Kinds (`neutral`, `positive`, `negative`, `info`) drive marker color using theme tokens.

### Keyboard scrubbing
- The graph container is focusable (tab stop, visible focus ring).
- Left/Right arrows move the hover dot by one data point. Shift+Arrow moves by ~5%. Home / End jump to extents.
- Up/Down arrows cycle through annotations if any exist.
- Escape clears the scrub dot and returns focus to the container.

### Screen-reader support
- Graph has a role and an accessible name (from a `title` prop or auto-generated: "Line graph of You vs SPY, BTC").
- A visually hidden summary sentence describes the primary: start value, end value, direction, % change.
- A visually hidden data table mirrors the series (collapsed behind a "View data" expander that sighted users can also open). Table is the source of truth for a11y.
- Annotations are listed after the summary: "3 events: earnings report Apr 12, …"

### Reduced motion
- `prefers-reduced-motion` respected throughout:
  - Enter animation replaces the draw-on with a simple fade.
  - Range morph becomes an instant swap with a short cross-fade.
  - Spring dots use critically damped (no overshoot) or become CSS transitions.
- Interaction still works, but motion is dialed down.

### Theme-aware palette
- Series colors pull from the theme's tokens (primary, destructive, muted variations for overlays).
- Consumer may override per-series with a palette prop. Colors are never hex-hardcoded inside the component.
- Dark mode: gradient area fill uses a higher-opacity bottom stop to stay visible against the dark background; baseline and grid dots shift to a lighter-gray token.

## Edge cases

| Case | Behavior |
|---|---|
| User hides all but primary | Works; overlay legend items dim. |
| Primary hidden | Not allowed. Attempt bounces; focus stays on primary legend item. |
| Annotation at same x as another | Rules stack slightly offset; popovers open side-by-side. |
| Annotation outside current range | Dimmed marker visible on the edge gutter; hover still works. |
| Keyboard scrubbing past the last point | Stops at the extent, no wrap. |
| Screen reader without JS | Static data table renders server-side as fallback. |
| Very long series label in legend | Truncates with ellipsis; full text appears in the toggle tooltip. |

## UI description

```
                                 [1D] 1W  1M  3M  1Y  ALL
┌─────────────────────────────────────────┐
│ · · · · · · ┆ · · · · · · · · · · · · · │
│ · · · · · · ┆ · · · · · · ╱╲· · · · · · │
│ · · · · · · ● earnings · ·╱ ╲· · · · · ·│
│ · · · · · · ┆ · · · · ·╱╲╱   ╲· · · · · │
│ · ─ ─ ─ ─ ─ ┆ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  baseline
│ · · · · · ·░┆░░░░░░░░░░░░░░░░· · · · · ·│
│ · · ░░░░░░░░┆░░░░░░░░░░░░░░░░░░░░· · · ·│
└─────────────────────────────────────────┘
  ▲ 2.92% You    ▲ 0.10% SPY    ▽ 0.27% BTC (hidden, dim)

  Focus ring on container │ arrow-keys scrub │ space toggles
```

## What's NOT included

- Brush/drag to create a custom range window
- Real-time streaming (appending data with a trailing animation)
- Small-multiples grid

## Success criteria

- A sighted user can explore the chart entirely without touching a pointer.
- A screen-reader user gets the same top-line story (start, end, direction, %) without parsing pixel values.
- Toggling SPY off visibly re-fits the remaining lines; toggling it back on restores smoothly.
- Reduced-motion users get a fully functional chart that doesn't feel broken.
- Dark mode looks as intentional as light mode — not an afterthought tint.
