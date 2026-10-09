# Starts the FastAPI backend on http://127.0.0.1:8000
$env:PYTHONIOENCODING = "utf-8"   # print Kannada correctly in the Windows console
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
