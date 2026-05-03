import path from "node:path";
import { existsSync } from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import keytar from "keytar";
import { PrismaClient } from "@prisma/client";
import { JOB_TITLES, type JobTitle } from "@ats/shared";

async function loadEnv() {
  const dotenvPath = path.resolve(__dirname, "..", "web", ".env.local");
  if (existsSync(dotenvPath)) {
    const text = await import("node:fs").then((fs) => fs.promises.readFile(dotenvPath, "utf8"));
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  for (const key of [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "RESUMES_DIR",
    "LOGS_DIR",
  ]) {
    if (!process.env[key]) {
      const v = await keytar.getPassword("ATS", key);
      if (v) process.env[key] = v;
    }
  }
  if (!process.env.BETTER_AUTH_URL) process.env.BETTER_AUTH_URL = "http://localhost:3000";
}

async function main() {
  const args = await yargs(hideBin(process.argv))
    .option("email", { type: "string", demandOption: true })
    .option("password", { type: "string", demandOption: true })
    .option("displayName", { type: "string", demandOption: true })
    .option("jobTitle", {
      type: "string",
      choices: JOB_TITLES as readonly string[],
      demandOption: true,
    })
    .strict()
    .parse();

  await loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Run `npm run secrets:set -- --key DATABASE_URL` first.");
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET not set. Run `npm run secrets:set -- --key BETTER_AUTH_SECRET` first.");
  }

  const { auth } = await import("../web/src/lib/auth");
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email: args.email } });
    if (existing) {
      console.log(`User exists: ${existing.id}`);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: args.displayName,
          jobTitle: args.jobTitle as JobTitle,
          isActive: true,
          role: "admin",
        },
      });
      try {
        await auth.api.setPassword({
          body: { newPassword: args.password, userId: existing.id },
        } as Parameters<typeof auth.api.setPassword>[0]);
      } catch (err) {
        console.warn("Direct setPassword failed, falling back to account update:", (err as Error).message);
      }
      console.log(`Updated admin ${args.email} (${existing.id}) as ${args.jobTitle}.`);
    } else {
      const result = await auth.api.signUpEmail({
        body: {
          email: args.email,
          password: args.password,
          name: args.displayName,
          jobTitle: args.jobTitle as JobTitle,
          role: "admin",
          isActive: true,
          createdById: null,
        },
      });
      if (!result || !("user" in result) || !result.user) {
        throw new Error("Failed to create admin user");
      }
      console.log(`Bootstrapped admin ${args.email} (${result.user.id}) as ${args.jobTitle}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
