"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  type TableColumn,
  type TableSortEntry,
  type TableFilterValue,
} from "@/registry/default/table";
import { ComponentPreview } from "@/lib/docs/ComponentPreview";
import { PropsTable, type PropDef } from "@/lib/docs/PropsTable";
import { DocPage, DocSection } from "@/lib/docs/DocPage";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface Ticker {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  change: number; // pct as 0.02 = +2%
  marketCap: number;
  status: "Active" | "Watch" | "Halted";
}

const TICKERS: Ticker[] = [
  { symbol: "AAPL", name: "Apple Inc.",         sector: "Technology",  industry: "Consumer Electronics", price: 189.12, change:  0.0214, marketCap: 2_950_000_000_000, status: "Active" },
  { symbol: "MSFT", name: "Microsoft Corp.",    sector: "Technology",  industry: "Software",             price: 412.34, change:  0.0089, marketCap: 3_060_000_000_000, status: "Active" },
  { symbol: "NVDA", name: "NVIDIA Corp.",       sector: "Technology",  industry: "Semiconductors",       price: 482.45, change:  0.0142, marketCap: 1_190_000_000_000, status: "Active" },
  { symbol: "AMD",  name: "Adv. Micro Devices", sector: "Technology",  industry: "Semiconductors",       price: 145.30, change: -0.0048, marketCap: 235_000_000_000,   status: "Active" },
  { symbol: "TSLA", name: "Tesla Inc.",         sector: "Consumer",    industry: "Automotive",           price: 241.83, change: -0.0038, marketCap: 770_000_000_000,   status: "Watch"  },
  { symbol: "F",    name: "Ford Motor Co.",     sector: "Consumer",    industry: "Automotive",           price:  11.24, change: -0.0117, marketCap:  44_000_000_000,   status: "Active" },
  { symbol: "JPM",  name: "JPMorgan Chase",     sector: "Financials",  industry: "Banks",                price: 197.50, change:  0.0062, marketCap: 570_000_000_000,   status: "Active" },
  { symbol: "BAC",  name: "Bank of America",    sector: "Financials",  industry: "Banks",                price:  37.21, change:  0.0031, marketCap: 290_000_000_000,   status: "Active" },
  { symbol: "BRK",  name: "Berkshire Hathaway", sector: "Financials",  industry: "Insurance",            price: 412.00, change:  0.0011, marketCap: 890_000_000_000,   status: "Active" },
  { symbol: "V",    name: "Visa",               sector: "Financials",  industry: "Payments",             price: 275.40, change:  0.0072, marketCap: 580_000_000_000,   status: "Active" },
  { symbol: "XOM",  name: "Exxon Mobil",        sector: "Energy",      industry: "Oil & Gas",            price: 117.60, change: -0.0092, marketCap: 470_000_000_000,   status: "Active" },
  { symbol: "CVX",  name: "Chevron",            sector: "Energy",      industry: "Oil & Gas",            price: 156.88, change: -0.0033, marketCap: 295_000_000_000,   status: "Active" },
  { symbol: "COP",  name: "ConocoPhillips",     sector: "Energy",      industry: "Oil & Gas",            price: 109.22, change:  0.0044, marketCap: 130_000_000_000,   status: "Halted" },
  { symbol: "PFE",  name: "Pfizer",             sector: "Healthcare",  industry: "Pharmaceuticals",      price:  28.45, change: -0.0055, marketCap: 161_000_000_000,   status: "Active" },
  { symbol: "LLY",  name: "Eli Lilly",          sector: "Healthcare",  industry: "Pharmaceuticals",      price: 780.12, change:  0.0123, marketCap: 740_000_000_000,   status: "Active" },
  { symbol: "UNH",  name: "UnitedHealth",       sector: "Healthcare",  industry: "Managed Care",         price: 514.30, change:  0.0018, marketCap: 474_000_000_000,   status: "Watch"  },
];

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const primitiveCode = `import {
  Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
} from "./components";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Role</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow index={0}>
      <TableCell>Alice</TableCell>
      <TableCell>Engineer</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
    {/* ... */}
  </TableBody>
</Table>`;

