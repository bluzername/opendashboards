import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NoDashboards } from "@/components/apps/dashboard-views";
import { getCurrentUserApp } from "@/lib/apps";

type Params = Promise<{ appId: string }>;

export default function NewDashboardPage({ params }: { params: Params }) {
  return <Suspense fallback={null}><NewDashboardDraft params={params} /></Suspense>;
}

async function NewDashboardDraft({ params }: { params: Params }) {
  const { appId } = await params;
  const app = await getCurrentUserApp(appId);
  if (!app) notFound();
  return <NoDashboards hasPendingPrompt={false} newDashboard />;
}
