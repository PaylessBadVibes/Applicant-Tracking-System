# ATS — One-command local-development bootstrap.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy\local-bootstrap.ps1 `
#       -RootPassword "<MariaDB root pwd>" `
#       -AdminEmail "you@example.com" `
#       -AdminPassword "TempPass!1" `
#       -AdminDisplayName "Your Name" `
#       -AdminJobTitle "HR_RECRUITMENT"
#
# Idempotent. Re-run with -Force to overwrite secrets and web\.env.local.
#
# Pre-requisites (NOT installed by this script):
#   1. MariaDB 11.4 LTS installed at C:\Program Files\MariaDB 11.4\
#      (the MariaDB Windows service must be running).
#   2. Node 20 LTS installed.
#   3. `npm install` run at least once at the workspace root.

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$RootPassword,
    [Parameter(Mandatory=$true)][string]$AdminEmail,
    [Parameter(Mandatory=$true)][string]$AdminPassword,
    [Parameter(Mandatory=$true)][string]$AdminDisplayName,
    [Parameter(Mandatory=$true)]
    [ValidateSet("HR_RECRUITMENT","HR_TIMEKEEPER")]
    [string]$AdminJobTitle,
    [string]$MariaDBBin = "C:\Program Files\MariaDB 11.4\bin",
    [string]$DbHost     = "127.0.0.1",
    [int]   $DbPort     = 3306,
    [string]$AppBaseUrl = "http://localhost:3000",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root      = Resolve-Path "$PSScriptRoot\.."
$totalSteps = 8

function Step([int]$n, [string]$msg) {
    Write-Host ""
    Write-Host ("[{0}/{1}] {2}" -f $n, $totalSteps, $msg) -ForegroundColor Cyan
}
function Ok([string]$msg)   { Write-Host "  OK    $msg" -ForegroundColor Green }
function Skip([string]$msg) { Write-Host "  SKIP  $msg" -ForegroundColor DarkGray }
function Fail([string]$msg) { Write-Host "  FAIL  $msg" -ForegroundColor Red; throw $msg }

function Get-AtsSecret([string]$Account) {
    # Run node from the workspace root so `require('keytar')` resolves via
    # <root>\node_modules\keytar (it doesn't exist under $env:TEMP).
    $code = "require('keytar').getPassword('ATS','$Account').then(v => { if (v) process.stdout.write(v); else process.exit(2); }).catch(e => { console.error(e.message); process.exit(3); });"
    Push-Location $root
    try {
        $val = & node -e $code 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        return $val
    } finally {
        Pop-Location
    }
}

