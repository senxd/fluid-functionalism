# Graph Enhancements V0 — Library parity pass

> Bring the Graph up to the same consistency bar as every other Fluid Functionalism component. No new chart capabilities — just the conventions the rest of the library already has.

## Scope

**In:** size variants, color palette for series (Tailwind-named hues), optional icons in the legend, loading state, disabled state, proximity-hover polish on the legend row, consistent focus rings.

**Out:** any new chart types, interaction patterns, or data-storytelling features.

## Feature description

### Size variants
Three sizes matching the rest of the library: `sm`, `md` (default), `lg`.

| Size | Chart height (default) | Legend type size | Baseline weight |
|---|---|---|---|
| `sm` | 180 | 12px | thinner |
| `md` | 280 | 13/15px | current |
| `lg` | 360 | 14/17px | current |

An explicit `height` prop still wins over the size default. Sparkline (`compact`) is unchanged — it's its own mode, not a size.

### Series color palette
Consumers can name a series color from the library's Tailwind palette (the same palette Badge uses) instead of passing hex. Primary still overrides with sign-aware red/green; overlays map the name to the theme token's correct light/dark shade.

### Icons in legend
A series can take an optional icon (sourced from the library's icon context, same as Select / TabsSubtle / Button). The icon renders before the direction triangle. Icon stroke and color track the series color and respect hidden/dim states.

### Loading state
A `loading` prop renders a skeleton placeholder:
- Baseline is visible (static).
- In place of the line, a muted shimmer path traces the graph area using the same shimmer treatment as ThinkingIndicator's text.
- Legend items render as shimmer pills (no numbers, no labels).
- Range selector (if configured) renders but is disabled.

### Disabled state
A `disabled` prop:
- Mutes all series to ~40% opacity, desaturates primary to neutral.
- Disables hover scrubbing, keyboard scrubbing, legend toggling, and the range selector.
- Tooltip does not appear on hover.
- Focus ring still draws for keyboard users so the element is discoverable.

### Proximity hover on legend
The legend row gains the same proximity-hover background pill that TabsSubtle and Dropdown use. Hovering between two items lets the pill slide; resting on an item nudges the pill onto it. This mirrors the "proximity as preview" language in the rest of the library.

### Focus ring consistency
All focusable elements (chart container, legend buttons, range selector items) use the library's shared `#6B97FF` focus ring at the shape-context-appropriate radius. The chart container already has this; legend buttons get it here too.

## Edge cases

| Case | Behavior |
|---|---|
| `loading` + data both provided | Skeleton wins until `loading` flips to false; then the enter animation plays. |
| `disabled` while hovering | Tooltip fades out; hover dot fades out. |
| Icon provided for a hidden series | Icon dims with the rest of the item. |
| Color name not in palette | Falls back to the default overlay neutrals; does not throw. |
| Size `sm` with a long legend | Wraps as today; smaller type keeps it compact. |
| Size changes at runtime | Heights and font sizes spring to the new values. |

## UI description

**Size `sm` with icons:**
```
┌──────────────────────────────────┐
│ (shorter chart area, same shape) │
└──────────────────────────────────┘
  📈 ▲ 2.92% You   📊 ▲ 0.10% SPY
```

**Loading:**
```
┌──────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ (shimmer) │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
└──────────────────────────────────┘
  ░░░░░░░░   ░░░░░░░░   ░░░░░░░░
```

**Disabled:** current chart shape, muted palette, no hover cursor, no tooltip.

## What's NOT included

- Alternate chart types (area-only, step, smooth, bar) — V1
- Absolute-value mode or dual axes — V1
- Brush / click handlers / cross-chart sync — V2
- Threshold lines, bands, forecast ribbons, streaming — V3

## Success criteria

- A dev using any three library components and the Graph can't tell which one requires "special" props — same size vocabulary, same color palette, same disabled/loading prop names.
- Every interactive element in the Graph has the same focus ring as the rest of the library.
- Hovering the legend row feels identical to hovering TabsSubtle.
