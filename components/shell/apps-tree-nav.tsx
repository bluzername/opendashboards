"use client";

import { ChevronRightIcon, PlusIcon } from "./icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { renameAppAction, updateDashboardAction } from "@/app/(app)/apps/actions";
import { AppMenu } from "@/components/apps/app-menu";
import { FolderGlyph, FolderOpenGlyph } from "@/components/apps/studio-controls";
import { InlineRename } from "@/components/inline-rename";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppTreeNode } from "@/lib/apps";
import { appPath, dashboardPath, parseAppPath } from "@/lib/apps/paths";
import { cn } from "@/lib/utils";

import { DashboardMenu } from "./dashboard-menu";
import { isPinned, rememberDashboard, setRecentsOpen, togglePin, useSidebarMemory } from "./sidebar-memory";

/** A compact app tree. Only the current app expands automatically. */
export function AppsTreeNav({ apps }: { apps: AppTreeNode[] }) {
  return (
    <Suspense fallback={<Tree apps={apps} pathname={null} />}>
      <ActiveTree apps={apps} />
    </Suspense>
  );
}

function ActiveTree({ apps }: { apps: AppTreeNode[] }) {
  return <Tree apps={apps} pathname={usePathname()} />;
}

function Tree({ apps, pathname }: { apps: AppTreeNode[]; pathname: string | null }) {
  const { appId: activeAppId, dashboardId } = parseAppPath(pathname);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activeAppId ? [activeAppId] : []));
  const [lastActive, setLastActive] = useState(activeAppId);
  if (activeAppId !== lastActive) {
    setLastActive(activeAppId);
    if (activeAppId && !expanded.has(activeAppId)) setExpanded(new Set(expanded).add(activeAppId));
  }

  // Show successful names immediately, while the server refresh catches up.
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, { from: string; to: string }>>({});
  const shown = (id: string, name: string) => (saved[id]?.from === name ? saved[id].to : name);
  const done = (id: string, name: string) => (next: string) => {
    setSaved((current) => ({ ...current, [id]: { from: name, to: next } }));
    setEditing(null);
  };

  // Pinned and Recents live in this browser; the tree is what the server knows.
  const { pins, recents, recentsOpen } = useSidebarMemory();
  const activeApp = apps.find((app) => app.id === activeAppId);
  const currentDashboardId = activeApp && !pathname?.endsWith("/new") ? (dashboardId ?? activeApp.dashboards[0]?.id) : undefined;
  useEffect(() => { if (currentDashboardId) rememberDashboard(currentDashboardId); }, [currentDashboardId]);
  const dashboardsById = new Map(apps.flatMap((app) => app.dashboards.map((dashboard) => [dashboard.id, { app, dashboard }] as const)));
  const appsById = new Map(apps.map((app) => [app.id, app]));
  // Only whole apps are pinned, and a pinned app moves out of Apps into Pinned.
  const pinnedApps = pins.flatMap((pin) => { const app = pin.kind === "app" ? appsById.get(pin.id) : undefined; return app ? [app] : []; });
  const unpinnedApps = apps.filter((app) => !isPinned(pins, "app", app.id));
  const recentRows = recents.flatMap((id) => {
    const found = dashboardsById.get(id);
    return found ? [{ id, href: dashboardPath(found.app.id, found.dashboard.id), title: shown(id, found.dashboard.title), meta: shown(found.app.id, found.app.name) }] : [];
  });

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // One app group (folder, its dashboards, "+" and "⋯"), the same wherever it is listed.
  const renderApp = (app: AppTreeNode) => {
        const isActiveApp = app.id === activeAppId;
        const isOpen = expanded.has(app.id);
        const isDraft = isActiveApp && pathname?.endsWith("/new");
        const activeDashboardId = isActiveApp && !isDraft ? (dashboardId ?? app.dashboards[0]?.id) : undefined;
        const appName = shown(app.id, app.name);

        return (
          <li key={app.id}>
            <div className="studio-tree-row studio-tree-group-row group/app relative">
              {editing === app.id ? (
                <div className="flex h-8 items-center pr-1 pl-7">
                  <InlineRename
                    value={appName}
                    label="App name"
                    maxLength={80}
                    onSave={(name) => renameAppAction({ id: app.id, name })}
                    onDone={done(app.id, app.name)}
                    className="h-7 w-full text-sm"
                  />
                </div>
              ) : (
                <>
                  <Link
                    href={appPath(app.id)}
                    onClick={() => setExpanded((current) => new Set(current).add(app.id))}
                    onDoubleClick={(event) => { event.preventDefault(); setEditing(app.id); }}
                    aria-current={isActiveApp && !app.dashboards.length && !isDraft ? "page" : undefined}
                    title={appName}
                    className={cn(
                      "studio-tree-group-link flex h-8 items-center rounded-md pl-9 text-sm text-sidebar-foreground/85",
                      "transition-colors duration-100 hover:bg-[var(--studio-hover)] hover:text-sidebar-foreground",
                      isActiveApp && "text-sidebar-foreground",
                    )}
                  >
                    <span className="truncate">{appName}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(app.id)}
                    aria-expanded={isOpen}
                    aria-controls={`app-dashboards-${app.id}`}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${appName}`}
                    className="studio-folder-toggle absolute top-1 left-1 flex size-6 items-center justify-center rounded-[6px]"
                  >
                    <FolderGlyph className="studio-nav-glyph studio-folder-closed" />
                    <FolderOpenGlyph className="studio-nav-glyph studio-folder-open" />
                  </button>
                  <div className="studio-row-actions absolute top-1 right-1 flex items-center gap-0.5">
                    <Tooltip delayDuration={350}>
                      <TooltipTrigger asChild>
                        <Link
                          href={`${appPath(app.id)}/new`}
                          onClick={() => setExpanded((current) => new Set(current).add(app.id))}
                          aria-label={`New dashboard in ${appName}`}
                          className="studio-row-action"
                        ><PlusIcon aria-hidden /></Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>New dashboard</TooltipContent>
                    </Tooltip>
                    <AppMenu
                      app={{ id: app.id, name: appName, dashboardCount: app.dashboards.length }}
                      onRename={() => setEditing(app.id)}
                      pinned={isPinned(pins, "app", app.id)}
                      onTogglePin={() => togglePin("app", app.id)}
                    />
                  </div>
                </>
              )}
            </div>

            <div
              id={`app-dashboards-${app.id}`}
              aria-hidden={!isOpen}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-opacity motion-reduce:duration-100",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <ul aria-label={`${appName} dashboards`} className="min-h-0 overflow-hidden">
                {app.dashboards.map((dashboard) => {
                  const active = dashboard.id === activeDashboardId;
                  const title = shown(dashboard.id, dashboard.title);
                  return (
                    <li key={dashboard.id} className="studio-tree-row studio-tree-dashboard-row relative mt-px">
                      {editing === dashboard.id ? (
                        <div className="flex h-8 items-center pr-1 pl-7">
                          <InlineRename
                            value={title}
                            label="Dashboard name"
                            maxLength={120}
                            onSave={(next) => updateDashboardAction({ appId: app.id, dashboardId: dashboard.id, title: next })}
                            onDone={done(dashboard.id, dashboard.title)}
                            className="h-7 w-full text-sm"
                          />
                        </div>
                      ) : (
                        <>
                          <Link
                            href={dashboardPath(app.id, dashboard.id)}
                            onDoubleClick={(event) => { event.preventDefault(); setEditing(dashboard.id); }}
                            aria-current={active ? "page" : undefined}
                            title={title}
                            className={cn(
                              "studio-tree-dashboard-link flex h-8 items-center rounded-md pl-9 text-sm text-sidebar-foreground/70",
                              "transition-colors duration-100 hover:bg-[var(--studio-hover)] hover:text-sidebar-foreground",
                              active && "bg-[var(--studio-selected)] text-sidebar-foreground",
                            )}
                          ><span className="truncate">{title}</span></Link>
                          <div className="studio-row-actions absolute top-1 right-1 flex items-center">
                            <DashboardMenu appId={app.id} dashboard={{ id: dashboard.id, title }} onRename={() => setEditing(dashboard.id)} />
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
                {isDraft && (
                  <li className="mt-px">
                    <Link href={`${appPath(app.id)}/new`} aria-current="page" className="flex h-8 items-center rounded-md bg-[var(--studio-selected)] pr-3 pl-9 text-sm text-sidebar-foreground">
                      New dashboard
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </li>
        );
  };

  return (
    <div className="studio-sidebar-sections">
      {pinnedApps.length > 0 && (
        <section aria-labelledby="sidebar-pinned">
          <h2 id="sidebar-pinned" className="studio-section-label">Pinned</h2>
          <ul aria-label="Pinned apps" className="studio-tree flex flex-col gap-1">{pinnedApps.map(renderApp)}</ul>
        </section>
      )}

      {unpinnedApps.length > 0 && <section aria-labelledby="sidebar-apps">
        <h2 id="sidebar-apps" className="studio-section-label">Apps</h2>
    <ul aria-label="Your apps" className="studio-tree flex flex-col gap-1">
      {unpinnedApps.map(renderApp)}
    </ul>
      </section>}

      {recentRows.length > 0 && (
        <section aria-labelledby="sidebar-recents">
          <h2 id="sidebar-recents" className="studio-section-label">
            <button type="button" className="studio-section-toggle" aria-expanded={recentsOpen} aria-controls="sidebar-recents-list" onClick={() => setRecentsOpen(!recentsOpen)}>
              Recents<ChevronRightIcon className="studio-section-caret" aria-hidden />
            </button>
          </h2>
          <div id="sidebar-recents-list" aria-hidden={!recentsOpen} inert={!recentsOpen} className={cn("studio-collapse", recentsOpen && "studio-collapse-open")}>
            <ul className="studio-flat-list min-h-0 overflow-hidden">
              {recentRows.map((row) => (
                <li key={row.id} className="studio-flat-row">
                  <Link href={row.href} title={`${row.title} · ${row.meta}`} className="studio-flat-link">
                    <span className="truncate">{row.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
