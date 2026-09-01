<#
.SYNOPSIS
    Starts all ClaimsGuru microservices (API, Workers, DB, Redis, Frontend) locally with a single command.
.DESCRIPTION
    Builds and runs the production containers locally connected to local SQL Server and Redis.
.EXAMPLE
    .\run_local_containers.ps1 -Rebuild
#>

param (
    [switch]$Rebuild = $false,
    [switch]$Stop = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

if ($Stop) {
    Write-Host "🛑 Stopping all ClaimsGuru containers..." -ForegroundColor Yellow
    docker rm -f claimsguru-api-test claimsguru-worker-ocr claimsguru-worker-default claimsguru-web-test 2>$null
    docker compose -f "$ProjectRoot/infra/docker/docker-compose.yml" stop mssql-db redis 2>$null
    Write-Host "✓ All containers stopped." -ForegroundColor Green
    exit 0
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Starting ClaimsGuru Cloud-Ready Local Container Stack" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure SQL Server and Redis are running
Write-Host "`n[1/5] Starting Local SQL Server & Redis..." -ForegroundColor Yellow
docker compose -f "$ProjectRoot/infra/docker/docker-compose.yml" up -d mssql-db redis

# 2. Wait for SQL Server to be healthy and initialize database
Write-Host "`n[2/5] Initializing Database Schema..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
docker exec -i claimgpt-feature-mssql-db-1 /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong!Password" -C -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'claimgpt') CREATE DATABASE claimgpt;" 2>$null
if (Test-Path "$ProjectRoot\.venv\Scripts\python.exe") {
    & "$ProjectRoot\.venv\Scripts\python.exe" "$ProjectRoot\init_db.py"
}

# 3. Build Docker Images if requested or missing
if ($Rebuild -or -not (docker images -q claimsguru-core:test)) {
    Write-Host "`n[3/5] Building claimsguru-core:test..." -ForegroundColor Yellow
    docker build -t claimsguru-core:test -f "$ProjectRoot/infra/docker/Dockerfile.core" "$ProjectRoot"
}

if ($Rebuild -or -not (docker images -q claimsguru-frontend:test)) {
    Write-Host "`n[4/5] Building claimsguru-frontend:test..." -ForegroundColor Yellow
    docker build -t claimsguru-frontend:test -f "$ProjectRoot/infra/docker/Dockerfile.web" "$ProjectRoot"
}

# 4. Remove old application containers
docker rm -f claimsguru-api-test claimsguru-worker-ocr claimsguru-worker-default claimsguru-web-test 2>$null

# 5. Launch API Gateway
Write-Host "`n[5/5] Launching API Gateway & Celery Workers..." -ForegroundColor Yellow

# API Gateway
docker run -d --name claimsguru-api-test -p 8000:8000 `
  --network claimgpt-feature_default `
  --dns 8.8.8.8 --dns 1.1.1.1 `
  -e DATABASE_URL="mssql+pymssql://sa:YourStrong!Password@claimgpt-feature-mssql-db-1:1433/claimgpt" `
  -e REDIS_URL="redis://claimgpt-feature-redis-1:6379/4" `
  --env-file "$ProjectRoot/.env" `
  claimsguru-core:test

# OCR Worker
docker run -d --name claimsguru-worker-ocr `
  --network claimgpt-feature_default `
  --dns 8.8.8.8 --dns 1.1.1.1 `
  -e CELERY_WORKER="true" `
  -e DATABASE_URL="mssql+pymssql://sa:YourStrong!Password@claimgpt-feature-mssql-db-1:1433/claimgpt" `
  -e REDIS_URL="redis://claimgpt-feature-redis-1:6379/4" `
  --env-file "$ProjectRoot/.env" `
  claimsguru-core:test `
  celery -A libs.shared.celery_app worker -l info -Q ocr_queue --pool=solo --hostname=ocr_worker@%h

# Default & Parser Worker
docker run -d --name claimsguru-worker-default `
  --network claimgpt-feature_default `
  --dns 8.8.8.8 --dns 1.1.1.1 `
  -e CELERY_WORKER="true" `
  -e DATABASE_URL="mssql+pymssql://sa:YourStrong!Password@claimgpt-feature-mssql-db-1:1433/claimgpt" `
  -e REDIS_URL="redis://claimgpt-feature-redis-1:6379/4" `
  --env-file "$ProjectRoot/.env" `
  claimsguru-core:test `
  celery -A libs.shared.celery_app worker -l info -Q default,parser_queue --pool=solo --hostname=default_worker@%h

# Frontend Web Portal
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
docker run -d --name claimsguru-web-test -p 3000:3000 claimsguru-frontend:test

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ✓ ClaimsGuru Stack is Live and Ready!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " 🌐 Frontend Portal:      http://localhost:3000" -ForegroundColor Cyan
Write-Host " 🔌 Ingress API Gateway:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host " 📊 Health Check:         http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
