$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path '.env.local')) { throw 'Primero ejecuta Instalar-Windows.ps1.' }
# Supabase puede estar detenido después de reiniciar Windows.
supabase start
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar la base de datos.' }
Write-Host 'Abre http://127.0.0.1:8087 en este computador.' -ForegroundColor Green
pnpm exec vite preview --host 127.0.0.1 --port 8087 --strictPort
