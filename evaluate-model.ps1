# Prints dataset validation, the saved model's measured metrics, error analysis and pipeline latency.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m app.training.evaluate_model
Set-Location $root