const dataModeCode = `import { Table, type TableColumn } from "./components";

const columns: TableColumn<Ticker>[] = [
  { id: "symbol",    header: "Symbol",     sortable: true, sortType: "text" },
  { id: "name",      header: "Name",       sortable: true, sortType: "text", searchable: true },
  { id: "price",     header: "Price",      sortable: true, cellType: "currency", decimals: 2 },
  { id: "change",    header: "Δ",          sortable: true, cellType: "delta",  decimals: 2,
                     accessor: (r) => r.change * 100 },
  { id: "marketCap", header: "Mkt Cap",    sortable: true, cellType: "compactNumber" },
];

<Table columns={columns} data={tickers} size="md" stickyHeader />`;

const sortFilterCode = `import { Table, type TableColumn } from "./components";

const columns: TableColumn<Ticker>[] = [
  { id: "symbol", header: "Symbol", sortable: true, sortType: "text",
    filter: { kind: "text", placeholder: "AAPL, NVDA..." },
    searchable: true },

  { id: "sector", header: "Sector", sortable: true, sortType: "text",
    filter: { kind: "set" } },

  { id: "industry", header: "Industry", sortable: true, sortType: "text",
    // Downstream of sector — options shrink to only-sector rows:
    filter: { kind: "set", dependsOn: ["sector"] } },

  { id: "status", header: "Status",
    cellType: "chip",
    colorMap: { Active: "green", Watch: "amber", Halted: "red" },
    filter: {
      kind: "enum",
      options: [
        { value: "Active", label: "Active" },
        { value: "Watch",  label: "Watch"  },
        { value: "Halted", label: "Halted" },
      ],
    }},

  { id: "price", header: "Price", sortable: true,
    cellType: "currency",
    filter: { kind: "range" } },
];

<Table
  columns={columns}
  data={tickers}
  search
  defaultSort={[{ id: "marketCap", desc: true }]}
/>
// Shift-click headers to add secondary sort.`;

const selectionCode = `<Table
  columns={columns}
  data={tickers}
  selection
  getRowId={(row) => row.symbol}
  onSelectionChange={(ids) => console.log(ids)}
/>`;

const actionsCode = `// onCellClick on a column consumes the click — the row handler
// doesn't fire when that cell is clicked. Scale-down press animation
// plays on any row that has onRowClick.
<Table
  columns={[
    { id: "symbol", header: "Symbol",
      onCellClick: (row) => openTickerProfile(row) },  // consumes click
    // ...
  ]}
  data={tickers}
  onRowClick={(row) => openDrawer(row)}
  actions={[
    { label: "Watch", icon: "⚐", onClick: (r) => star(r) },
    { label: "More",  icon: "⋯", onClick: (r) => openMenu(r) },
  ]}
/>`;

const loadingCode = `<Table columns={columns} data={[]} loading />`;

const statesCode = `<Table size="sm" density="compact" striped stickyHeader columns={...} data={...} />`;

// ---------------------------------------------------------------------------
// Props tables
// ---------------------------------------------------------------------------

const tableProps: PropDef[] = [
  { name: "columns", type: "TableColumn<T>[]", description: "Column definitions for data mode. If omitted, the table renders children (primitive mode)." },
  { name: "data", type: "T[]", description: "Rows. Required when columns is provided." },
  { name: "getRowId", type: "(row: T, i: number) => string", description: "Stable id per row (for selection). Defaults to the index." },
  { name: "size", type: '"sm" | "md" | "lg"', default: '"md"', description: "Size variant affecting row height, cell padding, and type size." },
  { name: "density", type: '"comfortable" | "compact"', default: '"comfortable"', description: "Tightens vertical padding without changing type size." },
  { name: "striped", type: "boolean", default: "false", description: "Alternating row tint." },
  { name: "stickyHeader", type: "boolean", default: "false", description: "Stick the header row to the scroll container's top." },
  { name: "loading", type: "boolean", default: "false", description: "Shimmer skeleton rows in the body." },
  { name: "emptyState", type: "ReactNode", description: "Content shown when data is empty (and not loading)." },
  { name: "search", type: "boolean", default: "false", description: "Show the global search input in the toolbar." },
  { name: "sort / defaultSort / onSortChange", type: "TableSortEntry[]", description: "Sort state. Controllable. Shift-click a header to multi-sort." },
  { name: "filters / defaultFilters / onFiltersChange", type: "Record<string, TableFilterValue>", description: "Filter state. Controllable." },
  { name: "selection", type: "boolean", default: "false", description: "Leading checkbox column, select-all with indeterminate." },
  { name: "selectedIds / onSelectionChange", type: "string[]", description: "Controllable selection." },
  { name: "onRowClick", type: "(row: T, e) => void", description: "Fires on row click (except clicks inside inputs / links / actions)." },
  { name: "actions", type: "TableAction<T>[] | (row) => TableAction<T>[]", description: "Trailing row actions column." },
];

