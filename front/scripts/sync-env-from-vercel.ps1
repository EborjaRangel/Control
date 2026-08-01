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

# Evita sobrescribir tokens válidos con placeholders corruptos de Vercel.
$existingMapbox = $null
if (Test-Path $EnvFile) {
  $prevLine = Get-Content $EnvFile | Where-Object { $_ -match '^NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=' } | Select-Object -First 1
  if ($prevLine -match '^NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="(pk\.[^"]+)"') {
    $existingMapbox = $Matches[1]
  }
}
$newMapboxLine = ($content -split "`n") | Where-Object { $_ -match '^NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=' } | Select-Object -First 1
if ($existingMapbox -and $newMapboxLine -and $newMapboxLine -notmatch 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk\.') {
  $content = $content -replace '(?m)^NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=.*$', "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=`"$existingMapbox`""
}

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
