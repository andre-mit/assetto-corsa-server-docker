import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

// Load .env manually so prisma CLI picks up env vars in all contexts
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      const val = match[2]?.replace(/^["']|["']$/g, "") ?? "";
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.PG_HOST || "localhost";
  const port = process.env.PG_PORT || "5432";
  const database = process.env.PG_DATABASE || "ac_manager";
  const user = process.env.PG_USER || "postgres";
  const password = encodeURIComponent(process.env.PG_PASSWORD || "");

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildDatabaseUrl(),
  },
});
