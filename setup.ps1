# One-time setup for Kannada SignBridge (Windows PowerShell).
# Run from the project folder:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "== Backend: creating Python virtual environment ==" -ForegroundColor Cyan
Set-Location "$root\backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe tools\make_placeholder_animations.py

Write-Host "== Frontend: installing npm packages ==" -ForegroundColor Cyan
Set-Location "$root\frontend"
npm install

$models = "$root\frontend\public\models"
New-Item -ItemType Directory -Force $models | Out-Null
if (-not (Test-Path "$models\hand_landmarker.task")) {
  Write-Host "Downloading MediaPipe hand model..." -ForegroundColor Cyan
  Invoke-WebRequest "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" -OutFile "$models\hand_landmarker.task"
}
if (-not (Test-Path "$models\face_landmarker.task")) {
  Write-Host "Downloading MediaPipe face model..." -ForegroundColor Cyan
  Invoke-WebRequest "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" -OutFile "$models\face_landmarker.task"
}
Set-Location $root
Write-Host "Setup complete. Start the backend with .\start-backend.ps1 and the frontend with .\start-frontend.ps1" -ForegroundColor Green
