$ErrorActionPreference = "SilentlyContinue"

docker stop prelegal | Out-Null
docker rm prelegal | Out-Null

Write-Host "Prelegal stopped."
