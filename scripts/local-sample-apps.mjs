// Local-only: builds sample apps through the real product flow, for evaluating
// dashboards and the Sources panel. Each app is created with its first prompt
// pending (as the New app composer does), then opened in headless Chrome so the
// agent builds it; later dashboards are asked for from the app's New dashboard
// page. Needs the dev server on :3156, the local sample data
// (local-retail-demo.mjs, local-samples-demo.mjs) and THESYS_API_KEY.
//
// Usage: node scripts/local-sample-apps.mjs <path to puppeteer-core> [chrome path]
import { createRequire } from "node:module";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local", quiet: true });
const require = createRequire(import.meta.url);
const puppeteer = require(process.argv[2] ?? "puppeteer-core");
const chrome = process.argv[3] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://127.0.0.1:3156";
const USER = "dev-user";
const NOW = "Build it now without asking me questions. Label it as sample data.";

/** Each dashboard is phrased to exercise a different way of sourcing data. */
const APPS = [
  {
    id: "15440000-0000-4000-8000-000000000002",
    name: "SaaS metrics",
    dashboards: [
      `Using the local_saas sample tables (see local_retail_schema), build a "Revenue health" dashboard. Put current MRR, ARR, active accounts and this month's logo churn rate in KPIs that all come from ONE summary query. Add a monthly MRR trend with new versus churned MRR, and MRR by plan. ${NOW}`,
      `Build a "Signups and plans" dashboard from local_saas.accounts: monthly signups by plan as a stacked bar chart, a donut of active accounts by region, and a table of the 20 most recent signups with company, plan, seats and MRR. ${NOW}`,
    ],
  },
  {
    id: "15440000-0000-4000-8000-000000000003",
    name: "Support desk",
    dashboards: [
      `Using local_support.tickets (see local_retail_schema), build a "Ticket queue" dashboard: open tickets by priority as KPIs, a daily trend of created versus resolved tickets, and a table of the oldest open Urgent and High tickets. Also show the percentage of tickets that met their first-response target (Urgent 30 min, High 60, Normal 240, Low 480), computed in the dashboard from the counts. ${NOW}`,
      `Build a "Team performance" dashboard from local_support.tickets: a leaderboard of agents by tickets resolved with their median resolution hours, average CSAT by channel, and tickets by category and weekday as a heatmap. ${NOW}`,
    ],
  },
  {
    id: "15440000-0000-4000-8000-000000000004",
    name: "Growth marketing",
    dashboards: [
      `Build a "Campaign performance" dashboard from the sample CSV files (local_files_list, then local_file_read) together with the retail database. From marketing_campaigns.csv: KPIs for total spend, signups and cost per signup, signups by channel, and a table of campaigns by month. Then compare actual retail revenue by region for 2026-Q4 from local_retail.orders against the targets in regional_targets.csv. ${NOW}`,
    ],
  },
  // One app per pair of connection types, using the dev-only sample connections (lib/tools/sample-connections.ts).
  {
    id: "15440000-0000-4000-8000-000000000005",
    name: "Product & growth",
    dashboards: [
      `Build a "Product analytics" dashboard. Use list_connections to find ids. From the PostHog connection "Product analytics" (posthog_query, HogQL on the events table): daily active users, daily signups (event signed_up), and a funnel of signed_up → project_created → upgraded_plan. From the ClickHouse connection "Event warehouse" (clickhouse_query on the events table): event volume by browser (properties $browser). ${NOW}`,
      `Build a "Website traffic" dashboard for 2026-08-20 to 2026-11-15. Use list_connections to find ids. From the GA4 connection "Marketing site" (ga4_report): sessions by channel, sessions by device, and a daily sessions trend. From the Search Console connection "example.com" (searchconsole_query): the top queries by clicks with CTR and position, and a daily clicks and impressions trend. ${NOW}`,
    ],
  },
  {
    id: "15440000-0000-4000-8000-000000000006",
    name: "Finance & operations",
    dashboards: [
      `Build a "Billing" dashboard. Use list_connections to find ids. From the MCP connection "Billing server" (mcp_tools, then mcp_call): this month's revenue summary as KPIs, revenue by month, and a table of open and past-due invoices. From the BigQuery connection "Revenue warehouse" (bigquery_query on local_saas.mrr_monthly): the monthly MRR trend. ${NOW}`,
      `Build an "Operations" dashboard. Use list_connections to find ids. From the Postgres connection "Retail database" (postgres_query): monthly orders and revenue by category. From the MySQL connection "Helpdesk" (mysql_query on tickets): open tickets by priority. From the sample CSV file nps_survey.csv (local_file_read): average NPS score by segment. Also show revenue per resolved ticket by month, which needs both the Postgres and the MySQL data together. ${NOW}`,
    ],
  },
  // Every kind of source in one place, one section each, for testing the Sources panel.
  {
    id: "15440000-0000-4000-8000-000000000007",
    name: "Source types",
    dashboards: [
      `Build a "Source gallery" dashboard for testing where data comes from. Use list_connections to find connection ids. Make one section per source, in this order, each titled with the source's name and holding one KPI and one chart or table:
1. PostHog connection "Product analytics" (posthog_query): weekly active users as a KPI, and daily pageviews as a chart.
2. ClickHouse connection "Event warehouse" (clickhouse_query): total events as a KPI, and events by operating system (properties $os) as a table.
3. Postgres connection "Retail database" (postgres_query): total revenue as a KPI, and revenue by category as a bar chart.
4. MySQL connection "Helpdesk" (mysql_query): open tickets as a KPI, and tickets by channel as a donut.
5. BigQuery connection "Revenue warehouse" (bigquery_query on local_saas.mrr_monthly): current MRR as a KPI, and the MRR trend as a chart.
6. GA4 connection "Marketing site" (ga4_report, 2026-08-20 to 2026-11-15): total sessions as a KPI, and sessions by device as a chart.
7. Search Console connection "example.com" (searchconsole_query, 2026-08-20 to 2026-11-15): total clicks as a KPI, and the top queries by clicks as a table.
8. MCP connection "Billing server" (mcp_tools, then mcp_call): the outstanding amount from revenue_summary as a KPI, and subscriptions_by_plan as a chart.
9. The sample CSV file nps_survey.csv (local_file_read): average score as a KPI, and responses by segment as a chart.
10. Combined sources: revenue per open ticket (Postgres total revenue divided by MySQL open tickets) as a KPI, and a table of marketing_campaigns.csv signups next to GA4 sessions by month.
11. No data source: a KPI "Target NPS" whose value 50 is written directly in the dashboard.
${NOW}`,
      `Build an "Edge cases" dashboard for testing layout limits with sample data. Use list_connections to find connection ids. Include all of these:
1. A KPI labelled "Average monthly recurring revenue per active enterprise account across all regions (sample)" whose value is the total revenue from local_retail.orders multiplied by 1000000, from the Postgres connection "Retail database".
2. A KPI labelled "Orders in a category with no data" from a Postgres query that returns no rows (orders where category = 'Nonexistent').
3. A chart titled "Monthly revenue, profit and order volume by category and region for the full sample period, before and after refunds" with a two-sentence description, from one long Postgres query that uses at least three CTEs and long column aliases.
4. A table of every column of the CSV file customer_feedback_responses_q3_q4_2026_full_export_with_comments.csv (local_file_read), including the long comment text.
5. A table with at least ten columns from tickets via the MySQL connection "Helpdesk".
6. A chart from the MCP connection "Billing server": mcp_call list_invoices with status past_due and limit 200.
7. A chart from the GA4 connection "Marketing site" with dimensions date, sessionDefaultChannelGroup and deviceCategory and metrics sessions, activeUsers, conversions and totalRevenue, 2026-08-20 to 2026-11-15.
8. One KPI combining four sources: Postgres total revenue, MySQL open tickets, BigQuery current MRR (local_saas.mrr_monthly) and the PostHog event count.
${NOW}`,
    ],
  },
];

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const count = async (appId) => Number((await db.query("SELECT COUNT(*) FROM dashboards WHERE app_id = $1", [appId])).rows[0].count);
const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

