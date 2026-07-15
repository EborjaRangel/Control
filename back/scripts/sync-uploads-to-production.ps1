# Sincroniza archivos de back/uploads hacia producción (Railway).
# Preserva el nombre del archivo para que coincida con las rutas en la base de datos.
#
# Uso:
#   .\scripts\sync-uploads-to-production.ps1
#   .\scripts\sync-uploads-to-production.ps1 -ApiUrl "https://tu-api.railway.app" -Username admin -Password "..."
#
# Requiere: curl.exe (incluido en Windows 10+)

param(
  [string]$ApiUrl = "https://control-production-b69d.up.railway.app",
  [string]$Username = "admin",
  [string]$Password = "Poliedro2027",
  [string]$UploadsDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $UploadsDir) {
  $UploadsDir = Join-Path (Join-Path $PSScriptRoot "..") "uploads"
}

if (-not (Test-Path $UploadsDir)) {
  throw "No se encontró la carpeta de uploads: $UploadsDir"
}

$curl = Get-Command curl.exe -ErrorAction SilentlyContinue
if (-not $curl) {
  throw "curl.exe no está disponible. Instálalo o usa Windows 10+."
}

Write-Host "==> API: $ApiUrl"
Write-Host "==> Carpeta local: $UploadsDir"
Write-Host ""

Write-Host "==> Iniciando sesión como $Username..."
try {
  $login = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" -Method Post `
    -ContentType "application/json" `
    -Body (@{ username = $Username; password = $Password } | ConvertTo-Json -Compress)
} catch {
  throw "No se pudo iniciar sesión: $($_.Exception.Message)"
}

if (-not $login.token) {
  $errMsg = if ($login.error) { $login.error } else { "sin token" }
  throw "No se pudo iniciar sesión: $errMsg"
}

$token = $login.token
$files = Get-ChildItem $UploadsDir -File | Where-Object { $_.Name -ne ".gitkeep" }
$total = $files.Count
$ok = 0
$fail = 0

Write-Host "==> Subiendo $total archivos..."
Write-Host ""

foreach ($file in $files) {
  $encodedName = [uri]::EscapeDataString($file.Name)
  $mime = switch ($file.Extension.ToLower()) {
    ".webp" { "image/webp" }
    ".png" { "image/png" }
    ".gif" { "image/gif" }
    default { "image/jpeg" }
  }
  $formField = "file=@$($file.FullName);type=$mime"
  $response = curl.exe -s -w "`n%{http_code}" -X POST `
    -H "Authorization: Bearer $token" `
    -F $formField `
    "$ApiUrl/api/admin/uploads/restore?filename=$encodedName"

  $lines = $response -split "`n"
  $status = $lines[-1].Trim()
  $body = ($lines[0..($lines.Length - 2)] -join "`n").Trim()

  if ($status -eq "201") {
    $ok++
    Write-Host "  OK  $($file.Name)"
  } else {
    $fail++
    Write-Host "  ERR $($file.Name) (HTTP $status) $body"
  }
}

Write-Host ""
Write-Host "==> Listo: $ok subidos, $fail fallidos de $total"

if ($fail -gt 0) {
  exit 1
}
