# Table Enhancements V1 — Sorting + filtering

> Sortable columns with layout-stable arrows, a declarative `columns` prop, per-column filters with `dependsOn` chains, visible filter chips, a global search, and a filter dropdown button for each column.

## Scope

**In:** column definition prop, sortable headers with tri-state arrows (asc → desc → none) that never shift layout, shift-click multi-column sort, global search input, per-column filters (text / set / range / enum), `dependsOn` filter chains, filter chip strip above the table, reset-all button, controlled and uncontrolled state.

**Out:** row selection, cell types (badges, sparklines), column resize/reorder/hide, virtualization, export.

## Feature description

### Declarative columns
The table now accepts a `columns` array alongside `data`. Each column describes: an id, a header label, how to get the value from a row, alignment, formatter, sortability, filter config, optional width. Consumers can still drop in the primitive sub-components for custom cases — `columns` is the preferred path for sortable/filterable tables.

### Sorting

**Interaction**
- Clicking a sortable header cycles `asc → desc → none`.
- Shift-click adds the column to a multi-column sort stack (next sort is secondary). Shift-clicking an existing sort column cycles its direction without collapsing the stack.
- Clicking a non-sortable column does nothing.

**Indicator — layout-stable arrows**
Every sortable header reserves a fixed-width slot (e.g. 10px) for the direction arrow so the text never shifts between sort states. The slot always renders three subtle dots (▵ ▿ stacked faintly) at rest; the active direction brightens while the other dims to near-transparent. Same principle as `tabular-nums` for digits — glyphs occupy the same box regardless of state.

Multi-sort: a small rank number (1, 2, 3…) appears next to the arrow on non-primary sort columns. The rank also occupies a fixed slot, so layout stays stable.

**Sort types**
Columns declare a sort type to control comparator behavior: `number` (default for numeric-aligned cells), `text` (locale-aware), `date`, `custom` (consumer comparator). Null / undefined values sort last regardless of direction.

### Global search
An optional `<Table.Search>` component (or a `search` prop on the root) renders a single input above the table. It filters rows by matching any column marked `searchable: true` (default: all text columns). The search is debounced and announces result count to screen readers.

### Per-column filters

Column filters declare a `filter` config. Supported kinds:

| Kind | Behavior |
|---|---|
| `text` | Contains-match on the cell's string value. Case-insensitive. |
| `set` | Multi-select from the distinct values in the column. Alpha-sorted with count next to each option. |
| `range` | Min + max numeric inputs (or a slider). |
| `enum` | Explicit option list provided by the consumer. Supports icons per option. |

Each column gets a filter affordance in the header — a small filter icon button that opens a popover. The popover renders the appropriate control. Active filters highlight the icon (filled state + primary color).

### Filter chips strip

A horizontal strip directly above the table (or inside a dedicated slot) shows one chip per active filter. Chips display the column label + summary of the active constraint (e.g. `Sector: Tech, Energy`, `Price: 10–50`, `Name: ~ "apple"`). Each chip has a dismiss button. A trailing "Clear all" button resets every filter at once.

Chips also act as entry points: clicking a chip re-opens its column's filter popover. Removing a chip removes that filter and re-evaluates the table.

### `dependsOn` — chained filters

A column's filter config may declare `dependsOn: ["otherColumnId"]`. Effect:
- Option lists for `set` and `enum` filters are derived only from rows that pass the upstream (depended-on) filters.
- If an upstream filter changes and invalidates a selected option downstream, the stale selection is silently dropped and the chip updates.
- `dependsOn` is a DAG; multiple upstreams are allowed. Cycles are ignored with a console warning (no throw).

Example: a "Sector" filter upstream restricts which "Industry" options are offered downstream. Picking "Financials" reduces the industry set to Banks / Insurance / Asset Mgmt / etc.

### State model

The table works uncontrolled by default — internal state for sort, filters, and search. Consumers can flip to controlled by passing `sort`, `filters`, `search` plus matching change callbacks, for server-side pipelines.

A `defaultSort` / `defaultFilters` pair lets consumers ship initial state without taking on full control.

### Reset + persistence hooks

- A `<Table.ResetAll>` slot-ready button calls the consumer's reset (or, if uncontrolled, clears internal state).
- Consumers can snapshot / restore state via a `getState()` ref handle. Actual persistence (URL params, local storage) is out of scope — this spec only exposes the hook.

## Edge cases

| Case | Behavior |
|---|---|
| Shift-click on already-primary column | Cycles its direction; stack unchanged. |
| Set-filter option count becomes 0 after upstream change | Option list shows "No matches"; filter self-clears. |
| Range filter min > max | Swapped on apply; never throws. |
| Global search + column filter both active | Intersection (AND) across all filters. |
| Column marked filterable but no data | Filter icon disabled with tooltip "No values". |
| Sort on a column that then gets hidden (future V3) | Sort remains valid; shown in hidden columns menu badge. |
| `dependsOn` cycle | Cycle detected; affected columns fall back to full option lists + console warning once. |
| Null values during sort | Always sorted last regardless of direction. |
| Sort stability | Equal values preserve original order (stable). |

## UI description

**Header row with sort + filter affordances:**
```
┌───────────────┬───────────────┬──────────────┬─────────────┐
│ Name     ⌄  ⏷ │ Sector   ⌄  ⏷ │ Price  ▾  ⏷  │ Mkt Cap ▴₁⏷ │
├───────────────┼───────────────┼──────────────┼─────────────┤
 └ header text  │ sort arrows   │ filter btn   │ multi-rank
```
(⌄ = subtle dual-arrow placeholder; ▾/▴ = active direction; ⏷ = filter popover button; ₁ = multi-sort rank.)

**Filter chip strip (above table):**
```
[Sector: Tech, Energy ×]  [Price: 10–50 ×]  [Name: ~ "apple" ×]   Clear all
```

**Set-filter popover with dependsOn:**
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

## What's NOT included

- Row selection (V2)
- Rich cell types — badges, sparklines, heatmap (V2)
- Row expand / detail (V2)
- Column resize / reorder / pin / hide (V3)
- Virtualization (V3)
- Export (V3)

## Success criteria

- Clicking any sortable header changes order with no horizontal jitter.
- A two-step filter chain (Sector → Industry) works out of the box: picking a sector narrows the industry options the consumer sees.
- Every active filter is visible as a chip; users can see the full filter state at a glance without opening any menu.
- Copy-pasting a table's `columns` config into a docs example looks declarative, not procedural.
