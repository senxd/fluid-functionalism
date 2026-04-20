# Graph V1 — Dotted grid, area fill, hover dot

> Upgrade the bare line into something that reads as a finished chart: dotted-point background grid, gradient area fill under the line, and a springy hover dot that tracks the pointer.

## Scope

**In:** dotted grid background, area fill with vertical gradient, hover dot that follows pointer x-position and snaps to the nearest data point.

**Out:** legend, tooltips with labels, multi-series, range controls, baselines, accessibility semantics beyond basic role.

## Feature description

### Dotted grid
- Background fills the graph area with a uniform grid of small dots (low-contrast muted color).
- Dot spacing stays visually consistent across widths: the grid picks a dot count that keeps density even, not a fixed count of columns.
- Dots sit behind the line and area fill.

### Area fill
- Below the line, fill with the series color at low opacity.
- Vertical linear gradient: strongest opacity at the top (near the line), fading toward the bottom edge.
- Fill terminates cleanly at the graph's baseline edge.

### Hover dot
- Pointer enters the graph → a colored dot (same hue as the line) fades in at the nearest data point.
- Dot follows the pointer x, snapping to nearest data x. Movement uses a spring so fast flicks feel elastic, not jittery.
- On leave, dot fades out.
- Touch devices: dot appears on touch-down, follows drag, disappears on touch-up.

## Edge cases

| Case | Behavior |
|---|---|
| Pointer outside graph bounds | Dot hidden. |
| Very narrow width (<120px) | Grid becomes sparser automatically; dot still works. |
| Rapid resize during hover | Dot re-snaps to the correct data point on next frame. |
| Touch + mouse on hybrid device | Last input wins. |

## UI description

```
┌─────────────────────────────────┐
│ · · · · · · · · · · ╱╲· · · · · │
│ · · · · · · · · ╱╲╱╱ ● · · · · ·│  ← hover dot
│ · · ░░░░░╱╲╱╱░░░░░░░░░░░░· · · ·│
│ · ░░░░░╱░░░░░░░░░░░░░░░░░░░░· · │  ← gradient area
│ ·░░░╱░░░░░░░░░░░░░░░░░░░░░░░░· ·│
└─────────────────────────────────┘
```

## What's NOT included

- Legend
- Labeled tooltip (the dot has no value readout yet)
- Multi-series
- Range selector / time windows
- Dotted baseline reference
- Direction indicators

## Success criteria

- Graph reads as "finished" at a glance, not a wireframe.
- Hover dot motion feels spring-fluid, never laggy or snappy.
- Grid density looks even across phone, tablet, and wide desktop.
