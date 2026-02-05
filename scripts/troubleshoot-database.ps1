# Database Troubleshooting Script
# Diagnoses and repairs PostgreSQL container issues (e.g. Exited 255)

param(
    [switch]$Repair,  # Remove container and recreate (keeps volume by default)
    [switch]$Reset   # Remove container AND volume - full reset (data loss)
)

Write-Host "=== PostgreSQL Container Troubleshooting ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "[X] Docker is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Docker daemon is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Get container status
$containerExists = docker ps -a --filter "name=postgres_db" --format "{{.Names}}" 2>&1
if (-not $containerExists) {
    Write-Host "[!] Container postgres_db does not exist." -ForegroundColor Yellow
    Write-Host "    Run .\start-database.ps1 to create it." -ForegroundColor Gray
    exit 0
}

$status = docker ps -a --filter "name=postgres_db" --format "{{.Status}}" 2>&1
Write-Host "Container status: $status" -ForegroundColor White
Write-Host ""

# Show recent logs
Write-Host "--- Last 40 lines of container logs ---" -ForegroundColor Cyan
docker logs postgres_db 2>&1 | Select-Object -Last 40
Write-Host ""

# Common causes of exit 255
if ($status -match "Exited") {
    Write-Host "Common causes of PostgreSQL exit 255:" -ForegroundColor Yellow
    Write-Host "  - Corrupted data (unclean shutdown, power loss)" -ForegroundColor Gray
    Write-Host "  - Lock file (postmaster.pid) left behind" -ForegroundColor Gray
    Write-Host "  - Docker Desktop/WSL2 memory limits" -ForegroundColor Gray
    Write-Host "  - Volume permission issues on Windows" -ForegroundColor Gray
    Write-Host ""
}

if ($Repair -or $Reset) {
    Write-Host "--- Repair Mode ---" -ForegroundColor Cyan
    docker stop postgres_db 2>&1 | Out-Null
    docker rm postgres_db 2>&1 | Out-Null
    Write-Host "[OK] Container removed" -ForegroundColor Green

    if ($Reset) {
        Write-Host "Removing volume postgres_db_data (ALL DATA WILL BE LOST)..." -ForegroundColor Yellow
        docker volume rm postgres_db_data 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Volume removed" -ForegroundColor Green
        } else {
            Write-Host "[!] Volume may be in use. Try: docker volume rm postgres_db_data" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "Recreating container..." -ForegroundColor Cyan
    $projectPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
    Set-Location $projectPath
    docker-compose up -d postgres_db 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Container recreated" -ForegroundColor Green
        Write-Host "Waiting for database to initialize..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
        Write-Host ""
        Write-Host "Run .\start-database.ps1 to verify, or npm run dev to start the app." -ForegroundColor Green
    } else {
        Write-Host "[X] Failed to recreate container" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "--- Repair Options ---" -ForegroundColor Cyan
    Write-Host "If the container fails to start, try:" -ForegroundColor White
    Write-Host ""
    Write-Host "  1. Recreate container (keeps data):" -ForegroundColor Yellow
    Write-Host "     .\scripts\troubleshoot-database.ps1 -Repair" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. Full reset (DELETES ALL DATABASE DATA):" -ForegroundColor Yellow
    Write-Host "     .\scripts\troubleshoot-database.ps1 -Reset" -ForegroundColor White
    Write-Host ""
    Write-Host "  3. Manual start:" -ForegroundColor Yellow
    Write-Host "     docker start postgres_db" -ForegroundColor White
    Write-Host ""
}
