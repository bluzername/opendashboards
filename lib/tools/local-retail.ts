import "server-only";
import pg from "pg";
import { z } from "zod";
import type { Tool } from "./index";

export const localRetailEnabled = () => process.env.NODE_ENV !== "production" && process.env.LOCAL_RETAIL_DEMO === "1";
const querySchema = z.object({ sql: z.string().min(1).max(20000) });

/** Development dataset only. Separate read-only role; never opens user-supplied hosts. */
export const localRetailTools: Tool[] = [
  {
    name: "local_retail_schema",
    description: "Schema of the ready-to-query LOCAL SAMPLE datasets: retail orders (local_retail), a SaaS subscription business (local_saas) and a support desk (local_support). No connection id needed. Query them with local_retail_query. Sample CSV files are separate: local_files_list.",
    callers: ["agent"], parameters: z.toJSONSchema(z.object({})),
    async run() {
      if (!localRetailEnabled()) throw new Error("Local dataset unavailable");
      return { sample: true, date_range: ["2026-08-20","2026-11-17"], tables: {
        "local_retail.orders": "id integer, order_date date, customer_id integer, category text, region text, revenue numeric, cost numeric, status text. 1800 completed orders. Revenue and cost are USD. Profit = revenue - cost.",
        "local_retail.daily_sales": "date date, revenue numeric, orders integer, average_order_value numeric, profit numeric",
        "local_retail.category_sales": "category text, revenue numeric, orders integer, profit numeric",
        "local_saas.accounts": "id integer, company text, plan text (Starter, Team, Business, Enterprise), region text, signup_date date, churn_date date (null while active), seats integer, mrr numeric. 640 accounts signed up 2025-12-01 to 2026-11-17. MRR is USD per month.",
        "local_saas.mrr_monthly": "month date (first of month, 2025-12 to 2026-11), active_accounts integer, mrr numeric, new_mrr numeric, churned_mrr numeric, new_accounts integer, churned_accounts integer",
        "local_support.tickets": "id integer, created_at timestamp, resolved_at timestamp (null while open), status text (open, resolved), priority text (Urgent, High, Normal, Low), channel text (Email, Chat, Phone), category text, agent text, first_response_minutes integer, csat integer 1-5 (null when not rated). 2400 tickets 2026-08-20 to 2026-11-17.",
        "local_support.daily_tickets": "date date, created integer, resolved integer"
      }, query_tool: "local_retail_query", files_tool: "local_files_list", note: "Prefix tables with their schema (local_retail, local_saas, local_support). Retail counts are orders, not units. These are generated sample records, not company data." };
    },
  },
  {
    name: "local_retail_query",
    description: "Runs one SELECT query against the local sample retail PostgreSQL dataset. Use local_retail_schema for tables. No connection id. Returns columns and rows. Use aggregate SQL for dashboard metrics and charts.",
    parameters: z.toJSONSchema(querySchema), callers: ["agent", "dashboard"],
    output: { columns: ["revenue"], rows: [{ revenue: 1234 }], truncated: false },
    async run(input, _context, { signal, caller }) {
      if (!localRetailEnabled()) throw new Error("Local dataset unavailable");
      const { sql } = querySchema.parse(input);
      const url = new URL(process.env.LOCAL_RETAIL_DATABASE_URL ?? "");
      if (!["localhost","127.0.0.1"].includes(url.hostname) || url.port !== "54329" || url.pathname !== "/opendashboards" || url.username !== "local_retail_reader") throw new Error("Invalid local dataset configuration");
      signal.throwIfAborted();
      const client = new pg.Client({
        connectionString: url.toString(), connectionTimeoutMillis: 3000, statement_timeout: 10000,
        // A calendar date has no timezone. Keep PostgreSQL DATE values as text
        // instead of turning local midnight into the previous UTC day.
        types: { getTypeParser: (oid, format) => oid === 1082 ? (value: string) => value : pg.types.getTypeParser(oid, format) },
      });
      client.on("error", () => {});
      try {
        await client.connect();
        await client.query("BEGIN READ ONLY");
        await client.query({text: `DECLARE local_preview_cursor NO SCROLL CURSOR FOR ${sql.trim().replace(/;\s*$/, "")}`, queryMode: "extended"} as pg.QueryConfig);
        const max = caller === "agent" ? 200 : 10000;
        const result = await client.query(`FETCH ${max + 1} FROM local_preview_cursor`);
        signal.throwIfAborted();
        const rows = result.rows.slice(0,max).map(row => Object.fromEntries(result.fields.map(field => {
          const value = row[field.name];
          return [field.name, value == null ? null : [20,1700].includes(field.dataTypeID) ? Number(value) : value instanceof Date ? value.toISOString() : value];
        })));
        return { columns: result.fields.map(field => field.name), rows, truncated: result.rows.length > max };
      } finally { await client.end().catch(() => {}); }
    },
  },
];
