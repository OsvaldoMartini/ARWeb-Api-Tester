@echo off
REM build-sidecar.bat — build the Node.js sidecar exe for Tauri packaging
REM Wraps build-sidecar.ps1 (requires Node 20+, esbuild, internet for @yao-pkg/pkg)
REM
REM Usage:
REM   scripts\build-sidecar.bat

echo == Building Node sidecar...
powershell -ExecutionPolicy Bypass -File "%~dp0build-sidecar.ps1"
if errorlevel 1 (
    echo ERROR: sidecar build failed.
    exit /b 1
)
echo == Sidecar ready.
