"use client";

import { EllipsisIcon, Loader2Icon, PencilIcon, PinIcon, PinOffIcon, PlusIcon, Trash2Icon } from "@/components/shell/icons";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteAppAction } from "@/app/(app)/apps/actions";
import Link from "next/link";
import { appPath } from "@/lib/apps/paths";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type App = { id: string; name: string; dashboardCount: number };

export function AppMenu({ app, onRename, pinned, onTogglePin, className }: { app: App; onRename: () => void; pinned?: boolean; onTogglePin?: () => void; className?: string }) {
  const [deleting, setDeleting] = useState(false);
  // Rename starts once the menu has closed: while open, it holds focus and
  // would pull it straight back out of the name being edited.
  const renameOnClose = useRef(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" className={cn("size-7 text-muted-foreground hover:text-foreground", className)} aria-label={`Actions for ${app.name}`} title="More actions">
            <EllipsisIcon className="size-[18px]" strokeWidth={1.5} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={6}
          className="studio-menu w-48"
          onCloseAutoFocus={(event) => {
            if (!renameOnClose.current) return;
            renameOnClose.current = false;
            event.preventDefault();
            onRename();
          }}
        >
          <DropdownMenuItem asChild><Link href={`${appPath(app.id)}/new`}><PlusIcon strokeWidth={1.5} aria-hidden />New dashboard</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => (renameOnClose.current = true)}>
            <PencilIcon strokeWidth={1.5} aria-hidden />
            Rename
          </DropdownMenuItem>
          {onTogglePin && <DropdownMenuItem onSelect={onTogglePin}>
            {pinned ? <PinOffIcon strokeWidth={1.5} aria-hidden /> : <PinIcon strokeWidth={1.5} aria-hidden />}
            {pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2Icon strokeWidth={1.5} aria-hidden />
            Delete app
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDialog app={app} open={deleting} onOpenChange={setDeleting} />
    </>
  );
}

function DeleteDialog({
  app,
  open,
  onOpenChange,
}: {
  app: App;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // Only returns when deleting failed; on success it navigates to /apps.
      const result = await deleteAppAction({ id: app.id });
      if (result && !result.ok) setError(result.error.message);
      else toast.success(`${app.name} deleted`);
    });
  }

  const dashboards =
    app.dashboardCount === 1 ? "its dashboard" : app.dashboardCount ? `its ${app.dashboardCount} dashboards` : null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) setError(null);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {app.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the app{dashboards ? `, ${dashboards}` : ""} and its build history. It can&apos;t be
            undone. Your data connections aren&apos;t affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            Delete app
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
