# CodeCharta Setup Guide

## Issue Analysis

**Problem**: `codecharta-analysis` command not recognized and requires Java.

**Root Cause**: CodeCharta is a Java-based tool that requires:
1. **Java 17 or higher** (Java Runtime Environment or Java Development Kit)
   - ⚠️ **Java 8 will NOT work** - CodeCharta requires class file version 61.0+
   - Java 17 and 21 are LTS (Long Term Support) versions
2. JAVA_HOME environment variable set
3. Java in system PATH

**Common Error**: If you see `UnsupportedClassVersionError: class file version 61.0, this version only recognizes class file versions up to 52.0`, you need to upgrade from Java 8 to Java 17+.

---

## Solution Options

### Option 1: Install Java and Use CodeCharta (Recommended for Full Features)

#### Step 1: Install Java

**Option A: Install OpenJDK (Free, Recommended)**
```powershell
# Using Chocolatey (if installed)
choco install openjdk

# Or download from:
# https://adoptium.net/temurin/releases/
# Download: OpenJDK 17 or 21 (LTS versions)
# Install and note the installation path (usually C:\Program Files\Eclipse Adoptium\...)
```

**Option B: Install Oracle JDK**
- Download from: https://www.oracle.com/java/technologies/downloads/
- Install JDK 17 or 21 (LTS versions)

#### Step 2: Set JAVA_HOME Environment Variable

**PowerShell (Current Session Only)**:
```powershell
# Find Java installation path (adjust version number)
$javaPath = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x+xx"
$env:JAVA_HOME = $javaPath
$env:PATH = "$javaPath\bin;$env:PATH"
```

**Permanent Setup (System-Wide)**:
1. Open **System Properties** → **Environment Variables**
2. Under **System Variables**, click **New**
3. Variable name: `JAVA_HOME`
4. Variable value: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x+xx` (your Java path)
5. Edit **Path** variable, add: `%JAVA_HOME%\bin`
6. Restart PowerShell/terminal

**Verify Installation**:
```powershell
java -version
echo $env:JAVA_HOME
```

#### Step 3: Run CodeCharta Analysis

```powershell
# Navigate to project directory
cd "F:\AI Projects\stoneyoneburn"

# Run analysis (creates project.cc.json)
npx codecharta-analysis . --outputFile project.cc.json

# Or if installed globally and in PATH:
codecharta-analysis . --outputFile project.cc.json
```

#### Step 4: Visualize Results

**Option A: Web Visualization (Recommended)**
```powershell
# Start visualization server
npx codecharta-visualization

# Or if installed globally:
codecharta-visualization

# Open browser to: http://localhost:8080
# Upload project.cc.json file
```

**Option B: Online Visualization**
- Go to: https://maibornwolff.github.io/codecharta/visualization/app/index.html
- Upload `project.cc.json` file
- View interactive 3D code map

---

### Option 2: Use Alternative Tools (No Java Required)

If you don't want to install Java, here are alternatives:

#### A. Dependency-Cruiser (JavaScript/TypeScript Focus)
```powershell
npm install -g dependency-cruiser
depcruise --output-type dot src/**/*.ts | dot -T svg > dependency-graph.svg
```

#### B. Madge (Dependency Graph)
```powershell
npm install -g madge
madge --image graph.svg src/
```

#### C. CodeSee (Visual Studio Code Extension)
- Install "CodeSee" extension in VS Code
- Automatically generates code maps
- No command-line setup needed

#### D. Sourcegraph (Online)
- Connect GitHub repository
- Automatic code navigation and visualization

#### E. VS Code Extensions
- **Code Map**: Visual code structure
- **Code Graph**: Dependency visualization
- **Project Manager**: Project structure navigation

---

### Option 3: Quick Java Setup Script

Create a PowerShell script to set up Java temporarily:

**`setup-codecharta.ps1`**:
```powershell
# Check if Java is installed
$javaInstalled = Get-Command java -ErrorAction SilentlyContinue

if (-not $javaInstalled) {
    Write-Host "Java not found. Please install Java first:" -ForegroundColor Red
    Write-Host "1. Download from: https://adoptium.net/" -ForegroundColor Yellow
    Write-Host "2. Install JDK 17 or 21" -ForegroundColor Yellow
    Write-Host "3. Set JAVA_HOME environment variable" -ForegroundColor Yellow
    exit 1
}

# Set JAVA_HOME if not set (adjust path as needed)
if (-not $env:JAVA_HOME) {
    $javaPath = (Get-Command java).Source | Split-Path -Parent | Split-Path -Parent
    $env:JAVA_HOME = $javaPath
    Write-Host "Set JAVA_HOME to: $env:JAVA_HOME" -ForegroundColor Green
}

