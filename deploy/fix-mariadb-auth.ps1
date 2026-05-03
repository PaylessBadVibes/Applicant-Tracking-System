# ATS - One-shot fix for MariaDB 11.x ↔ Prisma auth-plugin mismatch.
#
# Phase 1: Pins the existing ats_app and ats_migrate users to
#          mysql_native_password without rotating their passwords.
# Phase 2: Disables the builtin gssapi auth plugin via my.ini and restarts
#          the MariaDB Windows service. This requires Administrator privileges.
#
# Idempotent. Safe to re-run.
#
# Usage (run from an ELEVATED PowerShell):
#   powershell -ExecutionPolicy Bypass -File deploy\fix-mariadb-auth.ps1 `
#       -RootPassword "<your MariaDB root pwd>"

param(
    [Parameter(Mandatory=$true)][string]$RootPassword,
    [string]$MariaDBBin    = "C:\Program Files\MariaDB 11.4\bin",
    [string]$MariaDBData   = "C:\Program Files\MariaDB 11.4\data",
    [string]$DbHost        = "127.0.0.1",
    [int]   $Port          = 3306,
    [string]$ServiceName   = "MariaDB"
)

$ErrorActionPreference = "Stop"

function Get-AtsSecret([string]$Account) {
    $repoRoot = Resolve-Path "$PSScriptRoot\.."
    $code = "require('keytar').getPassword('ATS','$Account').then(v => { if (v) process.stdout.write(v); else process.exit(2); });"
    Push-Location $repoRoot
    try {
        $val = & node -e $code 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        return $val
    } finally {
        Pop-Location
    }
}

function Extract-Password([string]$Url) {
    if (-not $Url) { return $null }
    if ($Url -notmatch '^mysql://([^:]+):([^@]+)@') { return $null }
    return $matches[2]
}

function Test-IsAdmin {
    $id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $p  = New-Object System.Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ----------------------------------------------------------------------
# Phase 1: rebind users to mysql_native_password
# ----------------------------------------------------------------------
Write-Host ""
Write-Host "[1/2] Rebinding ats_app and ats_migrate to mysql_native_password..." -ForegroundColor Cyan

$dbUrl    = Get-AtsSecret "DATABASE_URL"
$migDbUrl = Get-AtsSecret "MIGRATE_DATABASE_URL"
if (-not $dbUrl)    { throw "DATABASE_URL missing from Credential Manager." }
if (-not $migDbUrl) { throw "MIGRATE_DATABASE_URL missing from Credential Manager." }

$appPwd = Extract-Password $dbUrl
$migPwd = Extract-Password $migDbUrl
if (-not $appPwd) { throw "Could not extract ats_app password from DATABASE_URL." }
if (-not $migPwd) { throw "Could not extract ats_migrate password from MIGRATE_DATABASE_URL." }

$mysql = Join-Path $MariaDBBin "mysql.exe"
if (-not (Test-Path $mysql)) { throw "mysql.exe not found at $mysql" }

$sql = @"
ALTER USER 'ats_app'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$appPwd');
ALTER USER 'ats_migrate'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$migPwd');
FLUSH PRIVILEGES;
SELECT user, host, plugin FROM mysql.user WHERE user IN ('ats_app','ats_migrate');
"@

$tmpSql = [System.IO.Path]::GetTempFileName()
Set-Content -LiteralPath $tmpSql -Value $sql -NoNewline
try {
    Get-Content -LiteralPath $tmpSql -Raw | & $mysql --user=root "--password=$RootPassword" --host=$DbHost --port=$Port --table
    if ($LASTEXITCODE -ne 0) { throw "mysql exited $LASTEXITCODE" }
} finally {
    Remove-Item -LiteralPath $tmpSql -Force -ErrorAction SilentlyContinue
}

# ----------------------------------------------------------------------
# Phase 2: disable gssapi at server level via my.ini + service restart
# ----------------------------------------------------------------------
Write-Host ""
Write-Host "[2/2] Disabling builtin gssapi plugin via my.ini..." -ForegroundColor Cyan

if (-not (Test-IsAdmin)) {
    Write-Host ""
    Write-Host "  WARNING: not running as Administrator." -ForegroundColor Yellow
    Write-Host "  Phase 2 cannot edit '$MariaDBData\my.ini' or restart the MariaDB service." -ForegroundColor Yellow
    Write-Host "  Either re-run this script from an elevated PowerShell, OR follow the" -ForegroundColor Yellow
    Write-Host "  manual steps printed below." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Manual steps (in an elevated PowerShell):" -ForegroundColor Yellow
    Write-Host "    Add-Content -Path '$MariaDBData\my.ini' -Value '`r`ngssapi=OFF'" -ForegroundColor Yellow
    Write-Host "    Restart-Service MariaDB -Force" -ForegroundColor Yellow
    exit 1
}

$myIni = Join-Path $MariaDBData "my.ini"
if (-not (Test-Path $myIni)) { throw "my.ini not found at $myIni" }

$content = Get-Content -LiteralPath $myIni -Raw
if ($content -match '(?im)^\s*gssapi\s*=\s*OFF\s*$') {
    Write-Host "  SKIP  gssapi=OFF already present in my.ini" -ForegroundColor DarkGray
} else {
    if ($content -match '(?im)^\s*\[mysqld\]\s*$') {
        # Insert `gssapi=OFF` immediately after the [mysqld] header.
        $patched = $content -replace '(?im)(^\s*\[mysqld\]\s*$)', "`$1`r`ngssapi=OFF"
    } else {
        # Append a new [mysqld] section with the directive.
        $patched = $content.TrimEnd() + "`r`n`r`n[mysqld]`r`ngssapi=OFF`r`n"
    }
    Set-Content -LiteralPath $myIni -Value $patched -NoNewline
    Write-Host "  OK    gssapi=OFF appended to my.ini" -ForegroundColor Green
}

Write-Host "  restarting MariaDB service..." -ForegroundColor DarkGray
Restart-Service -Name $ServiceName -Force
Start-Sleep -Seconds 2
$svc = Get-Service -Name $ServiceName
if ($svc.Status -ne "Running") {
    throw "MariaDB service failed to restart. Status: $($svc.Status)"
}
Write-Host "  OK    MariaDB service restarted" -ForegroundColor Green

# Verify gssapi is now DISABLED.
$verifySql = "SELECT plugin_name, plugin_status FROM information_schema.plugins WHERE plugin_name = 'gssapi';"
$verifySql | & $mysql --user=root "--password=$RootPassword" --host=$DbHost --port=$Port --table

Write-Host ""
Write-Host "Done. Try sign-in again." -ForegroundColor Green
