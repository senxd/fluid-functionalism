# Table Enhancements

> Take the Table from a proximity-hover primitive to a Seeking-Alpha-class data surface: size variants, density, loading / empty states, declarative columns, sortable headers with layout-stable arrows, per-column filters with `dependsOn` chains and visible chips, global search, rich cell types (sparklines, heatmaps, badges, deltas), row selection + expansion + actions, column show/hide/resize/reorder/pin, grouped headers, virtualization, CSV export, saved views, live-update flashes, and server-side hooks — all while keeping the library's motion-as-information aesthetic.

## Goal

> Make the Table powerful enough for a professional watchlist or screener UI without sacrificing the calm feel of the rest of the library.

## Scope

**In:**
- Library-parity primitives: size variants, density, loading skeleton, empty state, zebra striping, sticky header, keyboard row nav, a11y polish.
- Declarative `columns` prop plus composable primitive sub-components.
- Per-column sort (tri-state) with **layout-stable arrows** — arrow slots reserve fixed width so headers never shift. Multi-column sort via shift-click with fixed-width rank indicator.
- Global search; per-column filters (`text` / `set` / `range` / `enum`).
- `dependsOn` filter chains — e.g. Sector → Industry.
- Visible filter-chip strip with dismiss + Clear all, acting as entry points back into the filter popovers.
- Rich cell types (currency, percent, delta with sign-aware color, compactNumber, date, badge, chip, link, bar, heatmap, sparkline via `<Graph compact>`).
- Row selection with checkbox + select-all + shift-range + select-across-filters banner.
- Row expansion (single or multiple) with accordion physics.
- Footer aggregation row (sum / avg / count / custom).
- Row click + trailing actions column + context menu slot.
- Grouped / section rows with collapsible headers.
- Column show/hide menu; drag resize with double-click auto-fit; drag reorder; pin left/right; grouped (multi-level) headers.
- Row virtualization for large datasets, with sticky header, pinned columns, keyboard scroll-into-view.
- CSV / JSON export + copy to clipboard.
- Saved views (consumer-managed persistence via callbacks + ref handle).
- Live-update cell flash with reduced-motion fallback.
- Server-side sort / filter / paginate hooks (`manualSort`, `manualFilters`, `manualPagination`).
- Full cell-level keyboard navigation.

**Out:**
- Spreadsheet-style cell editing, cross-row formulas.
- Multi-tab table component.
- Collaborative cursors.

## Feature description

### Primitive polish (sizes, density, states)

Three sizes — `sm` / `md` (default) / `lg` — controlling row height, cell padding, type size. Independent `density="comfortable" | "compact"` tightens vertical padding without touching type size.

| Size | Row h | Padding | Type |
|---|---|---|---|
| `sm` | 32 | 6/10px | 12px |
| `md` | 40 | 8/12px | 13px |
| `lg` | 48 | 10/14px | 14px |

