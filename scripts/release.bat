@echo off
REM release.bat — bump version, build Tauri Windows exe, collect to releases\, zip for clients
REM Run as Administrator (required for some Rust build steps).
REM
REM Usage:
REM   scripts\release.bat patch              — bump patch, full build, collect, zip
REM   scripts\release.bat minor              — bump minor, full build, collect, zip
REM   scripts\release.bat major              — bump major, full build, collect, zip
REM   scripts\release.bat 1.2.3              — set exact version, full build, collect, zip
REM   scripts\release.bat --skip-bump        — no version bump, full build, collect, zip
REM   scripts\release.bat --collect-only     — no build; just collect existing artifacts + zip

setlocal
set "ROOT=%~dp0.."
set "BUMP=%~1"
set "SKIP_BUMP=0"
set "COLLECT_ONLY=0"

REM ── parse flags ──────────────────────────────────────────────────────────────
if "%BUMP%"=="--collect-only" goto :flag_collect_only
if "%BUMP%"=="--skip-bump"    goto :flag_skip_bump
if "%BUMP%"==""               goto :usage
goto :flags_done

:flag_collect_only
set "COLLECT_ONLY=1"
set "SKIP_BUMP=1"
set "BUMP="
goto :flags_done

:flag_skip_bump
set "SKIP_BUMP=1"
set "BUMP="
goto :flags_done

:usage
echo Usage: release.bat [patch^|minor^|major^|x.y.z^|--skip-bump^|--collect-only]
exit /b 1

:flags_done

REM ── 1. bump version ──────────────────────────────────────────────────────────
if "%SKIP_BUMP%"=="1" goto :after_bump
echo == Bumping version [%BUMP%]...
call "%~dp0bump-version.bat" %BUMP%
if errorlevel 1 ( echo ERROR: bump failed & exit /b 1 )

:after_bump

REM ── 2. read current version ───────────────────────────────────────────────────
for /f "delims=" %%V in ('python -c "import json; print(json.load(open(r'%ROOT%\package.json'))['version'])"') do set "VERSION=%%V"
if "%VERSION%"=="" ( echo ERROR: could not read version from package.json & exit /b 1 )
set "TAG=v%VERSION%"
echo == Version: %TAG%

REM ── 3. build Node sidecar ────────────────────────────────────────────────────
if "%COLLECT_ONLY%"=="1" goto :after_sidecar
echo    Building Node sidecar...
cd /d "%ROOT%"
powershell -ExecutionPolicy Bypass -File "%~dp0build-sidecar.ps1"
if errorlevel 1 ( echo ERROR: sidecar build failed & exit /b 1 )

:after_sidecar

REM ── 4. tauri build ───────────────────────────────────────────────────────────
if "%COLLECT_ONLY%"=="1" goto :after_build
echo    Running tauri build...
npm run tauri:build
if errorlevel 1 ( echo ERROR: tauri build failed & exit /b 1 )

:after_build

REM ── 5. collect artifacts ─────────────────────────────────────────────────────
set "BUNDLE=%ROOT%\src-tauri\target\release\bundle"
set "RELEASE_DIR=%ROOT%\releases\%TAG%"
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

echo    Collecting artifacts into releases\%TAG%\...

REM NSIS installer (.exe) — the file clients double-click to install
if exist "%BUNDLE%\nsis\*.exe" (
    for %%F in ("%BUNDLE%\nsis\*.exe") do (
        copy /Y "%%F" "%RELEASE_DIR%\" >nul
        echo    + %%~nxF   [NSIS installer]
    )
) else (
    echo    WARNING: no NSIS .exe found in %BUNDLE%\nsis\
)

REM MSI installer — for enterprise / IT deployment
if exist "%BUNDLE%\msi\*.msi" (
    for %%F in ("%BUNDLE%\msi\*.msi") do (
        copy /Y "%%F" "%RELEASE_DIR%\" >nul
        echo    + %%~nxF   [MSI installer]
    )
)

REM ── 6. write RELEASE.md and update INDEX.md ──────────────────────────────────
python "%~dp0_release_finalize.py" "%TAG%" "%RELEASE_DIR%" "%ROOT%\releases\INDEX.md"
if errorlevel 1 ( echo WARNING: could not write release notes )

REM ── 7. create client zip (NSIS exe + RELEASE.md) ─────────────────────────────
set "ZIP=%RELEASE_DIR%\ARWEB-API-Tester-%TAG%-windows-x64.zip"
echo    Creating client zip...
powershell -NoProfile -Command "$files = @(Get-ChildItem '%RELEASE_DIR%' -Filter '*.exe') + @(Get-ChildItem '%RELEASE_DIR%' -Filter 'RELEASE.md'); if ($files.Count -gt 0) { Compress-Archive -Path $files.FullName -DestinationPath '%ZIP%' -Force; Write-Host '   created ARWEB-API-Tester-%TAG%-windows-x64.zip' } else { Write-Host '   WARNING: no files to zip' }"

REM ── 8. summary ───────────────────────────────────────────────────────────────
echo.
echo == Release %TAG% ready ==
echo.
echo   Folder : releases\%TAG%\
echo   Send to clients: releases\%TAG%\ARWEB-API-Tester-%TAG%-windows-x64.zip
echo.
echo   Contents:
for %%F in ("%RELEASE_DIR%\*") do echo     %%~nxF
echo.
echo Next steps:
echo   git add releases\
echo   git commit -m "release: %TAG%"
echo   git push --follow-tags
endlocal
