"use client";

import { library as dashboardLibrary } from "@openuidev/dashboard-library";
import { useDataSources, type ComponentRenderProps, type Library } from "@openuidev/react-lang";
import { useArtifactRenderer } from "@openuidev/react-ui/cloud";
import { ArrowLeftIcon, CheckIcon, ChevronRightIcon, CopyIcon, DownloadIcon, SearchIcon, XIcon } from "@/components/shell/icons";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBuildPanel, WorkspaceHeader } from "./app-workspace";
import { SourcesGlyph, SourcesStateIcon, StudioIconButton } from "./studio-controls";
import { SourceLogo, SourceLogoStack } from "./source-logos";
import "./source-inspector.css";

type Sources = ReturnType<typeof useDataSources>;
type Entry = { id: string; statementId: string; label: string; description?: string; component: string; props: Record<string, unknown>; sources: Sources };
type Selection = { id: string; text: string; x: number; y: number };
/** The hover label shown over a dashboard value while Sources is open. */
type Tip = { text: string; x: number; y: number };
type InspectorContext = {
  register: (entry: Entry) => void; unregister: (id: string) => void;
  pick: (selection: Selection) => void;
  /** Components drawn solid: the one picked, or every user of the source being viewed. */
  selected: ReadonlySet<string>; open: boolean;
  identify: (id: string | null) => void;
  hover: (tip: { id: string; x: number; y: number } | null) => void;
};
const Context = createContext<InspectorContext | null>(null);
const LabelContext = createContext<string | undefined>(undefined);
/** A card's subtitle, so the chart inside it can describe itself. */
const DescriptionContext = createContext<string | undefined>(undefined);
const StatementContext = createContext<string | undefined>(undefined);
const json = (value: unknown) => JSON.stringify(value, null, 2) ?? "No result yet";

/** Capture provenance inside the actual Renderer, where query results and state live. */
function withInspection(name: string, Component: React.ComponentType<ComponentRenderProps>) {
  function Inspectable(renderProps: ComponentRenderProps) {
    const inspector = useContext(Context);
    const parentStatement = useContext(StatementContext);
    const parentLabel = useContext(LabelContext);
    const parentDescription = useContext(DescriptionContext);
    const statementId = renderProps.statementId ?? parentStatement;
    const instanceId = useId();
    const sources = useDataSources(statementId);
    const id = renderProps.statementId ?? (statementId ? `${statementId}:${name}:${instanceId}` : undefined);
    const inspectable = inspectableNames.has(name) && (name !== "Card" || Boolean(sources?.queries.length));
    const label = String(renderProps.props.label ?? renderProps.props.title ?? renderProps.props.name ?? parentLabel ?? name);
    const own = renderProps.props.subtitle ?? renderProps.props.hint;
    const description = typeof own === "string" && own ? own : parentDescription;
    const snapshot = JSON.stringify({ id, statementId, label, description, component: name, props: renderProps.props, sources });
    const register = inspector?.register;
    const unregister = inspector?.unregister;
    useEffect(() => { if (inspectable && id && register) register(JSON.parse(snapshot)); }, [id, register, snapshot, inspectable]);
    useEffect(() => () => { if (inspectable && id) unregister?.(id); }, [id, unregister, inspectable]);
    if (!inspector || !id || !inspectable) return <LabelContext value={label}><DescriptionContext value={description}><StatementContext value={statementId}><Component {...renderProps} /></StatementContext></DescriptionContext></LabelContext>;
    return <LabelContext value={label}><DescriptionContext value={description}><StatementContext value={statementId}><div className="source-inspectable" data-inspect-id={id} data-source-selected={inspector.selected.has(id) || undefined}
      onMouseMove={inspector.open ? (event) => { event.stopPropagation(); inspector.hover({ id, x: event.clientX, y: event.clientY }); } : undefined}
      onMouseLeave={inspector.open ? () => inspector.hover(null) : undefined}
      onMouseUp={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-inspect-id]") !== event.currentTarget || target.closest("button,a,input,select,textarea,[role=combobox]")) return;
        // Selecting text is reading, not inspecting: only a plain click picks.
        if (window.getSelection()?.toString().trim()) return;
        const text = target.textContent?.trim() || label;
        if (!/\d/.test(text) && !inspector.open) return;
        event.stopPropagation();
        inspector.hover(null);
        // A card holding one chart or table is one thing to inspect: act on what it holds,
        // so there is one frame and one highlight, never a card and its chart both.
        const inner = event.currentTarget.querySelectorAll<HTMLElement>("[data-inspect-id]");
        const picked = inner.length === 1 && inner[0].dataset.inspectId ? inner[0].dataset.inspectId : id;
        markCell(cellOf(target));
        inspector.pick({ id: picked, text: displayValue(target), x: event.clientX, y: event.clientY });
      }}><Component {...renderProps} /></div></StatementContext></DescriptionContext></LabelContext>;
  }
  Inspectable.displayName = `Inspectable${name}`;
  return Inspectable;
}

/**
 * The value worth echoing back: text the user selected, or one short text node
 * such as a KPI figure. Charts and lists concatenate every label, so they show none.
 */
function displayValue(target: HTMLElement) {
  const fits = (text: string) => text.length > 0 && text.length <= 32 && !/\n/.test(text);
  // A KPI figure can be split into spans ("43" and "%"); read the whole value.
  const value = target.closest(".openui-dashboard-kpi-value, td");
  const own = value ? value.textContent?.trim() ?? "" : target.childElementCount === 0 ? target.textContent?.trim() ?? "" : "";
  return fits(own) ? own : "";
}

