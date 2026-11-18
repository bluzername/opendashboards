import { getDashboardService, readDashboard } from "@/lib/dashboards";
import { scriptInputs } from "@/lib/dashboards/script-inputs";
import { getConnectionService } from "@/lib/connections";
import { toolsFor } from "@/lib/tools";
import { listedSampleConnections } from "@/lib/tools/sample-connections";
import { HttpError, route } from "@/lib/http";

export const GET = route(async (request, user) => {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new HttpError(400, "Dashboard id required");
  const dashboard = await getDashboardService().findByArtifact(user.id, id);
  if (!dashboard) throw new HttpError(404, "Dashboard not found");
  const source = await readDashboard(user.id, dashboard.appId, id);
  if (!source.ok) throw new HttpError(502, "Couldn't load the dashboard script");
  // `tools` tells real data tools apart from generated scripts; `scripts` lists what each script read;
  // `connections` names the connections queries point at.
  const connections = Object.fromEntries(
    [...(await getConnectionService().list(user.id)), ...listedSampleConnections()].map(({ id, name, source }) => [id, { name, source }]),
  );
  return Response.json(
    { program: source.program, tools: toolsFor("dashboard").map((tool) => tool.name), scripts: scriptInputs(id), connections },
    { headers: { "Cache-Control": "no-store" } },
  );
});
