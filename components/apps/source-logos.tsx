"use client";

import { DatabaseIcon, File01Icon, SourceCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  siClickhouse,
  siGoogleanalytics,
  siGooglebigquery,
  siGooglesearchconsole,
  siModelcontextprotocol,
  siMysql,
  siPostgresql,
  siPosthog,
  type SimpleIcon,
} from "simple-icons";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/** Each data tool's product mark: the same artwork the Data connections tiles use. */
const BRANDS: Record<string, SimpleIcon> = {
  postgres_query: siPostgresql,
  mysql_query: siMysql,
  bigquery_query: siGooglebigquery,
  clickhouse_query: siClickhouse,
  posthog_query: siPosthog,
  ga4_report: siGoogleanalytics,
  searchconsole_query: siGooglesearchconsole,
  mcp_call: siModelcontextprotocol,
};

/** Near-black brand colors (PostHog's and MCP's marks here) read as the text color instead. */
function isNearBlack(hex: string) {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.12;
}

/**
 * Where a source's data lives: the product's own logo in its brand color for connections,
 * and a muted document, code or cylinder glyph for files, scripts and other databases.
 * The brand color is mixed a little toward the text color (in CSS), which darkens it on
 * light surfaces and lightens it on dark ones, so pale and deep brands both stay legible.
 */
export function SourceLogo({ kind, toolName, className }: { kind: string; toolName: string; className?: string }) {
  const brand = BRANDS[toolName];
  if (brand) {
    const mono = isNearBlack(brand.hex);
    return <svg className={cn("source-logo", className)} data-brand={mono ? "mono" : "color"} style={mono ? undefined : ({ "--brand": `#${brand.hex}` } as CSSProperties)} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d={brand.path} /></svg>;
  }
  const glyph = kind === "File" ? File01Icon : kind === "Script" ? SourceCodeIcon : DatabaseIcon;
  return <HugeiconsIcon icon={glyph} size={14} strokeWidth={1.7} className={cn("source-logo", className)} aria-hidden="true" />;
}

/** The marks of one or more sources beside a row's label, side by side, each shown once. */
export function SourceLogoStack({ items }: { items: { kind: string; toolName: string }[] }) {
  const unique = items.filter((item, index, all) => all.findIndex(other => (BRANDS[other.toolName] ? other.toolName : other.kind) === (BRANDS[item.toolName] ? item.toolName : item.kind)) === index);
  if (!unique.length) return null;
  return <span className="source-logo-stack" aria-hidden="true">
    {unique.map(item => <SourceLogo key={BRANDS[item.toolName] ? item.toolName : item.kind} kind={item.kind} toolName={item.toolName} />)}
  </span>;
}
