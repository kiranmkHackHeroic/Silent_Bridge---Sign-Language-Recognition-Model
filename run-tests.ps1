# Runs backend (pytest) and frontend (vitest + TypeScript) tests
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m pytest
Set-Location "$root\frontend"
npx tsc --noEmit
npx vitest run
Set-Location $root
