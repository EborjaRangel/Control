# Sube variables de back/.env al servicio Control en Railway (sin DATABASE_URL ni URLs locales).
param(
  [string]$EnvFile = (Join-Path (Join-Path $PSScriptRoot "..") ".env"),
  [string[]]$Keys = @(
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "RESEND_API_KEY",
    "RESEND_FROM",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_SMS_FROM",
    "TWILIO_WHATSAPP_FROM",
    "TWILIO_WHATSAPP_CONTENT_SID",
    "TWILIO_WHATSAPP_CONTENT_VARIABLES",
    "WHATSAPP_PROVIDER",
    "WHATSAPP_CLOUD_ACCESS_TOKEN",
    "WHATSAPP_CLOUD_PHONE_NUMBER_ID",
    "WHATSAPP_CLOUD_API_VERSION",
    "WHATSAPP_CLOUD_TEMPLATE_NAME",
    "WHATSAPP_CLOUD_TEMPLATE_LANGUAGE",
    "WHATSAPP_CLOUD_TEMPLATE_VARIABLES",
    "WHATSAPP_CLOUD_SOLO_PLANTILLA",
    "FRONTEND_URL",
    "PUBLIC_APP_URL"
  ),
  [switch]$SkipDeploys
)

$ErrorActionPreference = "Stop"

$railway = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railway) {
  throw "Railway CLI no está instalado. Instálalo con: npm i -g @railway/cli"
}

if (-not (Test-Path $EnvFile)) {
  throw "No existe $EnvFile"
}

$productionUrls = @{
  FRONTEND_URL = "https://control-front-gray.vercel.app"
  PUBLIC_APP_URL = "https://control-front-gray.vercel.app"
}

$values = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $idx = $line.IndexOf("=")
  if ($idx -lt 1) { return }
  $key = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
  if ($Keys -contains $key -and $val) {
    $values[$key] = $val
  }
}

foreach ($key in @("FRONTEND_URL", "PUBLIC_APP_URL")) {
  $values[$key] = $productionUrls[$key]
}

Push-Location (Join-Path $PSScriptRoot "..")
try {
  foreach ($key in $Keys) {
    if (-not $values.ContainsKey($key)) {
      Write-Host "Omitido (sin valor en .env): $key"
      continue
    }
    $args = @("variable", "set", "${key}=$($values[$key])", "--service", "Control")
    if ($SkipDeploys) { $args += "--skip-deploys" }
    & railway @args | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Error al definir $key en Railway"
    }
    if ($key -match "PASS|KEY|TOKEN|SECRET|SID") {
      Write-Host "OK: $key=***"
    } else {
      Write-Host "OK: $key=$($values[$key])"
    }
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Variables sincronizadas. Railway redeployará el servicio Control (salvo -SkipDeploys)."
