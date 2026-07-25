@echo off
echo ============================================
echo   WorkTracker Build Script
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: Check Rust
cargo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust not found. Please install Rust first (https://www.rust-lang.org/tools/install)
    pause
    exit /b 1
)

echo [1/4] Installing dependencies...
echo.
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building frontend...
echo.
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed
    pause
    exit /b 1
)

echo.
echo [3/4] Packaging Tauri app...
echo.
npm run tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Tauri packaging failed
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo.
echo Output directory: src-tauri/target/release/bundle/
echo.
echo ============================================
echo   Build successful!
echo ============================================
pause
