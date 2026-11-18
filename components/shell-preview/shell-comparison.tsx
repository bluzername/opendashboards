"use client";

import { ChevronDownIcon, DatabaseIcon, LayoutDashboardIcon, PlusIcon, SquarePenIcon } from "lucide-react";
import { useRef, useState } from "react";
import { AppWorkspace } from "@/components/apps/app-workspace";
import { Brand } from "@/components/shell/brand";
import { Footer } from "@/components/shell/footer";
import { Button } from "@/components/ui/button";

/** Local design harness. AppWorkspace is imported unchanged from main.
 * The dashboard and conversation are fixtures, with no agent, database or Cloud calls.
 * Both comparison modes load the same inspector source; do not copy it into another shell.
 */
export function ShellComparison() {
  const [sources, setSources] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dashboard = useRef<HTMLIFrameElement>(null);

  function changeMode(next: boolean) {
    setSources(next);
    dashboard.current?.contentWindow?.postMessage({ type: "shell-preview-mode", sources: next }, window.location.origin);
  }

  return (
    <div className="flex h-dvh flex-col bg-neutral-50">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-3 border-b bg-white px-4 py-2 text-xs">
        <span className="font-medium">Shell comparison</span>
        <div className="flex rounded-lg border p-0.5" role="group" aria-label="Comparison view">
          <Button size="sm" variant={!sources ? "secondary" : "ghost"} aria-pressed={!sources} onClick={() => changeMode(false)}>Existing shell</Button>
          <Button size="sm" variant={sources ? "secondary" : "ghost"} aria-pressed={sources} onClick={() => changeMode(true)}>Sources design</Button>
        </div>
        <span className="text-muted-foreground">{sources ? "Proposed inspection · Build stays available" : "OpenDashboards main · 2a3f26f"}</span>
        <span className="ml-auto text-muted-foreground">Sample dashboard & chat</span>
        <a href="https://github.com/thesysdev/opendashboards" target="_blank" rel="noreferrer" className="underline underline-offset-4">Repository</a>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col px-2 py-3 md:flex" aria-label="Workspace navigation">
          <div className="mb-3 flex h-9 shrink-0 items-center px-2"><Brand /></div>
          <nav className="flex min-h-0 flex-1 flex-col" aria-label="Main">
            <button className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm text-foreground/80 hover:bg-black/[0.04]" onClick={() => setNotice("This comparison uses a sample app. Live dashboard generation needs an OpenUI Cloud connection.")}><SquarePenIcon className="size-4" />New App</button>
            <div className="mt-2 min-h-0 flex-1">
              <div className="flex h-8 items-center gap-2 px-1 text-sm font-medium"><ChevronDownIcon className="size-3.5" />Retail workspace</div>
              <div className="ml-5 flex h-8 items-center gap-2 rounded-lg bg-black/[0.06] px-2 text-sm"><LayoutDashboardIcon className="size-3.5 text-muted-foreground" />Business overview</div>
            </div>
            <button className="flex h-10 items-center gap-2.5 border-t px-2 text-sm text-foreground/80" onClick={() => setNotice("Data Connections manages credentials and connected services. Sources explains the data behind a dashboard value. They are separate tasks.")}><DatabaseIcon className="size-4" />Data Connections</button>
          </nav>
          <div className="mt-1 flex h-10 items-center gap-2 px-2 text-sm"><span className="flex size-7 items-center justify-center rounded-full bg-neutral-200 text-xs">R</span>Sample workspace</div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-2 mt-2 min-h-0 flex-1 overflow-hidden rounded-xl border bg-background md:ml-0" onClickCapture={(event) => {
            const target = (event.target as HTMLElement).closest("button[title='Rename'], a[href^='/apps']");
            if (target) { event.preventDefault(); event.stopPropagation(); setNotice("App navigation and saved names are fixtures here. The Build layout is the existing app component."); }
          }}>
            <AppWorkspace
              appId="shell-preview"
              name="Retail workspace"
              badges={<span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">Retail data</span>}
              dashboards={[{ id: "overview", title: "Business overview" }]}
              builder={<SampleConversation />}
            >
              <iframe ref={dashboard} title="Business overview dashboard" src="/shell-design/index.html?embed=1&baseline=1" className="min-h-0 w-full flex-1 border-0" onLoad={() => dashboard.current?.contentWindow?.postMessage({ type: "shell-preview-mode", sources }, window.location.origin)} />
            </AppWorkspace>
          </main>
          <Footer />
        </div>
      </div>
      {notice && <div role="dialog" aria-modal="true" aria-label="About the shell preview" className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-6" onClick={() => setNotice(null)}><div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}><p className="text-sm leading-6">{notice}</p><Button autoFocus className="mt-5" onClick={() => setNotice(null)}>Got it</Button></div></div>}
    </div>
  );
}

function SampleConversation() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 text-xs"><span className="flex-1">Business overview</span><ChevronDownIcon className="size-3.5 text-muted-foreground" /><PlusIcon className="size-3.5 text-muted-foreground" /></div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-6">
        <p className="text-xs text-muted-foreground">Sample conversation</p>
        <p className="rounded-xl bg-neutral-100 p-3">Build a business overview with revenue, orders, average order value, and top categories.</p>
        <div className="space-y-3"><p>Your business overview is ready. It includes revenue trends, category performance, and recent orders.</p><p>Use the comparison control above to explore the proposed Sources interaction alongside this conversation.</p></div>
      </div>
      <div className="border-t p-4"><div className="rounded-xl border bg-neutral-50 p-3 text-sm text-muted-foreground">Ask for a change…</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Chat generation is not connected in this local design preview.</p></div>
    </div>
  );
}
