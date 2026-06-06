@echo off
REM release.bat — bump version, build Tauri Windows exe, copy to releases\
REM Run as Administrator (required for symlinks and some Rust build steps).
REM
REM Usage:
REM   scripts\release.bat patch
REM   scripts\release.bat minor
REM   scripts\release.bat major
REM   scripts\release.bat 1.2.3
REM   scripts\release.bat --skip-bump

setlocal EnableDelayedExpansion
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

REM ── 2. read current version from package.json ─────────────────────────────
for /f "delims=" %%V in ('python -c "import json; print(json.load(open(r'%ROOT%\package.json'))['version'])"') do set "VERSION=%%V"
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

REM ── 5. collect artifacts ─────────────────────────────────────────────────────
set "BUNDLE=%ROOT%\src-tauri\target\release\bundle"
set "RELEASE_DIR=%ROOT%\releases\%TAG%"
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

echo    Copying artifacts...
set "FOUND=0"

REM Windows NSIS installer (.exe)
if exist "%BUNDLE%\nsis\*.exe" (
    for %%F in ("%BUNDLE%\nsis\*.exe") do (
        copy /Y "%%F" "%RELEASE_DIR%\" >nul
        echo    copied %%~nxF
        set "FOUND=1"
    )
)

REM Windows MSI installer
if exist "%BUNDLE%\msi\*.msi" (
    for %%F in ("%BUNDLE%\msi\*.msi") do (
        copy /Y "%%F" "%RELEASE_DIR%\" >nul
        echo    copied %%~nxF
        set "FOUND=1"
    )
)

if "%FOUND%"=="0" (
    echo WARNING: No artifacts found in %BUNDLE%
    echo          Make sure the build succeeded and targets include nsis or msi.
)

REM ── 6. write per-release notes ───────────────────────────────────────────────
for /f "tokens=1-3 delims=/" %%A in ('date /t') do (
    set "MONTH=%%A" & set "DAY=%%B" & set "YEAR=%%C"
)
REM Prefer ISO date from wmic
for /f "skip=1 delims=" %%D in ('wmic os get LocalDateTime ^| findstr /r "[0-9]"') do (
    set "DT=%%D"
    set "ISODATE=!DT:~0,4!-!DT:~4,2!-!DT:~6,2!"
    goto :got_date
)
:got_date

(
echo # Release %TAG%  ^(%ISODATE%^)
echo.
echo ## Artifacts
for %%F in ("%RELEASE_DIR%\*.exe" "%RELEASE_DIR%\*.msi") do (
    if exist "%%F" echo - `%%~nxF`
)
echo.
echo ## What's new
echo ^<!-- fill in before distributing --^>
echo.
echo ## Installation ^(Windows^)
echo Run the `-setup.exe` installer.
echo The app installs a Node.js sidecar — no separate server setup required.
echo.
echo ## SQLite database
echo The database is stored at:
echo `%%APPDATA%%\com.arweb.apitester\arweb.db`
) > "%RELEASE_DIR%\RELEASE.md"
echo    wrote releases\%TAG%\RELEASE.md

REM ── 7. update INDEX.md ───────────────────────────────────────────────────────
set "INDEX=%ROOT%\releases\INDEX.md"
python -c "
import re, os, glob
tag = r'%TAG%'
date = r'%ISODATE%'
release_dir = r'%RELEASE_DIR%'
artifacts = [os.path.basename(f) for f in glob.glob(release_dir + '/*.exe') + glob.glob(release_dir + '/*.msi')]
art_str = ', '.join(artifacts) if artifacts else '—'
entry = f'| {tag} | {date} | {art_str} |'
idx_path = r'%INDEX%'
if os.path.exists(idx_path):
    content = open(idx_path).read()
    if tag not in content:
        content = re.sub(r'(\|[-| ]+\|\n)', r'\1' + entry + '\n', content, count=1)
        open(idx_path, 'w').write(content)
else:
    open(idx_path, 'w').write('# Release Index\n\n| Version | Date | Artifacts |\n|---------|------|---|\n' + entry + '\n')
print('   updated releases/INDEX.md')
"

REM ── 8. done ──────────────────────────────────────────────────────────────────
echo.
echo Release %TAG% ready in releases\%TAG%\
echo.
echo Next steps:
echo   git push --follow-tags
echo   gh release create %TAG% releases\%TAG%\* --title "%TAG%" --notes-file releases\%TAG%\RELEASE.md
endlocal
