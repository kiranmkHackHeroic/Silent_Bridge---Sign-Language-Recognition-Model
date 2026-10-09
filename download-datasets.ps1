# Downloads the registered public ISL datasets (resumable, checksum-verified, safe extraction).
#   .\download-datasets.ps1                      -> list datasets, sizes and licenses
#   .\download-datasets.ps1 amrita_slr isl_csltr  -> download + extract
#   .\download-datasets.ps1 include               -> INCLUDE subset (slow server: hours)
$env:PYTHONIOENCODING = "utf-8"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
if ($args.Count -eq 0) { .\.venv\Scripts\python.exe tools\download_datasets.py --list }
else { .\.venv\Scripts\python.exe tools\download_datasets.py @args }
Set-Location $root
