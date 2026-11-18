"use client";

import {
  Add01Icon,
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Copy01Icon,
  DashboardSquare01Icon,
  DatabaseIcon as HugeDatabase,
  Delete02Icon,
  Download01Icon,
  Folder01Icon,
  FolderOpenIcon as HugeFolderOpen,
  Loading03Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  PencilEdit02Icon,
  PinIcon as HugePin,
  PinOffIcon as HugePinOff,
  Search01Icon,
  SearchAreaIcon,
  SidebarLeft01Icon,
  SidebarLeftIcon,
  SquareIcon as HugeSquare,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ComponentProps } from "react";

/**
 * The app shell's icon set: Hugeicons "stroke rounded", for soft ends and
 * corners. Each export keeps the name the shell already used, so a file
 * switches sets by its import line. The marketing pages keep Lucide.
 */
type IconProps = Omit<ComponentProps<"svg">, "ref"> & { size?: number | string; strokeWidth?: number };

function icon(svg: IconSvgElement, name: string) {
  const Icon = ({ size = 16, strokeWidth = 1.7, ...props }: IconProps) => <HugeiconsIcon icon={svg} size={size} strokeWidth={strokeWidth} {...props} />;
  Icon.displayName = name;
  return Icon;
}

export const ArrowLeftIcon = icon(ArrowLeft01Icon, "ArrowLeftIcon");
export const ArrowUpIcon = icon(ArrowUp02Icon, "ArrowUpIcon");
export const ArrowUpRightIcon = icon(ArrowUpRight01Icon, "ArrowUpRightIcon");
export const CheckIcon = icon(Tick02Icon, "CheckIcon");
export const ChevronDownIcon = icon(ArrowDown01Icon, "ChevronDownIcon");
export const ChevronRightIcon = icon(ArrowRight01Icon, "ChevronRightIcon");
export const CopyIcon = icon(Copy01Icon, "CopyIcon");
export const DatabaseIcon = icon(HugeDatabase, "DatabaseIcon");
export const DownloadIcon = icon(Download01Icon, "DownloadIcon");
export const EllipsisIcon = icon(MoreHorizontalIcon, "EllipsisIcon");
export const FolderIcon = icon(Folder01Icon, "FolderIcon");
export const FolderOpenIcon = icon(HugeFolderOpen, "FolderOpenIcon");
export const LayoutDashboardIcon = icon(DashboardSquare01Icon, "LayoutDashboardIcon");
export const Loader2Icon = icon(Loading03Icon, "Loader2Icon");
export const LoaderCircleIcon = Loader2Icon;
export const PanelCloseLeftIcon = icon(SidebarLeft01Icon, "PanelCloseLeftIcon");
export const PencilIcon = icon(PencilEdit01Icon, "PencilIcon");
export const PinIcon = icon(HugePin, "PinIcon");
export const PinOffIcon = icon(HugePinOff, "PinOffIcon");
export const PlusIcon = icon(Add01Icon, "PlusIcon");
export const SearchIcon = icon(Search01Icon, "SearchIcon");
export const SidebarSimpleIcon = icon(SidebarLeftIcon, "SidebarSimpleIcon");
export const SourcesIcon = icon(SearchAreaIcon, "SourcesIcon");
export const SparkleIcon = icon(AiMagicIcon, "SparkleIcon");
export const SquareIcon = icon(HugeSquare, "SquareIcon");
export const SquarePenIcon = icon(PencilEdit02Icon, "SquarePenIcon");
export const Trash2Icon = icon(Delete02Icon, "Trash2Icon");
export const XIcon = icon(Cancel01Icon, "XIcon");
