import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Tool } from "./index";
import { localRetailEnabled } from "./local-retail";

/**
 * Development only: CSV files in fixtures/sample-files, read like files a user
 * uploaded. Lets dashboards (and the Sources panel) have file-backed sources
 * beside database queries. Written by scripts/local-samples-demo.mjs.
 */
const DIR = path.join(process.cwd(), "fixtures", "sample-files");
const FILE_NAME = /^[a-z0-9_-]+\.csv$/;
const readSchema = z.object({ file: z.string().regex(FILE_NAME, "A file name from local_files_list, like marketing_campaigns.csv") });

type Table = { columns: string[]; rows: Record<string, string | number>[] };

/** Plain CSV: a header row, comma-separated values, no quoted commas. Numbers come back as numbers. */
async function readCsv(file: string): Promise<Table> {
  const text = await fs.readFile(path.join(DIR, file), "utf8");
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(",");
  const rows = lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(columns.map((column, i) => {
      const value = values[i] ?? "";
      return [column, /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value];
    }));
  });
  return { columns, rows };
}

export const localFileTools: Tool[] = [
  {
    name: "local_files_list",
    description: "Lists the LOCAL SAMPLE CSV files (as if uploaded by the user) with their columns and row counts. Read one with local_file_read. Sample data, not company data.",
    callers: ["agent"],
    parameters: z.toJSONSchema(z.object({})),
    async run() {
      if (!localRetailEnabled()) throw new Error("Local files unavailable");
      const names = (await fs.readdir(DIR).catch(() => [])).filter((name) => FILE_NAME.test(name)).sort();
      const files = await Promise.all(names.map(async (file) => {
        const { columns, rows } = await readCsv(file);
        return { file, columns, rows: rows.length };
      }));
      return { files, read_tool: "local_file_read", note: "Each file is a small table. Aggregate in the dashboard, or join with a database query by a shared key." };
    },
  },
  {
    name: "local_file_read",
    description: "Reads one LOCAL SAMPLE CSV file by name (from local_files_list) and returns its columns and rows. Use it in dashboards as a file-backed source.",
    callers: ["agent", "dashboard"],
    parameters: z.toJSONSchema(readSchema),
    output: { columns: ["campaign", "spend"], rows: [{ campaign: "Autumn launch", spend: 1200 }], truncated: false },
    async run(input, _context, { signal }) {
      if (!localRetailEnabled()) throw new Error("Local files unavailable");
      const { file } = readSchema.parse(input);
      signal.throwIfAborted();
      const { columns, rows } = await readCsv(file);
      return { file, columns, rows, truncated: false };
    },
  },
];
