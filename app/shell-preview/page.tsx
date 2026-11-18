import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ShellComparison } from "@/components/shell-preview/shell-comparison";

export const metadata = { title: "Shell comparison", robots: { index: false, follow: false } };

export default function ShellPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  if (process.env.LOCAL_RETAIL_DEMO === "1") redirect("/apps/15440000-0000-4000-8000-000000000001");
  return <Suspense><ShellComparison /></Suspense>;
}
