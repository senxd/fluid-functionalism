"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { springs } from "@/lib/springs";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import { Badge, type BadgeColor } from "@/registry/default/badge";
import { CheckboxGroup, CheckboxItem } from "@/registry/default/checkbox-group";
import { Switch } from "@/registry/default/switch";
import { Button } from "@/registry/default/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableSize = "sm" | "md" | "lg";
export type TableDensity = "comfortable" | "compact";
export type TableAlign = "left" | "right" | "center";
export type SortDir = "asc" | "desc";

export type TableCellType =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "delta"
  | "compactNumber"
  | "date"
  | "badge"
  | "chip"
  | "link";

export type TableSortType = "number" | "text" | "date" | "custom";

export interface TableSortEntry {
  id: string;
  desc: boolean;
}

export type TableFilterKind = "text" | "set" | "range" | "enum";

interface BaseFilterConfig {
  dependsOn?: string[];
}
export interface TextFilterConfig extends BaseFilterConfig {
  kind: "text";
  placeholder?: string;
}
export interface SetFilterConfig extends BaseFilterConfig {
  kind: "set";
}
export interface RangeFilterConfig extends BaseFilterConfig {
  kind: "range";
  step?: number;
}
export interface EnumFilterConfig extends BaseFilterConfig {
  kind: "enum";
  options: { value: string; label: string }[];
}
export type TableFilterConfig =
  | TextFilterConfig
  | SetFilterConfig
  | RangeFilterConfig
  | EnumFilterConfig;

export type TableFilterValue =
  | { kind: "text"; value: string }
  | { kind: "set"; values: string[] }
  | { kind: "range"; min?: number; max?: number }
  | { kind: "enum"; values: string[] };

export interface TableColumn<T = Record<string, unknown>> {
  id: string;
  header: ReactNode;
  accessor?: keyof T | ((row: T) => unknown);
  /** Cell render; wins over cellType. */
  cell?: (row: T) => ReactNode;
  /** Per-cell click handler. Consumes the click (stops row-level `onRowClick`). Adds pointer + hover affordance. */
  onCellClick?: (row: T) => void;
  cellType?: TableCellType;
  /** Format the raw value (used by cell types to stringify). */
  format?: (v: unknown) => string;
  /** Badge color mapping (for cellType='badge' / 'chip'). */
  colorMap?: Record<string, BadgeColor>;
  align?: TableAlign;
  sortable?: boolean;
  sortType?: TableSortType;
  sortFn?: (a: T, b: T) => number;
  filter?: TableFilterConfig;
  searchable?: boolean;
  width?: number | string;
  /** Hide the column. */
  hidden?: boolean;
  /** Right-align sign-aware color for percent/delta. */
  signAware?: boolean;
  /** Currency formatting. */
  currency?: string;
  /** Decimals for numeric cells. */
  decimals?: number;
}

export interface TableAction<T> {
  label: string;
  icon?: ReactNode;
  onClick: (row: T) => void;
}

interface TableDataProps<T> {
  /** High-level column definitions. Required for the feature-rich mode. */
  columns?: TableColumn<T>[];
  /** Row data. */
  data?: T[];
  /** Unique id per row. Used for selection. Defaults to row index. */
  getRowId?: (row: T, index: number) => string;
  /** Size variant. */
  size?: TableSize;
  /** Density. */
  density?: TableDensity;
  /** Opt-in zebra striping. */
  striped?: boolean;
  /** Stick the header to the scroll parent's top. */
  stickyHeader?: boolean;
  /** Shimmer skeleton rows. */
  loading?: boolean;
  /** Skeleton row count when loading. */
  loadingRowCount?: number;
  /** Empty state content. */
  emptyState?: ReactNode;

  /** Global search box. */
  search?: boolean;
  /** Controlled search value. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  /** Sort state (controllable). */
  sort?: TableSortEntry[];
  defaultSort?: TableSortEntry[];
  onSortChange?: (s: TableSortEntry[]) => void;

  /** Filter state (controllable). */
  filters?: Record<string, TableFilterValue>;
  defaultFilters?: Record<string, TableFilterValue>;
  onFiltersChange?: (f: Record<string, TableFilterValue>) => void;

  /** Row selection. */
  selection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;

  /** Row click. */
  onRowClick?: (row: T, e: React.MouseEvent) => void;

  /** Trailing row actions (right-pinned). */
  actions?: TableAction<T>[] | ((row: T) => TableAction<T>[]);
}

