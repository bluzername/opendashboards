"use client";

import { LogOutIcon } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { AvatarCircle } from "./user-avatar";

/** The signed-in user's row at the bottom of the sidebar, with Sign out when there's a gateway session to end. */
export function SidebarUserMenu({ email, canSignOut }: { email: string; canSignOut: boolean }) {
  const identity = (
    <>
      <AvatarCircle name={email} className="size-7" />
      <span className="min-w-0 truncate text-sm text-foreground/80" title={email}>
        {email}
      </span>
    </>
  );

  if (!canSignOut) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5" aria-label={`Signed in as ${email}`}>
        {identity}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${email}`}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none data-[state=open]:bg-black/[0.06]"
      >
        {identity}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="min-w-52">
        <DropdownMenuItem asChild>
          <form method="post" action="/auth/signout">
            <button type="submit" className="contents">
              <LogOutIcon aria-hidden />
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
