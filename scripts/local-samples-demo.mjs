// Local-only sample data for evaluating dashboards and the Sources panel.
// Adds two PostgreSQL datasets beside local_retail (a SaaS subscription business
// and a support desk) and writes a few CSV files that the dev-only file tools read.
// Run after scripts/local-retail-demo.mjs, which creates the read-only role.
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local", quiet: true });
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "54329" || url.pathname !== "/opendashboards") throw new Error("This seed only runs against the local OpenDashboards database.");
if (!process.env.LOCAL_RETAIL_DATABASE_URL) throw new Error("Run scripts/local-retail-demo.mjs first: it creates the read-only role.");

const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query(`
    CREATE SCHEMA IF NOT EXISTS local_saas;
    CREATE TABLE IF NOT EXISTS local_saas.accounts (
      id integer PRIMARY KEY, company text NOT NULL, plan text NOT NULL, region text NOT NULL,
      signup_date date NOT NULL, churn_date date, seats integer NOT NULL, mrr numeric(10,2) NOT NULL
    );
    INSERT INTO local_saas.accounts (id, company, plan, region, signup_date, churn_date, seats, mrr)
    SELECT n,
      (ARRAY['Bluebird','Cedar','Harbor','Juniper','Lumen','Maple','Northstar','Orbit','Pinnacle','Quartz'])[(n % 10) + 1]
        || ' ' || (ARRAY['Labs','Systems','Group','Cloud','Health','Studio'])[((n / 10) % 6) + 1] || ' ' || n,
      plan, (ARRAY['North America','Europe','APAC','LATAM'])[((n * 7) % 4) + 1],
      signup, CASE WHEN n % 7 = 0 AND signup + 30 + (n * 13) % 200 <= DATE '2026-11-17' THEN signup + 30 + (n * 13) % 200 END,
      seats, CASE plan WHEN 'Starter' THEN 29 WHEN 'Team' THEN 12 * seats WHEN 'Business' THEN 25 * seats ELSE 18 * seats END
    FROM (
      SELECT n, DATE '2025-12-01' + (n * 7919) % 352 AS signup,
        CASE WHEN n % 20 < 10 THEN 'Starter' WHEN n % 20 < 16 THEN 'Team' WHEN n % 20 < 19 THEN 'Business' ELSE 'Enterprise' END AS plan,
        CASE WHEN n % 20 < 10 THEN 1 + n % 5 WHEN n % 20 < 16 THEN 5 + n % 21 WHEN n % 20 < 19 THEN 20 + n % 81 ELSE 100 + (n * 3) % 401 END AS seats
      FROM generate_series(1, 640) n
    ) s
    ON CONFLICT (id) DO NOTHING;
    CREATE OR REPLACE VIEW local_saas.mrr_monthly AS
      SELECT m::date AS month,
        COUNT(*) FILTER (WHERE a.signup_date <= (m + interval '1 month - 1 day') AND (a.churn_date IS NULL OR a.churn_date > (m + interval '1 month - 1 day')))::int AS active_accounts,
        COALESCE(SUM(a.mrr) FILTER (WHERE a.signup_date <= (m + interval '1 month - 1 day') AND (a.churn_date IS NULL OR a.churn_date > (m + interval '1 month - 1 day'))), 0) AS mrr,
        COALESCE(SUM(a.mrr) FILTER (WHERE date_trunc('month', a.signup_date) = m), 0) AS new_mrr,
        COALESCE(SUM(a.mrr) FILTER (WHERE date_trunc('month', a.churn_date) = m), 0) AS churned_mrr,
        COUNT(*) FILTER (WHERE date_trunc('month', a.signup_date) = m)::int AS new_accounts,
        COUNT(*) FILTER (WHERE date_trunc('month', a.churn_date) = m)::int AS churned_accounts
      FROM generate_series(DATE '2025-12-01', DATE '2026-11-01', interval '1 month') m CROSS JOIN local_saas.accounts a
      GROUP BY m;

    CREATE SCHEMA IF NOT EXISTS local_support;
    CREATE TABLE IF NOT EXISTS local_support.tickets (
      id integer PRIMARY KEY, created_at timestamp NOT NULL, resolved_at timestamp, status text NOT NULL,
      priority text NOT NULL, channel text NOT NULL, category text NOT NULL, agent text NOT NULL,
      first_response_minutes integer NOT NULL, csat integer
    );
    INSERT INTO local_support.tickets (id, created_at, resolved_at, status, priority, channel, category, agent, first_response_minutes, csat)
    SELECT n, created, CASE WHEN open THEN NULL ELSE created + make_interval(hours => 1 + (n * 37) % 70) END,
      CASE WHEN open THEN 'open' ELSE 'resolved' END, priority,
      (ARRAY['Email','Chat','Phone'])[(n % 3) + 1],
      (ARRAY['Billing','Bug','How-to','Account','Feature request'])[((n * 11) % 5) + 1],
      (ARRAY['Ana','Ben','Chloe','Dev','Eli','Farah'])[((n * 5) % 6) + 1],
      CASE priority WHEN 'Urgent' THEN 5 + (n * 7) % 50 WHEN 'High' THEN 10 + (n * 7) % 90 WHEN 'Normal' THEN 20 + (n * 13) % 300 ELSE 30 + (n * 17) % 600 END,
      CASE WHEN open OR n % 3 = 0 THEN NULL ELSE 2 + (n * 7) % 4 END
    FROM (
      SELECT n, TIMESTAMP '2026-08-20 08:00' + make_interval(mins => (n * 53) % 129600) AS created,
        CASE WHEN n % 20 = 0 THEN 'Urgent' WHEN n % 20 < 4 THEN 'High' WHEN n % 20 < 14 THEN 'Normal' ELSE 'Low' END AS priority,
        (TIMESTAMP '2026-08-20 08:00' + make_interval(mins => (n * 53) % 129600)) > TIMESTAMP '2026-11-12' AND n % 3 <> 0 AS open
      FROM generate_series(1, 2400) n
    ) s
    ON CONFLICT (id) DO NOTHING;
    CREATE OR REPLACE VIEW local_support.daily_tickets AS
      SELECT d::date AS date,
        (SELECT COUNT(*) FROM local_support.tickets t WHERE t.created_at::date = d::date)::int AS created,
        (SELECT COUNT(*) FROM local_support.tickets t WHERE t.resolved_at::date = d::date)::int AS resolved
      FROM generate_series(DATE '2026-08-20', DATE '2026-11-17', interval '1 day') d;

    -- Product events: what the sample PostHog and ClickHouse connections read.
    CREATE SCHEMA IF NOT EXISTS local_product;
    CREATE TABLE IF NOT EXISTS local_product.events (
      uuid integer PRIMARY KEY, event text NOT NULL, timestamp timestamp NOT NULL, distinct_id text NOT NULL, properties jsonb NOT NULL
    );
    INSERT INTO local_product.events (uuid, event, timestamp, distinct_id, properties)
    SELECT n, event, TIMESTAMP '2026-08-20 00:00' + make_interval(mins => (n * 47) % 129600),
      'user_' || ((n * 31) % 2400 + 1),
      jsonb_build_object(
        '$current_url', (ARRAY['https://app.example.com/home','https://app.example.com/dashboards','https://app.example.com/settings','https://app.example.com/billing','https://example.com/pricing','https://example.com/blog'])[(n % 6) + 1],
        '$browser', (ARRAY['Chrome','Safari','Firefox','Edge'])[((n * 3) % 4) + 1],
        '$os', (ARRAY['Mac OS X','Windows','iOS','Android'])[((n * 5) % 4) + 1],
        '$geoip_country_name', (ARRAY['United States','India','Germany','United Kingdom','Brazil'])[((n * 7) % 5) + 1],
        'plan', (ARRAY['free','free','team','business'])[((n * 11) % 4) + 1])
    FROM (
      SELECT n, CASE WHEN n % 40 = 0 THEN 'signed_up' WHEN n % 40 = 1 THEN 'project_created' WHEN n % 40 = 2 THEN 'invite_sent'
        WHEN n % 97 = 3 THEN 'upgraded_plan' WHEN n % 5 = 0 THEN 'dashboard_viewed' ELSE '$pageview' END AS event
      FROM generate_series(1, 36000) n
    ) e
    ON CONFLICT (uuid) DO NOTHING;
    -- ClickHouse and HogQL date helpers, so their usual SQL also runs on this PostgreSQL copy.
    CREATE OR REPLACE FUNCTION local_product.toStartOfDay(ts timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$ SELECT date_trunc('day', ts) $$;
    CREATE OR REPLACE FUNCTION local_product.toStartOfWeek(ts timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$ SELECT date_trunc('week', ts) $$;
    CREATE OR REPLACE FUNCTION local_product.toStartOfMonth(ts timestamp) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$ SELECT date_trunc('month', ts) $$;
    CREATE OR REPLACE FUNCTION local_product.toDate(ts timestamp) RETURNS date LANGUAGE sql IMMUTABLE AS $$ SELECT ts::date $$;

    -- Web traffic: what the sample GA4 and Search Console connections read.
    CREATE SCHEMA IF NOT EXISTS local_web;
    CREATE TABLE IF NOT EXISTS local_web.ga_sessions (
      date date NOT NULL, channel text NOT NULL, country text NOT NULL, device text NOT NULL, landing_page text NOT NULL,
      sessions integer NOT NULL, active_users integer NOT NULL, new_users integer NOT NULL, engaged_sessions integer NOT NULL,
      screen_page_views integer NOT NULL, conversions integer NOT NULL, total_revenue numeric(10,2) NOT NULL,
      PRIMARY KEY (date, channel, country, device, landing_page)
    );
    INSERT INTO local_web.ga_sessions
    SELECT d::date, c.channel, k.country, v.device, p.page, s, round(s * 0.82), round(s * 0.31), round(s * (0.48 + c.i * 0.04)),
      round(s * (2.1 + p.i * 0.3)), round(s * (0.012 + v.i * 0.004)), round(s * (0.012 + v.i * 0.004)) * (40 + c.i * 9)
    FROM generate_series(DATE '2026-08-20', DATE '2026-11-17', interval '1 day') d
    CROSS JOIN (VALUES (0,'Organic Search'),(1,'Direct'),(2,'Paid Search'),(3,'Referral'),(4,'Email')) c(i, channel)
    CROSS JOIN (VALUES (0,'United States'),(1,'India'),(2,'Germany'),(3,'United Kingdom')) k(i, country)
    CROSS JOIN (VALUES (0,'desktop'),(1,'mobile'),(2,'tablet')) v(i, device)
    CROSS JOIN (VALUES (0,'/'),(1,'/pricing'),(2,'/blog/dashboards'),(3,'/docs')) p(i, page)
    CROSS JOIN LATERAL (SELECT (6 + ((extract(doy FROM d)::int * 7 + c.i * 13 + k.i * 5 + v.i * 3 + p.i) % 23)) * (5 - c.i) / (1 + v.i) AS s) x
    ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS local_web.search_performance (
      date date NOT NULL, query text NOT NULL, page text NOT NULL, country text NOT NULL, device text NOT NULL,
      clicks integer NOT NULL, impressions integer NOT NULL, position numeric(5,2) NOT NULL,
      PRIMARY KEY (date, query, country, device)
    );
    INSERT INTO local_web.search_performance
    SELECT d::date, q.query, q.page, k.country, v.device, round(imp * (0.09 - q.i * 0.004)), imp, round((2.5 + q.i * 0.9 + v.i * 0.6)::numeric, 2)
    FROM generate_series(DATE '2026-08-20', DATE '2026-11-15', interval '1 day') d
    CROSS JOIN (VALUES (0,'open source dashboards','/'),(1,'claude dashboards alternative','/'),(2,'ai dashboard builder','/pricing'),
      (3,'posthog dashboard','/blog/dashboards'),(4,'postgres dashboard','/docs'),(5,'generative ui','/blog/dashboards'),
      (6,'self hosted bi','/docs'),(7,'dashboard from sql','/docs'),(8,'kpi dashboard template','/blog/dashboards'),(9,'openui','/')) q(i, query, page)
    CROSS JOIN (VALUES (0,'usa'),(1,'ind'),(2,'deu')) k(i, country)
    CROSS JOIN (VALUES (0,'DESKTOP'),(1,'MOBILE')) v(i, device)
    CROSS JOIN LATERAL (SELECT (40 + ((extract(doy FROM d)::int * 11 + q.i * 17 + k.i * 7) % 90)) * (12 - q.i) / (1 + k.i + v.i) AS imp) x
    ON CONFLICT DO NOTHING;

    -- Invoices: what the sample billing MCP server answers from.
    CREATE SCHEMA IF NOT EXISTS local_billing;
    CREATE TABLE IF NOT EXISTS local_billing.invoices (
      id text PRIMARY KEY, account_id integer NOT NULL, company text NOT NULL, plan text NOT NULL,
      amount numeric(10,2) NOT NULL, status text NOT NULL, created date NOT NULL, due date NOT NULL
    );
    INSERT INTO local_billing.invoices
    SELECT 'in_' || a.id || '_' || to_char(m, 'YYYYMM'), a.id, a.company, a.plan, a.mrr,
      CASE WHEN m >= DATE '2026-11-01' AND a.id % 9 = 0 THEN 'open' WHEN a.id % 23 = 0 THEN 'past_due' WHEN a.id % 41 = 0 THEN 'void' ELSE 'paid' END,
      m::date, (m + interval '14 days')::date
    FROM local_saas.accounts a
    CROSS JOIN generate_series(DATE '2025-12-01', DATE '2026-11-01', interval '1 month') m
    WHERE a.signup_date <= m + interval '1 month - 1 day' AND (a.churn_date IS NULL OR a.churn_date > m)
    ON CONFLICT (id) DO NOTHING;

    GRANT USAGE ON SCHEMA local_saas, local_support, local_product, local_web, local_billing TO local_retail_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA local_saas TO local_retail_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA local_support TO local_retail_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA local_product TO local_retail_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA local_web TO local_retail_reader;
    GRANT SELECT ON ALL TABLES IN SCHEMA local_billing TO local_retail_reader;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA local_product TO local_retail_reader;`);

  // CSV files, the "uploaded file" kind of source. Plain values: no quoted commas.
  const dir = path.join(process.cwd(), "fixtures", "sample-files");
  fs.mkdirSync(dir, { recursive: true });
  const write = (name, header, rows) => fs.writeFileSync(path.join(dir, name), [header.join(","), ...rows.map((row) => row.join(","))].join("\n") + "\n");

  const campaigns = [
    ["Autumn launch", "Paid search"], ["Brand awareness", "Social"], ["Retargeting", "Display"],
    ["Newsletter", "Email"], ["Creator partners", "Influencer"], ["Webinar series", "Events"],
  ];
  const months = ["2026-08", "2026-09", "2026-10", "2026-11"];
  write("marketing_campaigns.csv", ["campaign", "channel", "month", "spend", "impressions", "clicks", "signups"],
    campaigns.flatMap(([campaign, channel], c) => months.map((month, m) => {
      const spend = 1200 + c * 650 + m * 310 + ((c * 7 + m * 3) % 5) * 140;
      const impressions = spend * (18 + ((c + m) % 4) * 6);
      const clicks = Math.round(impressions * (0.011 + ((c * 3 + m) % 5) * 0.004));
      const signups = Math.round(clicks * (0.035 + ((c + m * 2) % 4) * 0.012));
      return [campaign, channel, month, spend, impressions, clicks, signups];
    })));

  write("regional_targets.csv", ["region", "quarter", "revenue_target"], ["North", "South", "East", "West"].flatMap((region, r) =>
    [["2026-Q3", 15500 + r * 2400], ["2026-Q4", 52000 + r * 3100]].map(([quarter, target]) => [region, quarter, target])));

  write("nps_survey.csv", ["response_date", "segment", "plan", "score"], Array.from({ length: 180 }, (_, i) => {
    const day = new Date(Date.UTC(2026, 7, 20) + (i % 90) * 86400000).toISOString().slice(0, 10);
    return [day, ["SMB", "Mid-market", "Enterprise"][i % 3], ["Starter", "Team", "Business", "Enterprise"][(i * 7) % 4], [10, 9, 9, 8, 10, 7, 6, 9, 3, 8, 10, 5][i % 12]];
  }));

  // Edge cases: a long file name, long column names and paragraph-length values.
  const comments = [
    "The new dashboard builder saved our analytics team hours every week - but we would love scheduled exports and a way to pin the most important charts for the leadership review",
    "Setup was quick; the Postgres connection worked first time and the generated SQL was readable enough that our data engineer trusted it without rewriting anything",
    "We hit a confusing moment when two charts showed slightly different totals - it turned out one excluded refunds - so showing where each number comes from would really help",
    "Great product overall",
  ];
  write("customer_feedback_responses_q3_q4_2026_full_export_with_comments.csv",
    ["response_id", "submitted_at_utc_timestamp", "customer_company_legal_name", "account_owner_full_name", "product_area_mentioned_in_feedback", "verbatim_customer_comment_text", "satisfaction_score_out_of_ten", "follow_up_required_flag", "region_country_and_city_detail", "plan", "seats", "monthly_recurring_revenue_usd"],
    Array.from({ length: 60 }, (_, i) => [
      `resp_${String(100000 + i * 37)}`, new Date(Date.UTC(2026, 6, 1) + i * 86400000 * 2.3).toISOString(),
      ["Bluebird Systems International Holdings Limited", "Cedar Analytics GmbH", "Harbor Cloud Infrastructure Services Private Limited", "Juniper Labs"][i % 4],
      ["Alexandra Montgomery-Fitzgerald", "Ben Ito", "Chloe Raghavendran Subramanian", "Dev Patel"][i % 4],
      ["Dashboard builder and generated SQL", "Connections", "Sources panel and data provenance", "Billing"][i % 4],
      comments[i % 4], (i * 7) % 11, i % 3 === 0 ? "yes" : "no",
      ["United States - San Francisco", "Germany - Berlin", "India - Bengaluru", "Brazil - São Paulo"][i % 4],
      ["Starter", "Team", "Business", "Enterprise"][i % 4], 1 + (i * 13) % 400, 29 + (i * 97) % 9000,
    ]));

  const counts = (await client.query(`SELECT (SELECT COUNT(*) FROM local_saas.accounts) AS accounts, (SELECT COUNT(*) FROM local_support.tickets) AS tickets,
    (SELECT COUNT(*) FROM local_product.events) AS events, (SELECT COUNT(*) FROM local_web.ga_sessions) AS ga, (SELECT COUNT(*) FROM local_web.search_performance) AS search,
    (SELECT COUNT(*) FROM local_billing.invoices) AS invoices`)).rows[0];
  console.log(`Local samples ready: ${counts.accounts} SaaS accounts, ${counts.tickets} tickets, ${counts.events} product events, ${counts.ga} GA rows, ${counts.search} search rows, ${counts.invoices} invoices, 3 CSV files.`);
} finally {
  await client.end();
}
