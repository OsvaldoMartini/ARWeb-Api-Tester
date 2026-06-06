@echo off
REM release.bat — bump version, build Tauri Windows exe, copy to releases\
REM Run as Administrator (required for some Rust build steps).
REM
REM Usage:
REM   scripts\release.bat patch
REM   scripts\release.bat minor
REM   scripts\release.bat major
REM   scripts\release.bat 1.2.3
REM   scripts\release.bat --skip-bump

setlocal
set "ROOT=%~dp0.."
set "BUMP=%~1"
set "SKIP_BUMP=0"

if "%BUMP%"=="--skip-bump" (
    set "SKIP_BUMP=1"
    set "BUMP="
)

if "%SKIP_BUMP%"=="0" (
    if "%BUMP%"=="" (
        echo Usage: release.bat [patch^|minor^|major^|x.y.z^|--skip-bump]
        exit /b 1
    )
)

REM ── 1. bump version ──────────────────────────────────────────────────────────
if "%SKIP_BUMP%"=="0" (
    echo == Bumping version [%BUMP%]...
    call "%~dp0bump-version.bat" %BUMP%
    if errorlevel 1 exit /b 1
)

REM ── 2. read current version ───────────────────────────────────────────────────
for /f "delims=" %%V in ('python -c "import json; print(json.load(open(r'%ROOT%\package.json'))['version'])"') do set "VERSION=%%V"
if "%VERSION%"=="" ( echo ERROR: could not read version & exit /b 1 )
set "TAG=v%VERSION%"
echo == Building %TAG%...

REM ── 3. build Node sidecar ────────────────────────────────────────────────────
echo    Building Node sidecar...
cd /d "%ROOT%"
powershell -ExecutionPolicy Bypass -File "%~dp0build-sidecar.ps1"
if errorlevel 1 ( echo ERROR: sidecar build failed & exit /b 1 )

REM ── 4. tauri build ───────────────────────────────────────────────────────────
echo    Running tauri build...
npm run tauri:build
if errorlevel 1 ( echo ERROR: tauri build failed & exit /b 1 )

REM ── 5. collect artifacts + write release notes + update index ─────────────────
set "BUNDLE=%ROOT%\src-tauri\target\release\bundle"
set "RELEASE_DIR=%ROOT%\releases\%TAG%"
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

echo    Copying artifacts...

REM Windows NSIS installer (.exe)
if exist "%BUNDLE%\nsis\*.exe" (
    for %%F in ("%BUNDLE%\nsis\*.exe") do (
        copy /Y "%%F" "%RELEASE_DIR%\" >nul
        echo    copied %%~nxF
    )
)

REM Windows MSI installer
if exist "%BUNDLE%\msi\*.msi" (
    for %%F in ("%BUNDLE%\msi\*.msi") do (
        copy /Y "%%F" "%RELEASE_DIR%\" >nul
        echo    copied %%~nxF
    )
)

REM ── 6. write RELEASE.md and update INDEX.md ──────────────────────────────────
python "%~dp0_release_finalize.py" "%TAG%" "%RELEASE_DIR%" "%ROOT%\releases\INDEX.md"
if errorlevel 1 ( echo WARNING: could not write release notes & )

REM ── 7. done ──────────────────────────────────────────────────────────────────
echo.
echo Release %TAG% ready in releases\%TAG%\
echo.
echo Next steps:
echo   git push --follow-tags
echo   gh release create %TAG% releases\%TAG%\* --title "%TAG%" --notes-file releases\%TAG%\RELEASE.md
endlocal
