# CodeCharta Setup Helper Script
# Checks Java installation and helps set up CodeCharta

Write-Host "=== CodeCharta Setup Helper ===" -ForegroundColor Cyan
Write-Host ""

# Check if Java is installed
$javaInstalled = Get-Command java -ErrorAction SilentlyContinue

if ($javaInstalled) {
    Write-Host "✓ Java is installed" -ForegroundColor Green
    
    # Check Java version - CodeCharta requires Java 17+
    $javaVersionOutput = java -version 2>&1
    Write-Host $javaVersionOutput
    
    # Extract major version number (e.g., "1.8.0_xxx" -> 8, "17.0.x" -> 17, "21.x.x" -> 21)
    $versionMatch = $javaVersionOutput -match 'version "(?:1\.)?(\d+)'
    if ($versionMatch) {
        $majorVersion = [int]$matches[1]
        Write-Host ""
        
        if ($majorVersion -lt 17) {
            Write-Host "✗ Java version $majorVersion is installed, but CodeCharta requires Java 17 or higher" -ForegroundColor Red
            Write-Host ""
            Write-Host "To use CodeCharta, you need to upgrade Java:" -ForegroundColor Yellow
            Write-Host "1. Download Java 17 or 21 (LTS) from: https://adoptium.net/" -ForegroundColor Yellow
            Write-Host "2. Install the new version" -ForegroundColor Yellow
            Write-Host "3. Update JAVA_HOME environment variable to point to the new version" -ForegroundColor Yellow
            Write-Host "4. Restart your terminal/PowerShell" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Alternative: Use dependency-cruiser (no Java needed)" -ForegroundColor Cyan
            Write-Host "  npm install -g dependency-cruiser" -ForegroundColor White
            Write-Host ""
            exit 1
        } else {
            Write-Host "✓ Java version $majorVersion is compatible with CodeCharta" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠ Could not determine Java version, but continuing..." -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "✗ Java is NOT installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To use CodeCharta, you need to install Java:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://adoptium.net/" -ForegroundColor Yellow
    Write-Host "2. Install JDK 17 or 21 (LTS version)" -ForegroundColor Yellow
    Write-Host "3. Set JAVA_HOME environment variable" -ForegroundColor Yellow
    Write-Host "4. Add Java bin to PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use dependency-cruiser (no Java needed)" -ForegroundColor Cyan
    Write-Host "  npm install -g dependency-cruiser" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check JAVA_HOME
if ($env:JAVA_HOME) {
    Write-Host "✓ JAVA_HOME is set: $env:JAVA_HOME" -ForegroundColor Green
} else {
    Write-Host "⚠ JAVA_HOME is not set" -ForegroundColor Yellow
    # Try to find Java path
    $javaPath = (Get-Command java).Source | Split-Path -Parent | Split-Path -Parent
    if ($javaPath) {
        Write-Host "  Found Java at: $javaPath" -ForegroundColor Cyan
        Write-Host "  Set temporarily with: `$env:JAVA_HOME = '$javaPath'" -ForegroundColor White
        $env:JAVA_HOME = $javaPath
    }
}
Write-Host ""

# Check if CodeCharta is available
Write-Host "Checking CodeCharta installation..." -ForegroundColor Cyan
$codechartaCheck = npx codecharta-analysis --version 2>&1

if ($LASTEXITCODE -eq 0 -or $codechartaCheck -notmatch "ERROR") {
    Write-Host "✓ CodeCharta is available" -ForegroundColor Green
    Write-Host ""
    
    # Ask if user wants to run analysis
    $runAnalysis = Read-Host "Run CodeCharta analysis now? (y/n)"
    if ($runAnalysis -eq 'y' -or $runAnalysis -eq 'Y') {
        Write-Host ""
        Write-Host "Running analysis (excluding node_modules, dist, coverage)..." -ForegroundColor Cyan
        npx codecharta-analysis . --outputFile project.cc.json --exclude "node_modules|dist|coverage|.git"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ Analysis complete! File created: project.cc.json" -ForegroundColor Green
            Write-Host ""
            Write-Host "To visualize:" -ForegroundColor Yellow
            Write-Host "  npx codecharta-visualization" -ForegroundColor White
            Write-Host "  Then open http://localhost:8080 and upload project.cc.json" -ForegroundColor White
        } else {
            Write-Host "✗ Analysis failed. Check errors above." -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠ CodeCharta check failed" -ForegroundColor Yellow
    Write-Host "  Error: $codechartaCheck" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try installing:" -ForegroundColor Yellow
    Write-Host "  npm install -g codecharta-analysis" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
