# Starts the React (Vite) frontend on http://127.0.0.1:5173
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\frontend"
npm run dev