const columnProps: PropDef[] = [
  { name: "id", type: "string", description: "Stable column identifier. Used for sort and filter keys." },
  { name: "header", type: "ReactNode", description: "Header content." },
  { name: "accessor", type: "keyof T | (row) => unknown", description: "How to pull the value from a row. Defaults to row[id]." },
  { name: "cell", type: "(row) => ReactNode", description: "Custom cell render. Wins over cellType." },
  { name: "cellType", type: '"text" | "number" | "currency" | "percent" | "delta" | "compactNumber" | "date" | "badge" | "chip" | "link"', description: "Predefined cell formatting." },
  { name: "format", type: "(v) => string", description: "Format the raw value to a string. Used by cellType." },
  { name: "colorMap", type: "Record<string, BadgeColor>", description: "Color mapping for badge/chip cells." },
  { name: "align", type: '"left" | "right" | "center"', description: "Cell alignment. Defaults to right for numeric cellTypes." },
  { name: "sortable", type: "boolean", description: "Allow clicking the header to sort." },
  { name: "sortType", type: '"number" | "text" | "date" | "custom"', description: "Comparator. Defaults to number." },
  { name: "sortFn", type: "(a, b) => number", description: "Custom comparator (sortType \"custom\")." },
  { name: "filter", type: "TableFilterConfig", description: "Filter kind: text / set / range / enum. Supports dependsOn: string[]." },
  { name: "searchable", type: "boolean", description: "Include this column in the global search scan." },
  { name: "signAware", type: "boolean", description: "For percent/delta cells, color by sign (green/red)." },
  { name: "currency", type: "string", description: "Currency code for currency cells." },
  { name: "decimals", type: "number", description: "Decimal places for numeric cells." },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TableDoc() {
  // Full data-mode demo columns (sort + filter + dependsOn)
  const columns: TableColumn<Ticker>[] = useMemo(
    () => [
      { id: "symbol", header: "Symbol", sortable: true, sortType: "text", searchable: true,
        filter: { kind: "text", placeholder: "AAPL, NVDA…" } },

      { id: "name", header: "Name", sortable: true, sortType: "text", searchable: true },

      { id: "sector", header: "Sector", sortable: true, sortType: "text",
        filter: { kind: "set" } },

      { id: "industry", header: "Industry", sortable: true, sortType: "text",
        filter: { kind: "set", dependsOn: ["sector"] } },

      { id: "status", header: "Status",
        cellType: "chip",
        colorMap: { Active: "green", Watch: "amber", Halted: "red" },
        filter: {
          kind: "enum",
          options: [
            { value: "Active", label: "Active" },
            { value: "Watch", label: "Watch" },
            { value: "Halted", label: "Halted" },
          ],
        } },

      { id: "price", header: "Price", sortable: true, cellType: "currency", decimals: 2,
        filter: { kind: "range", step: 1 } },

      { id: "change", header: "Δ", sortable: true, cellType: "delta", decimals: 2, signAware: true,
        accessor: (r) => r.change * 100 },

      { id: "marketCap", header: "Mkt Cap", sortable: true, cellType: "compactNumber",
        filter: { kind: "range", step: 1_000_000_000 } },
    ],
    [],
  );

  const simpleColumns: TableColumn<Ticker>[] = useMemo(
    () => [
      { id: "symbol", header: "Symbol", sortable: true, sortType: "text" },
      { id: "name", header: "Name", sortable: true, sortType: "text" },
      { id: "price", header: "Price", sortable: true, cellType: "currency", decimals: 2 },
      { id: "change", header: "Δ", sortable: true, cellType: "delta", decimals: 2, signAware: true,
        accessor: (r) => r.change * 100 },
      { id: "marketCap", header: "Mkt Cap", sortable: true, cellType: "compactNumber" },
    ],
    [],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionsLast, setActionsLast] = useState<string | null>(null);

  return (
    <DocPage
      title="Table"
      slug="table"
      description="Data table with proximity row hover, declarative columns, sortable headers with layout-stable arrows, per-column filters with dependsOn chains, visible filter chips, selection, and row actions."
    >
      <DocSection title="Screener (sort + filter + dependsOn)">
        <ComponentPreview code={sortFilterCode}>
          <div className="w-full">
            <Table<Ticker>
              columns={columns}
              data={TICKERS}
              search
              stickyHeader
              defaultSort={[{ id: "marketCap", desc: true }]}
              getRowId={(r) => r.symbol}
            />
            <p className="text-[11px] text-muted-foreground mt-2 px-0.5">
              Click headers to sort. Shift-click to add a secondary sort. Pick a sector → industry options shrink to match.
            </p>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Data Mode — Basic">
        <ComponentPreview code={dataModeCode}>
          <div className="w-full">
            <Table<Ticker>
              columns={simpleColumns}
              data={TICKERS.slice(0, 6)}
              getRowId={(r) => r.symbol}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Row Selection">
        <ComponentPreview code={selectionCode}>
          <div className="w-full">
            <Table<Ticker>
              columns={simpleColumns}
              data={TICKERS.slice(0, 6)}
              getRowId={(r) => r.symbol}
              selection
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onRowClick={(row) => {
                const id = row.symbol;
                setSelectedIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                );
              }}
            />
            <p className="text-[11px] text-muted-foreground mt-2 px-0.5">
              Click anywhere on a row to toggle selection. Selected:{" "}
              {selectedIds.length ? selectedIds.join(", ") : "none"}
            </p>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Row Click + Actions + Cell Click">
        <ComponentPreview code={actionsCode}>
          <div className="w-full">
            <Table<Ticker>
              columns={simpleColumns.map((c) =>
                c.id === "symbol"
                  ? {
                      ...c,
                      onCellClick: (row) => setActionsLast(`symbol:${row.symbol}`),
                    }
                  : c,
              )}
              data={TICKERS.slice(0, 6)}
              getRowId={(r) => r.symbol}
              onRowClick={(row) => setActionsLast(`row:${row.symbol}`)}
              actions={[
                { label: "Watch", icon: "⚐", onClick: (r) => setActionsLast(`watch:${r.symbol}`) },
                { label: "More",  icon: "⋯", onClick: (r) => setActionsLast(`more:${r.symbol}`) },
              ]}
            />
            <p className="text-[11px] text-muted-foreground mt-2 px-0.5">
              Last: {actionsLast ?? "—"} — clicking the Symbol cell fires
              only the cell handler (row click is consumed).
            </p>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Sizes + Density + Striped">
        <ComponentPreview code={statesCode}>
          <div className="flex flex-col gap-6 w-full">
            {(["sm", "md", "lg"] as const).map((s) => (
              <div key={s}>
                <div className="text-[11px] text-muted-foreground mb-1 px-0.5">size=&quot;{s}&quot;</div>
                <Table<Ticker>
                  size={s}
                  density={s === "sm" ? "compact" : "comfortable"}
                  striped
                  columns={simpleColumns}
                  data={TICKERS.slice(0, 4)}
                  getRowId={(r) => r.symbol}
                />
              </div>
            ))}
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Loading">
        <ComponentPreview code={loadingCode}>
          <div className="w-full">
            <Table<Ticker>
              columns={simpleColumns}
              data={[]}
              loading
              loadingRowCount={5}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Empty">
        <ComponentPreview code={`<Table columns={columns} data={[]} emptyState="No tickers match your filters." />`}>
          <div className="w-full">
            <Table<Ticker>
              columns={simpleColumns}
              data={[]}
              emptyState="No tickers match your filters."
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Primitive Mode (children API)">
        <ComponentPreview code={primitiveCode}>
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow index={0}>
                  <TableCell>Alice</TableCell>
                  <TableCell>Engineer</TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
                <TableRow index={1}>
                  <TableCell>Bob</TableCell>
                  <TableCell>Designer</TableCell>
                  <TableCell>Away</TableCell>
                </TableRow>
                <TableRow index={2}>
                  <TableCell>Carol</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell>Active</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="API — Table">
        <PropsTable props={tableProps} />
      </DocSection>

      <DocSection title="API — TableColumn">
        <PropsTable props={columnProps} />
      </DocSection>
    </DocPage>
  );
}
