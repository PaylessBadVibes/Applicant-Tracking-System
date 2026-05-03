# ATS — Install NSSM-supervised Next.js Windows service.
# Run as Administrator.

param(
    [string]$ServiceName = "ATS Web",
    [int]   $Port        = 3000,
    [string]$NssmPath    = "C:\Program Files\nssm\nssm.exe",
    [string]$NodePath    = "C:\Program Files\nodejs\node.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $NssmPath)) { throw "NSSM not found at $NssmPath" }
if (-not (Test-Path $NodePath)) { throw "Node not found at $NodePath" }

$root        = Resolve-Path "$PSScriptRoot\.."
$webDir      = Join-Path $root "web"
$standalone  = Join-Path $webDir ".next\standalone\server.js"
$logsDir     = Join-Path $root "data\logs"

if (-not (Test-Path $standalone)) {
    throw "Next.js standalone build not found at $standalone. Run `npm --workspace web run build` first."
}
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

# Remove existing service first (idempotent reinstall).
& $NssmPath status $ServiceName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    & $NssmPath stop    $ServiceName confirm | Out-Null
    & $NssmPath remove  $ServiceName confirm | Out-Null
}

& $NssmPath install  $ServiceName $NodePath | Out-Null
& $NssmPath set      $ServiceName AppParameters         "$standalone"
& $NssmPath set      $ServiceName AppDirectory          "$webDir"
& $NssmPath set      $ServiceName AppEnvironmentExtra   "NODE_ENV=production" "PORT=$Port" "HOSTNAME=127.0.0.1"
& $NssmPath set      $ServiceName AppStdout             (Join-Path $logsDir "ats-web-stdout.log")
& $NssmPath set      $ServiceName AppStderr             (Join-Path $logsDir "ats-web-stderr.log")
& $NssmPath set      $ServiceName AppRotateFiles        1
& $NssmPath set      $ServiceName AppRotateBytes        10485760
& $NssmPath set      $ServiceName Start                 SERVICE_AUTO_START
& $NssmPath set      $ServiceName ObjectName            "NT AUTHORITY\LocalService"
& $NssmPath set      $ServiceName AppExit               Default Restart
& $NssmPath set      $ServiceName AppRestartDelay       5000

Start-Service $ServiceName
Write-Host "Service '$ServiceName' installed and started on port $Port."
