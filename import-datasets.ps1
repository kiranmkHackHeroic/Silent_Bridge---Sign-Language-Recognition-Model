# Extracts MediaPipe landmarks from downloaded dataset videos (resumable: processed videos are skipped).
#   .\import-datasets.ps1 amrita_slr      (isolated signs)
#   .\import-datasets.ps1 include         (isolated signs, official splits)
#   .\import-datasets.ps1 isl_csltr       (continuous sentences)
$env:PYTHONIOENCODING = "utf-8"
$env:GLOG_minloglevel = "2"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
foreach ($d in $args) { .\.venv\Scripts\python.exe -m app.video.importer $d --workers 3 }
Set-Location $root