/**
 * What gets boxed on the dashboard: a KPI figure, a table number, or the text of a table
 * cell (its first element, not the whole cell, so the box sits inside the row).
 */
function cellOf(target: HTMLElement): Element | null {
  // Only a KPI's figure is marked; tables are picked whole, like charts.
  return target.closest(".openui-dashboard-kpi-value");
}

/** One word for a component in "Used by", so same-named chart and table rows stay distinct. */
function componentKind(component: string) {
  if (component === "Kpi" || component === "Stat") return "Metric";
  return component === "Table" ? "Table" : "Chart";
}

const inspectableNames = new Set(["Kpi","Stat","KeyValue","Card","TimeSeries","Bars","Donut","Table","Leaderboard","Goal","Funnel","Heatmap","GeoMap","Scatter","Waterfall","Progress","Trend","Distribution","Treemap","Cohorts","SmallMultiples"]);
export const inspectionLibrary: Library = {
  ...dashboardLibrary,
  components: Object.fromEntries(Object.entries(dashboardLibrary.components).map(([name, definition]) => [name,
    { ...definition, component: withInspection(name, definition.component) },
  ])),
};

export function InspectorIdentity() {
  const inspector = useContext(Context);
  const { id } = useArtifactRenderer();
  const identify = inspector?.identify;
  useEffect(() => { if (id) identify?.(id); }, [id, identify]);
  return null;
}

function HoverTip({ setterRef, active }: { setterRef: RefObject<((tip: Tip | null) => void) | null>; active: boolean }) {
  const [tip, setTip] = useState<Tip | null>(null);
  useLayoutEffect(() => { setterRef.current = setTip; return () => { setterRef.current = null; }; }, [setterRef]);
  if (!active || !tip) return null;
  return <div className="source-hover-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>;
}

/*
 * Sources, as the panel lists them: where a dashboard's data comes from, not every
 * chart. Each Query in the dashboard is one source, typed by its origin: a database
 * query (SQL), a file, a service (PostHog, GA4…), or a script OpenUI Cloud generated,
 * whose own inputs the server notes as it runs.
 */
type ScriptCall = { name: string; args: unknown };
type Origin = { key: string; toolName: string; args: unknown; kind: string; title: string; detail: string; code: string; codeLabel: string };
type Source = Origin & { statementId: string; data: unknown; loading: boolean; consumers: Entry[] };
type Connections = Record<string, { name: string; source: string }>;
type Meta = { program: string; tools: ReadonlySet<string> | null; scripts: Record<string, ScriptCall[]>; connections: Connections };
type View = { kind: "list" } | { kind: "source"; id: string } | { kind: "element"; id: string; value?: string } | { kind: "input"; source: string; call: ScriptCall };

