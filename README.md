# ATS — Applicant Tracking System

Admin-only Applicant Tracking System for HR Recruitment and HR Time-Keeping, locally hosted on a single Windows host with MariaDB, Better-Auth, Prisma, and IIS.

## Overview

A Next.js 14 (App Router) admin portal backed by:

- **Database**: MariaDB 11.4 LTS (loopback only)
- **ORM**: Prisma 5
- **Authentication**: Better-Auth (email + password, server-side `__session` cookie)
- **File storage**: local filesystem (`data/resumes/…`), streamed via API
- **Process supervision**: NSSM running `next start` (standalone build)
- **Reverse proxy / TLS**: IIS + URL Rewrite + Application Request Routing, certificate from internal AD CS
- **Backups**: `mariabackup`, scheduled via Windows Task Scheduler

There is no applicant-facing front end — admins create and progress applicants manually.

Email sending is **not wired** in this build (Interpretation B): the schema, status hook, and `email_logs` table are preserved; on `PRE_ORIENTATION` transitions a `SKIPPED` log row is written and an `EMAIL_SKIPPED` audit entry is recorded.

## Tech Stack

- **Frontend**: Next.js 14 standalone, React 18, Tailwind CSS, shadcn/ui, Recharts.
- **Backend**: Next.js API routes (Node runtime), Prisma 5, mysql2.
- **Auth**: Better-Auth (email/password). Session cookie name: `__session`. 14-day expiry.
- **Database**: MariaDB 11.4 LTS, `utf8mb4` / `utf8mb4_unicode_ci`.
- **Storage**: local filesystem under `data/resumes/{applicantId}/{ulid}-{safeName}`.
- **Service**: NSSM 2.24 (`ATS Web` service, `LocalService`).
- **TLS**: AD CS-issued server certificate, IIS HTTPS binding, HSTS enforced.

## Project Layout

```
shared/      Shared TypeScript types, enums, Zod schemas (canonical).
web/         Next.js 14 application (UI + API routes).
  prisma/    Prisma schema and migrations.
scripts/     Maintenance CLI scripts (bootstrap-admin, seed-email-template,
             secrets-set, audit-retention).
deploy/      PowerShell installers (DB, NSSM, IIS, backup) + IIS web.config +
             scheduled-tasks XMLs.
data/        Runtime state (resumes, backups, logs). NOT committed.
```

## Prerequisites

| For | Required |
|---|---|
| Local development | Node 20 LTS, MariaDB 11.4 LTS |
| Production | the above, plus NSSM 2.24, IIS (Web-Server / Web-Static-Content / Web-Mgmt-Console), URL Rewrite 2.1, Application Request Routing 3.0, an AD CS Enterprise CA where the host's machine account has Enroll rights on the `WebServer` template |

Install MariaDB 11.4 LTS to its default path `C:\Program Files\MariaDB 11.4\` and set a root password during the wizard. Install Node 20 LTS to `C:\Program Files\nodejs\`.

## Environment Variables

### `web/.env.local` (committed only as `.env.example`)

| Variable | Purpose | Source at runtime |
|---|---|---|
| `BETTER_AUTH_URL` | public origin (matches IIS binding in production, `http://localhost:3000` for dev) | `.env.local` |
| `RESUMES_DIR` | absolute path to resume blob root | `.env.local` |
| `LOGS_DIR` | absolute path to logs directory | `.env.local` |
| `DATABASE_URL` | runtime DB url (`ats_app` user) | Windows Credential Manager (`ATS / DATABASE_URL`) |
| `MIGRATE_DATABASE_URL` | DDL DB url (`ats_migrate` user) — used by `prisma migrate` | Windows Credential Manager (`ATS / MIGRATE_DATABASE_URL`) |
| `BETTER_AUTH_SECRET` | session signing secret | Windows Credential Manager (`ATS / BETTER_AUTH_SECRET`) |
| `MARIADB_ROOT_PASSWORD` | used only by setup-db / backup scripts | Windows Credential Manager (`ATS / MARIADB_ROOT_PASSWORD`) |

Secrets live in Windows Credential Manager (service `ATS`). For **local development**, `deploy\local-bootstrap.ps1` reads them from keytar and bakes them into `web\.env.local` so Next.js can auto-load them — `.env.local` is gitignored. For **production**, the NSSM service should run a wrapper that reads keytar at start-up and injects them into the child process environment instead of writing to disk.

## Local Development — One-Command Setup

After installing MariaDB and Node, run:

```powershell
# From the workspace root.
npm install

powershell -ExecutionPolicy Bypass -File deploy\local-bootstrap.ps1 `
    -RootPassword     "<your MariaDB root password>" `
    -AdminEmail       "you@example.com" `
    -AdminPassword    "TempPass!1" `
    -AdminDisplayName "Your Name" `
    -AdminJobTitle    "HR_RECRUITMENT"

