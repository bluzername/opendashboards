"use client";

import { SidebarSimpleIcon, SquarePenIcon, XIcon } from "./icons";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DatabaseGlyph, StudioIconButton } from "@/components/apps/studio-controls";
import { cn } from "@/lib/utils";
import { usePanelLayout } from "./use-panel-layout";
import "@/components/apps/studio.css";

/** The navigation's own affordance is distinct from Build and Sources. */
export function ShellFrame({ navigation, user, children }: { navigation: ReactNode; user: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { root: shellRef, prepare: prepareLayout } = usePanelLayout(collapsed);
  return <div ref={shellRef} className="studio-shell flex h-dvh overflow-hidden bg-background text-foreground">
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-foreground/20 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside aria-label="Navigation" className={cn("studio-sidebar", mobileOpen && "studio-sidebar-mobile-open")} data-collapsed={collapsed}>
      <div className="studio-sidebar-header">
        <Link href="/apps" aria-label="OpenDashboards home" className="studio-brand"><Image src="/shiro-logo.svg" alt="OpenDashboards" width={28} height={22} className="h-auto" priority /></Link>
        <StudioIconButton className="studio-sidebar-toggle hidden md:inline-flex" label={collapsed ? "Show sidebar" : "Hide sidebar"} onClick={() => { prepareLayout(); setCollapsed(!collapsed); }} aria-expanded={!collapsed}>
          <SidebarSimpleIcon />
        </StudioIconButton>
        <StudioIconButton className="ml-auto md:hidden" label="Close" onClick={() => setMobileOpen(false)}><XIcon /></StudioIconButton>
      </div>
      <div className="studio-sidebar-content" aria-hidden={collapsed && !mobileOpen} inert={collapsed && !mobileOpen} onClick={(event) => { if ((event.target as HTMLElement).closest('a')) setMobileOpen(false); }}>
        {navigation}
        <div className="mt-2 shrink-0">{user}</div>
      </div>
      <nav className="studio-sidebar-rail" aria-label="Quick navigation" aria-hidden={!collapsed} inert={!collapsed}>
        <Button asChild variant="ghost" size="icon" className="studio-icon-button"><Link href="/apps" title="New app" aria-label="New app"><SquarePenIcon /></Link></Button>
        <Button asChild variant="ghost" size="icon" className="studio-icon-button mt-auto"><Link href="/connections" title="Data connections" aria-label="Data connections"><DatabaseGlyph /></Link></Button>
      </nav>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
        <StudioIconButton label="Menu" onClick={() => setMobileOpen(true)}><SidebarSimpleIcon /></StudioIconButton>
        <span className="text-sm font-medium">OpenDashboards</span>
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  </div>;
}
