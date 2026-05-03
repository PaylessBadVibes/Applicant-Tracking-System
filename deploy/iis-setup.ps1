# ATS — One-time IIS reverse proxy setup for the Next.js service.
# Run as Administrator. Requires:
#   * URL Rewrite 2.1 (https://www.iis.net/downloads/microsoft/url-rewrite)
#   * Application Request Routing 3.0 (https://www.iis.net/downloads/microsoft/application-request-routing)
#   * AD CS server certificate already enrolled to Cert:\LocalMachine\My
#     (its thumbprint is supplied via -CertThumbprint)

param(
    [Parameter(Mandatory=$true)][string]$Hostname,
    [Parameter(Mandatory=$true)][string]$CertThumbprint,
    [string]$SiteName    = "ATS",
    [string]$AppPoolName = "ATS",
    [int]   $UpstreamPort = 3000
)

$ErrorActionPreference = "Stop"
Import-Module WebAdministration

$root      = Resolve-Path "$PSScriptRoot\.."
$iisRoot   = Join-Path $root "deploy\iis-root"
$webConfig = Join-Path $root "deploy\web.config"

New-Item -ItemType Directory -Force -Path $iisRoot | Out-Null
Copy-Item -LiteralPath $webConfig -Destination (Join-Path $iisRoot "web.config") -Force

# Application pool (No Managed Code; ATS is just a reverse proxy host).
if (Test-Path "IIS:\AppPools\$AppPoolName") { Remove-WebAppPool -Name $AppPoolName }
New-WebAppPool -Name $AppPoolName | Out-Null
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name "managedRuntimeVersion" -Value ""

# Site
if (Test-Path "IIS:\Sites\$SiteName") { Remove-Website -Name $SiteName }
New-Website -Name $SiteName -PhysicalPath $iisRoot -ApplicationPool $AppPoolName -Port 80 -HostHeader $Hostname | Out-Null

# HTTPS binding
New-WebBinding -Name $SiteName -Protocol "https" -Port 443 -HostHeader $Hostname -SslFlags 1
$binding = Get-WebBinding -Name $SiteName -Protocol "https"
$binding.AddSslCertificate($CertThumbprint, "My")

# Enable ARR proxy at server level
& "$env:windir\system32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy /enabled:"True" /commit:apphost | Out-Null

# Restart IIS to apply
iisreset | Out-Null
Write-Host "IIS site '$SiteName' configured at https://$Hostname/ -> http://127.0.0.1:$UpstreamPort"
