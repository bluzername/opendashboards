"use client";

import { Loader2Icon, PlusIcon } from "@/components/shell/icons";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { addAppConnectionAction } from "@/app/(app)/apps/actions";
import { SourceTile } from "@/components/connections/source-tile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type AddableConnection = { id: string; name: string; source: string; tile: string };

/**
 * The header's "+" beside Sources: adds another of the user's connections to
 * the app, or goes to Data Connections to connect a new one.
 */
export function AddAppConnection({ appId, connections }: { appId: string; connections: AddableConnection[] }) {
  const [pending, startTransition] = useTransition();

  function add(connection: AddableConnection) {
    startTransition(async () => {
      const result = await addAppConnectionAction({ appId, connectionId: connection.id });
      if (result.ok) toast.success(`Added ${connection.name} to this app`);
      else toast.error(result.error.message);
    });
  }

  return (
    <DropdownMenu>
      <Tooltip delayDuration={450}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            disabled={pending}
            aria-label="Add data source"
            className="studio-icon-button inline-flex shrink-0 items-center justify-center outline-none"
          >
            {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : <PlusIcon aria-hidden />}
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="studio-tooltip">Add source</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="studio-menu w-64">
        {connections.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Add to this app</DropdownMenuLabel>
            {connections.map((connection) => (
              <DropdownMenuItem key={connection.id} onSelect={() => add(connection)}>
                <SourceTile label={connection.tile} className="size-6 rounded-md" />
                <span className="min-w-0 flex-1 truncate">{connection.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{connection.source}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/connections">
            <PlusIcon aria-hidden />
            Connect a new source
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
