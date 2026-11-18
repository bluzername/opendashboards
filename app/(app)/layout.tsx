import type { Metadata } from "next";
import { Suspense } from "react";

import { AnalyticsUser } from "@/components/analytics-user";
import { AppsTree } from "@/components/shell/apps-tree";
import { ShellFrame } from "@/components/shell/shell-frame";
import { NavLink } from "@/components/shell/nav-link";
import { SidebarUser, SidebarUserFallback } from "@/components/shell/sidebar-user";
import { requireUser } from "@/lib/auth/user";

/** Everything in here is a signed-in user's own; only the landing page is for crawlers. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>
    <Suspense fallback={null}><IdentifyUser /></Suspense>
    <ShellFrame
      navigation={<nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
        <NavLink href="/apps" label="New app" icon="new" exact primary />
        <div className="studio-sidebar-scroll mt-5 min-h-0 flex-1 overflow-y-auto pb-2"><Suspense fallback={null}><AppsTree /></Suspense></div>
        <div className="shrink-0 pt-2"><NavLink href="/connections" label="Data connections" icon="connections" /></div>
      </nav>}
      user={<Suspense fallback={<SidebarUserFallback />}><SidebarUser /></Suspense>}
    >{children}</ShellFrame>
  </>;
}

async function IdentifyUser() {
  const user = await requireUser();
  return <AnalyticsUser id={user.id} email={user.email} />;
}
