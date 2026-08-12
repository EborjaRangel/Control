# Actualiza back/.env con variables de Railway (servicio Control) y mantiene DATABASE_URL local.
param(
  [string]$EnvFile = (Join-Path (Join-Path $PSScriptRoot "..") ".env"),
  [string]$LocalDatabaseUrl = "postgresql://postgres:Nya5l136@localhost:5432/control"
)

$ErrorActionPreference = "Stop"

$railway = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railway) {
  throw "Railway CLI no está instalado. Instálalo con: npm i -g @railway/cli"
}

Push-Location (Join-Path $PSScriptRoot "..")
try {
  $kv = railway variable list --service Control --kv 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudieron leer variables de Railway: $kv"
  }
} finally {
  Pop-Location
}

$keep = @(
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
  "FRONTEND_URL",
  "PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
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
  "WHATSAPP_CLOUD_SOLO_PLANTILLA"
)

$values = @{}
foreach ($line in ($kv -split "`n")) {
  if ($line -match '^\s*$') { continue }
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { continue }
  $key = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1)
  if ($key -like "RAILWAY_*") { continue }
  if ($keep -contains $key) {
    $values[$key] = $val
  }
}

$values["FRONTEND_URL"] = "http://localhost:3000"
$values["PUBLIC_APP_URL"] = "http://localhost:3000"

$lines = @(
  "# PostgreSQL local (datos sincronizados desde Railway con sync-production-to-local.ps1)",
  ('DATABASE_URL="{0}"' -f $LocalDatabaseUrl),
  "",
  "# Puerto del API",
  "PORT=4000",
  ""
)

foreach ($key in $keep) {
  if ($key -in @("FRONTEND_URL", "PUBLIC_APP_URL")) { continue }
  if (-not $values.ContainsKey($key)) { continue }
  $lines += ('{0}="{1}"' -f $key, $values[$key])
}

$lines += ""
$lines += ('FRONTEND_URL="{0}"' -f $values["FRONTEND_URL"])
$lines += ('PUBLIC_APP_URL="{0}"' -f $values["PUBLIC_APP_URL"])
$lines += ""
$lines += "# Opcional en local: muestra el enlace de recuperación en pantalla si SMTP falla"
$lines += '# SMTP_DEV_LOG="true"'

Set-Content -Path $EnvFile -Value ($lines -join "`r`n") -Encoding UTF8
Write-Host "Actualizado: $EnvFile"