function Set-AtsSecret([string]$Account, [string]$Value) {
    Push-Location $root
    try {
        # Wrap in `cmd /c` because PowerShell strips `--` from native command args.
        $Value | & cmd /c "npm run --silent secrets:set -- --key $Account --from-stdin"
        if ($LASTEXITCODE -ne 0) { Fail "secrets:set failed for $Account (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

function New-RandomHex([int]$Bytes = 32) {
    $b = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return -join ($b | ForEach-Object { $_.ToString("x2") })
}

# --------------------------------------------------------------------
# Phase 1: Pre-flight
# --------------------------------------------------------------------
Step 1 "Pre-flight checks"

$nodeVer = (& node --version) -replace '^v',''
if (-not $nodeVer) { Fail "Node.js not found on PATH." }
$major = [int]($nodeVer.Split('.')[0])
if ($major -lt 20) { Fail "Node $nodeVer detected; require >= 20." }
Ok "Node $nodeVer"

if (-not (Test-Path "$MariaDBBin\mysql.exe")) {
    Fail "MariaDB not found at $MariaDBBin. Install MariaDB 11.4 from mariadb.org first."
}
Ok "MariaDB binaries at $MariaDBBin"

$svc = Get-Service -Name "MariaDB" -ErrorAction SilentlyContinue
if (-not $svc) { Fail "Windows service 'MariaDB' not registered. Run the MariaDB MSI installer." }
if ($svc.Status -ne "Running") {
    Write-Host "  starting MariaDB service..." -ForegroundColor DarkGray
    Start-Service "MariaDB"
    Start-Sleep -Seconds 2
    if ((Get-Service "MariaDB").Status -ne "Running") { Fail "Could not start MariaDB service." }
}
Ok "MariaDB service running"

$tcp = Test-NetConnection -ComputerName $DbHost -Port $DbPort -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $tcp) { Fail "Cannot reach MariaDB at ${DbHost}:${DbPort}." }
Ok "TCP ${DbHost}:${DbPort} reachable"

# --------------------------------------------------------------------
# Phase 2: npm rebuild keytar (idempotent, fixes Node-version mismatch)
# --------------------------------------------------------------------
Step 2 "Rebuild keytar native module"
Push-Location $root
try {
    & npm rebuild keytar 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Fail "npm rebuild keytar failed. Install 'Desktop development with C++' via Visual Studio Installer, then re-run."
    }
    Ok "keytar rebuilt"
} finally {
    Pop-Location
}

# --------------------------------------------------------------------
# Phase 3: Stash secrets (MARIADB_ROOT_PASSWORD, BETTER_AUTH_SECRET)
# --------------------------------------------------------------------
Step 3 "Provision secrets in Windows Credential Manager"

$existingRoot = Get-AtsSecret "MARIADB_ROOT_PASSWORD"
if ($existingRoot -and -not $Force) {
    Skip "MARIADB_ROOT_PASSWORD already set (re-run with -Force to overwrite)"
} else {
    Set-AtsSecret "MARIADB_ROOT_PASSWORD" $RootPassword
    Ok "MARIADB_ROOT_PASSWORD stored"
}

$existingSecret = Get-AtsSecret "BETTER_AUTH_SECRET"
if ($existingSecret -and -not $Force) {
    Skip "BETTER_AUTH_SECRET already set (re-run with -Force to overwrite)"
} else {
    $betterSecret = New-RandomHex 32
    Set-AtsSecret "BETTER_AUTH_SECRET" $betterSecret
    Ok "BETTER_AUTH_SECRET generated and stored"
}

# --------------------------------------------------------------------
# Phase 4: setup-db.ps1 (creates DB + ats_app + ats_migrate)
# Skipped when existing credentials in Credential Manager already work
# (idempotent re-runs). Pass -Force to always rotate.
# --------------------------------------------------------------------
Step 4 "Create database, runtime users, and connection URLs"

function Test-AtsCredentials([string]$ConnUrl) {
    if (-not $ConnUrl) { return $false }
    if ($ConnUrl -notmatch '^mysql://([^:]+):([^@]+)@([^:/]+):(\d+)/(.+)$') { return $false }
    $u = $matches[1]; $p = $matches[2]; $h = $matches[3]; $port = $matches[4]; $d = $matches[5]
    & "$MariaDBBin\mysql.exe" "--user=$u" "--password=$p" "--host=$h" "--port=$port" "--database=$d" "--execute=SELECT 1" 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

$existingDbUrl  = Get-AtsSecret "DATABASE_URL"
$existingMigUrl = Get-AtsSecret "MIGRATE_DATABASE_URL"

$skipSetup = $false
if (-not $Force -and $existingDbUrl -and $existingMigUrl) {
    if ((Test-AtsCredentials $existingDbUrl) -and (Test-AtsCredentials $existingMigUrl)) {
        $skipSetup = $true
    }
}

if ($skipSetup) {
    Skip "DATABASE_URL and MIGRATE_DATABASE_URL already valid (re-run with -Force to rotate)"
    $dbUrl  = $existingDbUrl
    $migUrl = $existingMigUrl
} else {
    & "$PSScriptRoot\setup-db.ps1" `
        -MariaDBBin   $MariaDBBin `
        -DbHost       $DbHost `
        -Port         $DbPort `
        -RootPassword $RootPassword
    if ($LASTEXITCODE -ne 0) { Fail "setup-db.ps1 failed (exit $LASTEXITCODE)" }

    $migUrl = Get-AtsSecret "MIGRATE_DATABASE_URL"
    if (-not $migUrl) { Fail "setup-db.ps1 reported success but MIGRATE_DATABASE_URL is not in Credential Manager." }
    $dbUrl = Get-AtsSecret "DATABASE_URL"
    if (-not $dbUrl) { Fail "DATABASE_URL is not in Credential Manager." }
    Ok "DATABASE_URL and MIGRATE_DATABASE_URL stored"
}

# --------------------------------------------------------------------
# Phase 5: Generate web\.env.local (includes secrets, sourced from keytar)
# --------------------------------------------------------------------
Step 5 "Write web\.env.local"
$envLocal   = Join-Path $root "web\.env.local"
$envExample = Join-Path $root "web\.env.example"

$authSecret = Get-AtsSecret "BETTER_AUTH_SECRET"
if (-not $authSecret) { Fail "BETTER_AUTH_SECRET missing from Credential Manager." }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Set-EnvLine([string[]]$Lines, [string]$Key, [string]$Value) {
    $found = $false
    $out = foreach ($line in $Lines) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=") {
            $found = $true
            "$Key=$Value"
        } else { $line }
    }
    if (-not $found) { $out = @($out) + @("$Key=$Value") }
    return ,@($out)
}

