param(
    [string]$ServiceName = "ATS Web",
    [string]$NssmPath    = "C:\Program Files\nssm\nssm.exe"
)

$ErrorActionPreference = "Stop"
& $NssmPath stop   $ServiceName confirm | Out-Null
& $NssmPath remove $ServiceName confirm | Out-Null
Write-Host "Service '$ServiceName' removed."
