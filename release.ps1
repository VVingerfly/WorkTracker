param(
    [string]$Version = "",
    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"

Write-Host "============================================"
Write-Host "   WorkTracker Release Script"
Write-Host "============================================"
Write-Host ""

# 读取版本号
if (-not $Version) {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $Version = $packageJson.version
}
Write-Host "[INFO] Version: $Version"
Write-Host ""

# 检查环境
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Rust not found." -ForegroundColor Red
    exit 1
}

# 1. 安装依赖
Write-Host "[1/5] Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    exit 1
}

# 2. 构建前端
Write-Host ""
Write-Host "[2/5] Building frontend..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed" -ForegroundColor Red
    exit 1
}

# 3. 打包 Tauri 应用
Write-Host ""
Write-Host "[3/5] Packaging Tauri app..."
npm run tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Tauri packaging failed" -ForegroundColor Red
    exit 1
}

# 查找安装包
$setupExe = Get-ChildItem "src-tauri\target\release\bundle\nsis\*_x64-setup.exe" | Select-Object -First 1
if (-not $setupExe) {
    Write-Host "[ERROR] Setup exe not found in src-tauri\target\release\bundle\nsis\" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "[INFO] Setup file: $($setupExe.FullName)"
Write-Host "[INFO] File size: $([math]::Round($setupExe.Length / 1MB, 2)) MB"

# 4. 创建 Git Tag
Write-Host ""
Write-Host "[4/5] Creating git tag v$Version..."
$tagExists = git tag -l "v$Version"
if ($tagExists) {
    Write-Host "[WARN] Tag v$Version already exists, skipping." -ForegroundColor Yellow
} else {
    git tag "v$Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create tag" -ForegroundColor Red
        exit 1
    }
    git push origin "v$Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Failed to push tag, you may need to push manually." -ForegroundColor Yellow
    }
    Write-Host "[OK] Tag v$Version created and pushed." -ForegroundColor Green
}

# 5. 发布到 GitHub Release
Write-Host ""
Write-Host "[5/5] Publishing to GitHub Release..."

if ($Notes) {
    $releaseNotes = $Notes
} else {
    $releaseNotes = "WorkTracker v$Version"
}

$ghAvailable = Get-Command gh -ErrorAction SilentlyContinue
if ($ghAvailable) {
    Write-Host "[INFO] Using GitHub CLI to create release..."
    gh release create "v$Version" $setupExe.FullName --title "WorkTracker v$Version" --notes $releaseNotes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] GitHub release creation failed" -ForegroundColor Red
        Write-Host "[INFO] You can upload manually:" -ForegroundColor Yellow
        Write-Host "  File: $($setupExe.FullName)" -ForegroundColor Yellow
        Write-Host "  URL:  https://github.com/VVingerfly/WorkTracker/releases/new?tag=v$Version" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Release published successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] GitHub CLI (gh) not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please publish manually:" -ForegroundColor Cyan
    Write-Host "  1. Open: https://github.com/VVingerfly/WorkTracker/releases/new?tag=v$Version"
    Write-Host "  2. Title: WorkTracker v$Version"
    Write-Host "  3. Upload file: $($setupExe.FullName)"
    Write-Host ""
    Write-Host "  Or install GitHub CLI to automate:"
    Write-Host "  https://cli.github.com/"
}

Write-Host ""
Write-Host "============================================"
Write-Host "   Release v$Version complete!"
Write-Host "============================================"
