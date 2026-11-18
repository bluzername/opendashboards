"use client";

import { OpenUICloudProvider } from "@openuidev/react-ui/cloud";
import { usePathname } from "next/navigation";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { usePanelLayout } from "@/components/shell/use-panel-layout";
import { Button } from "@/components/ui/button";
import { ChatStateIcon } from "./studio-controls";

import { NewDashboard } from "./live-dashboard";
import "./studio.css";

type Dashboard = { id: string; title: string };

type ComposeRequest = { version: number; text?: string };
const BuildPanelContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  compose: (text?: string) => void;
  composeRequest: ComposeRequest | null;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
} | null>(null);

/**
 * A dashboard the Build chat is creating, shown in place of the page it started
 * on (`at`) until the app opens it: pending while the call runs, then streaming
 * from Cloud's `response`.
 */
export type Creating = { at: string; response?: string };

type DashboardResponses = {
  responses: Readonly<Record<string, string>>;
  publish: (artifactId: string, response: string) => void;
  setCreating: Dispatch<SetStateAction<Creating | null>>;
};

const DashboardResponsesContext = createContext<DashboardResponses | null>(null);

function useDashboardResponses() {
  const context = use(DashboardResponsesContext);
  if (!context) throw new Error("Dashboard responses are only available inside AppWorkspace");
  return context;
}

/**
 * The latest create/edit response OpenUI Cloud gave for a dashboard in this
 * session. Passed to its renderer as `response`, it carries the new version,
 * so an open dashboard follows an edit as it's built.
 */
export function useDashboardResponse(artifactId: string): string | undefined {
  return useDashboardResponses().responses[artifactId];
}

/** For the Build chat: hands a create/edit response to the dashboard it's for. */
export function usePublishDashboardResponse() {
  return useDashboardResponses().publish;
}

/** For the Build chat: shows the dashboard it's creating, before the app has a page for it. */
export function useSetCreatingDashboard() {
  return useDashboardResponses().setCreating;
}

/** The Build panel's open state, for content inside the workspace. */
export function useBuildPanel() {
  const context = use(BuildPanelContext);
  if (!context) throw new Error("useBuildPanel must be used inside AppWorkspace");
  return context;
}

const WorkspaceHeaderContext = createContext<{ name: string; badges: React.ReactNode; addSource?: React.ReactNode } | null>(null);

/**
 * Built like the chat header: title on the left, compact actions on the right.
 * With chat collapsed it leads with a labelled "Edit with AI" toggle.
 */
export function WorkspaceHeader({ actions }: { actions?: React.ReactNode }) {
  const workspace = use(WorkspaceHeaderContext);
  const panel = use(BuildPanelContext);
  return <header className="studio-panel-header flex shrink-0 items-center gap-2">
    {panel && !panel.open && <>
      <Button size="sm" variant="ghost" className="studio-chat-trigger" aria-controls="app-builder" aria-expanded={false} onClick={() => panel.compose()}><ChatStateIcon open={false} />Edit with AI</Button>
      <span className="studio-header-divider" aria-hidden />
    </>}
    <span className="studio-workspace-name min-w-0 truncate font-medium" title={workspace?.name}>{workspace?.name}</span>
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">{workspace?.badges}</div>
    <div className="flex shrink-0 items-center gap-1">{workspace?.addSource}{actions}</div>
  </header>;
}

export function AppWorkspace({
  name,
  badges,
  addSource,
  builder,
  children,
}: {
  appId: string;
  name: string;
  badges: React.ReactNode;
  /** The header's "+" for adding a data source, beside Sources. */
  addSource?: React.ReactNode;
  builder: React.ReactNode;
  dashboards: Dashboard[];
  children: React.ReactNode;
}) {
  const [open, updateOpen] = useState(true);
  const { root: workspaceRef, prepare: prepareLayout } = usePanelLayout(open);
  const setOpen = useCallback((next: boolean) => {
    if (next === open) return;
    prepareLayout();
    updateOpen(next);
  }, [open, prepareLayout]);
  const previousOpen = useRef(open);
  useEffect(() => {
    // Closing hands focus to the header's Chat toggle, which takes the panel's place.
    if (previousOpen.current && !open) workspaceRef.current?.querySelector<HTMLButtonElement>(".studio-chat-trigger")?.focus({ preventScroll: true });
    previousOpen.current = open;
  }, [open, workspaceRef]);
  const [draft, setDraft] = useState("");
  const [composeRequest, setComposeRequest] = useState<ComposeRequest | null>(null);
  const compose = useCallback((text?: string) => {
    setOpen(true);
    if (text !== undefined) setDraft(text);
    setComposeRequest(current => ({ version: (current?.version ?? 0) + 1, text }));
  }, [setOpen]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const publish = useCallback(
    (artifactId: string, response: string) =>
      setResponses((current) => (current[artifactId] === response ? current : { ...current, [artifactId]: response })),
    [],
  );
  const [creating, setCreating] = useState<Creating | null>(null);
  const dashboardResponses = useMemo(() => ({ responses, publish, setCreating }), [responses, publish]);
  // Moving to another page, or to the new dashboard once it opens, hands back to the page.
  const pathname = usePathname();
  // Leaving the page once the response is in means the app opened the new dashboard
  // (or you moved on): it's done, so going back shows that page again.
  if (creating?.response && creating.at !== pathname) setCreating(null);
  const showCreating = creating !== null && creating.at === pathname;

  return (
    // One Cloud connection for the workspace: the chat and the dashboard
    // share its token and artifact cache.
    <OpenUICloudProvider token="/api/frontend-token">
    <DashboardResponsesContext value={dashboardResponses}>
    <BuildPanelContext value={{ open, setOpen, compose, composeRequest, draft, setDraft }}>
    <WorkspaceHeaderContext value={{ name, badges, addSource }}>
      <div ref={workspaceRef} className="studio-workspace relative flex h-full min-w-0">
        <div className="studio-chat-slot" data-open={open} data-shell-flip>
          <aside id="app-builder" aria-label="Chat" className="studio-chat" aria-hidden={!open} inert={!open}>
            {builder}
          </aside>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          {showCreating ? <NewDashboard response={creating.response} /> : children}
        </div>
      </div>
    </WorkspaceHeaderContext>
    </BuildPanelContext>
    </DashboardResponsesContext>
    </OpenUICloudProvider>
  );
}