/** Waits for the app to have `target` dashboards and the agent to stop running. */
async function settle(page, appId, target, label) {
  const deadline = Date.now() + 9 * 60_000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const have = await count(appId);
    const running = await page.$('[aria-label="Stop"]').then(Boolean).catch(() => false);
    if (have >= target && !running) return log(`✓ ${label} (${have} dashboards)`);
  }
  throw new Error(`Timed out building ${label}`);
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: "new" });
try {
  for (const app of APPS) {
    const [first, ...rest] = app.dashboards;
    const existing = await db.query("SELECT 1 FROM apps WHERE id = $1", [app.id]);
    if (!existing.rowCount) {
      await db.query("INSERT INTO apps (id, user_id, name, pending_prompt) VALUES ($1, $2, $3, $4)", [app.id, USER, app.name, first]);
    }
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    if ((await count(app.id)) < 1) {
      log(`Building ${app.name} · dashboard 1`);
      await page.goto(`${BASE}/apps/${app.id}`, { waitUntil: "networkidle2", timeout: 120_000 }).catch(() => {});
      await settle(page, app.id, 1, `${app.name} · dashboard 1`);
    }
    for (const [i, prompt] of rest.entries()) {
      const target = i + 2;
      if ((await count(app.id)) >= target) continue;
      log(`Building ${app.name} · dashboard ${target}`);
      await page.goto(`${BASE}/apps/${app.id}/new`, { waitUntil: "networkidle2", timeout: 120_000 }).catch(() => {});
      await sleep(4000);
      await page.waitForSelector(".studio-composer-input", { timeout: 60_000 });
      await page.click(".studio-composer-input");
      await page.type(".studio-composer-input", prompt);
      await page.keyboard.press("Enter");
      await settle(page, app.id, target, `${app.name} · dashboard ${target}`);
    }
    await page.close();
  }
  const rows = await db.query("SELECT a.name, d.title FROM dashboards d JOIN apps a ON a.id = d.app_id ORDER BY a.created_at, d.position");
  for (const row of rows.rows) log(`${row.name} → ${row.title}`);
} finally {
  await browser.close();
  await db.end();
}
