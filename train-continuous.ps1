# Trains + evaluates the continuous sentence model (BiGRU + CTC vs. sentence-classifier baseline)
# on the imported ISL-CSLTR videos and activates it.
$env:PYTHONIOENCODING = "utf-8"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m app.continuous.train
Set-Location $root
