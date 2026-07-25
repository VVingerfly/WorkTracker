Write-Host "============================================"
Write-Host "   WorkTracker Build Script"
Write-Host "============================================"
Write-Host ""

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion"
} else {
    Write-Host "[ERROR] Node.js not found. Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Rust
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    $cargoVersion = cargo --version
    Write-Host "[OK] Rust found: $cargoVersion"
} else {
    Write-Host "[ERROR] Rust not found. Please install Rust first (https://www.rust-lang.org/tools/install)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[1/4] Installing dependencies..."
Write-Host ""
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Building frontend..."
Write-Host ""
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/4] Packaging Tauri app..."
Write-Host ""
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Tauri packaging failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[4/4] Build complete!"
Write-Host ""
Write-Host "Output directory: src-tauri/target/release/bundle/"
Write-Host ""
Write-Host "============================================"
Write-Host "   Build successful!" -ForegroundColor Green
Write-Host "============================================"
Read-Host "Press Enter to exit"
