# Table Enhancements V3 — Power-user surface

> The Seeking-Alpha pass. Columns become malleable — resize, reorder, pin, hide. Grouped headers, virtualization for huge datasets, CSV export, saved views, live-update flash, server-side hooks, and full keyboard nav across cells.

## Scope

**In:** column show/hide menu, column resize (drag), column reorder (drag), column pin (left/right), grouped/multi-level headers, row virtualization, CSV/JSON export, saved views, live-update cell flash, server-side sort/filter/paginate callbacks, full cell-level keyboard navigation.

**Out:** spreadsheet-style cell editing, cross-row formulas, multi-tab views.

## Feature description

### Column show/hide

A "Columns" menu button (typically sits at the end of the filter chip strip) opens a Dropdown with a checkbox per column. Toggling hides/shows the column with a spring fade + width collapse. Hidden columns remember their position when re-shown. The count of hidden columns appears as a small badge on the button.

### Column resize

Each non-pinned header gets a thin drag handle on its right edge. Dragging resizes the column; widths persist within the table's state. Double-click the handle → auto-fit (measure the widest visible cell and pad).

Resize is interruptible and smooth — springs to the target on release rather than snapping.

### Column reorder (drag)

Header cells are drag handles. Dragging one lifts it slightly (small scale + shadow), shows insertion indicators between neighbors, and drops it into the new position on release. Pinned columns don't participate in reorder across the pin boundary.

### Column pin (left / right)

Columns can be pinned from a header context menu (reuses the library Dropdown). Pinned columns stick to the left or right while the body scrolls horizontally. A subtle shadow appears on the pinned column's free edge once content scrolls under it.

Checkbox and expand columns auto-pin left when present; actions column auto-pins right. These defaults are overridable.

### Grouped / multi-level headers

Columns can declare a `group: "string"`. Neighboring columns with the same group render under a span-row above their own headers. Two levels deep max in this version. Sorting / filtering still happens at the leaf column; group headers are labels, not interactive.

### Row virtualization

For large datasets, `virtualize: true` (or automatic above ~200 rows) switches the body to a windowed renderer. Only visible rows + a small buffer are mounted. Scroll is smooth; sticky header and pinned columns continue to work. Row height may be fixed (`rowHeight` prop) or measured (default).

Proximity hover continues to work within the visible window. Keyboard navigation scrolls the window when the cursor leaves the viewport.

### CSV / JSON export

A trailing "Export" action in the toolbar opens a small menu: Download CSV / Download JSON / Copy to clipboard. Exports visible rows (respecting filters, search, sort) with visible columns. Consumer can override with `exportAll` to ignore pagination/virtualization.

Column formatters apply to string exports by default (so `1.2M` instead of `1200000`); a `rawValue` escape hatch exports the underlying value.

### Saved views

A view is a named snapshot of: column visibility, widths, order, pins, sort, filters, search, grouping. The table doesn't own persistence but exposes:
- A "Views" menu next to the columns menu.
- `onViewSave({ name, state })` and `onViewLoad(name)` callbacks.
- A controllable `views` prop (array) and `activeView` id.

The table also exposes a `getState()` / `setState(state)` ref handle so consumers can roundtrip to URL params or a backend without re-implementing state extraction.

### Live-update flash

When a cell's value changes while rendered, the cell briefly flashes: green for increase, red for decrease, neutral for non-numeric. Flash is a short spring opacity pulse (150–250ms) on a background tint, respecting `prefers-reduced-motion` (replaced with a quick crossfade). Opt in via a column's `flashOnChange: true`.

Useful for live price/quote tables: connect a WebSocket feed and every tick pulses the cell.

### Server-side hooks

All data operations can be delegated:

| Prop | Effect |
|---|---|
| `manualSort: true` | The table emits `onSortChange` but does not sort locally. |
| `manualFilters: true` | Same for filters. |
| `manualPagination: true` | Table shows the provided rows as-is; pagination UI defers to consumer. |
| `loading` | Works in every manual mode — shows the skeleton. |

This enables dataset-agnostic usage: feed the table slices from a paged API and it renders without trying to second-guess the data.

### Cell-level keyboard navigation

Arrow keys navigate cell-by-cell (not just row-by-row). Focus ring moves to the active cell. Enter activates a link/button cell; Space toggles a selection checkbox; Escape returns the cursor to row level. Tab flows in reading order. Keyboard resize is available on a focused resize handle via Left/Right arrow with Alt.

## Edge cases

| Case | Behavior |
|---|---|
| Hide all columns | Prevented — at least one must remain visible; the toggle bounces. |
| Resize below a minimum | Clamped to a per-column min width (default 48px). |
| Reorder across pinned boundary | Blocked; insertion indicator shows the barrier. |
| Export with grouped rows | Groups render as a dedicated column ("Group") in CSV. |
| Virtualize + variable row heights | Measured once per row; remeasured on resize. |
| Live-update flash during user scroll | Flash still fires but is visually dampened by scroll momentum — acceptable. |
| Server-side sort + local filter | Blocked combination — must pick manual for both or neither; console warning. |
| View load with a column that no longer exists | Column is skipped; a toast/slot event surfaces the mismatch so consumers can show a notice. |
| Keyboard resize collision with OS shortcuts | Alt+Arrow is the explicit chord to avoid common OS overlap. |

## UI description

**Toolbar + column menu:**
```
[Search...]  [Sector ▾] [Price ▾]   ... [Columns ⚙ 2] [Views ▾] [Export ⇩]
```

**Pinned left + scrolling body:**
```
┌────┬────────┐┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┌───────┐
│ ☐ │ AAPL   ││ ... (scrolling cells) ...│ [⋯]  │
│ ☐ │ TSLA   ││ ...                      │ [⋯]  │
└────┴────────┘┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈└───────┘
   pinned left                           pinned right
```

**Grouped headers:**
```
┌──────── Identity ────────┬────── Market ───────┬── Perf ──┐
│ Ticker    Name           │ Price    Mkt Cap    │ 1D  1Y   │
```

**Column resize:**
```
... Price ┃      Mkt Cap ...
          ↑
     drag handle, double-click → auto-fit
```

**Live-update flash (AAPL price tick +):**
```
│ AAPL │ 🟢 Active │ [$189.14] ← brief green tint fades out │
```

## What's NOT included

- In-cell editing, formulas
- Multi-tab table component
- Collaborative cursors

## Success criteria

- A watchlist with 2,000 tickers scrolls at 60fps on a mid-range laptop via virtualization.
- Dragging a column to a new position feels physical (lift → indicator → settle) with no layout jank.
- Hiding three columns and exporting matches what's on screen in the CSV.
- A live WebSocket price feed renders subtle green/red cell flashes without stealing focus or shifting layout.
- A saved view round-trips through URL params and restores exactly: same filters, same sort, same hidden columns, same widths.
- Keyboard-only users can sort, filter, resize, reorder, pin, hide, and export without touching a pointer.
