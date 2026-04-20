# Table Enhancements V2 — Rich cells + row interactions

> Cells stop being plain text. Add formatted numeric cells, sign-aware deltas, badges, status chips, inline sparklines (via Graph `compact`), inline bars, heatmap cells, row selection, row expansion, footer totals, and row-level actions.

## Scope

**In:** cell formatters and components (currency, percent, delta, compact number, bar, heatmap, badge/chip, link, sparkline), row selection with a checkbox column + select-all, row expansion for detail content, optional footer row with totals, row click + contextual action column, grouped/section rows.

**Out:** column resize/reorder/pin/hide (V3), virtualization (V3), export (V3), live-update cell flash (V3).

## Feature description

### Cell formatters and components

Columns accept either a `format` function or a predefined cell type. Types map to small presentational components:

| Type | Renders |
|---|---|
| `text` | Plain string. |
| `number` | Locale-formatted number. Right-aligned + tabular-nums. |
| `currency` | Currency with configurable code and decimals. Right-aligned. |
| `percent` | Percent with configurable decimals. Right-aligned. Optional sign-aware coloring (green/red tokens). |
| `delta` | Signed number with an up/down glyph. Sign-aware color. Never shifts alignment. |
| `compactNumber` | `1.2M`, `850K`, `3.4B` style. Right-aligned. |
| `date` | Locale date/time. Hoverable tooltip for full timestamp. |
| `badge` | Uses the library's Badge component. Color from the column's mapping. |
| `chip` | A rounded pill with an optional dot, used for statuses ("Active", "Pending"). |
| `link` | Cell renders an anchor or a button that fires `onCellClick`. |
| `bar` | Inline horizontal bar, width proportional to the column's domain. Color from kind (positive/negative/neutral). |
| `heatmap` | Cell background tinted by value on the column's domain. Readable text automatically picks light/dark. |
| `sparkline` | Inline mini-chart using `<Graph compact>`. Per-row series data. |

Consumers can always opt out of a type by writing a `cell(row)` render function.

### Row selection

A `selection` prop enables row-select mode. Effects:
- A leading column with a checkbox appears.
- A header checkbox toggles select-all (with an indeterminate state).
- Selected rows apply a subtle tint + brighter border.
- `onSelectionChange(ids)` fires with the current set of row ids (row id comes from a `getRowId(row)` consumer).
- Selection is controllable via `selectedIds` + `onSelectionChange`.
- Shift-click on a checkbox selects a range between the last-clicked row and the target row.
- Selection survives sort and filter changes.

### Row expansion

A column can declare `expandable: true` or the table can take a `renderExpanded(row)` render prop. UI:
- Leading chevron cell (or a dedicated trailing action cell).
- Click toggles an animated row that springs open beneath the target, full-width.
- Expanded content is consumer-rendered (anything — a graph, a details panel, nested table).
- Only one row may be expanded at a time by default (`expandMode="single"`); `expandMode="multiple"` allows many.
- Keyboard: the row cursor from V0 gains Right-to-expand / Left-to-collapse.

### Footer totals

A `footer` config can specify per-column aggregation:

| Aggregation | Output |
|---|---|
| `sum` | Sum of visible rows. |
| `avg` | Mean of visible rows. |
| `count` | Row count. |
| `custom` | Consumer-provided reducer. |

Footer respects filters (it totals what's on screen) but does *not* respect pagination (it still totals all filtered rows if pagination is added later).

### Row click + actions

- `onRowClick(row, e)` fires on row click unless the click originates in a checkbox / link / expand button / action column cell.
- A trailing actions column (always right-pinned visually) can render a cluster of icon buttons (reuses library Button `size="icon"` `variant="ghost"`). Common actions: open, edit, more-menu.
- A row-level context menu slot can render a Dropdown for right-click or "•••" button.

### Grouped / section rows

Rows can be grouped by a column (via `groupBy: columnId` or a consumer-supplied group function). Effects:
- A subtle section header row precedes each group with the group's label + row count.
- Sorts happen within groups.
- Filters remove empty groups.
- Section headers can be collapsible (chevron); collapsed state is local unless controlled.

## Edge cases

| Case | Behavior |
|---|---|
| Heatmap cell with null value | Cell stays untinted, text muted. |
| Sparkline column with empty data array | Renders a blank compact slot, no layout shift. |
| Select-all across filters | "All" toggles only the currently filtered rows. A banner clarifies: "25 of 240 selected. Select all 240?" if filters are active. |
| Row expands while row cursor moves away | Expansion stays; cursor is decoupled from expansion. |
| Footer with no data | Row renders dashes in aggregation cells. |
| Grouped rows + sort by a column | Sort applies within each group; group order uses the group column's natural sort. |
| Action button focus + row click | Button handles the click; row click doesn't fire. |
| Linked cell in a selectable table | Anchor takes the click; selection checkbox is the explicit path. |

## UI description

**Rich cell row (sparkline, delta, badge, action cluster):**
```
┌────────┬──────────┬────────┬──────────────┬────────┬───────────┐
│ AAPL   │ 🟢Active │ $189.12│ ▴ +2.14%     │ ╱╲╱╲▔╱ │ [⚐][⋯]    │
│ TSLA   │ 🟠Watch  │ $241.83│ ▾ −0.38%     │ ╲╱▔╲╱╲ │ [⚐][⋯]    │
│ NVDA   │ 🟢Active │ $482.45│ ▴ +1.42%     │ ╱▔╲╱▔▔ │ [⚐][⋯]    │
└────────┴──────────┴────────┴──────────────┴────────┴───────────┘
```

**Expanded row:**
```
├────────────────────────── ~ ──────────────────────────────────┤
│ AAPL   🟢Active   $189.12   ▴ +2.14%   ╱╲╱▔   [⚐][⋯]          │
│ ▼                                                              │
│   ┌─────────────── Details ──────────────────────┐             │
│   │ Full chart, key stats, filings, news headlines│             │
│   └──────────────────────────────────────────────┘             │
├───────────────────────────────────────────────────────────────┤
```

**Footer totals:**
```
├────────┼──────────┼────────┼──────────────┼────────┼─────────┤
│ Total  │ 3 items  │        │ avg +1.06%   │        │         │
└────────┴──────────┴────────┴──────────────┴────────┴─────────┘
```

**Grouped rows:**
```
▾ Financials (24)
  JPM   …
  BAC   …
▾ Technology (38)
  AAPL  …
```

## What's NOT included

- Column resize / reorder / pin / hide (V3)
- Virtualization for huge datasets (V3)
- Export (V3)
- Live-update cell flash on value change (V3)

## Success criteria

- A ticker-list table with name / status / price / change / sparkline / actions ships without custom cell rendering.
- Selecting rows feels consistent with CheckboxGroup in the rest of the library (proximity hover on the checkbox, spring-animated check).
- Expanding a row feels like the Accordion — same physics, same radii.
- Footer totals update when filters change without a flicker.