`loading` replaces the body with shimmer rows (same aesthetic as the Graph's loading state, sweeping gradient from globals.css). `striped` adds faint alternating row tint with proximity hover layered on top. Empty state is a single centered row with a muted icon + message + optional action slot.

`stickyHeader` pins `<thead>` to the scroll container's top; header gains a subtle shadow when content scrolls beneath it.

Keyboard: the container focuses; Arrow Up/Down moves a visible row cursor; Enter activates `onRowClick`; Home/End jump to extents.

### Declarative columns

Columns accept an array where each entry describes: id, header, value accessor, alignment, cell type / formatter, sort config, filter config, width, whether it's searchable, whether it's pinned, whether it can be hidden. Primitive sub-components (`TableRow`, `TableCell`, …) still exist for full-custom tables, but `columns` is the preferred path for feature-rich usage.

### Sorting — layout-stable arrows

Sortable headers cycle `asc → desc → none` on click. Shift-click appends to a multi-column sort stack; shift-click on an existing sort column cycles its direction without collapsing the stack.

Every sortable header reserves a fixed-width slot for the direction arrow — at rest, two faint chevrons stack (▵ ▿); the active direction brightens while the inactive dims to near-transparent. Same principle as `tabular-nums`: the slot occupies the same space regardless of state so **nothing ever shifts** when sort changes. Multi-sort rank (1, 2, 3…) renders in a companion fixed-width slot.

Null / undefined sort last regardless of direction. Stable sort preserves original row order on ties. Sort types: `number` (default for numeric-aligned), `text` (locale-aware), `date`, `custom`.

### Filters

Per-column `filter` config selects a kind:

| Kind | Behavior |
|---|---|
| `text` | Case-insensitive contains. |
| `set` | Multi-select of distinct column values, alpha-sorted with counts. |
| `range` | Min/max (numeric inputs or slider). |
| `enum` | Consumer-provided option list, optional icons. |

A filter icon on each filterable header opens the appropriate popover. Active filters highlight the icon. The chip strip directly above the table renders one dismiss-able chip per active filter (`Sector: Tech, Energy`, `Price: 10–50`, `Name: ~ "apple"`), clicking a chip re-opens its popover, and a trailing "Clear all" resets every filter.

Global search (`<Table.Search>` or `search` prop) filters any column marked `searchable` (defaults to text columns). Debounced; announces result counts to screen readers.

### `dependsOn` filter chains

A column's `filter.dependsOn: ["otherColumnId"]` restricts that column's option list (for `set` / `enum`) to values present in rows that pass the upstream filters. When upstream filters change and invalidate a downstream selection, the stale selection is silently dropped and its chip updates. Multiple upstreams form a DAG; cycles are detected once with a console warning and fall back to full option lists.

### State model

Uncontrolled by default (sort, filters, search, selection are internal). Controllable via paired props + callbacks for server-side pipelines. `defaultSort` / `defaultFilters` seed initial state without taking on full control. `getState()` / `setState(state)` ref handle enables URL-param / localStorage round-trips without the table owning persistence.

### Rich cell types

Predefined types:

| Type | Renders |
|---|---|
| `text` | Plain string. |
| `number` | Locale number, right-aligned, tabular-nums. |
| `currency` | Currency, configurable code + decimals. |
| `percent` | Percent, configurable decimals, optional sign-aware color. |
| `delta` | Signed number + up/down glyph + sign-aware color. |
| `compactNumber` | `1.2M`, `850K`, `3.4B`. |
| `date` | Locale date/time with full-timestamp tooltip. |
| `badge` | Library Badge, color from a mapping. |
| `chip` | Rounded pill (optional dot) for statuses. |
| `link` | Anchor or button; fires `onCellClick`. |
| `bar` | Inline horizontal bar, width proportional to column domain, kind-colored. |
| `heatmap` | Background tint by value; text color auto-flips for contrast. |
| `sparkline` | Inline `<Graph compact>`, per-row data. |

Consumers can always fall back to a custom `cell(row)` render.

### Row selection

Opt in with `selection`. Leading checkbox column appears, header checkbox does select-all (with indeterminate), shift-click selects a range, selected rows gain a subtle tint + brighter border. When filters are active and the user hits select-all, a banner clarifies "25 of 240 selected. Select all 240?". Selection survives sort and filter changes. Controllable via `selectedIds` + `onSelectionChange`; row identity via `getRowId`.

### Row expansion

`expandable: true` on a column or `renderExpanded(row)` on the table. A leading chevron toggles expansion; the expanded row springs open full-width beneath the target with Accordion physics, rendering consumer content. `expandMode="single" | "multiple"`. Keyboard: Right expands, Left collapses. Row cursor is independent of expansion state.

### Footer totals

Per-column `footer: { aggregation: "sum" | "avg" | "count" | "custom", reducer? }`. Footer respects filters (totals what's on screen) but ignores pagination (totals all filtered rows).

### Row click + actions

`onRowClick(row, e)` fires unless the click originates in a checkbox / link / expand / action cell. A trailing actions column (auto-pinned right) holds icon buttons (reuses Button `size="icon" variant="ghost"`). A row-level context menu slot can render a Dropdown for right-click or "•••".

### Grouped / section rows

`groupBy: columnId` (or consumer group function) clusters rows into labeled sections. Section headers show group label + row count and can be collapsed. Sort happens within groups; filters remove empty groups.

### Column show/hide, resize, reorder, pin

- **Hide/show:** "Columns" menu with a checkbox per column; hidden-count badge on the button; fade + width collapse on toggle; remembered position when shown again.
- **Resize:** thin drag handle at each non-pinned header's right edge; widths persist in state; double-click auto-fits to the widest visible cell; springs to target on release.
- **Reorder:** header drag with lift + insertion indicators + settle animation. Blocked across pinned/unpinned boundary.
- **Pin:** header context menu pins left or right; pinned columns stick while body scrolls; subtle shadow on the pin's free edge when content scrolls under it. Checkbox/expand columns auto-pin left; actions auto-pin right.

### Grouped headers (multi-level)

`group: "string"` on columns clusters neighboring leaf columns under a span header. Two levels deep. Sort/filter live on the leaf columns; group headers are labels only.

### Virtualization

`virtualize: true` (or auto above ~200 rows) windows the body. Only visible rows + small buffer mount. Sticky header and pinned columns keep working. Row heights may be fixed or measured. Keyboard navigation scrolls the viewport when the cursor leaves it.

### Export

Toolbar "Export" menu: Download CSV / Download JSON / Copy to clipboard. Respects filters, search, sort, and visible columns by default; `exportAll` overrides to ignore windowing. Column formatters apply to string outputs (`1.2M`, not `1200000`) with a `rawValue` escape hatch.

### Saved views

A view is a named snapshot of: column visibility, widths, order, pins, sort, filters, search, grouping. The table exposes `onViewSave`, `onViewLoad`, a controllable `views` / `activeView` prop, and the shared `getState()` / `setState()` ref handle. Persistence is the consumer's to implement.

### Live-update flash

`flashOnChange: true` on a column — when that column's cell value changes while rendered, a brief green (increase) / red (decrease) / neutral tint pulses over the cell (spring opacity, 150–250ms). Respects `prefers-reduced-motion` (degrades to a quick crossfade). Ideal for live quote feeds.

### Server-side hooks

`manualSort` / `manualFilters` / `manualPagination` defer data ops to the consumer via callbacks. `loading` works in every manual mode. A `manualSort` + local-filter mismatch triggers a console warning with a note to pick one strategy per data op.

### Cell-level keyboard nav

Arrow keys navigate cells within a row (Left/Right) as well as rows (Up/Down). Focus ring moves cell-to-cell. Enter activates link / button cells; Space toggles checkbox cells; Escape bumps focus back to row level. Tab follows reading order. Resize handles accept keyboard input (Alt + Left/Right).

## Edge cases

| Case | Behavior |
|---|---|
| Size + density both set | Both apply; compact subtracts from size's base padding. |
| `loading` + data both provided | Skeleton wins until `loading` flips false. |
| Empty state with `striped` | Striping hides; empty row spans all columns. |
| Sticky header in a scrollable card | Header shadow fades in once content scrolls under it. |
| Keyboard nav past last row | Stops; no wrap. |
| Shift-click on already-primary sort column | Direction cycles; stack unchanged. |
| Set filter option count = 0 after upstream change | "No matches"; filter self-clears. |
| Range filter min > max | Swapped on apply; never throws. |
| Global search + column filters | Intersection (AND) across all. |
| Filterable column with no data | Filter icon disabled with "No values" tooltip. |
| Sort on hidden column | Sort remains valid; shown as a badge in the hidden-columns menu. |
| `dependsOn` cycle | Detected once; affected columns fall back to full lists + console warn. |
| Null values during sort | Always last regardless of direction. |
| Sort stability | Equal values preserve original order. |
| Heatmap cell with null value | Untinted; text muted. |
| Sparkline column with empty data | Blank compact slot; no layout shift. |
| Select-all across filters | Only filtered rows; banner offers to extend selection to all matches. |
| Footer with no data | Aggregation cells show dashes. |
| Grouped rows + sort | Sort within groups. |
| Hide all columns | Blocked — at least one visible. Toggle bounces. |
| Resize below min width | Clamped (default 48px). |
| Reorder across pin boundary | Blocked; insertion indicator shows the barrier. |
| Export with grouped rows | Groups render as a "Group" column in CSV. |
| Virtualize + variable row heights | Measured once per row; remeasured on resize. |
| Live flash during scroll | Still fires; visually dampened by scroll momentum. |
| Server-side sort + local filter | Blocked combination; console warning. |
| View load with missing column | Column skipped; slot event surfaces the mismatch for the consumer. |
| Reduced-motion users | Flashes → quick crossfade; row expand → fade; column resize → instant settle. |

## UI description

**Toolbar, filter chips, layout-stable sort arrows:**
```
┌ [Search…] ┬──────────────────────────────────────────────┐
│ [Sector: Tech, Energy ×]  [Price: 10–50 ×]   Clear all    │
├───────────────────┬────────────────┬───────────┬──────────┤
│ Ticker        ⌄ ⏷ │ Sector    ⌄ ⏷  │ Price ▾ ⏷ │ Cap ▴₁ ⏷ │
├───────────────────┼────────────────┼───────────┼──────────┤
│ AAPL              │ Technology     │  189.12   │  2.98T   │
│ MSFT              │ Technology     │  412.34   │  3.06T   │
└───────────────────┴────────────────┴───────────┴──────────┘
[Columns ⚙ 2] [Views ▾] [Export ⇩]
```

**Set-filter with `dependsOn: ["sector"]`:**
```
 ┌───────────────────────┐
 │ Industry              │
 │ ──────────────────── │
 │ ☑ Banks (24)          │
 │ ☑ Insurance (11)      │
 │ ☐ Asset Mgmt (8)      │
 │ (only Financials-sector rows considered) │
 └───────────────────────┘
```

**Rich cells (sparkline, delta, badge, action cluster):**
```
┌────────┬──────────┬─────────┬──────────┬────────┬────────┐
│ AAPL   │ 🟢Active │ $189.12 │ ▴ +2.14% │ ╱╲╱╲▔╱ │ [⚐][⋯] │
│ TSLA   │ 🟠Watch  │ $241.83 │ ▾ −0.38% │ ╲╱▔╲╱╲ │ [⚐][⋯] │
│ NVDA   │ 🟢Active │ $482.45 │ ▴ +1.42% │ ╱▔╲╱▔▔ │ [⚐][⋯] │
└────────┴──────────┴─────────┴──────────┴────────┴────────┘
```

**Expanded row + footer:**
```
│ AAPL   🟢Active  $189.12  ▴ +2.14%  sparkline  [⋯]  ▼ │
│ ┌────────── Details panel (consumer) ───────────┐      │
│ │ Full chart, key stats, filings, news headlines │      │
│ └───────────────────────────────────────────────┘      │
├───────────────────────────────────────────────────────┤
│ Total  3 items               avg +1.06%              │
```

**Pinned columns + horizontal scroll:**
```
┌────┬───────┐┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┌───────┐
│ ☐ │ AAPL  ││ ... scrolling cells ...│ [⋯]  │
│ ☐ │ TSLA  ││ ...                    │ [⋯]  │
└────┴───────┘┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈└───────┘
  pinned left                         pinned right
```

**Live-update flash (AAPL price tick +):**
```
│ AAPL │ 🟢 │ [$189.14] ← brief green tint fades out │
```

## Success criteria

- A `<Table size="sm" striped stickyHeader>` looks intentional next to a `<Graph size="sm">`.
- Keyboard users can sort, filter, resize, reorder, pin, hide, select, expand, and export without a pointer.
- Clicking any sortable header changes order with zero horizontal jitter.
- A Sector → Industry filter chain works out of the box: picking a sector narrows downstream options.
- Every active filter is visible as a chip; the full filter state reads at a glance.
- A watchlist with 2,000 rows scrolls at 60fps via virtualization.
- A live WebSocket feed pulses green/red cell flashes without stealing focus or shifting layout.
- A ticker-list table with name / status / price / change / sparkline / actions ships without custom cell rendering.
- Copy-pasting a table's `columns` config reads declarative, not procedural.
- A saved view round-trips through URL params and restores exactly: same filters, sort, hidden columns, widths.

## Version summary

| Version | Adds |
|---|---|
| **V0** | Library parity — sizes, density, loading skeleton, empty state, zebra striping, alignment + numeric defaults, sticky header, keyboard row nav, a11y. |
| **V1** | Declarative `columns` + sortable headers with **layout-stable arrows** + multi-column sort + global search + per-column filters + `dependsOn` chains + visible filter chips. |
| **V2** | Rich cell types (currency/percent/delta/badge/chip/link/bar/heatmap/sparkline), row selection, row expansion, footer totals, row click + actions column, grouped rows. |
| **V3** | Column show/hide/resize/reorder/pin, grouped (multi-level) headers, virtualization, CSV/JSON export, saved views, live-update flash, server-side hooks, cell-level keyboard nav. |

## Implementation status

| Status | Items |
|---|---|
| ✅ Implemented | Size variants, density toggle, zebra striping, sticky header, loading skeleton, empty state, numeric right-alignment defaults, declarative `columns` + `data`, tri-state sort, layout-stable sort arrows with fixed-width slots, multi-column sort (shift-click) with rank, global search, per-column filters (`text`/`set`/`range`/`enum`), `dependsOn` filter chains with cycle detection, filter-chip strip (dismiss + reopen + Clear all), `text`/`number`/`currency`/`percent`/`delta`/`compactNumber`/`date`/`badge`/`chip`/`link` cell types, sign-aware `delta`, row selection (select-all, indeterminate), `onRowClick`, right-pinned actions column, controlled + uncontrolled state. |
| ⏳ Deferred | Keyboard row/cell navigation, row expansion, footer totals, grouped/section rows, `bar`/`heatmap`/`sparkline` cell types, column show/hide menu, column resize, column reorder, column pin left/right, grouped (multi-level) headers, virtualization, CSV/JSON export, saved views, live-update cell flash, server-side hooks. |