if ((Test-Path $envLocal) -and -not $Force) {
    # File exists: refresh only the secret/URL lines so phase-4 rotations take effect.
    $lines = @(Get-Content -LiteralPath $envLocal)
    $lines = Set-EnvLine $lines "DATABASE_URL"        $dbUrl
    $lines = Set-EnvLine $lines "BETTER_AUTH_SECRET"  $authSecret
    [System.IO.File]::WriteAllLines($envLocal, $lines, $utf8NoBom)
    Ok "web\.env.local refreshed (DATABASE_URL + BETTER_AUTH_SECRET synced from keytar)"
} else {
    if (-not (Test-Path $envExample)) { Fail "web\.env.example not found." }
    $resumesDir = (Join-Path $root "data\resumes")
    $logsDir    = (Join-Path $root "data\logs")
    $lines = Get-Content -LiteralPath $envExample
    $out = foreach ($line in $lines) {
        if     ($line -match '^\s*BETTER_AUTH_URL\s*=')  { "BETTER_AUTH_URL=$AppBaseUrl" }
        elseif ($line -match '^\s*RESUMES_DIR\s*=')      { "RESUMES_DIR=$resumesDir" }
        elseif ($line -match '^\s*LOGS_DIR\s*=')         { "LOGS_DIR=$logsDir" }
        else                                              { $line }
    }
    # Append secrets to be auto-loaded by Next.js (file is gitignored).
    $out = @($out) + @(
        "",
        "# --- Secrets baked in from Windows Credential Manager by local-bootstrap.ps1 ---",
        "DATABASE_URL=$dbUrl",
        "BETTER_AUTH_SECRET=$authSecret"
    )
    [System.IO.File]::WriteAllLines($envLocal, $out, $utf8NoBom)
    Ok "web\.env.local written (secrets included)"
}

# --------------------------------------------------------------------
# Phase 6: Prisma generate + migrate (init if no migrations, deploy otherwise)
# --------------------------------------------------------------------
Step 6 "Apply Prisma schema"
$env:DATABASE_URL = $migUrl
$migrationsDir   = Join-Path $root "web\prisma\migrations"
$hasMigrations   = (Test-Path $migrationsDir) -and `
                   ((Get-ChildItem -LiteralPath $migrationsDir -Filter "migration.sql" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0)
Push-Location $root
try {
    & npm --workspace web run prisma:generate
    if ($LASTEXITCODE -ne 0) { Fail "prisma generate failed" }

    if ($hasMigrations) {
        & npm --workspace web run prisma:deploy
        if ($LASTEXITCODE -ne 0) { Fail "prisma migrate deploy failed" }
        Ok "migrations deployed"
    } else {
        # No committed migrations yet — sync schema directly via db push (no
        # shadow database needed). For production deployments, a developer
        # should run `npm --workspace web run prisma:migrate -- --name init`
        # once with shadow-DB privileges to generate committable migration files.
        & npm --workspace web run prisma:push
        if ($LASTEXITCODE -ne 0) { Fail "prisma db push failed" }
        Ok "schema applied via db push (no migration history committed)"
    }
} finally {
    Pop-Location
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
}

# --------------------------------------------------------------------
# Phase 7: bootstrap-admin
# --------------------------------------------------------------------
Step 7 "Bootstrap first admin"
Push-Location $root
try {
    # Wrap in `cmd /c` because PowerShell strips `--` from native command args.
    # Quote each value individually to survive cmd's parsing rules.
    $emailQ   = '"' + ($AdminEmail       -replace '"','""') + '"'
    $pwdQ     = '"' + ($AdminPassword    -replace '"','""') + '"'
    $nameQ    = '"' + ($AdminDisplayName -replace '"','""') + '"'
    $titleQ   = '"' + ($AdminJobTitle    -replace '"','""') + '"'
    $cmdLine  = "npm run bootstrap-admin -- --email $emailQ --password $pwdQ --displayName $nameQ --jobTitle $titleQ"
    & cmd /c $cmdLine
    if ($LASTEXITCODE -ne 0) { Fail "bootstrap-admin failed (exit $LASTEXITCODE)" }
    Ok "admin '$AdminEmail' ready"
} finally {
    Pop-Location
}

# --------------------------------------------------------------------
# Phase 8: seed-email-template
# --------------------------------------------------------------------
Step 8 "Seed Pre-Orientation email template"
Push-Location $root
try {
    & npm run seed-email-template
    if ($LASTEXITCODE -ne 0) { Fail "seed-email-template failed (exit $LASTEXITCODE)" }
    Ok "template ready"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "═════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Local bootstrap complete." -ForegroundColor Green
Write-Host "  Run ``npm run dev:web`` and open $AppBaseUrl/sign-in" -ForegroundColor Green
Write-Host "═════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Note: -RootPassword and -AdminPassword appear in your PowerShell command history." -ForegroundColor Yellow
Write-Host "      Clear with: Clear-History; (Get-PSReadlineOption).HistorySavePath" -ForegroundColor Yellow