/** The product each data tool reads from, as the list's right-hand label. */
const PRODUCTS: Record<string, string> = {
  postgres_query: "Postgres", mysql_query: "MySQL", bigquery_query: "BigQuery", clickhouse_query: "ClickHouse", posthog_query: "PostHog",
  ga4_report: "GA4", searchconsole_query: "Search Console", mcp_call: "MCP", local_retail_query: "Database", local_file_read: "File",
};
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
/** Tables a query reads, skipping its own WITH names. */
const tablesIn = (sql: string) => {
  const own = new Set([...sql.matchAll(/\b(\w+)\s+as\s*\(/gi)].map(match => match[1].toLowerCase()));
  return [...new Set([...sql.matchAll(/\b(?:from|join)\s+([`"]?[\w$-]+(?:\.[\w$-]+)*[`"]?)/gi)].map(match => match[1].replace(/[`"]/g, "")).filter(name => !own.has(name.toLowerCase())))];
};
const callKey = (name: string, args: unknown) => JSON.stringify([name, args ?? {}]);

/** "kpiQ" → "KPI", "revenue_vs_target" → "Revenue vs target", "dailyDetail" → "Daily detail". */
function humanize(id: string) {
  const words = id.replace(/(?<=[a-z0-9])(?:Q|Query)$/, "").replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim().split(/\s+/)
    .map(word => NAME_WORDS[word.toLowerCase()] ?? word.toLowerCase()).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
/** Abbreviations agents use in query names, spelled the way people read them. */
const NAME_WORDS: Record<string, string> = { kpi: "KPI", kpis: "KPIs", dau: "DAU", wau: "WAU", mau: "MAU", mrr: "MRR", arr: "ARR", nps: "NPS", csat: "CSAT", aov: "AOV", ga: "GA", sc: "Search", inv: "invoices", cat: "category", rpt: "revenue per ticket", pv: "pageviews", rev: "revenue", comb: "combined", pg: "Postgres", bq: "BigQuery", ch: "ClickHouse", my: "MySQL" };
const GA_NAMES: Record<string, string> = { sessionDefaultChannelGroup: "channel", firstUserDefaultChannelGroup: "channel", deviceCategory: "device", date: "day", landingPage: "landing page", pagePath: "page", yearMonth: "month" };
/** A report's own description: "Sessions by channel", "Search clicks by query". */
function reportTitle(toolName: string, values: Record<string, unknown>) {
  const dimensions = Array.isArray(values.dimensions) ? values.dimensions.map(String) : [];
  const by = dimensions.length ? ` by ${dimensions.map(name => GA_NAMES[name] ?? humanize(name).toLowerCase()).join(" and ")}` : "";
  if (toolName === "searchconsole_query") return `Search clicks${by || " in total"}`;
  const metrics = Array.isArray(values.metrics) ? values.metrics.map(String) : [];
  return `${humanize(metrics[0] ?? "report")}${metrics.length > 1 ? " and more" : ""}${by || " in total"}`;
}

function originOf(toolName: string, args: unknown, meta: Pick<Meta, "tools" | "connections">, statementId?: string): Origin {
  const values = isRecord(args) ? args : {};
  const key = callKey(toolName, args);
  const base = { key, toolName, args, code: "", codeLabel: "Query" };
  if (typeof values.file === "string") return { ...base, kind: "File", title: values.file, detail: "CSV" };
  // Until the tool list loads, a call with no arguments is most likely a script.
  const isTool = meta.tools ? meta.tools.has(toolName) : Object.keys(values).length > 0;
  if (!isTool) return { ...base, kind: "Script", title: humanize(toolName), detail: "" };
  const product = PRODUCTS[toolName] ?? humanize(toolName);
  const connection = typeof values.connection === "string" ? meta.connections[values.connection]?.name : undefined;
  const sql = typeof values.sql === "string" ? values.sql : typeof values.hogql === "string" ? values.hogql : "";
  const { connection: _connection, ...request } = values;
  if (sql) {
    const tables = tablesIn(sql);
    return { ...base, code: sql, codeLabel: toolName === "posthog_query" ? "HogQL" : "SQL", kind: product,
      title: statementId ? humanize(statementId) : tables.join(", ") || "Query",
      detail: [connection ?? (product === "Database" ? "Local sample database" : undefined), tables.join(", ")].filter(Boolean).join(" · ") };
  }
  if (toolName === "mcp_call") {
    const tool = String(values.tool ?? "tool");
    return { ...base, code: `${tool}(${JSON.stringify(values.arguments ?? {}, null, 2)})`, codeLabel: "Tool call", kind: product,
      title: humanize(tool), detail: [connection, tool].filter(Boolean).join(" · ") };
  }
  return { ...base, code: JSON.stringify(request, null, 2), codeLabel: "Request", kind: product,
    title: toolName === "ga4_report" || toolName === "searchconsole_query" ? reportTitle(toolName, values) : statementId ? humanize(statementId) : product,
    detail: connection ?? product };
}

/**
 * Which queries an element really reads. The renderer reports every query of the
 * enclosing statement, so a chart written inline in a section inherits the section's
 * KPI query too. The program says better: find the call that carries the element's
 * label and follow the names it uses down to Query statements.
 */
function programIndex(program: string) {
  const statements = new Map<string, string>();
  let current: string | null = null;
  for (const line of program.split("\n")) {
    const match = /^([A-Za-z_]\w*)\s*=\s*(.*)$/.exec(line);
    if (match) { current = match[1]; statements.set(current, match[2]); }
    else if (current && line.trim()) statements.set(current, `${statements.get(current)}\n${line}`);
  }
  const queries = new Set([...statements].filter(([, expression]) => /^Query\(/.test(expression.trim())).map(([name]) => name));
  return { statements, queries };
}
/** The balanced call that contains `index`, skipping string literals. */
function enclosingCall(text: string, index: number) {
  let depth = 0;
  for (let i = index; i >= 0; i--) {
    const char = text[i];
    if (char === ")" || char === "]") depth++;
    else if (char === "(" || char === "[") {
      if (depth === 0 && char === "(") {
        let end = i, open = 0, quoted = false;
        for (; end < text.length; end++) {
          const next = text[end];
          if (next === '"' && text[end - 1] !== "\\") quoted = !quoted;
          if (quoted) continue;
          if (next === "(") open++;
          else if (next === ")" && --open === 0) break;
        }
        return text.slice(i, end + 1);
      }
      if (depth > 0) depth--;
    }
  }
  return "";
}
function queriesInProgram(index: ReturnType<typeof programIndex>, program: string, label: string): Set<string> | null {
  const at = program.indexOf(JSON.stringify(label));
  if (at < 0) return null;
  const found = new Set<string>();
  const seen = new Set<string>();
  const visit = (expression: string, depth: number) => {
    for (const [name] of expression.matchAll(/\b[A-Za-z_]\w*\b/g)) {
      if (seen.has(name) || !index.statements.has(name)) continue;
      seen.add(name);
      if (index.queries.has(name)) found.add(name);
      else if (depth < 4) visit(index.statements.get(name)!, depth + 1);
    }
  };
  visit(enclosingCall(program, at), 0);
  return found.size ? found : null;
}

let indexedProgram = "";
let indexed = programIndex("");
/** An element's queries, narrowed to the ones its own expression uses. */
function readsOf(entry: Entry, program: string) {
  const all = entry.sources?.queries ?? [];
  if (all.length < 2 || !program) return all;
  if (program !== indexedProgram) { indexedProgram = program; indexed = programIndex(program); }
  const used = queriesInProgram(indexed, program, entry.label);
  const narrowed = used ? all.filter(query => used.has(query.statementId)) : all;
  return narrowed.length ? narrowed : all;
}

function collectSources(entries: Entry[], meta: Pick<Meta, "tools" | "connections" | "program">): Source[] {
  const sources = new Map<string, Source>();
  for (const entry of entries) for (const query of readsOf(entry, meta.program)) {
    const existing = sources.get(query.statementId);
    if (existing) { if (!existing.consumers.some(item => item.id === entry.id)) existing.consumers.push(entry); continue; }
    sources.set(query.statementId, { ...originOf(query.toolName ?? query.statementId, query.args, meta, query.statementId), statementId: query.statementId, data: query.data, loading: Boolean(query.loading), consumers: [entry] });
  }
  // A query feeding one element is best named after it ("pv" → "Daily pageviews"). Files,
  // scripts, MCP tools and reports already carry descriptive names of their own.
  const list = [...sources.values()];
  const named = list.map(source => {
    if (!["SQL", "HogQL"].includes(source.codeLabel)) return null;
    const labels = [...new Set(source.consumers.map(consumer => consumer.label))];
    return labels.length === 1 ? labels[0] : null;
  });
  // Two queries feeding the same element would share its name; those keep their own.
  return list.map((source, i) => named[i] && named.filter(name => name === named[i]).length === 1 ? { ...source, title: named[i]! } : source);
}

const EMPTY = new Set<string>();

export function SourceInspector({ children, artifactId, response }: { children: ReactNode; artifactId?: string; response?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const panelId = useId();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  /** Where Back goes: the views opened before this one. */
  const [trail, setTrail] = useState<View[]>([]);
  /** Rows the user opened or closed; their choice beats each row's default while they move around. */
  const [rowState, setRowState] = useState<Readonly<Record<string, boolean>>>({});
  const [highlight, setHighlight] = useState<ReadonlySet<string>>(EMPTY);
  const [candidate, setCandidate] = useState<Selection | null>(null);
  const [filter, setFilter] = useState("");
  const [resolvedId, identify] = useState<string | null>(artifactId ?? null);
  const [meta, setMeta] = useState<Meta>({ program: "", tools: null, scripts: {}, connections: {} });
  const [metaError, setMetaError] = useState("");
  const [inputData, setInputData] = useState<Record<string, { data?: unknown; error?: string }>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const sources = useMemo(() => collectSources(Object.values(entries), meta), [entries, meta]);
  const element = view.kind === "element" ? entries[view.id] : undefined;
  const elementSources = element ? readsOf(element, meta.program).flatMap(query => sources.filter(item => item.statementId === query.statementId)) : [];
  const source = view.kind === "source" || view.kind === "input" ? sources.find(item => item.statementId === (view.kind === "source" ? view.id : view.source))
    : elementSources.length === 1 ? elementSources[0] : undefined;
  const scriptView = source?.kind === "Script" ? source.statementId : null;

  const close = useCallback(() => { setOpen(false); setCandidate(null); setRowState({}); markCell(null); triggerRef.current?.focus({ preventScroll: true }); }, []);
  // On phones Sources and the chat are bottom sheets, and only one is open at a time.
  const chat = useBuildPanel();
  const setChatOpen = chat.setOpen;
  const openPanel = () => { setOpen(true); if (isSheetLayout()) setChatOpen(false); };
  // When the chat sheet opens over an open Sources sheet, Sources steps aside (set while
  // rendering, as React recommends for state that follows other state).
  const [seenChatOpen, setSeenChatOpen] = useState(chat.open);
  if (chat.open !== seenChatOpen) {
    setSeenChatOpen(chat.open);
    if (chat.open && open && isSheetLayout()) { setOpen(false); setCandidate(null); setRowState({}); }
  }
  // Nothing is being inspected: no figure stays boxed on the dashboard.
  useEffect(() => { if (!open && !candidate) markCell(null); }, [open, candidate]);
  const register = useCallback((entry: Entry) => setEntries(current => JSON.stringify(current[entry.id]) === JSON.stringify(entry) ? current : { ...current, [entry.id]: entry }), []);
  const unregister = useCallback((id: string) => setEntries(current => { if (!current[id]) return current; const next = { ...current }; delete next[id]; return next; }), []);
  const reveal = useCallback((id: string | undefined) => {
    if (!id) return;
    document.querySelector(`[data-inspect-id="${CSS.escape(id)}"] > *`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  /** A value on the dashboard was clicked: show that element, then where its data comes from. */
  const pick = useCallback((value: Selection) => {
    setTrail([]);
    setView({ kind: "element", id: value.id, value: value.text || kpiValue(value.id) });
    setHighlight(new Set([value.id]));
    if (open) setCandidate(null); else setCandidate(value);
  }, [open]);

  // Hover state lives in its own small component, so moving the pointer never re-renders the dashboard.
  const tipRef = useRef<((tip: Tip | null) => void) | null>(null);
  const describeRef = useRef<(id: string) => string>(() => "");
  useLayoutEffect(() => {
    describeRef.current = (id) => {
      const queries = entries[id] ? readsOf(entries[id], meta.program) : [];
      if (!queries.length) return "Computed in the dashboard";
      const first = sources.find(item => item.statementId === queries[0].statementId);
      const label = first ? `${first.title} · ${first.kind}` : humanize(queries[0].statementId);
      return queries.length > 1 ? `${label} +${queries.length - 1}` : label;
    };
  });
  const hover = useCallback((tip: { id: string; x: number; y: number } | null) => tipRef.current?.(tip ? { text: describeRef.current(tip.id), x: tip.x, y: tip.y } : null), []);
  const context = useMemo(() => ({ register, unregister, pick, selected: open || candidate ? highlight : EMPTY, open, identify, hover }), [register, unregister, pick, highlight, open, candidate, hover]);

  // The program, which names are real tools, what each script read, and connection names.
  // Read again when a script is shown, since its inputs are noted as the dashboard runs it.
  useEffect(() => {
    if (!open || !resolvedId) return;
    const controller = new AbortController();
    fetch(`/api/dashboard-source?id=${encodeURIComponent(resolvedId)}`, { signal: controller.signal })
      .then(async result => { if (!result.ok) throw new Error("Couldn't load the dashboard's sources. Close and reopen Sources to retry."); return result.json(); })
      .then(data => {
        setMeta({ program: data.program ?? "", tools: Array.isArray(data.tools) ? new Set(data.tools) : null, scripts: isRecord(data.scripts) ? data.scripts as Record<string, ScriptCall[]> : {}, connections: isRecord(data.connections) ? data.connections as Connections : {} });
        setMetaError("");
      })
      .catch(error => { if (!controller.signal.aborted) setMetaError(error.message); });
    return () => controller.abort();
  }, [open, resolvedId, response, scriptView]);

  // A script's input isn't a Query of the dashboard, so its data is fetched on demand.
  const inputKey = view.kind === "input" ? callKey(view.call.name, view.call.args) : null;
  const inputCall = view.kind === "input" ? view.call : null;
  useEffect(() => {
    if (!inputKey || !inputCall || !resolvedId || inputData[inputKey]) return;
    const controller = new AbortController();
    fetch("/api/interpreter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: inputCall.name, arguments: inputCall.args ?? {}, id: resolvedId }), signal: controller.signal })
      .then(async result => { const body = await result.json(); if (!result.ok) throw new Error(body?.error?.message ?? "Couldn't load this data."); return body.result; })
      .then(data => setInputData(current => ({ ...current, [inputKey]: { data } })))
      .catch(error => { if (!controller.signal.aborted) setInputData(current => ({ ...current, [inputKey]: { error: error.message } })); });
    return () => controller.abort();
  }, [inputKey, inputCall, resolvedId, inputData]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { if (candidate) setCandidate(null); else if (open) close(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [candidate, open, close]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(".source-search input, [data-source-heading]")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, view]);
  useEffect(() => {
    if (!candidate) return;
    const dismiss = () => setCandidate(null);
    const outside = (event: PointerEvent) => { if (!(event.target as HTMLElement).closest(".source-selection,[data-inspect-id]")) dismiss(); };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("scroll", dismiss, true); window.removeEventListener("pointerdown", outside); };
  }, [candidate]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const copy = async (value: unknown) => {
    const text = typeof value === "string" ? value : json(value);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1500);
    } catch { toast.error("Couldn’t copy. Please try again."); }
  };
  const download = (value: unknown, name: string) => {
    const url = URL.createObjectURL(new Blob([json(value)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `${name.replace(/[^\w.-]+/g, "_")}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* Navigation: each step remembers where it came from, so Back retraces it. */
  const go = (next: View, lit: string[]) => { setTrail(current => [...current, view]); setView(next); setHighlight(new Set(lit)); reveal(lit[0]); };
  const showList = () => { setTrail([]); setView({ kind: "list" }); setHighlight(EMPTY); markCell(null); };
  const highlightIds = (consumers: Entry[]) => consumers.map(consumer => consumer.id);
  const openSource = (item: Source) => go({ kind: "source", id: item.statementId }, item.consumers.map(consumer => consumer.id));
  const openElement = (id: string) => { markCell(document.querySelector(`[data-inspect-id="${CSS.escape(id)}"] .openui-dashboard-kpi-value`)); go({ kind: "element", id, value: kpiValue(id) }, [id]); };
  const back = () => {
    const previous = trail.at(-1);
    if (!previous || previous.kind === "list") { showList(); return; }
    setTrail(trail.slice(0, -1)); setView(previous);
    setHighlight(new Set(previous.kind === "element" ? [previous.id] : sources.find(item => item.statementId === (previous.kind === "source" ? previous.id : previous.source))?.consumers.map(consumer => consumer.id) ?? []));
  };

  const query = filter.trim().toLowerCase();
  const listed = query ? sources.filter(item => [item.title, item.kind, item.detail, ...item.consumers.map(consumer => consumer.label)].some(text => text.toLowerCase().includes(query))) : sources;

  const copyButton = (value: unknown, className?: string) => { const text = typeof value === "string" ? value : json(value); return <StudioIconButton className={className} label={copied === text ? "Copied" : "Copy"} onClick={() => copy(value)}>{copied === text ? <CheckIcon /> : <CopyIcon />}</StudioIconButton>; };

  /**
   * One collapsible row. Each has a default: closed, except where the heading can't say
   * where the data came from (a chart's or table's source opens). Whatever the user opens
   * or closes wins, and carries over as they move between elements.
   */
  const row = (id: string, label: ReactNode, content: ReactNode, { note, defaultOpen = false }: { note?: string; defaultOpen?: boolean } = {}) => {
    const expanded = rowState[id] ?? defaultOpen;
    return <section className="source-row-section" key={id}>
      <button className="source-row-toggle" aria-expanded={expanded} onClick={() => setRowState(current => ({ ...current, [id]: !expanded }))}>
        <span className="source-row-title">{label}</span>{note && <span className="source-row-note">{note}</span>}<ChevronRightIcon aria-hidden />
      </button>
      <div className="source-disclosure" data-open={expanded} aria-hidden={!expanded} inert={!expanded}><div className="source-disclosure-inner"><div className="source-row-body">{content}</div></div></div>
    </section>;
  };

  const downloadButton = (value: unknown, name: string) => <StudioIconButton label="Download" onClick={() => download(value, name)}><DownloadIcon /></StudioIconButton>;
  const resultRow = (raw: unknown, name: string, label: string, state: string, defaultOpen = false) => {
    const value = unwrapResult(raw);
    return row("result", label, value === undefined ? <p className="source-help">{state}</p> : <>
      <Result value={value} />
      <div className="source-result-foot"><span>{resultSummary(value)}</span>{copyButton(value)}{downloadButton(value, name)}</div>
    </>, { defaultOpen });
  };
  const requestRow = (origin: Origin) => {
    if (!origin.code) return null;
    const isQuery = origin.codeLabel === "SQL" || origin.codeLabel === "HogQL";
    const code = isQuery ? formatSql(origin.code) : origin.code;
    return row("query", isQuery ? "Query" : origin.codeLabel, <div className="source-code-wrap"><Code value={code} />{copyButton(code, "source-code-copy")}</div>, { note: isQuery ? origin.codeLabel : undefined });
  };
  /** A source in a list: its name, then its mark (product logo, file, script or database). */
  const sourceLink = (item: Origin, onClick: () => void) => <button className="live-source-row" title={[item.title, item.kind, item.detail].filter(Boolean).join(" · ")} onClick={onClick}>
    <span className="source-row-label">{item.title}</span>
    <span className="source-row-kind source-row-mark"><SourceLogo kind={item.kind} toolName={item.toolName} /><span className="sr-only">{item.kind}</span></span>
  </button>;
  const scriptInputs = (item: Source) => {
    const inputs = item.kind === "Script" ? meta.scripts[item.toolName] : undefined;
    return inputs?.length
      ? <ul className="source-list">{inputs.map(call => { const origin = originOf(call.name, call.args, meta); return <li key={origin.key}>{sourceLink(origin, () => go({ kind: "input", source: item.statementId, call }, highlightIds(item.consumers)))}</li>; })}</ul>
      : <p className="source-help">{inputs ? "This script reads no data source." : "What it reads shows here once the dashboard has loaded."}</p>;
  };
  /**
   * A script as Claude shows a formula: one "Script" row whose content is the sources it
   * reads, unlabelled. Its result is the Result row, like any other source.
   */
  const scriptRow = (item: Source, defaultOpen = false) => row("script", <>Script<SourceLogoStack items={(meta.scripts[item.toolName] ?? []).map(call => originOf(call.name, call.args, meta))} /></>, scriptInputs(item), { defaultOpen });
  /** A source's rows: what a script reads, or the query or request; then its result. */
  const sourceRows = (item: Source, scriptOpen = false) => <>
    {item.kind === "Script" ? scriptRow(item, scriptOpen) : requestRow(item)}
    {resultRow(item.data, item.title, item.kind === "File" ? "File" : "Result", item.loading ? "Loading…" : "No data came back. If the query failed, the dashboard shows why.")}
  </>;
  /**
   * The source of a chart or table, open by default: its mark, name and connection with
   * copy and download, a script's inputs, then a preview of the data, as Claude's File row.
   */
  const sourceCard = (item: Source) => {
    const value = unwrapResult(item.data);
    return row("source", <>Source<SourceLogoStack items={[item]} /></>, <>
      <div className="source-identity">
        <button className="source-identity-text" onClick={() => openSource(item)} title="Open this source">
          <span className="source-identity-name">{identityName(item)}</span>
        </button>
        {value !== undefined && <>{copyButton(value)}{downloadButton(value, item.title)}</>}
      </div>
      {value === undefined ? <p className="source-help">{item.loading ? "Loading…" : "No data came back. If the query failed, the dashboard shows why."}</p> : <><Result value={value} /><div className="source-result-foot"><span>{resultSummary(value)}</span></div></>}
    </>, { defaultOpen: true });
  };
  /** Other places the same data appears; each opens that element, keeping this row open. */
  const usedByRow = (consumers: Entry[], label: string, current?: string) => {
    const unique = consumers.filter((consumer, index, all) => all.findIndex(item => item.label === consumer.label && componentKind(item.component) === componentKind(consumer.component)) === index);
    // Nothing else uses this data: a list holding only what's already open says nothing.
    const elsewhere = current ? unique.filter(consumer => consumer.id !== current && consumer.label !== entries[current]?.label) : unique;
    if (!elsewhere.length) return null;
    return row("used", label, <ul className="source-list">{unique.map(consumer => <li key={consumer.id}>
      <button className="live-source-row" title={consumer.label} data-active={consumer.id === current || undefined} onClick={() => openElement(consumer.id)}>
        <span className="source-row-label">{consumer.label}</span><span className="source-row-kind">{isMetric(consumer) ? kpiValue(consumer.id) || "Metric" : componentKind(consumer.component)}</span>
      </button>
    </li>)}</ul>, { note: String(unique.length) });
  };
  const heading = (title: string, meta: string) => <>
    <h2 tabIndex={-1} data-source-heading>{title}</h2>
    <p className="source-detail-meta">{meta}</p>
  </>;

  let body: ReactNode;
  if (view.kind === "element" && element) {
    const others = elementSources.flatMap(item => item.consumers).filter(consumer => consumer.id !== element.id && consumer.label !== element.label);
    const first = elementSources[0];
    const code = !first ? statementScript(meta.program, [element.statementId, ...(element.sources?.via ?? [])]) : "";
    const formula = !first && row("query", "Formula", code ? <div className="source-code-wrap"><Code value={code} />{copyButton(code, "source-code-copy")}</div> : <p className="source-help">{metaError || "Loading…"}</p>, { defaultOpen: !isMetric(element) });
    // Several sources: the heading can't name them all, so the list opens either way.
    const manySources = elementSources.length > 1 && row("sources", <>Sources<SourceLogoStack items={elementSources} /></>, <ul className="source-list">{elementSources.map(item => <li key={item.statementId}>{sourceLink(item, () => openSource(item))}</li>)}</ul>, { defaultOpen: true });
    if (isMetric(element)) {
      // A number: the heading is its source, which already says where it came from.
      const value = view.value || kpiValue(element.id);
      body = <>
        {elementSources.length > 1 ? heading(`${elementSources.length} sources`, [...new Set(elementSources.map(item => item.kind))].join(" and "))
          : first ? heading(first.title, [first.kind, first.detail].filter(Boolean).join(" · "))
          : heading("Computed in the dashboard", "From the dashboard's own script, not a data source")}
        {/* Keyed by element: switching replays a brief, subtle arrival on what changed. */}
        <div className="source-focus" key={element.id}>
          <div className="source-focus-value">{value || "—"}</div><div className="source-focus-label">{element.label}</div>
          {element.description && <div className="source-focus-hint">{element.description}</div>}
        </div>
        <div className="source-rows">
          {manySources}
          {source ? sourceRows(source) : formula}
          {usedByRow([element, ...others], "Also used by", element.id)}
        </div>
      </>;
    } else {
      // A chart or table: the heading is the element itself, so its source opens below it.
      body = <>
        <div className="source-focus source-focus-heading" key={element.id}>
          <h2 tabIndex={-1} data-source-heading>{element.label}</h2>
          {element.description && <p className="source-detail-meta">{element.description}</p>}
        </div>
        <div className="source-rows">
          {manySources}
          {source ? source.kind === "Script" ? sourceRows(source, true) : <>{sourceCard(source)}{requestRow(source)}</> : formula}
          {usedByRow([element, ...others], "Also used by", element.id)}
        </div>
      </>;
    }
  } else if (view.kind === "input" && source) {
    const origin = originOf(view.call.name, view.call.args, meta);
    const loaded = inputData[origin.key];
    body = <>
      {heading(origin.title, [origin.kind, origin.detail, `read by ${source.title}`].filter(Boolean).join(" · "))}
      <div className="source-rows">
        {requestRow(origin)}
        {resultRow(loaded?.data, origin.title, origin.kind === "File" ? "File" : "Result", loaded?.error ?? "Loading…", true)}
      </div>
    </>;
  } else if (view.kind === "source" && source) {
    body = <>
      {heading(source.title, [source.kind, source.detail].filter(Boolean).join(" · ") + (source.loading ? " · Updating…" : ""))}
      <div className="source-rows">
        {sourceRows(source)}
        {usedByRow(source.consumers, "Used by")}
      </div>
    </>;
  } else {
    body = <>
      <div className="source-search-bar"><label className="source-search"><SearchIcon aria-hidden /><input aria-label="Search sources" placeholder="Find a source…" value={filter} onChange={event => setFilter(event.target.value)} /></label></div>
      <ul className="source-list" aria-label="Sources">{listed.map(item => <li key={item.statementId}>{sourceLink(item, () => openSource(item))}</li>)}</ul>
      {!sources.length && <p className="source-help">Sources appear once the dashboard has rendered.</p>}
      {sources.length > 0 && !listed.length && <p className="source-help" role="status">No sources match “{filter}”.</p>}
    </>;
  }

  return <Context value={context}><div className="source-workspace" data-inspecting={open || undefined}>
    <div className="source-canvas" data-shell-flip onClick={event => {
      if (!open || view.kind === "list") return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-inspect-id], .studio-panel-header, button, a, input, select, textarea, [role=combobox], [role=menu], [role=dialog]")) return;
      if (window.getSelection()?.toString().trim()) return;
      showList();
    }}><WorkspaceHeader actions={<Button ref={triggerRef} size="sm" variant="ghost" className="studio-sources-trigger" onClick={() => { if (open) close(); else { openPanel(); showList(); setCandidate(null); } }} aria-expanded={open} aria-controls={panelId} aria-label={open ? "Close Sources" : "Open Sources"}><SourcesStateIcon open={open} />Sources</Button>} />{children}</div>
    {candidate && !open && <div role="toolbar" aria-label="Selected value actions" className="source-selection" style={{ left: Math.min(candidate.x, typeof window === "undefined" ? 600 : window.innerWidth - 140), top: Math.max(8, candidate.y - 48) }}><Button size="sm" variant="ghost" className="source-selection-action" onClick={() => { openPanel(); setCandidate(null); }}><SourcesGlyph />See source</Button></div>}
    <div className="live-source-slot" data-open={open} aria-hidden={!open} inert={!open}>
      <aside ref={panelRef} id={panelId} className="live-source-panel" aria-label="Sources panel">
        <header>
          {view.kind !== "list" && <StudioIconButton label="Back" onClick={back}><ArrowLeftIcon /></StudioIconButton>}
          {view.kind === "list" && <span>Sources</span>}<StudioIconButton className="ml-auto" label="Close" onClick={close}><XIcon /></StudioIconButton>
        </header>
        <div className="live-source-body">{body}</div>
      </aside>
    </div>
    <span className="sr-only" role="status">{copied ? "Copied to clipboard" : ""}</span>
    <HoverTip setterRef={tipRef} active={open} />
  </div></Context>;
}

/**
 * What a result holds, without transport wrappers: an MCP call's structuredContent,
 * and a lone list inside it ({ invoices: [...] }) as the table itself.
 */
function unwrapResult(value: unknown): unknown {
  let inner = isRecord(value) && "structuredContent" in value ? value.structuredContent ?? value.text : value;
  if (isRecord(inner)) { const entries = Object.entries(inner); if (entries.length === 1 && Array.isArray(entries[0][1])) inner = entries[0][1]; }
  return inner;
}

/** Phones: the side panels become bottom sheets (studio.css and source-inspector.css, max-width 639px). */
const isSheetLayout = () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;

const isMetric = (entry: Entry) => entry.component === "Kpi" || entry.component === "Stat";

/** Marks the exact figure or table cell that was picked, so it reads as selected on the dashboard. */
function markCell(cell: Element | null) {
  if (typeof document === "undefined") return;
  for (const marked of document.querySelectorAll("[data-source-cell]")) if (marked !== cell) marked.removeAttribute("data-source-cell");
  // Re-adding restarts its arrival highlight when the same cell is picked again.
  if (cell) { cell.removeAttribute("data-source-cell"); void (cell as HTMLElement).offsetWidth; cell.setAttribute("data-source-cell", ""); }
}

/**
 * What a chart's source is, as Claude names a file: the tables a query reads, the file,
 * the MCP tool or the script, rather than the chart's own title again.
 */
function identityName(item: Origin) {
  if (item.codeLabel === "SQL" || item.codeLabel === "HogQL") return tablesIn(item.code).join(", ") || item.title;
  if (item.toolName === "mcp_call" && isRecord(item.args)) return String(item.args.tool ?? item.title);
  return item.title;
}

/** A KPI's figure as the dashboard shows it, formatted. */
function kpiValue(id: string) {
  if (typeof document === "undefined") return "";
  return document.querySelector(`[data-inspect-id="${CSS.escape(id)}"] .openui-dashboard-kpi-value`)?.textContent?.trim() ?? "";
}

function Code({ value }: { value: string }) { return <pre className="source-code-block">{value}</pre>; }
/** One-line SQL, broken before its main clauses so it reads top to bottom. Display only. */
function formatSql(sql: string) {
  if (sql.includes("\n")) return sql.trim();
  return sql.trim().replace(/\s+(?=(?:select|from|where|group by|order by|having|limit|(?:left |right |inner |full )?join|union(?: all)?)\b)/gi, "\n").replace(/\),\s*(?=\w+ as \()/gi, "),\n");
}

/** Rows and fields of a result, for the Data heading. */
function resultSummary(value: unknown) {
  const shape = resultShape(value);
  if (!shape) return undefined;
  const fields = new Set(shape.rows.flatMap(row => Object.keys(row))).size;
  return `${shape.rows.length.toLocaleString()} ${shape.rows.length === 1 ? "row" : "rows"} · ${fields} ${fields === 1 ? "field" : "fields"}`;
}
function resultShape(value: unknown): { rows: Record<string, unknown>[] } | null {
  const envelope = isRecord(value) && Array.isArray(value.rows) ? value : null;
  const columnar = !envelope && isRecord(value) && Object.keys(value).length > 0
    && Object.values(value).every(column => Array.isArray(column) && column.length === (Object.values(value)[0] as unknown[]).length && column.every(cell => !isRecord(cell) && !Array.isArray(cell)));
  if (columnar) {
    const columns = value as Record<string, unknown[]>;
    return { rows: (Object.values(columns)[0]).map((_, index) => Object.fromEntries(Object.entries(columns).map(([key, column]) => [key, column[index]]))) };
  }
  const rows = envelope ? envelope.rows : value;
  return Array.isArray(rows) && rows.every(isRecord) ? { rows: rows as Record<string, unknown>[] } : null;
}
/**
 * A result as the source returned it: raw field names and values, compact rows. One row
 * reads as a field list; more as a table.
 */
function Result({ value }: { value: unknown }) {
  const shape = resultShape(value);
  const display = (item: unknown): ReactNode => {
    if (item === undefined || item === null) return <span className="source-result-null">—</span>;
    if (typeof item === "string" && /^\d{4}-\d{2}-\d{2}T/.test(item)) return item.replace(/T00:00:00(?:\.000)?Z?$/, "").replace("T", " ").replace(/:\d{2}(?:\.\d+)?Z?$/, "");
    if (typeof item === "object") return <code>{JSON.stringify(item)}</code>;
    return String(item);
  };
  if (!shape) return isRecord(value)
    ? <dl className="source-result-fields">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{key}</dt><dd>{display(item)}</dd></div>)}</dl>
    : <pre className="source-result-raw">{json(value)}</pre>;
  const { rows } = shape;
  if (!rows.length) return <p className="source-help">No rows returned.</p>;
  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  if (rows.length === 1) return <dl className="source-result-fields">{columns.map(column => <div key={column}><dt>{column}</dt><dd data-numeric={typeof rows[0][column] === "number" || undefined}>{display(rows[0][column])}</dd></div>)}</dl>;
  return <div className="source-result-table-scroll" role="region" aria-label="Result" tabIndex={0}>
    <table className="source-result-table">
      <caption className="sr-only">{rows.length} rows, {columns.length} fields</caption>
      <thead><tr>{columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column} data-numeric={typeof row[column] === "number" || undefined}>{display(row[column])}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

/** Keep the stored expressions verbatim; no inferred or invented formulas. */
function statementScript(program: string, ids: string[]) {
  const lines = program.split("\n"); const blocks: string[] = [];
  for (let index=0;index<lines.length;index++) {
    const match = /^\s*([\w$]+)\s*=/.exec(lines[index]);
    if (!match || !ids.includes(match[1])) continue;
    let end=index+1; while(end<lines.length && !/^\s*(?:[\w$]+\s*=|```)/.test(lines[end]))end++;
    blocks.push(lines.slice(index,end).join("\n"));
  }
  return blocks.join("\n\n") || (program ? "The expression is embedded in the dashboard. Open Full dashboard script below." : "");
}
