"use client";

/** Names are edited in the sidebar, so the dashboard title is always a heading. */
export function DashboardTitle({ dashboard }: {
  dashboard: { id: string; title: string; description: string | null };
}) {
  return <div className="@container bg-background text-foreground">
    <header className="mx-auto max-w-[1440px] px-4 pt-6 @min-[721px]:px-9 @min-[721px]:pt-8">
      <h1 className="text-xl leading-tight font-semibold tracking-tight">{dashboard.title}</h1>
      {dashboard.description && <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">{dashboard.description}</p>}
    </header>
  </div>;
}
