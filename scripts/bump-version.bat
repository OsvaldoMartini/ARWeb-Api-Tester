@echo off
REM bump-version.bat — bump version in package.json, tauri.conf.json, Cargo.toml
REM Usage:
REM   scripts\bump-version.bat patch
REM   scripts\bump-version.bat minor
REM   scripts\bump-version.bat major
REM   scripts\bump-version.bat 1.2.3

setlocal EnableDelayedExpansion
set "ROOT=%~dp0.."
set "BUMP=%~1"

if "%BUMP%"=="" (
    echo Usage: bump-version.bat [patch^|minor^|major^|x.y.z]
    exit /b 1
)

REM ── read current version ──────────────────────────────────────────────────────
for /f "delims=" %%V in ('python -c "import json; print(json.load(open(r'%ROOT%\package.json'))['version'])"') do set "CURRENT=%%V"

REM ── compute new version via Python ───────────────────────────────────────────
for /f "delims=" %%V in ('python -c "
bump = r'%BUMP%'
cur  = r'%CURRENT%'
parts = cur.split('.')
major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
if bump == 'patch':  patch += 1
elif bump == 'minor': minor += 1; patch = 0
elif bump == 'major': major += 1; minor = 0; patch = 0
elif len(bump.split('.')) == 3:
    major, minor, patch = map(int, bump.split('.'))
else:
    raise ValueError('Unknown bump: ' + bump)
print(f'{major}.{minor}.{patch}')
"') do set "NEW=%%V"

echo Bumping %CURRENT% --^> %NEW%

REM ── update all 3 files ───────────────────────────────────────────────────────
python -c "
import json, re

new = '%NEW%'
root = r'%ROOT%'

# package.json
p = json.load(open(root + r'\package.json'))
p['version'] = new
open(root + r'\package.json', 'w').write(json.dumps(p, indent=2) + '\n')
print('  updated package.json')

# tauri.conf.json
t = json.load(open(root + r'\src-tauri\tauri.conf.json'))
t['version'] = new
open(root + r'\src-tauri\tauri.conf.json', 'w').write(json.dumps(t, indent=2) + '\n')
print('  updated src-tauri/tauri.conf.json')

# Cargo.toml — only inside [package] section
lines = open(root + r'\src-tauri\Cargo.toml').readlines()
in_pkg = False
out = []
for line in lines:
    if line.strip() == '[package]':
        in_pkg = True
    elif line.startswith('[') and line.strip() != '[package]':
        in_pkg = False
    if in_pkg and re.match(r'^version\s*=', line):
        line = 'version = \"' + new + '\"\n'
    out.append(line)
open(root + r'\src-tauri\Cargo.toml', 'w').writelines(out)
print('  updated src-tauri/Cargo.toml')
"
if errorlevel 1 ( echo ERROR: version update failed & exit /b 1 )

REM ── git commit + tag ─────────────────────────────────────────────────────────
cd /d "%ROOT%"
git add package.json src-tauri\tauri.conf.json src-tauri\Cargo.toml
git commit -m "chore: bump version to %NEW%"
git tag -a "v%NEW%" -m "Release v%NEW%"
echo   git commit + tag v%NEW% created

echo.
echo Version is now %NEW%. Run scripts\release.bat to build and package.
endlocal
