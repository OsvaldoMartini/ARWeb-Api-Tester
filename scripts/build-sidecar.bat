@echo off
REM build-sidecar.bat — build the C# backend exe for ARAPI packaging
REM Wraps build-sidecar.ps1
REM
REM Usage:
REM   scripts\build-sidecar.bat

echo == Building ARAPI backend...
powershell -ExecutionPolicy Bypass -File "%~dp0build-sidecar.ps1"
if errorlevel 1 (
    echo ERROR: backend build failed.
    exit /b 1
)
echo == Backend ready.
