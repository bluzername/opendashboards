"use client";

import { SquarePenIcon } from "./icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { DatabaseGlyph } from "@/components/apps/studio-controls";
import { cn } from "@/lib/utils";

/** Icons by name: Server Components can't pass component functions to this Client Component. */
const ICONS = { new: SquarePenIcon, connections: DatabaseGlyph };

type Props = {
  href: string;
  label: string;
  icon?: keyof typeof ICONS;
  /** Active only on `href` itself, not on paths below it. */
  exact?: boolean;
  /** Smaller, for items nested under another one. */
  nested?: boolean;
  /** The main action (New app): full-strength colour for text and icon, like Codex's "New thread". */
  primary?: boolean;
};

/**
 * A sidebar link with an active highlight. The highlight reads the URL, which
 * on dynamic routes is only known at request time, so the link prerenders
 * without it and the highlight streams in.
 */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}

function ActiveNavLink(props: Props) {
  const pathname = usePathname();
  const active = props.exact
    ? pathname === props.href
    : pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkView {...props} active={active} />;
}

function NavLinkView({ href, label, icon, nested, primary, active }: Props & { active: boolean }) {
  const Icon = icon ? ICONS[icon] : null;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-primary={primary || undefined}
      title={nested ? label : undefined}
      className={cn(
        "studio-nav-link flex h-8 items-center gap-3 rounded-md pr-2 pl-2 text-sm text-sidebar-foreground/85 transition-colors duration-100",
        "hover:bg-[var(--studio-hover)] hover:text-sidebar-foreground",
        nested && "text-sidebar-foreground/75",
        primary && "text-sidebar-foreground",
        active && "bg-[var(--studio-selected)] text-sidebar-foreground",
      )}
    >
      {Icon && (primary
        ? <span className="studio-primary-tile"><Icon className="studio-nav-glyph" aria-hidden /></span>
        : <Icon className="studio-nav-glyph" aria-hidden />)}
      <span className="truncate">{label}</span>
    </Link>
  );
}
