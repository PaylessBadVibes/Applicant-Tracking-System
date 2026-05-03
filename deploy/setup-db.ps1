# ATS — One-time MariaDB setup
#
# - Creates database `ats` (utf8mb4 / utf8mb4_unicode_ci)
# - Creates `ats_app` (DML-only, runtime) and `ats_migrate` (DDL, used by Prisma)
# - Generates random 40-char passwords and stores DATABASE_URL and MIGRATE_DATABASE_URL
#   in Windows Credential Manager (service "ATS") via the npm secrets:set helper,
#   unless -SkipKeytarPersist is given.
#
# Prerequisites:
#   - MariaDB 11.4 LTS installed at C:\Program Files\MariaDB 11.4\
#   - Either pass -RootPassword on the command line, or pre-store the root password:
#       npm run secrets:set -- --key MARIADB_ROOT_PASSWORD
#
# Run as Administrator from the workspace root.

param(
    [string]$MariaDBBin       = "C:\Program Files\MariaDB 11.4\bin",
    [string]$DbHost           = "127.0.0.1",
    [int]   $Port             = 3306,
    [string]$Database         = "ats",
    [string]$RootPassword     = "",
    [switch]$SkipKeytarPersist
)

$ErrorActionPreference = "Stop"

function Get-CredManSecret([string]$Service, [string]$Account) {
    # Read a secret previously written by `npm run secrets:set` (which uses keytar).
    # Run node from the workspace root so `require('keytar')` resolves correctly.
    $repoRoot = Resolve-Path "$PSScriptRoot\.."
    $code = "require('keytar').getPassword('$Service','$Account').then(v => { if (v) process.stdout.write(v); else process.exit(2); });"
    Push-Location $repoRoot
    try {
        $val = & node -e $code 2>$null
        if ($LASTEXITCODE -ne 0) { throw "Secret '$Account' not found in Credential Manager." }
        return $val
    } finally {
        Pop-Location
    }
}

function New-RandomPassword([int]$Length = 48) {
    $bytes = New-Object byte[] $Length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_').Substring(0,$Length)
}

if ([string]::IsNullOrEmpty($RootPassword)) {
    $rootPwd = Get-CredManSecret -Service "ATS" -Account "MARIADB_ROOT_PASSWORD"
} else {
    $rootPwd = $RootPassword
}
$appPwd  = New-RandomPassword 40
$migPwd  = New-RandomPassword 40

$mysql = Join-Path $MariaDBBin "mysql.exe"
if (-not (Test-Path $mysql)) { throw "mysql.exe not found at $mysql" }

$sql = @"
CREATE DATABASE IF NOT EXISTS $Database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP USER IF EXISTS 'ats_app'@'localhost';
CREATE USER 'ats_app'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$appPwd');
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON $Database.* TO 'ats_app'@'localhost';

DROP USER IF EXISTS 'ats_migrate'@'localhost';
CREATE USER 'ats_migrate'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('$migPwd');
GRANT ALL PRIVILEGES ON $Database.* TO 'ats_migrate'@'localhost';

FLUSH PRIVILEGES;
"@

$tmpSql = [System.IO.Path]::GetTempFileName()
Set-Content -LiteralPath $tmpSql -Value $sql -NoNewline
try {
    # Pipe SQL via stdin in --batch mode: aborts on first error.
    Get-Content -LiteralPath $tmpSql -Raw | & $mysql --user=root "--password=$rootPwd" --host=$DbHost --port=$Port --batch
    if ($LASTEXITCODE -ne 0) { throw "MariaDB setup failed (mysql exit code $LASTEXITCODE)." }
} finally {
    Remove-Item -LiteralPath $tmpSql -Force -ErrorAction SilentlyContinue
}

$dbUrl     = "mysql://ats_app:${appPwd}@${DbHost}:${Port}/${Database}"
$migDbUrl  = "mysql://ats_migrate:${migPwd}@${DbHost}:${Port}/${Database}"

if (-not $SkipKeytarPersist) {
    # Persist via the npm secrets:set helper (keytar).
    # Wrap in `cmd /c` because PowerShell strips `--` from native command args.
    $root = Resolve-Path "$PSScriptRoot\.."
    Push-Location $root
    try {
        $dbUrl    | & cmd /c "npm run --silent secrets:set -- --key DATABASE_URL --from-stdin"
        $migDbUrl | & cmd /c "npm run --silent secrets:set -- --key MIGRATE_DATABASE_URL --from-stdin"
    } finally {
        Pop-Location
    }
}

Write-Host "MariaDB database '$Database' ready. Credentials stored in Windows Credential Manager."