# Verify Java
Write-Host "Java Version:" -ForegroundColor Cyan
java -version

# Run CodeCharta analysis
Write-Host "`nRunning CodeCharta analysis..." -ForegroundColor Cyan
npx codecharta-analysis . --outputFile project.cc.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nAnalysis complete! File: project.cc.json" -ForegroundColor Green
    Write-Host "To visualize, run: npx codecharta-visualization" -ForegroundColor Yellow
} else {
    Write-Host "Analysis failed. Check errors above." -ForegroundColor Red
}
```

**Usage**:
```powershell
.\setup-codecharta.ps1
```

---

## Recommended Workflow

### For Your Project (TypeScript/Node.js)

**Best Option**: Use **Dependency-Cruiser** + **VS Code Extensions**

1. **Install Dependency-Cruiser**:
```powershell
npm install -g dependency-cruiser
npm install -g graphviz  # For SVG output (optional)
```

2. **Generate Dependency Graph**:
```powershell
depcruise --output-type dot src/**/*.ts | dot -T svg > dependency-graph.svg
```

3. **Install VS Code Extensions**:
   - CodeSee
   - Code Map
   - Project Manager

4. **Use Built-in Tools**:
   - VS Code's built-in "Go to Symbol" (Ctrl+Shift+O)
   - File Explorer for structure
   - Search (Ctrl+Shift+F) for code navigation

---

## CodeCharta-Specific Commands

Once Java is installed:

### Analysis Commands

```powershell
# Basic analysis
npx codecharta-analysis . --outputFile project.cc.json

# Exclude node_modules and dist
npx codecharta-analysis . --outputFile project.cc.json --exclude "node_modules|dist|coverage"

# Include only TypeScript files
npx codecharta-analysis . --outputFile project.cc.json --include "**/*.ts"

# Analyze specific directories
npx codecharta-analysis src storefront --outputFile project.cc.json
```

### Visualization Commands

```powershell
# Start local server
npx codecharta-visualization

# Or specify port
npx codecharta-visualization --port 3001

# Open browser automatically
npx codecharta-visualization --open
```

### Advanced Options

```powershell
# Merge multiple analysis files
npx codecharta-analysis src --outputFile src.cc.json
npx codecharta-analysis storefront --outputFile storefront.cc.json
# Then merge in visualization UI

# Custom configuration
npx codecharta-analysis . --outputFile project.cc.json --config codecharta.json
```

---

## Troubleshooting

### Issue: "UnsupportedClassVersionError: class file version 61.0, this version only recognizes class file versions up to 52.0"
**Problem**: You have Java 8 installed, but CodeCharta requires Java 17 or higher.

**Solution**: 
1. Upgrade to Java 17 or 21 (LTS versions)
2. Download from: https://adoptium.net/
3. Install the new version
4. Update JAVA_HOME environment variable to point to the new version
5. Restart your terminal/PowerShell

**Quick Check**:
```powershell
java -version
# Should show "openjdk version 17" or higher
```

### Issue: "JAVA_HOME is not set"
**Solution**: Set JAVA_HOME environment variable (see Option 1, Step 2)

### Issue: "java command not found"
**Solution**: Add Java bin directory to PATH

### Issue: "Command not recognized" after global install
**Solution**: Use `npx` prefix: `npx codecharta-analysis`

### Issue: Analysis takes too long
**Solution**: Exclude large directories:
```powershell
npx codecharta-analysis . --outputFile project.cc.json --exclude "node_modules|dist|coverage|.git"
```

### Issue: Out of memory errors
**Solution**: Increase Java heap size:
```powershell
$env:JAVA_OPTS = "-Xmx4g"
npx codecharta-analysis . --outputFile project.cc.json
```

---

## Quick Start (If Java Already Installed)

```powershell
# 1. Set JAVA_HOME (if not already set)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x+xx"

# 2. Run analysis
cd "F:\AI Projects\stoneyoneburn"
npx codecharta-analysis . --outputFile project.cc.json --exclude "node_modules|dist|coverage"

# 3. Visualize
npx codecharta-visualization
# Open http://localhost:8080 and upload project.cc.json
```

---

## Next Steps

1. **Choose your approach**: Java setup or alternative tools
2. **Install required software**: Java (if using CodeCharta) or alternative tools
3. **Run analysis**: Generate visualization file
4. **Visualize**: View code structure interactively

**Recommendation**: For a TypeScript/Node.js project, consider using **Dependency-Cruiser** or **VS Code extensions** as they're easier to set up and don't require Java.

---

**Last Updated**: January 2025