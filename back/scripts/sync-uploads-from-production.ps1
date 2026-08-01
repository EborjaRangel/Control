# Descarga archivos de /uploads desde producción (Railway) hacia back/uploads local.
# Útil después de sincronizar la base de datos sin copiar las imágenes.
#
# Uso:
#   .\scripts\sync-uploads-from-production.ps1
#   .\scripts\sync-uploads-from-production.ps1 -ApiUrl "https://tu-api.railway.app"

param(
  [string]$ApiUrl = "https://control-production-b69d.up.railway.app",
  [string]$UploadsDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $UploadsDir) {
  $UploadsDir = Join-Path (Join-Path $PSScriptRoot "..") "uploads"
}

New-Item -ItemType Directory -Force -Path $UploadsDir | Out-Null

Write-Host "==> API: $ApiUrl"
Write-Host "==> Destino local: $UploadsDir"
Write-Host ""

$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env"
$databaseUrl = $null
if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if ($line -match 'DATABASE_URL="([^"]+)"') {
    $databaseUrl = $Matches[1]
  }
}

$paths = New-Object System.Collections.Generic.HashSet[string]
function Add-UploadPath([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return }
  $trimmed = $value.Trim()
  if ($trimmed -match '/uploads/([^/?#]+)$') {
    [void]$paths.Add($Matches[1])
    return
  }
  if ($trimmed -match '^/?uploads/([^/?#]+)$') {
    [void]$paths.Add($Matches[1])
  }
}

if ($databaseUrl) {
  Write-Host "==> Leyendo rutas de imágenes desde PostgreSQL local..."
  $pgBin = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
  if (-not (Test-Path $pgBin)) {
    throw "No se encontró psql. Ajusta `$PgBin o instala PostgreSQL client."
  }

  $sql = @'
SELECT DISTINCT path FROM (
  SELECT "fotoUrl" AS path FROM "Dirigente" WHERE "fotoUrl" IS NOT NULL AND "fotoUrl" <> ''
  UNION ALL SELECT "ineFrenteUrl" FROM "Dirigente" WHERE "ineFrenteUrl" IS NOT NULL AND "ineFrenteUrl" <> ''
  UNION ALL SELECT "ineReversoUrl" FROM "Dirigente" WHERE "ineReversoUrl" IS NOT NULL AND "ineReversoUrl" <> ''
  UNION ALL SELECT "fotoAntesUrl" FROM "ReporteServicioUrbano" WHERE "fotoAntesUrl" IS NOT NULL AND "fotoAntesUrl" <> ''
  UNION ALL SELECT "fotoDespuesUrl" FROM "ReporteServicioUrbano" WHERE "fotoDespuesUrl" IS NOT NULL AND "fotoDespuesUrl" <> ''
  UNION ALL SELECT "fotoAtencionUrl" FROM "ReporteServicioUrbano" WHERE "fotoAtencionUrl" IS NOT NULL AND "fotoAtencionUrl" <> ''
) t;
'@

  $rows = $sql | & $pgBin $databaseUrl -t -A 2>$null
  foreach ($row in $rows) {
    Add-UploadPath $row
  }
}

if ($paths.Count -eq 0) {
  Write-Host "No se encontraron rutas /uploads/ en la base. Descargando archivos ya presentes en producción no está soportado sin listado remoto."
  exit 0
}

$ok = 0
$skip = 0
$fail = 0

foreach ($fileName in ($paths | Sort-Object)) {
  $target = Join-Path $UploadsDir $fileName
  if (Test-Path $target) {
    $skip++
    continue
  }

  try {
    Invoke-WebRequest -Uri "$ApiUrl/uploads/$fileName" -OutFile $target -TimeoutSec 60
    $ok++
    Write-Host "  OK  $fileName"
  } catch {
    $fail++
    Write-Host "  ERR $fileName"
  }
}

Write-Host ""
Write-Host "==> Listo: $ok descargados, $skip ya existían, $fail fallidos (total $($paths.Count))"

if ($fail -gt 0) {
  exit 1
}
