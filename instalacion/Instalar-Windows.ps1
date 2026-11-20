# Ejecutar en PowerShell desde la carpeta del proyecto. Requiere Docker Desktop iniciado, Node.js, pnpm y Supabase CLI.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
function Require-Tool($name) { if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "Falta $name. Instálalo antes de continuar." } }
Require-Tool 'node'; Require-Tool 'pnpm'; Require-Tool 'supabase'; Require-Tool 'docker'
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) { throw 'Inicia Docker Desktop antes de instalar.' }
Write-Host 'Instalando dependencias...' -ForegroundColor Cyan
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Falló pnpm install.' }
Write-Host 'Iniciando base de datos local...' -ForegroundColor Cyan
supabase start
if ($LASTEXITCODE -ne 0) { throw 'Falló supabase start.' }
# El comando status -o env es solo para uso local; no imprimas su salida porque contiene claves.
$raw = (supabase status -o env 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo obtener la configuración local.' }
$values = @{}
foreach ($line in ($raw -split "`n")) {
  if ($line -match '^([A-Z_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2].Trim('"', "'", ' ') }
}
$publicKey = @($values['ANON_KEY'], $values['PUBLISHABLE_KEY'], $values['SUPABASE_ANON_KEY']) | Where-Object { $_ } | Select-Object -First 1
$adminKey = @($values['SERVICE_ROLE_KEY'], $values['SECRET_KEY'], $values['SUPABASE_SERVICE_ROLE_KEY']) | Where-Object { $_ } | Select-Object -First 1
if (-not $publicKey -or -not $adminKey) { throw 'No se encontraron las claves locales. Comprueba la versión de Supabase CLI; no copies claves a este chat.' }
# Solo la clave pública entra al archivo de Vite. Nunca guardar la clave administrativa.
$envFile = Join-Path (Get-Location) '.env.local'
@("VITE_SUPABASE_URL=http://127.0.0.1:55321", "VITE_SUPABASE_ANON_KEY=$publicKey") | Set-Content -Path $envFile -Encoding utf8
Write-Host 'Compilando la aplicación...' -ForegroundColor Cyan
pnpm run build:prod
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación.' }
# No ejecutar el bootstrap si hay usuarios: se comprueba también dentro del programa.
$secure = Read-Host 'Contraseña NUEVA para el MASTER (mínimo 12 caracteres)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
try {
  $env:NOMINA_LOCAL_URL = 'http://127.0.0.1:55321'
  $env:NOMINA_LOCAL_ADMIN_KEY = $adminKey
  @{ password = $password } | ConvertTo-Json -Compress | node (Join-Path $PSScriptRoot 'activar-master.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo activar el MASTER.' }
} finally {
  Remove-Item Env:NOMINA_LOCAL_ADMIN_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:NOMINA_LOCAL_URL -ErrorAction SilentlyContinue
  $password = $null; $secure = $null; $adminKey = $null
}
Write-Host 'Instalación inicial terminada. Ejecuta Iniciar-NominaLocal.ps1.' -ForegroundColor Green
