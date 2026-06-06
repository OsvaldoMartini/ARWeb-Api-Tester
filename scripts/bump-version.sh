#!/usr/bin/env bash
# bump-version.sh — bump version in all 3 version files and git-commit
# Usage:
#   ./scripts/bump-version.sh patch       # 0.1.0 → 0.1.1
#   ./scripts/bump-version.sh minor       # 0.1.0 → 0.2.0
#   ./scripts/bump-version.sh major       # 0.1.0 → 1.0.0
#   ./scripts/bump-version.sh 1.2.3       # set exact version
set -euo pipefail

BUMP="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "$BUMP" ]]; then
  echo "Usage: $0 [patch|minor|major|x.y.z]" >&2; exit 1
fi

# ── read current version ──────────────────────────────────────────────────────
CURRENT=$(python3 -c "import json; print(json.load(open('$ROOT/package.json'))['version'])")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  [0-9]*.[0-9]*.[0-9]*)
    IFS='.' read -r MAJOR MINOR PATCH <<< "$BUMP" ;;
  *)
    echo "Unknown bump: $BUMP" >&2; exit 1 ;;
esac

NEW="$MAJOR.$MINOR.$PATCH"
echo "Bumping $CURRENT → $NEW"

# ── package.json ──────────────────────────────────────────────────────────────
python3 -c "
import json, sys
p = json.load(open('$ROOT/package.json'))
p['version'] = '$NEW'
open('$ROOT/package.json', 'w').write(json.dumps(p, indent=2) + '\n')
"
echo "  updated package.json"

# ── src-tauri/tauri.conf.json ─────────────────────────────────────────────────
python3 -c "
import json
p = json.load(open('$ROOT/src-tauri/tauri.conf.json'))
p['version'] = '$NEW'
open('$ROOT/src-tauri/tauri.conf.json', 'w').write(json.dumps(p, indent=2) + '\n')
"
echo "  updated src-tauri/tauri.conf.json"

# ── src-tauri/Cargo.toml ──────────────────────────────────────────────────────
python3 - <<'PYEOF'
import re, sys
path = '$ROOT/src-tauri/Cargo.toml'
text = open(path).read()
# Only replace version inside [package] section
in_pkg = False
lines = []
for line in text.splitlines():
    if line.strip() == '[package]':
        in_pkg = True
    elif line.startswith('[') and line.strip() != '[package]':
        in_pkg = False
    if in_pkg and re.match(r'^version\s*=', line):
        line = 'version = "$NEW"'
    lines.append(line)
open(path, 'w').write('\n'.join(lines) + '\n')
PYEOF
echo "  updated src-tauri/Cargo.toml"

# ── git commit + tag ──────────────────────────────────────────────────────────
cd "$ROOT"
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to $NEW"
git tag -a "v$NEW" -m "Release v$NEW"
echo "  git commit + tag v$NEW created"

echo ""
echo "Version is now $NEW. Run ./scripts/release.sh to build and package."