npm run dev:web
```

Open [http://localhost:3000/sign-in](http://localhost:3000/sign-in).

`local-bootstrap.ps1` is idempotent. Add `-Force` to overwrite an existing `web\.env.local` or to rotate the secrets in Credential Manager. `--AdminJobTitle` accepts `HR_RECRUITMENT` or `HR_TIMEKEEPER`.

The bootstrap script does, in order: (1) pre-flight checks, (2) `npm rebuild keytar`, (3) stash `MARIADB_ROOT_PASSWORD` and a fresh `BETTER_AUTH_SECRET`, (4) run `setup-db.ps1` (creates DB + `ats_app` + `ats_migrate` users), (5) generate `web\.env.local`, (6) `prisma generate` + `prisma migrate deploy`, (7) bootstrap the first admin, (8) seed the Pre-Orientation email template.

After the first admin signs in, additional admins can be invited from the in-app **Users** page.

## Production — Full Manual Setup

Use this path only on the production host (NSSM-supervised, fronted by IIS with an AD CS server certificate).

> **PowerShell users:** PowerShell silently strips `--` from native-command argument lists, so `npm run X -- --foo bar` won't forward `--foo bar` to the inner script. Use the `npx tsx scripts/X.ts` form below (works in any shell) or wrap the command: `cmd /c "npm run X -- --foo bar"`.

```powershell
# 1. From the workspace root.
npm install

# 2. Provision the MariaDB root password into Credential Manager.
npx tsx scripts/secrets-set.ts --key MARIADB_ROOT_PASSWORD

# 3. Create the database, runtime user (ats_app) and migration user (ats_migrate).
powershell -ExecutionPolicy Bypass -File deploy\setup-db.ps1

# 4. Provision the Better-Auth secret (64-char hex).
npx tsx scripts/secrets-set.ts --key BETTER_AUTH_SECRET

# 5. Copy and edit non-secret env values.
copy web\.env.example web\.env.local
notepad web\.env.local

# 6. Generate Prisma client and apply the initial migration.
npm --workspace web run prisma:deploy

# 7. Seed the canonical email template.
npm run seed-email-template

# 8. Create the first admin.
npx tsx scripts/bootstrap-admin.ts --email you@example.com --password "TempPass!1" --displayName "Jane Doe" --jobTitle HR_RECRUITMENT

# 9. Build the standalone Next.js bundle.
npm --workspace web run build

# 10. Install the NSSM service and the IIS reverse proxy.
powershell -ExecutionPolicy Bypass -File deploy\install-service.ps1
powershell -ExecutionPolicy Bypass -File deploy\iis-setup.ps1 -Hostname ats.internal.corp -CertThumbprint <your-cert-thumbprint>

# 11. Register the daily scheduled tasks.
schtasks /Create /XML deploy\scheduled-tasks\ATS-Daily-Backup.xml         /TN "\ATS\ATS-Daily-Backup"
schtasks /Create /XML deploy\scheduled-tasks\ATS-Daily-Audit-Retention.xml /TN "\ATS\ATS-Daily-Audit-Retention"
```

## Status Workflow

```
APPLIED ──▶ TRADE_TEST_SCHEDULED ─┬─▶ PRE_ORIENTATION ──▶ DEPLOYMENT
                                  │                        ▲
                                  ├─▶ FAILED_RE_TRADE_TEST ┘
                                  │       (re-schedule)
                                  └─▶ NEEDS_RESCHEDULE
                                          (re-schedule)

PRE_ORIENTATION / DEPLOYMENT ──▶ REDEPLOYMENT  (and back)
```

A `PASS` outcome on the latest trade-test attempt automatically sets `status = PRE_ORIENTATION`. The application records an `EmailLog` row with `status = SKIPPED` (Interpretation B — SMTP transport is not wired in this build) and an `EMAIL_SKIPPED` audit entry. To enable real email later, plug a transport into `web/src/lib/email-hook.ts`.

## Verification

```
npm run typecheck
npm run lint
npx --workspace web prisma validate
```

After deployment:

```
Get-Service "ATS Web"
Invoke-WebRequest https://ats.internal.corp/sign-in
```

## Backups

Daily `mariabackup` snapshot at 01:30 local. Output in `data\backups\<yyyyMMdd-HHmmss>\`. Last 7 retained automatically. Manifest of SHA-256 checkpoints appended to `data\backups\manifest.csv`.

## Audit Log

Every applicant write produces a field-level diff in `audit_logs` with `{ from, to }` per changed field. Trade-test scheduling and outcome recording, status changes, resume upload/remove, and template edits are all logged with the acting admin's UID, email, and job-title snapshot. Retention: **5 years**, enforced by the daily `audit-retention` scheduled task.

## Security Model

- Every API route (except `/api/auth/*`) requires the `__session` cookie and verifies it via Better-Auth (`auth.api.getSession`), additionally enforcing `role === "admin"` and `isActive === true`.
- All admins share identical permissions; `jobTitle` (`HR_RECRUITMENT` / `HR_TIMEKEEPER`) is a cosmetic label.
- MariaDB is bound to `127.0.0.1`; only IIS (also local) reaches the Node app on `127.0.0.1:3000`. Public traffic terminates TLS at IIS using the AD CS certificate.
- Resume uploads validated server-side for content-type allowlist (PNG, JPG, JPEG, PDF, DOCX) and 10 MB max. The path resolver explicitly defends against directory traversal.
- Resume blobs live on a folder with strict NTFS ACLs (`LocalService` + `Administrators` only); the streaming API route is the only path through which they can be read.
- Two database accounts: `ats_app` (DML only) for runtime, `ats_migrate` (DDL) for `prisma migrate`. The runtime user cannot alter schema.
