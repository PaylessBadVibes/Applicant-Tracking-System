# ATS — Daily MariaDB backup (mariabackup).
# Scheduled by Task Scheduler at 01:30 local. Keeps last 7 backups.

param(
    [string]$MariaDBBin = "C:\Program Files\MariaDB 11.4\bin",
    [string]$DataDir    = "C:\Program Files\MariaDB 11.4\data"
)

$ErrorActionPreference = "Stop"
$root       = Resolve-Path "$PSScriptRoot\.."
$backupRoot = Join-Path $root "data\backups"
$logFile    = Join-Path $root "data\logs\backup.log"

function Log([string]$msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')] $msg"
    Write-Host $line
    Add-Content -LiteralPath $logFile -Value $line
}

function Get-CredManSecret([string]$Service, [string]$Account) {
    $code = @"
const k = require('keytar');
k.getPassword('$Service','$Account').then(v => { if (v) process.stdout.write(v); else process.exit(2); });
"@
    $tmp = [System.IO.Path]::GetTempFileName() + ".js"
    Set-Content -LiteralPath $tmp -Value $code -NoNewline
    try {
        $val = & node $tmp
        if ($LASTEXITCODE -ne 0) { throw "Secret '$Account' not found." }
        return $val
    } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
}

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $logFile) | Out-Null

$rootPwd = Get-CredManSecret -Service "ATS" -Account "MARIADB_ROOT_PASSWORD"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $backupRoot $timestamp
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$mariabackup = Join-Path $MariaDBBin "mariabackup.exe"
if (-not (Test-Path $mariabackup)) { throw "mariabackup.exe not found at $mariabackup" }

Log "Starting backup -> $dest"
& $mariabackup --backup --target-dir=$dest --user=root "--password=$rootPwd" --datadir=$DataDir
if ($LASTEXITCODE -ne 0) { Log "ERROR: --backup failed exit $LASTEXITCODE"; exit 1 }

& $mariabackup --prepare --target-dir=$dest
if ($LASTEXITCODE -ne 0) { Log "ERROR: --prepare failed exit $LASTEXITCODE"; exit 1 }

# Manifest
$manifest = Join-Path $backupRoot "manifest.csv"
$checkpointsFile = Join-Path $dest "xtrabackup_checkpoints"
if (Test-Path $checkpointsFile) {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $checkpointsFile).Hash
    Add-Content -LiteralPath $manifest -Value "$timestamp,$hash"
}

# Retention: keep last 7
Get-ChildItem -LiteralPath $backupRoot -Directory |
    Sort-Object Name -Descending |
    Select-Object -Skip 7 |
    ForEach-Object {
        Log "Pruning old backup: $($_.Name)"
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }

Log "Backup complete: $dest"
