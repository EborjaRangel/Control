# Sincroniza datos de PostgreSQL en producción (Railway) hacia la base local.
# Uso:
#   .\scripts\sync-production-to-local.ps1 -ProductionDatabaseUrl "postgresql://..."
#
# Requiere PostgreSQL client (pg_dump, psql) instalado en Windows.

param(
  [Parameter(Mandatory = $true)]
  [string]$ProductionDatabaseUrl,

  [string]$LocalDatabaseUrl = "",

  [string]$PgBin = "C:\Program Files\PostgreSQL\18\bin",

  [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not $LocalDatabaseUrl) {
  $envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env"
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL=' } | Select-Object -First 1
    if ($line -match '=\s*"?([^"\r\n]+)"?') {
      $LocalDatabaseUrl = $Matches[1].Trim()
    }
  }
  if (-not $LocalDatabaseUrl) {
    throw "No se encontró DATABASE_URL local. Pasa -LocalDatabaseUrl o configura back/.env"
  }
}

function Get-DbHostLabel([string]$Url) {
  if ($Url -match "@([^:/]+)") { return $Matches[1] }
  return "desconocido"
}

$pgDump = Join-Path $PgBin "pg_dump.exe"
$psql = Join-Path $PgBin "psql.exe"

if (-not (Test-Path $pgDump)) {
  throw "No se encontró pg_dump en $pgDump. Ajusta -PgBin si PostgreSQL está en otra ruta."
}
if (-not (Test-Path $psql)) {
  throw "No se encontró psql en $psql. Ajusta -PgBin si PostgreSQL está en otra ruta."
}

$dumpFile = Join-Path $env:TEMP ("control-production-data-{0}.sql" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$truncateFile = Join-Path $env:TEMP "control-truncate-public-local.sql"

Write-Host "==> Origen producción: $(Get-DbHostLabel $ProductionDatabaseUrl)"
Write-Host "==> Destino local: $(Get-DbHostLabel $LocalDatabaseUrl)"
Write-Host ""
Write-Host "ADVERTENCIA: Esto BORRARÁ todos los datos actuales en tu PostgreSQL local y los reemplazará con los de Railway."
if (-not $Force) {
  $confirm = Read-Host "Escribe SI para continuar"
  if ($confirm -ne "SI") {
    Write-Host "Cancelado."
    exit 0
  }
}

Write-Host ""
Write-Host "==> 1/3 Exportando datos de producción..."
& $pgDump $ProductionDatabaseUrl `
  --data-only `
  --no-owner `
  --no-acl `
  --disable-triggers `
  --file $dumpFile

$sizeKb = [math]::Round((Get-Item $dumpFile).Length / 1KB, 1)
Write-Host "    Dump creado: $dumpFile ($sizeKb KB)"

@'
DO $do$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $do$;
'@ | Set-Content -Path $truncateFile -Encoding UTF8

Write-Host "==> 2/3 Limpiando tablas locales..."
& $psql $LocalDatabaseUrl -v ON_ERROR_STOP=1 -f $truncateFile

Write-Host "==> 3/3 Importando datos a la base local..."
$dumpContent = Get-Content -Path $dumpFile -Raw -Encoding UTF8
$fullImport = "SET session_replication_role = replica;`n$dumpContent`nSET session_replication_role = DEFAULT;`n"
$importFile = Join-Path $env:TEMP "control-import-local-full.sql"
Set-Content -Path $importFile -Value $fullImport -Encoding UTF8 -NoNewline
& $psql $LocalDatabaseUrl -v ON_ERROR_STOP=1 -f $importFile

Write-Host ""
Write-Host "==> Verificación local:"
$verifySql = 'SELECT ''Dirigente'' AS tabla, COUNT(*)::text AS total FROM "Dirigente" UNION ALL SELECT ''Usuario'', COUNT(*)::text FROM "Usuario" UNION ALL SELECT ''Nomina'', COUNT(*)::text FROM "Nomina";'
$verifySql | & $psql $LocalDatabaseUrl

Write-Host ""
Write-Host "Sincronización completada."
