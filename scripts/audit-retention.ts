import path from "node:path";
import { existsSync, promises as fsp } from "node:fs";
import keytar from "keytar";
import { PrismaClient } from "@prisma/client";

const RETENTION_YEARS = 5;

async function loadEnv() {
  const dotenvPath = path.resolve(__dirname, "..", "web", ".env.local");
  if (existsSync(dotenvPath)) {
    const text = await fsp.readFile(dotenvPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  for (const key of ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
    if (!process.env[key]) {
      const v = await keytar.getPassword("ATS", key);
      if (v) process.env[key] = v;
    }
  }
}

async function appendLog(line: string) {
  const logsDir = process.env.LOGS_DIR ?? path.resolve(__dirname, "..", "data", "logs");
  await fsp.mkdir(logsDir, { recursive: true });
  await fsp.appendFile(path.join(logsDir, "audit-retention.log"), `${line}\n`, "utf8");
}

async function main() {
  await loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Run `npm run secrets:set -- --key DATABASE_URL` first.");
  }

  const prisma = new PrismaClient();
  try {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

    const result = await prisma.auditLog.deleteMany({ where: { at: { lt: cutoff } } });
    const line = `[${new Date().toISOString()}] purged ${result.count} audit_logs rows older than ${cutoff.toISOString()}`;
    console.log(line);
    await appendLog(line);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error(err);
  await appendLog(`[${new Date().toISOString()}] ERROR: ${(err as Error).message}`);
  process.exit(1);
});
