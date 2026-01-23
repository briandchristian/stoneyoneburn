# Database Startup Helper Script
# Checks Docker and starts PostgreSQL container for development

Write-Host "=== Database Startup Helper ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed and running
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "✗ Docker is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the database, you need Docker:" -ForegroundColor Yellow
    Write-Host "1. Install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "2. Start Docker Desktop" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if Docker daemon is running
Write-Host "Checking Docker daemon..." -ForegroundColor Cyan
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker daemon is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "✓ Docker is running" -ForegroundColor Green
}
Write-Host ""

# Check if postgres_db container exists and is running
Write-Host "Checking PostgreSQL container..." -ForegroundColor Cyan
$containerStatus = docker ps -a --filter "name=postgres_db" --format "{{.Status}}" 2>&1

if ($LASTEXITCODE -eq 0 -and $containerStatus) {
    if ($containerStatus -match "Up") {
        Write-Host "✓ PostgreSQL container is running" -ForegroundColor Green
        Write-Host "  Status: $containerStatus" -ForegroundColor Gray
    } else {
        Write-Host "⚠ PostgreSQL container exists but is stopped" -ForegroundColor Yellow
        Write-Host "  Status: $containerStatus" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Starting container..." -ForegroundColor Cyan
        docker start postgres_db 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Container started successfully" -ForegroundColor Green
            Write-Host ""
            Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
            Start-Sleep -Seconds 3
        } else {
            Write-Host "✗ Failed to start container" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "⚠ PostgreSQL container not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating and starting PostgreSQL container..." -ForegroundColor Cyan
    
    # Navigate to project directory to use docker-compose.yml
    $projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $projectPath
    
    docker-compose up -d postgres_db 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Container created and started successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Waiting for database to be ready..." -ForegroundColor Cyan
        Start-Sleep -Seconds 5
    } else {
        Write-Host "✗ Failed to create container" -ForegroundColor Red
        Write-Host "  Try running manually: docker-compose up -d postgres_db" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Verify database connection
Write-Host "Verifying database connection on port 6543..." -ForegroundColor Cyan
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connection = $tcpClient.BeginConnect("127.0.0.1", 6543, $null, $null)
    $wait = $connection.AsyncWaitHandle.WaitOne(2000, $false)
    
    if ($wait) {
        $tcpClient.EndConnect($connection)
        $tcpClient.Close()
        Write-Host "✓ Database is accepting connections on port 6543" -ForegroundColor Green
    } else {
        Write-Host "⚠ Database may still be starting up" -ForegroundColor Yellow
        Write-Host "  Port 6543 is not yet accepting connections" -ForegroundColor Gray
    }
    $tcpClient.Close()
} catch {
    Write-Host "⚠ Could not verify connection (this is normal if the database is still starting)" -ForegroundColor Yellow
}
Write-Host ""

# Display container info
Write-Host "Container Information:" -ForegroundColor Cyan
docker ps --filter "name=postgres_db" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Write-Host ""

Write-Host "=== Database Ready ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start your application with:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Database connection details:" -ForegroundColor Cyan
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: 6543" -ForegroundColor White
Write-Host "  Database: vendure" -ForegroundColor White
Write-Host "  User: postgres" -ForegroundColor White
Write-Host "  Password: postgres" -ForegroundColor White
Write-Host ""
Write-Host "To stop the database:" -ForegroundColor Cyan
Write-Host "  docker stop postgres_db" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "  docker logs -f postgres_db" -ForegroundColor White
Write-Host ""
