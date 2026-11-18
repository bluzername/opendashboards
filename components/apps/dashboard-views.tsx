"use client";

import { LayoutDashboardIcon, LoaderCircleIcon } from "@/components/shell/icons";
import { Button } from "@/components/ui/button";
import { ChatStateIcon } from "./studio-controls";
import { WorkspaceHeader, useBuildPanel } from "./app-workspace";

/** Build owns the input. The canvas explains where the result will appear. */
export function NoDashboards({ hasPendingPrompt }: { hasPendingPrompt: boolean; newDashboard?: boolean }) {
  const build = useBuildPanel();
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-shell-flip>
    <WorkspaceHeader />
    <div className="studio-canvas-empty">
      <div className="studio-empty-content">
        {hasPendingPrompt ? <LoaderCircleIcon className="studio-empty-symbol animate-spin" aria-hidden /> : <LayoutDashboardIcon className="studio-empty-symbol" aria-hidden />}
        <h1>{hasPendingPrompt ? "Bringing your data into view" : "Your dashboard starts here"}</h1>
        <p>{hasPendingPrompt ? "Exploring your data and putting the first view together." : "Describe what you want to track in the chat. Your metrics and charts will take shape here."}</p>
        {!hasPendingPrompt && <Button variant="ghost" size="sm" className="studio-empty-action" onClick={() => build.compose()}><ChatStateIcon open={false} />{build.open ? "Describe your dashboard" : "Open chat"}</Button>}
      </div>
    </div>
  </div>;
}
