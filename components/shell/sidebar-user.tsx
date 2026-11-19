import { hasGatewaySession } from "@/lib/auth";
import { requireUser } from "@/lib/auth/user";

import { SidebarUserMenu } from "./sidebar-user-menu";

/** The signed-in user at the bottom of the sidebar. Reads the request, so it renders behind Suspense. */
export async function SidebarUser() {
  const user = await requireUser();
  return <SidebarUserMenu email={user.email} canSignOut={hasGatewaySession()} />;
}

export function SidebarUserFallback() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5" aria-hidden>
      <span className="size-7 rounded-full bg-neutral-200" />
      <span className="h-3 w-20 rounded bg-neutral-200" />
    </div>
  );
}
