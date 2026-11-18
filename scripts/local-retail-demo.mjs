import fs from "node:fs";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local", quiet: true });
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "54329" || url.pathname !== "/opendashboards") throw new Error("This seed only runs against the local OpenDashboards database.");
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  await client.query(`CREATE SCHEMA IF NOT EXISTS local_retail;
    CREATE TABLE IF NOT EXISTS local_retail.orders (
      id integer PRIMARY KEY, order_date date NOT NULL, customer_id integer NOT NULL,
      category text NOT NULL, region text NOT NULL, revenue numeric(12,2) NOT NULL,
      cost numeric(12,2) NOT NULL, status text NOT NULL DEFAULT 'completed'
    );
    INSERT INTO local_retail.orders (id,order_date,customer_id,category,region,revenue,cost)
    SELECT n, DATE '2026-08-20' + ((n-1)/20), (n*17)%540+1,
      (ARRAY['Clothing','Home & living','Accessories','Beauty'])[(n%4)+1],
      (ARRAY['North','South','East','West'])[((n/4)%4)+1],
      25+(n*37)%260, round((25+(n*37)%260)*0.57,2)
    FROM generate_series(1,1800) n ON CONFLICT (id) DO NOTHING;
    CREATE OR REPLACE VIEW local_retail.daily_sales AS
      SELECT order_date AS date, sum(revenue) AS revenue, count(*)::int AS orders,
        round(avg(revenue),2) AS average_order_value, sum(revenue-cost) AS profit
      FROM local_retail.orders GROUP BY order_date;
    CREATE OR REPLACE VIEW local_retail.category_sales AS
      SELECT category, sum(revenue) AS revenue, count(*)::int AS orders, sum(revenue-cost) AS profit
      FROM local_retail.orders GROUP BY category;`);
  let readerUrl = process.env.LOCAL_RETAIL_DATABASE_URL;
  if (!readerUrl) {
    const password = randomBytes(24).toString("hex");
    const existing = await client.query("SELECT 1 FROM pg_roles WHERE rolname='local_retail_reader'");
    if (existing.rowCount) throw new Error("Reader role exists but its local credential is missing; preserve the role.");
    await client.query(`CREATE ROLE local_retail_reader LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
    const reader = new URL(url); reader.username="local_retail_reader"; reader.password=password;
    readerUrl=reader.toString();
    fs.appendFileSync(".env.local", `LOCAL_RETAIL_DATABASE_URL=${readerUrl}\n`);
  }
  await client.query("GRANT USAGE ON SCHEMA local_retail TO local_retail_reader; GRANT SELECT ON ALL TABLES IN SCHEMA local_retail TO local_retail_reader;");
  await client.query("INSERT INTO apps (id,user_id,name) VALUES ($1,'dev-user','Dashboard studio') ON CONFLICT (id) DO NOTHING", ["15440000-0000-4000-8000-000000000001"]);
  console.log("Local retail dataset ready: 1,800 sample orders, read-only access, Dashboard studio.");
} finally { await client.end(); }
