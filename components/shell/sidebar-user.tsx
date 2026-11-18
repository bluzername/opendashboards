import { requireUser } from "@/lib/auth/user";

import { AvatarCircle } from "./user-avatar";

/** The signed-in user at the bottom of the sidebar. Reads the request, so it renders behind Suspense. */
export async function SidebarUser() {
  const user = await requireUser();
  return (
    <div className="flex h-10 items-center gap-2 pr-2 pl-1" aria-label={`Signed in as ${user.email}`}>
      <AvatarCircle name={user.email} className="size-6 bg-[var(--studio-selected)] text-[10px] font-medium tracking-wide text-sidebar-foreground/70" />
      <span className="min-w-0 truncate text-sm text-sidebar-foreground/70" title={user.email}>
        {user.email}
      </span>
    </div>
  );
}

export function SidebarUserFallback() {
  return (
    <div className="flex h-10 items-center gap-2 pr-2 pl-1" aria-hidden>
      <span className="size-6 rounded-full bg-[var(--studio-selected)]" />
      <span className="h-3 w-28 rounded bg-sidebar-accent" />
    </div>
  );
}
