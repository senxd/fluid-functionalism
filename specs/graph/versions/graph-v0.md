# Graph V0 — Just a line

> Render a single series of numeric data as a smooth SVG line inside a responsive container. Nothing else.

## Scope

**In:** accept an array of numeric values, render as a single line path scaled to fit the container width/height.

**Out:** legend, axes, tooltips, interactions, multiple series, theming variants, animation.

## Feature description

- Consumer passes a series of points (numbers, or `{x, y}` pairs).
- The component fits the line to the available width/height, with a small inner padding so the stroke doesn't clip.
- Stroke is the theme's primary color. Fixed stroke width. No fills, no markers.
- Container is responsive: if the parent resizes, the line rescales. No animation — just redraw.
- If fewer than two points are given, nothing renders.

## Edge cases

| Case | Behavior |
|---|---|
| Empty array | Render nothing (empty SVG frame). |
| Single point | Render nothing. |
| All identical y-values | Draw a flat horizontal line centered vertically. |
| NaN / null in data | Skip silently (no segmented gaps yet). |
| Extreme values (very large range) | Scale clamps to min/max of the array. |

## UI description

```
┌─────────────────────────────────┐
│                       ╱╲╱       │
│                  ╱╲╱╱           │
│        ╱╲  ╱╲╱╱                 │
│   ╱╲╱╱  ╲╱                      │
└─────────────────────────────────┘
```

Single stroke, no decoration, no chrome.

## What's NOT included

- Grid dots
- Area fill under line
- Hover, scrub, tooltips
- Legend or labels
- Multi-series overlays
- Range controls, animation, axes, baseline

## Success criteria

- Drop-in with a data array produces a visible line.
- Resizing the parent rescales without glitching.
- Zero-config: no required props beyond data.
