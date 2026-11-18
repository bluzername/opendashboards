"use client";

import type { ComponentProps, ReactNode } from "react";
import { DatabaseIcon, FolderIcon, FolderOpenIcon, SourcesIcon, SparkleIcon } from "@/components/shell/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** The same target, hit area and tooltip treatment for shell actions. */
export function StudioIconButton({ label, children, className, ...props }: ComponentProps<typeof Button> & { label: string; children: ReactNode }) {
  return <Tooltip delayDuration={450}>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon-sm" aria-label={label} className={cn("studio-icon-button", className)} {...props}>{children}</Button>
    </TooltipTrigger>
    <TooltipContent sideOffset={6} className="studio-tooltip">{label}</TooltipContent>
  </Tooltip>;
}

type GlyphProps = { className?: string };

/* Shell glyphs at 16px from the shared icon set, under the names the app already uses. */
export function FolderGlyph({ className }: GlyphProps) {
  return <FolderIcon className={cn("studio-glyph", className)} aria-hidden />;
}

export function FolderOpenGlyph({ className }: GlyphProps) {
  return <FolderOpenIcon className={cn("studio-glyph", className)} aria-hidden />;
}

/** Data connections: the stored databases themselves. */
export function DatabaseGlyph({ className }: GlyphProps) {
  return <DatabaseIcon className={cn("studio-glyph", className)} aria-hidden />;
}

/** Sources: inspecting a value on the dashboard, so a framed area under a magnifier, not a database. */
export function SourcesGlyph({ className }: GlyphProps) {
  return <SourcesIcon className={cn("studio-glyph", className)} aria-hidden />;
}

/** Sources toggle: the selected button state carries open/closed, not the glyph. */
export function SourcesStateIcon({ open }: { open: boolean }) {
  return <span className="studio-glyph-slot" data-open={open}><SourcesGlyph /></span>;
}

/** "Edit with AI": a sparkle, the common mark for the assistant. */
export function ChatStateIcon({ open }: { open: boolean }) {
  return <span className="studio-glyph-slot" data-open={open}><SparkleIcon className="studio-glyph" aria-hidden /></span>;
}
