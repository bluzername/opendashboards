import { DatabaseIcon, SquarePenIcon, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/apps", label: "New app", icon: SquarePenIcon },
  { href: "/connections", label: "Data connections", icon: DatabaseIcon },
];
