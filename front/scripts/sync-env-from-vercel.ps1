# Descarga variables de Vercel (control-front) y deja valores aptos para desarrollo local.
param(
  [string]$EnvFile = (Join-Path (Join-Path $PSScriptRoot "..") ".env.local")
)

$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "..")
try {
  npx vercel link --project control-front --yes | Out-Null
  npx vercel env pull $EnvFile --environment=production --yes | Out-Null
} finally {
  Pop-Location
}

$content = Get-Content $EnvFile -Raw
$content = $content -replace '(?m)^API_PROXY_URL=.*$', 'API_PROXY_URL="http://localhost:4000"'
$content = $content -replace '(?m)^NEXT_PUBLIC_APP_URL=.*$', 'NEXT_PUBLIC_APP_URL="http://localhost:3000"'

$stripPrefixes = @(
  "^VERCEL=",
  "^VERCEL_",
  "^NX_DAEMON=",
  "^TURBO_"
)

$filtered = ($content -split "`n") | Where-Object {
  $line = $_
  $drop = $false
  foreach ($prefix in $stripPrefixes) {
    if ($line -match $prefix) { $drop = $true; break }
  }
  -not $drop
}

Set-Content -Path $EnvFile -Value ($filtered -join "`n") -Encoding UTF8
Write-Host "Actualizado: $EnvFile"
