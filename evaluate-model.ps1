# Prints dataset validation, the saved model's measured metrics, error analysis and pipeline latency.
$env:PYTHONIOENCODING = "utf-8"   # print Kannada correctly in the Windows console
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m app.training.evaluate_model
Set-Location $root
