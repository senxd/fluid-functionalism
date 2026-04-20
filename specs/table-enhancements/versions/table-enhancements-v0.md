# Table Enhancements V0 — Primitive polish + library parity

> Ship the table conventions the rest of the library already has — size variants, density, loading/empty states, sticky header, alignment — so every Fluid Functionalism component speaks the same language. No sorting or filtering yet.

## Scope

**In:** size variants, density toggle, loading skeleton, empty state, zebra striping (optional), per-cell alignment with numeric defaults, sticky header, keyboard row navigation, a11y polish.

**Out:** sorting, filtering, column definitions as a declarative prop, selection, column resize/reorder, export, virtualization.

## Feature description

### Size variants
Three sizes matching the rest of the library: `sm` / `md` (default) / `lg`. Controls row height, cell padding, and type size together.

| Size | Row height | Cell padding | Type |
|---|---|---|---|
| `sm` | 32 | 6/10px | 12px |
| `md` | 40 | 8/12px | 13px |
| `lg` | 48 | 10/14px | 14px |

### Density toggle
Independently of size, a `density="comfortable" | "compact"` prop tightens vertical padding. Compact reduces the padding to the next step down without changing type size.

### Loading state
A `loading` prop renders a skeleton body: the header stays visible; the body is replaced by N shimmer rows (configurable, default 6). Matches the Graph's loading aesthetic — muted pills per cell with the sweeping shimmer from globals.css.

### Empty state
When `data` is empty (and not loading), a centered column-spanning placeholder row shows: a subtle icon, a short message ("No results"), and optional action/reset slot. Defaults are theme tokens, not hardcoded greys.

### Zebra striping
Opt-in via `striped`. Alternating rows get a faint `bg-muted/40` tint. Proximity hover continues to work over the striping (hover background layers on top).

### Cell alignment + numeric defaults
Per-cell `align="left" | "right" | "center"`. Numeric cells default to `right` + `tabular-nums`. Currency / percent deltas keep sign-aware color (reuse graph's green/red tokens) when the consumer marks a cell as `deltaColor`.

### Sticky header
A `stickyHeader` prop fixes the `<thead>` to the scroll container's top. Header borders animate (shadow fades in) once the body scrolls.

### Keyboard navigation
The table container is focusable. Arrow Up/Down moves a row cursor (visible focus ring at the row level, reusing the `#6B97FF` focus ring). Enter activates the row if `onRowClick` is set. Home/End jump to first/last row.

### A11y polish
- `role="table"` / `role="row"` / `role="cell"` on the existing semantic markup.
- Row cursor reflected as `aria-rowindex`.
- `aria-busy` when loading.
- `aria-live="polite"` announcements for empty/loading transitions.

## Edge cases

| Case | Behavior |
|---|---|
| Size + density both set | Both apply; compact subtracts from the size's default padding. |
| `loading` + data both provided | Skeleton wins until `loading` flips false. |
| Empty state with `striped` | Striping hides; the empty-state row spans all columns. |
| Sticky header inside a scrollable card | Header shadow appears only when content is scrolled past it. |
| Keyboard nav past the last row | Stops; no wrap. |
| Mixed alignment in a numeric column | Explicit `align` wins over numeric default. |

## UI description

**Default (md, comfortable):**
```
┌──────────────┬────────┬────────┬────────┐
│ Name         │  Qty   │  Price │  Total │
├──────────────┼────────┼────────┼────────┤
│ Lorem ipsum  │    12  │   2.50 │  30.00 │
│ Dolor sit    │     8  │   1.25 │  10.00 │
│ Amet consec  │     3  │   9.99 │  29.97 │
└──────────────┴────────┴────────┴────────┘
```

**Loading:**
```
┌──────────────┬────────┬────────┬────────┐
│ Name         │  Qty   │  Price │  Total │
├──────────────┼────────┼────────┼────────┤
│ ░░░░░░░░░░   │ ░░░░░  │ ░░░░░  │ ░░░░░  │
│ ░░░░░░░░░░   │ ░░░░░  │ ░░░░░  │ ░░░░░  │
│ ░░░░░░░░░░   │ ░░░░░  │ ░░░░░  │ ░░░░░  │
└──────────────┴────────┴────────┴────────┘
```

**Empty:**
```
┌──────────────┬────────┬────────┬────────┐
│ Name         │  Qty   │  Price │  Total │
├──────────────┴────────┴────────┴────────┤
│              (◇) No results             │
└─────────────────────────────────────────┘
```

## What's NOT included

- Column sort / filter (V1)
- Filter chips / dropdowns (V1)
- Row selection (V2)
- Column resize / reorder / pin / hide (V3)
- Virtualization, export (V3)

## Success criteria

- A `<Table size="sm" striped stickyHeader>` looks intentional next to a `<Graph size="sm">` — same vocabulary.
- Keyboard users can move through rows without a mouse.
- Loading state reads as a table that's loading, not a blank space.
