@echo off
REM bump-version.bat — bump version in package.json, tauri.conf.json, Cargo.toml
REM Usage:
REM   scripts\bump-version.bat patch
REM   scripts\bump-version.bat minor
REM   scripts\bump-version.bat major
REM   scripts\bump-version.bat 1.2.3

setlocal
set "BUMP=%~1"
set "ROOT=%~dp0.."

if "%BUMP%"=="" (
    echo Usage: bump-version.bat [patch^|minor^|major^|x.y.z]
    exit /b 1
)

REM ── compute and write new version via helper script ───────────────────────────
for /f "delims=" %%V in ('python "%~dp0_bump_version.py" %BUMP% "%ROOT%"') do set "NEW=%%V"
if errorlevel 1 ( echo ERROR: version bump failed & exit /b 1 )
if "%NEW%"=="" ( echo ERROR: could not read new version & exit /b 1 )

echo Bumped to %NEW%

REM ── git commit + tag ─────────────────────────────────────────────────────────
cd /d "%ROOT%"
git add package.json src-arapi\tauri.conf.json src-arapi\Cargo.toml
git commit -m "chore: bump version to %NEW%"
git rev-parse "v%NEW%" >nul 2>&1
if errorlevel 1 (
    git tag -a "v%NEW%" -m "Release v%NEW%"
    echo git commit + tag v%NEW% created
) else (
    echo git commit created  ^(tag v%NEW% already exists -- skipped^)
)

echo.
echo Version is now %NEW%. Run scripts\release.bat to build and package.
endlocal
