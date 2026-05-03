import path from "node:path";
import { existsSync, promises as fsp } from "node:fs";
import keytar from "keytar";
import { PrismaClient } from "@prisma/client";

const TEMPLATE_ID = "PASS_PRE_ORIENTATION";

const DEFAULT_BODY = `Hi {{applicantName}},

Congratulations on passing your trade test for the **{{departmentLabel}}** team.

Your pre-orientation is scheduled for **{{orientationDate}}**.

Please reply to this email to confirm.

— HR Team
`;

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

async function main() {
  await loadEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Run `npm run secrets:set -- --key DATABASE_URL` first.");
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.emailTemplate.findUnique({ where: { id: TEMPLATE_ID } });
    if (existing) {
      console.log(`Template '${TEMPLATE_ID}' already exists. Skipping.`);
      return;
    }

    await prisma.emailTemplate.create({
      data: {
        id: TEMPLATE_ID,
        name: "Pre-Orientation Notice",
        description: "Sent automatically when an applicant's trade test is marked PASS.",
        subject: "Congratulations, {{applicantName}} — Your Pre-Orientation is Scheduled",
        bodyMarkdown: DEFAULT_BODY,
        availableVariables: ["applicantName", "applicantEmail", "departmentLabel", "orientationDate"],
      },
    });

    console.log(`Seeded template '${TEMPLATE_ID}'.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