interface TableProps<T = Record<string, unknown>>
  extends Omit<HTMLAttributes<HTMLTableElement>, "children">,
    TableDataProps<T> {
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Size / density config
// ---------------------------------------------------------------------------

const SIZE_CONFIG: Record<
  TableSize,
  {
    fontSize: number;
    rowMin: number;
    paddingY: { comfortable: number; compact: number };
    paddingX: number;
  }
> = {
  sm: { fontSize: 12, rowMin: 32, paddingY: { comfortable: 6, compact: 3 }, paddingX: 10 },
  md: { fontSize: 13, rowMin: 40, paddingY: { comfortable: 8, compact: 4 }, paddingX: 12 },
  lg: { fontSize: 14, rowMin: 48, paddingY: { comfortable: 10, compact: 6 }, paddingX: 14 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getValue<T>(row: T, col: TableColumn<T>): unknown {
  if (col.accessor) {
    if (typeof col.accessor === "function") return col.accessor(row);
    return (row as Record<string, unknown>)[col.accessor as string];
  }
  return (row as Record<string, unknown>)[col.id];
}

function compare(a: unknown, b: unknown, sortType: TableSortType = "number"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (sortType === "text") {
    return String(a).localeCompare(String(b));
  }
  if (sortType === "date") {
    const av = a instanceof Date ? a.getTime() : new Date(a as string).getTime();
    const bv = b instanceof Date ? b.getTime() : new Date(b as string).getTime();
    return av - bv;
  }
  const an = Number(a);
  const bn = Number(b);
  if (Number.isNaN(an) || Number.isNaN(bn)) return String(a).localeCompare(String(b));
  return an - bn;
}

function defaultFormatForCellType(
  type: TableCellType | undefined,
  v: unknown,
  col: TableColumn,
): string {
  if (v == null) return "—";
  if (col.format) return col.format(v);
  const decimals = col.decimals ?? 2;
  switch (type) {
    case "number":
      return Number(v).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    case "currency": {
      const code = col.currency ?? "USD";
      return Number(v).toLocaleString(undefined, {
        style: "currency",
        currency: code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    case "percent": {
      const sign = Number(v) > 0 ? "+" : "";
      return `${sign}${(Number(v) * 100).toFixed(decimals)}%`;
    }
    case "delta": {
      const n = Number(v);
      const sign = n > 0 ? "+" : n < 0 ? "−" : "";
      return `${sign}${Math.abs(n).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    }
    case "compactNumber": {
      const n = Number(v);
      const abs = Math.abs(n);
      if (abs >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
      if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
      if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
      return n.toFixed(0);
    }
    case "date": {
      const d = v instanceof Date ? v : new Date(v as string);
      return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
    }
    default:
      return String(v);
  }
}

function signColorClass(n: number): string {
  if (n > 0.00005) return "text-[var(--graph-up,#16a34a)]";
  if (n < -0.00005) return "text-[var(--graph-down,#dc2626)]";
  return "";
}

function alignClass(align: TableAlign | undefined, cellType: TableCellType | undefined): string {
  if (align) {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  }
  const numeric =
    cellType === "number" ||
    cellType === "currency" ||
    cellType === "percent" ||
    cellType === "delta" ||
    cellType === "compactNumber";
  return numeric ? "text-right" : "text-left";
}

// ---------------------------------------------------------------------------
// Layout-stable sort arrow
// ---------------------------------------------------------------------------

function SortArrow({
  active,
  dir,
  rank,
}: {
  active: boolean;
  dir: SortDir;
  rank?: number;
}) {
  const activeUp = active && dir === "asc";
  const activeDown = active && dir === "desc";
  return (
    <span className="inline-flex items-center gap-0.5 ml-1 align-middle">
      {/* Fixed-width slot; two chevrons stacked with a gap so they never overlap */}
      <span
        className="relative inline-block align-middle"
        style={{ width: 10, height: 14 }}
        aria-hidden="true"
      >
        {/* Up chevron — top half */}
        <motion.svg
          width="10"
          height="5"
          viewBox="0 0 10 5"
          className="absolute left-0 top-0"
          initial={false}
          animate={{
            opacity: activeUp ? 1 : active ? 0 : 0.3,
            scale: activeUp ? 1.15 : active ? 0.5 : 0.9,
            y: activeUp ? 0 : active ? -2 : 0,
          }}
          transition={springs.fast}
        >
          <path
            d="M1.5 4 L5 1 L8.5 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.svg>
        {/* Down chevron — bottom half */}
        <motion.svg
          width="10"
          height="5"
          viewBox="0 0 10 5"
          className="absolute left-0 bottom-0"
          initial={false}
          animate={{
            opacity: activeDown ? 1 : active ? 0 : 0.3,
            scale: activeDown ? 1.15 : active ? 0.5 : 0.9,
            y: activeDown ? 0 : active ? 2 : 0,
          }}
          transition={springs.fast}
        >
          <path
            d="M1.5 1 L5 4 L8.5 1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </motion.svg>
      </span>
      {/* Rank slot — always present so layout stays stable */}
      <span
        aria-hidden="true"
        className="tabular-nums text-[10px] text-muted-foreground"
        style={{ width: 9, display: "inline-block", textAlign: "center" }}
      >
        {rank ?? ""}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Small icons (inline SVG — no dep on lucide)
// ---------------------------------------------------------------------------

function FilterIcon({ active }: { active?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2 3.5h12L10 9v4l-4-2V9L2 3.5Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2 2 L8 8 M8 2 L2 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5 L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Filter popover
// ---------------------------------------------------------------------------

function FiltersPanel<T>({
  columns,
  rowsPassingUpstream,
  filters,
  setColumnFilter,
  clearAll,
  triggerRef,
  onClose,
}: {
  columns: TableColumn<T>[];
  rowsPassingUpstream: (colId: string) => T[];
  filters: Record<string, TableFilterValue>;
  setColumnFilter: (id: string, v: TableFilterValue | undefined) => void;
  clearAll: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const shape = useShape();
  const popoverRef = useRef<HTMLDivElement>(null);
  const width = 300;

  // Recompute position from the live trigger rect on every scroll/resize so the
  // popover stays pinned to its button instead of floating as the page scrolls.
  const computePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + 6;
    const left = Math.max(
      8,
      Math.min(
        rect.left,
        (typeof window !== "undefined" ? window.innerWidth : 1000) - width - 8,
      ),
    );
    return { top, left };
  }, [triggerRef]);

  const [pos, setPos] = useState<{ top: number; left: number } | null>(() =>
    computePos(),
  );

  useEffect(() => {
    const update = () => setPos(computePos());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [computePos]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, triggerRef]);

  if (!pos) return null;

  const activeCount = Object.keys(filters).length;

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.1 } }}
      transition={springs.fast}
      className={cn(
        "fixed z-50 bg-card",
        "border border-border/60",
        "shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        shape.container,
      )}
      style={{ width, top: pos.top, left: pos.left, transformOrigin: "top left" }}
      role="dialog"
      aria-label="Filters"
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/40">
        <span
          className="text-[12px] text-muted-foreground"
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          Filters
        </span>
        <button
          type="button"
          onClick={clearAll}
          disabled={activeCount === 0}
          className={cn(
            "text-[11px] transition-colors",
            activeCount === 0
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Clear all
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-3 py-2 flex flex-col gap-3">
        {columns.map((col) => {
          const value = filters[col.id];
          return (
            <div key={col.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[12px] text-foreground"
                  style={{ fontVariationSettings: fontWeights.medium }}
                >
                  {col.header}
                </span>
                {value && (
                  <button
                    type="button"
                    onClick={() => setColumnFilter(col.id, undefined)}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <FilterControl
                column={col}
                rowsPassingUpstream={rowsPassingUpstream(col.id)}
                value={value}
                onChange={(v) => setColumnFilter(col.id, v)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end px-3 pt-2 pb-3 border-t border-border/40">
        <button
          type="button"
          className={cn(
            "text-[11px] px-2.5 py-1 bg-foreground text-background",
            shape.button,
          )}
          onClick={onClose}
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

// Per-column filter control (inline, used inside FiltersPanel)
function FilterControl<T>({
  column,
  rowsPassingUpstream,
  value,
  onChange,
}: {
  column: TableColumn<T>;
  rowsPassingUpstream: T[];
  value: TableFilterValue | undefined;
  onChange: (v: TableFilterValue | undefined) => void;
}) {
  const shape = useShape();
  if (!column.filter) return null;
  if (column.filter.kind === "text") {
    return (
      <input
        type="text"
        placeholder={column.filter.placeholder ?? "Contains…"}
        value={value?.kind === "text" ? value.value : ""}
        onChange={(e) =>
          onChange(e.target.value ? { kind: "text", value: e.target.value } : undefined)
        }
        className={cn(
          "w-full px-2 py-1.5 text-[13px] bg-background border border-border/60 outline-none",
          "focus-visible:ring-1 focus-visible:ring-[#6B97FF]",
          shape.input,
        )}
      />
    );
  }
  if (column.filter.kind === "range") {
    return (
      <RangeFilterInputs
        step={column.filter.step}
        value={value?.kind === "range" ? value : { kind: "range" }}
        onChange={(v) => onChange(v.min == null && v.max == null ? undefined : v)}
      />
    );
  }
  if (column.filter.kind === "set") {
    return (
      <SetFilterOptions
        column={column}
        rows={rowsPassingUpstream}
        value={value?.kind === "set" ? value.values : []}
        onChange={(values) =>
          onChange(values.length ? { kind: "set", values } : undefined)
        }
      />
    );
  }
  if (column.filter.kind === "enum") {
    return (
      <EnumFilterOptions
        options={column.filter.options}
        counts={enumCounts(rowsPassingUpstream, column)}
        value={value?.kind === "enum" ? value.values : []}
        onChange={(values) =>
          onChange(values.length ? { kind: "enum", values } : undefined)
        }
      />
    );
  }
  return null;
}

function RangeFilterInputs({
  step,
  value,
  onChange,
}: {
  step?: number;
  value: { kind: "range"; min?: number; max?: number };
  onChange: (v: { kind: "range"; min?: number; max?: number }) => void;
}) {
  const shape = useShape();
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="Min"
        step={step}
        value={value.min ?? ""}
        onChange={(e) =>
          onChange({
            kind: "range",
            min: e.target.value === "" ? undefined : Number(e.target.value),
            max: value.max,
          })
        }
        className={cn(
          "w-full px-2 py-1.5 text-[13px] bg-background border border-border/60 outline-none",
          "focus-visible:ring-1 focus-visible:ring-[#6B97FF] tabular-nums",
          shape.input,
        )}
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="number"
        placeholder="Max"
        step={step}
        value={value.max ?? ""}
        onChange={(e) =>
          onChange({
            kind: "range",
            min: value.min,
            max: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
        className={cn(
          "w-full px-2 py-1.5 text-[13px] bg-background border border-border/60 outline-none",
          "focus-visible:ring-1 focus-visible:ring-[#6B97FF] tabular-nums",
          shape.input,
        )}
      />
    </div>
  );
}

function FilterCheckList({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string; count: number }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  if (items.length === 0) {
    return <div className="text-[12px] text-muted-foreground py-2">No values</div>;
  }
  const checkedIndices = new Set(
    items.map((o, i) => (value.includes(o.value) ? i : -1)).filter((i) => i >= 0),
  );
  const toggleAt = (i: number) => {
    const v = items[i].value;
    const has = value.includes(v);
    onChange(has ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className="max-h-[220px] overflow-y-auto -mx-2">
      <CheckboxGroup checkedIndices={checkedIndices}>
        {items.map((o, i) => (
          <CheckboxItem
            key={o.value}
            index={i}
            label={o.count > 0 ? `${o.label}  ·  ${o.count}` : o.label}
            checked={value.includes(o.value)}
            onToggle={() => toggleAt(i)}
          />
        ))}
      </CheckboxGroup>
    </div>
  );
}

function SetFilterOptions<T>({
  column,
  rows,
  value,
  onChange,
}: {
  column: TableColumn<T>;
  rows: T[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const items = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const v = getValue(r, column);
      if (v == null) continue;
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([v, c]) => ({ value: v, label: v, count: c }));
  }, [rows, column]);
  return <FilterCheckList items={items} value={value} onChange={onChange} />;
}

function EnumFilterOptions({
  options,
  counts,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  counts: Map<string, number>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const items = options.map((o) => ({
    value: o.value,
    label: o.label,
    count: counts.get(o.value) ?? 0,
  }));
  return <FilterCheckList items={items} value={value} onChange={onChange} />;
}

function enumCounts<T>(rows: T[], col: TableColumn<T>): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = getValue(r, col);
    if (v == null) continue;
    const k = String(v);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------

function renderCell<T>(row: T, col: TableColumn<T>): ReactNode {
  if (col.cell) return col.cell(row);
  const value = getValue(row, col);
  const type = col.cellType ?? "text";

  if (type === "badge") {
    const label = col.format ? col.format(value) : String(value ?? "");
    const color = col.colorMap?.[String(value)] ?? "gray";
    return <Badge color={color}>{label}</Badge>;
  }
  if (type === "chip") {
    const label = col.format ? col.format(value) : String(value ?? "");
    const color = col.colorMap?.[String(value)] ?? "gray";
    return <Badge color={color} variant="dot">{label}</Badge>;
  }
  if (type === "link") {
    const label = col.format ? col.format(value) : String(value ?? "");
    return (
      <span className="text-foreground hover:underline decoration-dotted underline-offset-2 cursor-pointer">
        {label}
      </span>
    );
  }

  const text = defaultFormatForCellType(type, value, col as TableColumn);
  if (type === "delta" && col.signAware !== false) {
    const n = Number(value);
    return (
      <span className={cn("tabular-nums", signColorClass(n))}>{text}</span>
    );
  }
  if (type === "percent" && col.signAware) {
    const n = Number(value);
    return (
      <span className={cn("tabular-nums", signColorClass(n))}>{text}</span>
    );
  }
  if (type === "number" || type === "currency" || type === "percent" || type === "compactNumber") {
    return <span className="tabular-nums">{text}</span>;
  }
  return text;
}

// ---------------------------------------------------------------------------
// Primitive sub-components (existing API, unchanged)
// ---------------------------------------------------------------------------

interface PrimitiveTableContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number | null;
}
const PrimitiveTableContext = createContext<PrimitiveTableContextValue | null>(null);

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("", className)} {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  index?: number;
}
const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ index, className, style, ...props }, ref) => {
    const internalRef = useRef<HTMLTableRowElement>(null);
    const ctx = useContext(PrimitiveTableContext);
    useEffect(() => {
      if (index === undefined || !ctx) return;
      ctx.registerItem(index, internalRef.current);
      return () => ctx.registerItem(index, null);
    }, [index, ctx]);
    const isBodyRow = index !== undefined;
    const activeIdx = ctx?.activeIndex ?? null;
    const hideBorder =
      activeIdx !== null &&
      ((isBodyRow && (index === activeIdx || index === activeIdx - 1)) ||
        (!isBodyRow && activeIdx === 0));
    return (
      <tr
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLTableRowElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref)
            (ref as React.MutableRefObject<HTMLTableRowElement | null>).current = node;
        }}
        data-proximity-index={index}
        className={cn(
          "group/row relative z-10 border-b transition-[border-color] duration-80",
          hideBorder ? "border-transparent" : "border-accent/40",
          isBodyRow && activeIdx === index && "is-active",
          className,
        )}
        style={{
          ...style,
          fontVariationSettings: isBodyRow ? fontWeights.normal : fontWeights.semibold,
        }}
        {...props}
      />
    );
  },
);
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("px-3 py-2 text-left text-foreground", className)}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "px-3 py-2 text-muted-foreground transition-colors duration-80 group-[.is-active]/row:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

// ---------------------------------------------------------------------------
// Table (feature-rich + primitive)
// ---------------------------------------------------------------------------

function TableImpl<T = Record<string, unknown>>(
  props: TableProps<T>,
  ref: React.Ref<HTMLTableElement>,
) {
  const {
    columns,
    data,
    getRowId,
    size = "md",
    density = "comfortable",
    striped = false,
    stickyHeader = false,
    loading = false,
    loadingRowCount = 6,
    emptyState,
    search: enableSearch = false,
    searchValue: searchProp,
    onSearchChange,
    sort: sortProp,
    defaultSort,
    onSortChange,
    filters: filtersProp,
    defaultFilters,
    onFiltersChange,
    selection,
    selectedIds: selectedIdsProp,
    onSelectionChange,
    onRowClick,
    actions,
    children,
    className,
    ...rest
  } = props;

  const isDataMode = columns != null && data != null;

  // ── Primitive mode (children API) ─────────────────────────
  if (!isDataMode) {
    return (
      <PrimitiveTable ref={ref} className={className} size={size} density={density} {...rest}>
        {children}
      </PrimitiveTable>
    );
  }

  // ── Data mode ────────────────────────────────────────────
  return (
    <DataTableInner<T>
      ref={ref as React.Ref<HTMLTableElement>}
      columns={columns!}
      data={data!}
      getRowId={getRowId}
      size={size}
      density={density}
      striped={striped}
      stickyHeader={stickyHeader}
      loading={loading}
      loadingRowCount={loadingRowCount}
      emptyState={emptyState}
      enableSearch={enableSearch}
      searchProp={searchProp}
      onSearchChange={onSearchChange}
      sortProp={sortProp}
      defaultSort={defaultSort}
      onSortChange={onSortChange}
      filtersProp={filtersProp}
      defaultFilters={defaultFilters}
      onFiltersChange={onFiltersChange}
      selection={selection}
      selectedIdsProp={selectedIdsProp}
      onSelectionChange={onSelectionChange}
      onRowClick={onRowClick}
      actions={actions}
      className={className}
      rest={rest}
    />
  );
}

const Table = forwardRef(TableImpl) as <T = Record<string, unknown>>(
  props: TableProps<T> & { ref?: React.Ref<HTMLTableElement> },
) => React.ReactElement;

// ---------------------------------------------------------------------------
// Primitive mode (proximity-hover rows — existing behavior + size/density)
// ---------------------------------------------------------------------------

interface PrimitiveTableProps extends HTMLAttributes<HTMLTableElement> {
  size?: TableSize;
  density?: TableDensity;
  children?: ReactNode;
}

const PrimitiveTable = forwardRef<HTMLTableElement, PrimitiveTableProps>(
  ({ children, size = "md", density = "comfortable", className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
      activeIndex,
      itemRects,
      sessionRef,
      handlers,
      registerItem,
      measureItems,
    } = useProximityHover(containerRef);

    useEffect(() => {
      measureItems();
    }, [measureItems, children]);

    const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
    const cfg = SIZE_CONFIG[size];

    return (
      <PrimitiveTableContext.Provider value={{ registerItem, activeIndex }}>
        <div
          ref={containerRef}
          className="relative"
          onMouseEnter={handlers.onMouseEnter}
          onMouseMove={handlers.onMouseMove}
          onMouseLeave={handlers.onMouseLeave}
          style={
            {
              "--cell-py": `${cfg.paddingY[density]}px`,
              "--cell-px": `${cfg.paddingX}px`,
              "--row-min": `${cfg.rowMin}px`,
            } as React.CSSProperties
          }
        >
          <AnimatePresence>
            {activeRect && (
              <motion.div
                key={sessionRef.current}
                className="absolute bg-accent/40 pointer-events-none"
                initial={{
                  opacity: 0,
                  top: activeRect.top,
                  left: activeRect.left,
                  width: activeRect.width,
                  height: activeRect.height,
                }}
                animate={{
                  opacity: 1,
                  top: activeRect.top,
                  left: activeRect.left,
                  width: activeRect.width,
                  height: activeRect.height,
                }}
                exit={{ opacity: 0, transition: { duration: 0.06 } }}
                transition={{ ...springs.fast, opacity: { duration: 0.08 } }}
              />
            )}
          </AnimatePresence>

          <table
            ref={ref}
            className={cn("w-full border-collapse", className)}
            style={{ fontSize: cfg.fontSize }}
            {...props}
          >
            {children}
          </table>
        </div>
      </PrimitiveTableContext.Provider>
    );
  },
);
PrimitiveTable.displayName = "PrimitiveTable";

// ---------------------------------------------------------------------------
// Data-mode inner component
// ---------------------------------------------------------------------------

interface DataTableInnerProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowId?: (row: T, index: number) => string;
  size: TableSize;
  density: TableDensity;
  striped: boolean;
  stickyHeader: boolean;
  loading: boolean;
  loadingRowCount: number;
  emptyState?: ReactNode;
  enableSearch: boolean;
  searchProp?: string;
  onSearchChange?: (v: string) => void;
  sortProp?: TableSortEntry[];
  defaultSort?: TableSortEntry[];
  onSortChange?: (s: TableSortEntry[]) => void;
  filtersProp?: Record<string, TableFilterValue>;
  defaultFilters?: Record<string, TableFilterValue>;
  onFiltersChange?: (f: Record<string, TableFilterValue>) => void;
  selection?: boolean;
  selectedIdsProp?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T, e: React.MouseEvent) => void;
  actions?: TableAction<T>[] | ((row: T) => TableAction<T>[]);
  className?: string;
  rest: Record<string, unknown>;
}

const DataTableInner = forwardRef(function DataTableInner<T>(
  props: DataTableInnerProps<T>,
  ref: React.Ref<HTMLTableElement>,
) {
  const {
    columns,
    data,
    getRowId,
    size,
    density,
    striped,
    stickyHeader,
    loading,
    loadingRowCount,
    emptyState,
    enableSearch,
    searchProp,
    onSearchChange,
    sortProp,
    defaultSort,
    onSortChange,
    filtersProp,
    defaultFilters,
    onFiltersChange,
    selection,
    selectedIdsProp,
    onSelectionChange,
    onRowClick,
    actions,
    className,
    rest,
  } = props;

  const shape = useShape();
  const cfg = SIZE_CONFIG[size];
  const visibleColumns = useMemo(() => columns.filter((c) => !c.hidden), [columns]);

  // Proximity hover on body rows
  const proxContainerRef = useRef<HTMLDivElement | null>(null);
  const {
    activeIndex: proxIndex,
    itemRects: proxRects,
    sessionRef: proxSession,
    handlers: proxHandlers,
    registerItem: proxRegister,
    measureItems: proxMeasure,
  } = useProximityHover(proxContainerRef);


  // ── Search state ──────────────────────────────────────────
  const [searchState, setSearchState] = useState("");
  const search = searchProp ?? searchState;
  const setSearch = (v: string) => {
    setSearchState(v);
    onSearchChange?.(v);
  };

  // ── Sort state ────────────────────────────────────────────
  const [sortState, setSortState] = useState<TableSortEntry[]>(defaultSort ?? []);
  const sort = sortProp ?? sortState;
  const setSort = (next: TableSortEntry[]) => {
    setSortState(next);
    onSortChange?.(next);
  };

  // ── Filter state ──────────────────────────────────────────
  const [filtersState, setFiltersState] = useState<Record<string, TableFilterValue>>(
    defaultFilters ?? {},
  );
  const filters = filtersProp ?? filtersState;
  const setFilters = (next: Record<string, TableFilterValue>) => {
    setFiltersState(next);
    onFiltersChange?.(next);
  };

  const setColumnFilter = (id: string, v: TableFilterValue | undefined) => {
    const next = { ...filters };
    if (v == null) delete next[id];
    else next[id] = v;
    setFilters(next);
  };

  // ── Selection state ───────────────────────────────────────
  const [selectedState, setSelectedState] = useState<string[]>([]);
  const selectedIds = selectedIdsProp ?? selectedState;
  const setSelected = (ids: string[]) => {
    setSelectedState(ids);
    onSelectionChange?.(ids);
  };

  const rowId = useCallback(
    (row: T, i: number): string => (getRowId ? getRowId(row, i) : String(i)),
    [getRowId],
  );

  // ── dependsOn order (topological) ─────────────────────────
  const upstreamsFor = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of visibleColumns) {
      map.set(c.id, c.filter?.dependsOn ?? []);
    }
    return map;
  }, [visibleColumns]);

  // Compute rows passing upstream filters for a given column.
  // Cycle-safe: if we detect a cycle we fall back to all rows.
  const rowsPassingUpstream = useCallback(
    (colId: string): T[] => {
      const visited = new Set<string>();
      const stack = [colId];
      const excluded = new Set<string>([colId]);
      let cycle = false;
      while (stack.length) {
        const cur = stack.pop()!;
        if (visited.has(cur)) {
          cycle = true;
          continue;
        }
        visited.add(cur);
        const ups = upstreamsFor.get(cur) ?? [];
        for (const u of ups) {
          if (u === colId) {
            cycle = true;
            continue;
          }
          excluded.add(u);
          stack.push(u);
        }
      }
      if (cycle && typeof console !== "undefined") {
        console.warn(`[Table] dependsOn cycle involving column "${colId}"`);
      }
      // Apply all filters EXCEPT for the target column and its downstream deps
      return filterRows(data, visibleColumns, filters, excluded);
    },
    [data, visibleColumns, filters, upstreamsFor],
  );

  // ── Pipeline: filter → search → sort ─────────────────────
  const processed = useMemo(() => {
    let rows = filterRows(data, visibleColumns, filters);
    if (search.trim()) {
      const q = search.toLowerCase();
      const searchables = visibleColumns.filter(
        (c) => c.searchable !== false && (c.cellType == null || c.cellType === "text" || c.cellType === "link" || c.cellType === "badge" || c.cellType === "chip" || c.searchable === true),
      );
      rows = rows.filter((row) =>
        searchables.some((c) => {
          const v = getValue(row, c);
          if (v == null) return false;
          return String(v).toLowerCase().includes(q);
        }),
      );
    }
    if (sort.length) {
      rows = [...rows].sort((a, b) => {
        for (const s of sort) {
          const col = visibleColumns.find((c) => c.id === s.id);
          if (!col) continue;
          const cmp = col.sortFn
            ? col.sortFn(a, b)
            : compare(getValue(a, col), getValue(b, col), col.sortType);
          if (cmp !== 0) return s.desc ? -cmp : cmp;
        }
        return 0;
      });
    }
    return rows;
  }, [data, visibleColumns, filters, search, sort]);

  // Remeasure proximity rects when the rendered row set changes
  useEffect(() => {
    proxMeasure();
  }, [proxMeasure, processed]);

  // ── Sort handler ─────────────────────────────────────────
  const toggleSort = (colId: string, shift: boolean) => {
    const col = visibleColumns.find((c) => c.id === colId);
    if (!col || col.sortable === false) return;
    const existingIdx = sort.findIndex((s) => s.id === colId);
    if (!shift) {
      // Single-column cycle
      if (existingIdx === 0 && sort.length === 1) {
        const cur = sort[0];
        if (!cur.desc) setSort([{ id: colId, desc: true }]);
        else setSort([]); // third click clears
      } else {
        setSort([{ id: colId, desc: false }]);
      }
      return;
    }
    // Multi-column: cycle within the stack
    if (existingIdx === -1) {
      setSort([...sort, { id: colId, desc: false }]);
    } else {
      const cur = sort[existingIdx];
      const next = [...sort];
      if (!cur.desc) {
        next[existingIdx] = { ...cur, desc: true };
      } else {
        next.splice(existingIdx, 1);
      }
      setSort(next);
    }
  };

  // ── Selection logic ──────────────────────────────────────
  const allProcessedIds = processed.map((r, i) => rowId(r, i));
  const allSelected =
    allProcessedIds.length > 0 && allProcessedIds.every((id) => selectedIds.includes(id));
  const someSelected =
    !allSelected && allProcessedIds.some((id) => selectedIds.includes(id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(selectedIds.filter((id) => !allProcessedIds.includes(id)));
    } else {
      const merged = new Set([...selectedIds, ...allProcessedIds]);
      setSelected([...merged]);
    }
  };
  const toggleRow = (id: string) => {
    setSelected(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  // ── Active filter chips ──────────────────────────────────
  const activeFilters = Object.entries(filters)
    .map(([id, v]) => ({ id, value: v, column: visibleColumns.find((c) => c.id === id) }))
    .filter((x) => x.column);

  // ── Filters popover anchor (one button that lists all columns) ──
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);

  // ── Rendering ────────────────────────────────────────────
  const hasActions = !!actions;
  const totalCols = visibleColumns.length + (selection ? 1 : 0) + (hasActions ? 1 : 0);
  const filterableColumns = visibleColumns.filter((c) => c.filter);
  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* Toolbar */}
      {(enableSearch || filterableColumns.length > 0) && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {enableSearch && (
              <div
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 flex-1 min-w-[160px] max-w-xs bg-muted/30 border border-border/50",
                  shape.input,
                )}
              >
                <span className="text-muted-foreground">
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-[13px]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            )}

            {filterableColumns.length > 0 && (
              <button
                ref={filtersButtonRef}
                type="button"
                onClick={() => setFiltersPanelOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] border transition-colors",
                  activeFilterCount > 0
                    ? "bg-accent/50 border-border text-foreground"
                    : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/40",
                  shape.input,
                )}
                style={{ fontVariationSettings: fontWeights.medium }}
                aria-expanded={filtersPanelOpen}
                aria-haspopup="dialog"
              >
                <FilterIcon active={activeFilterCount > 0} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center text-[10px] px-1.5 py-0 min-w-[16px] h-[16px] bg-foreground text-background tabular-nums",
                      shape.bg,
                    )}
                    style={{ fontVariationSettings: fontWeights.semibold }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {enableSearch && (
              <div className="text-[11px] text-muted-foreground tabular-nums ml-auto">
                {processed.length} of {data.length}
              </div>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map(({ id, value, column }) => (
                <FilterChip
                  key={id}
                  column={column!}
                  value={value}
                  onClick={() => setFiltersPanelOpen(true)}
                  onDismiss={() => setColumnFilter(id, undefined)}
                />
              ))}
              <button
                type="button"
                onClick={() => setFilters({})}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={proxContainerRef}
        onMouseEnter={proxHandlers.onMouseEnter}
        onMouseMove={proxHandlers.onMouseMove}
        onMouseLeave={proxHandlers.onMouseLeave}
        className={cn(
          "relative w-full overflow-x-auto",
          stickyHeader && "max-h-full",
        )}
        style={
          {
            "--cell-py": `${cfg.paddingY[density]}px`,
            "--cell-px": `${cfg.paddingX}px`,
            "--row-min": `${cfg.rowMin}px`,
          } as React.CSSProperties
        }
      >
        {/* Proximity hover background */}
        <AnimatePresence>
          {proxIndex !== null && proxRects[proxIndex] && (
            <motion.div
              key={proxSession.current}
              className="absolute bg-accent/40 pointer-events-none z-0"
              initial={{
                opacity: 0,
                top: proxRects[proxIndex]!.top,
                left: proxRects[proxIndex]!.left,
                width: proxRects[proxIndex]!.width,
                height: proxRects[proxIndex]!.height,
              }}
              animate={{
                opacity: 1,
                top: proxRects[proxIndex]!.top,
                left: proxRects[proxIndex]!.left,
                width: proxRects[proxIndex]!.width,
                height: proxRects[proxIndex]!.height,
              }}
              exit={{ opacity: 0, transition: { duration: 0.06 } }}
              transition={{ ...springs.fast, opacity: { duration: 0.08 } }}
            />
          )}
        </AnimatePresence>
        <table
          ref={ref}
          className={cn("w-full border-collapse relative z-[1]", className)}
          style={{ fontSize: cfg.fontSize }}
          {...(rest as HTMLAttributes<HTMLTableElement>)}
        >
          <thead
            className={cn(
              stickyHeader && "sticky top-0 z-10 bg-background/95 backdrop-blur",
            )}
          >
            <tr
              className="border-b border-border/60"
              style={{ fontVariationSettings: fontWeights.semibold }}
            >
              {selection && (
                <th
                  className="text-left"
                  style={{
                    padding: `var(--cell-py) var(--cell-px)`,
                    width: 34,
                  }}
                >
                  <Switch
                    variant="checkbox"
                    hideLabel
                    label={
                      allSelected
                        ? "Deselect all rows"
                        : someSelected
                          ? "Deselect all rows"
                          : "Select all rows"
                    }
                    checked={allSelected}
                    onToggle={toggleAll}
                  />
                </th>
              )}
              {visibleColumns.map((col) => {
                const sortIdx = sort.findIndex((s) => s.id === col.id);
                const isActiveSort = sortIdx !== -1;
                const sortEntry = isActiveSort ? sort[sortIdx] : null;
                const rank = sort.length > 1 && isActiveSort ? sortIdx + 1 : undefined;
                const sortable = col.sortable !== false && col.sortable !== undefined;
                const align = alignClass(col.align, col.cellType);
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "text-foreground",
                      align,
                      sortable && "cursor-pointer select-none",
                    )}
                    style={{
                      padding: `var(--cell-py) var(--cell-px)`,
                      width: col.width,
                    }}
                    onClick={(e) => sortable && toggleSort(col.id, e.shiftKey)}
                    aria-sort={
                      isActiveSort ? (sortEntry!.desc ? "descending" : "ascending") : "none"
                    }
                  >
                    <span className="inline-flex items-center">
                      <span>{col.header}</span>
                      {sortable && (
                        <SortArrow
                          active={isActiveSort}
                          dir={sortEntry?.desc ? "desc" : "asc"}
                          rank={rank}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
              {hasActions && (
                <th
                  className="text-right"
                  style={{
                    padding: `var(--cell-py) var(--cell-px)`,
                    width: 1,
                  }}
                />
              )}
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: loadingRowCount }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border/40">
                  {selection && (
                    <td style={{ padding: "var(--cell-py) var(--cell-px)" }}>
                      <SkeletonPill w={16} />
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={alignClass(col.align, col.cellType)}
                      style={{ padding: "var(--cell-py) var(--cell-px)" }}
                    >
                      <SkeletonPill w={60 + ((i * 7 + col.id.length * 3) % 50)} />
                    </td>
                  ))}
                  {hasActions && (
                    <td style={{ padding: "var(--cell-py) var(--cell-px)" }}>
                      <SkeletonPill w={24} />
                    </td>
                  )}
                </tr>
              ))}

            {!loading && processed.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="text-center py-10 text-muted-foreground text-[13px]"
                >
                  {emptyState ?? "No results"}
                </td>
              </tr>
            )}

            {!loading &&
              processed.map((row, i) => {
                const id = rowId(row, i);
                const isSelected = selectedIds.includes(id);
                const rowActions =
                  typeof actions === "function" ? actions(row) : actions;
                return (
                  <BodyRow<T>
                    key={id}
                    index={i}
                    row={row}
                    striped={striped}
                    isSelected={isSelected}
                    isHoverActive={proxIndex === i}
                    columns={visibleColumns}
                    selection={selection}
                    toggleRow={() => toggleRow(id)}
                    onRowClick={onRowClick}
                    actions={rowActions}
                    registerProx={proxRegister}
                  />
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Filters panel (all filterable columns in one popover) */}
      <AnimatePresence>
        {filtersPanelOpen && filterableColumns.length > 0 && (
          <FiltersPanel<T>
            columns={filterableColumns}
            rowsPassingUpstream={rowsPassingUpstream}
            filters={filters}
            setColumnFilter={setColumnFilter}
            clearAll={() => setFilters({})}
            triggerRef={filtersButtonRef}
            onClose={() => setFiltersPanelOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}) as <T>(
  props: DataTableInnerProps<T> & { ref?: React.Ref<HTMLTableElement> },
) => React.ReactElement;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterRows<T>(
  rows: T[],
  columns: TableColumn<T>[],
  filters: Record<string, TableFilterValue>,
  exclude?: Set<string>,
): T[] {
  const entries = Object.entries(filters).filter(
    ([id]) => !exclude?.has(id),
  );
  if (entries.length === 0) return rows;
  return rows.filter((row) =>
    entries.every(([colId, val]) => {
      const col = columns.find((c) => c.id === colId);
      if (!col) return true;
      const v = getValue(row, col);
      if (val.kind === "text") {
        return String(v ?? "").toLowerCase().includes(val.value.toLowerCase());
      }
      if (val.kind === "set") {
        return val.values.includes(String(v));
      }
      if (val.kind === "enum") {
        return val.values.includes(String(v));
      }
      if (val.kind === "range") {
        const n = Number(v);
        if (Number.isNaN(n)) return false;
        if (val.min != null && n < val.min) return false;
        if (val.max != null && n > val.max) return false;
        return true;
      }
      return true;
    }),
  );
}

// ---------------------------------------------------------------------------
// Row + supporting bits
// ---------------------------------------------------------------------------

function BodyRow<T>({
  index,
  row,
  striped,
  isSelected,
  isHoverActive,
  columns,
  selection,
  toggleRow,
  onRowClick,
  actions,
  registerProx,
}: {
  index: number;
  row: T;
  striped: boolean;
  isSelected: boolean;
  isHoverActive: boolean;
  columns: TableColumn<T>[];
  selection?: boolean;
  toggleRow: () => void;
  onRowClick?: (row: T, e: React.MouseEvent) => void;
  actions?: TableAction<T>[];
  registerProx: (index: number, el: HTMLElement | null) => void;
}) {
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    registerProx(index, rowRef.current);
    return () => registerProx(index, null);
  }, [index, registerProx]);
  const clickable = !!onRowClick;
  return (
    <motion.tr
      ref={rowRef}
      data-proximity-index={index}
      className={cn(
        "relative border-b transition-[color,border-color] duration-100 group/row",
        isHoverActive ? "border-transparent" : "border-border/40",
        striped && index % 2 === 1 && !isHoverActive && !isSelected && "bg-muted/30",
        isSelected && "bg-accent/30",
        clickable && "cursor-pointer",
        isHoverActive && "text-foreground",
      )}
      style={{ minHeight: "var(--row-min)", transformOrigin: "center" }}
      whileTap={clickable ? { scale: 0.995 } : undefined}
      transition={springs.fast}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "[data-row-action], [data-cell-action], input, a, button, [role='button']",
          )
        )
          return;
        onRowClick?.(row, e);
      }}
    >
      {selection && (
        <td
          data-cell-action
          onPointerDown={(e) => e.stopPropagation()}
          style={{ padding: "var(--cell-py) var(--cell-px)" }}
        >
          <Switch
            variant="checkbox"
            hideLabel
            label={isSelected ? "Deselect row" : "Select row"}
            checked={isSelected}
            onToggle={toggleRow}
          />
        </td>
      )}
      {columns.map((col) => {
        const cellContent = renderCell(row, col);
        const isCellClickable = !!col.onCellClick;
        return (
          <td
            key={col.id}
            data-cell-action={isCellClickable ? "" : undefined}
            onPointerDown={
              isCellClickable ? (e) => e.stopPropagation() : undefined
            }
            onClick={
              isCellClickable
                ? (e) => {
                    e.stopPropagation();
                    col.onCellClick!(row);
                  }
                : undefined
            }
            className={cn(
              "text-muted-foreground",
              alignClass(col.align, col.cellType),
              isCellClickable &&
                "cursor-pointer hover:text-foreground transition-colors",
            )}
            style={{ padding: "var(--cell-py) var(--cell-px)" }}
          >
            <span className="text-foreground">{cellContent}</span>
          </td>
        );
      })}
      {actions && actions.length > 0 && (
        <td
          data-row-action
          onPointerDown={(e) => e.stopPropagation()}
          className="text-right"
          style={{ padding: "var(--cell-py) var(--cell-px)" }}
        >
          <span className="inline-flex items-center gap-0.5">
            {actions.map((a, i) => (
              <Button
                key={i}
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  a.onClick(row);
                }}
                title={a.label}
                aria-label={a.label}
                className="hover:bg-foreground/10 active:bg-foreground/15 dark:hover:bg-foreground/15 dark:active:bg-foreground/20"
              >
                {a.icon ?? a.label.slice(0, 1)}
              </Button>
            ))}
          </span>
        </td>
      )}
    </motion.tr>
  );
}

function FilterChip<T>({
  column,
  value,
  onClick,
  onDismiss,
}: {
  column: TableColumn<T>;
  value: TableFilterValue;
  onClick: () => void;
  onDismiss: () => void;
}) {
  const shape = useShape();
  const summary = summarizeFilter(value);
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 bg-accent/40 border border-border/50 text-[12px]",
        shape.bg,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1"
      >
        <span
          className="text-muted-foreground"
          style={{ fontVariationSettings: fontWeights.medium }}
        >
          {typeof column.header === "string" ? column.header : column.id}:
        </span>
        <span className="text-foreground">{summary}</span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-0.5 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Remove filter"
      >
        <XIcon />
      </button>
    </div>
  );
}

function summarizeFilter(v: TableFilterValue): string {
  if (v.kind === "text") return `~ "${v.value}"`;
  if (v.kind === "set" || v.kind === "enum") {
    if (v.values.length <= 2) return v.values.join(", ");
    return `${v.values.slice(0, 2).join(", ")} +${v.values.length - 2}`;
  }
  if (v.kind === "range") {
    if (v.min != null && v.max != null) return `${v.min}–${v.max}`;
    if (v.min != null) return `≥ ${v.min}`;
    if (v.max != null) return `≤ ${v.max}`;
    return "";
  }
  return "";
}

function SkeletonPill({ w }: { w: number }) {
  const shape = useShape();
  return (
    <span
      className={cn("inline-block h-3", shape.bg)}
      style={{
        width: w,
        background:
          "linear-gradient(90deg, var(--muted) 0%, var(--muted) 35%, var(--accent) 50%, var(--muted) 65%, var(--muted) 100%)",
        backgroundSize: "300% 100%",
        animation: "shimmer 1.6s ease-in-out infinite reverse",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
export type { TableProps };
