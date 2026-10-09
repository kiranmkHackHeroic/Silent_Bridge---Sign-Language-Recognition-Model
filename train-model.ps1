# Validates the recorded dataset, trains + evaluates the sign classifier and saves the best model.
$env:PYTHONIOENCODING = "utf-8"   # print Kannada correctly in the Windows console
# Same as the "Train model" button on the Dataset & Model page. Extra args are passed through,
# e.g.  .\train-model.ps1 --no-save   or   .\train-model.ps1 --seed 7 --models logreg,mlp
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$root\backend"
.\.venv\Scripts\python.exe -m app.training.train_model @args
Set-Location $root
