$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

docker build -t prelegal .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$envArgs = @()
if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
}

docker rm -f prelegal *> $null
docker run -d --name prelegal -p 8000:8000 -p 3000:3000 @envArgs prelegal
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Prelegal is starting."
Write-Host "Backend:  http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
