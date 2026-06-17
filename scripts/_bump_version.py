"""
_bump_version.py  —  called by bump-version.bat
Usage: python _bump_version.py <bump> <root>
  bump: patch | minor | major | x.y.z
  root: absolute path to the repo root
Prints the new version to stdout.
Writes updated version to package.json, tauri.conf.json, Cargo.toml.
"""
import json, re, sys

bump = sys.argv[1]
root = sys.argv[2].rstrip('\\').rstrip('/')

# ── read current version ──────────────────────────────────────────────────────
pkg = json.load(open(root + '/package.json'))
cur = pkg['version']
major, minor, patch = map(int, cur.split('.'))

# ── compute new version ───────────────────────────────────────────────────────
if bump == 'patch':
    patch += 1
elif bump == 'minor':
    minor += 1; patch = 0
elif bump == 'major':
    major += 1; minor = 0; patch = 0
elif len(bump.split('.')) == 3:
    major, minor, patch = map(int, bump.split('.'))
else:
    print(f'ERROR: unknown bump "{bump}". Use patch/minor/major/x.y.z', file=sys.stderr)
    sys.exit(1)

new = f'{major}.{minor}.{patch}'
print(new)

# ── package.json ──────────────────────────────────────────────────────────────
pkg['version'] = new
open(root + '/package.json', 'w').write(json.dumps(pkg, indent=2) + '\n')
print(f'  updated package.json  ({cur} -> {new})', file=sys.stderr)

# ── src-arapi/tauri.conf.json ─────────────────────────────────────────────────
tauri_path = root + '/src-arapi/tauri.conf.json'
t = json.load(open(tauri_path))
t['version'] = new
open(tauri_path, 'w').write(json.dumps(t, indent=2) + '\n')
print('  updated src-arapi/tauri.conf.json', file=sys.stderr)

# ── src-arapi/Cargo.toml ──────────────────────────────────────────────────────
cargo_path = root + '/src-arapi/Cargo.toml'
lines = open(cargo_path).readlines()
in_pkg = False
out = []
for line in lines:
    if line.strip() == '[package]':
        in_pkg = True
    elif line.startswith('[') and line.strip() != '[package]':
        in_pkg = False
    if in_pkg and re.match(r'^version\s*=', line):
        line = f'version = "{new}"\n'
    out.append(line)
open(cargo_path, 'w').writelines(out)
print('  updated src-arapi/Cargo.toml', file=sys.stderr)
