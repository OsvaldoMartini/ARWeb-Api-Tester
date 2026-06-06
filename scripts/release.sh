#!/usr/bin/env bash
# release.sh — bump version, build Tauri app, and copy artifacts to releases/
# Produces Linux bundles (AppImage, .deb) when run on Linux/CI.
# Use release.ps1 on Windows to produce the .exe installer.
#
# Usage:
#   ./scripts/release.sh patch
#   ./scripts/release.sh minor
#   ./scripts/release.sh major
#   ./scripts/release.sh 1.2.3
#   ./scripts/release.sh --skip-bump     # rebuild current version
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUMP="${1:-}"
SKIP_BUMP=false
[[ "$BUMP" == "--skip-bump" ]] && { SKIP_BUMP=true; BUMP=""; }

# ── 1. bump version ───────────────────────────────────────────────────────────
if [[ "$SKIP_BUMP" == false ]]; then
  [[ -z "$BUMP" ]] && { echo "Usage: $0 [patch|minor|major|x.y.z|--skip-bump]" >&2; exit 1; }
  echo "== Bumping version ($BUMP)..."
  bash "$ROOT/scripts/bump-version.sh" "$BUMP"
fi

# ── 2. read current version ───────────────────────────────────────────────────
VERSION=$(python3 -c "import json; print(json.load(open('$ROOT/package.json'))['version'])")
TAG="v$VERSION"
echo "== Building $TAG..."

# ── 3. tauri build ────────────────────────────────────────────────────────────
cd "$ROOT"
npm run tauri:build

# ── 4. collect artifacts ──────────────────────────────────────────────────────
BUNDLE_ROOT="$ROOT/src-tauri/target/release/bundle"
RELEASE_DIR="$ROOT/releases/$TAG"
mkdir -p "$RELEASE_DIR"

ARTIFACTS=()

for DIR in appimage deb nsis msi; do
  if [[ -d "$BUNDLE_ROOT/$DIR" ]]; then
    while IFS= read -r -d '' FILE; do
      cp "$FILE" "$RELEASE_DIR/"
      ARTIFACTS+=("$(basename "$FILE")")
      echo "   copied $(basename "$FILE")"
    done < <(find "$BUNDLE_ROOT/$DIR" -maxdepth 1 -type f \( -name '*.AppImage' -o -name '*.deb' -o -name '*.exe' -o -name '*.msi' \) -print0)
  fi
done

# ── 5. per-release notes ──────────────────────────────────────────────────────
DATE=$(date '+%Y-%m-%d')
ARTIFACT_LIST=$(printf -- '- `%s`\n' "${ARTIFACTS[@]}")
cat > "$RELEASE_DIR/RELEASE.md" <<EOF
# Release $TAG  ($DATE)

## Artifacts
$ARTIFACT_LIST

## What's new
<!-- fill in before distributing -->

## Installation (Linux)
Make the AppImage executable and run it:
\`\`\`
chmod +x *.AppImage && ./*.AppImage
\`\`\`
EOF
echo "   wrote releases/$TAG/RELEASE.md"

# ── 6. update INDEX.md ────────────────────────────────────────────────────────
INDEX="$ROOT/releases/INDEX.md"
ARTIFACT_STR=$(IFS=', '; echo "${ARTIFACTS[*]}")
if [[ ! -f "$INDEX" ]]; then
  cat > "$INDEX" <<EOF
# Release Index

| Version | Date | Artifacts |
|---------|------|-----------|
| $TAG | $DATE | $ARTIFACT_STR |
EOF
elif ! grep -q "$TAG" "$INDEX"; then
  # insert after the header separator line
  sed -i "/^|---/a | $TAG | $DATE | $ARTIFACT_STR |" "$INDEX"
fi
echo "   updated releases/INDEX.md"

# ── 7. done ───────────────────────────────────────────────────────────────────
echo ""
echo "Release $TAG ready in releases/$TAG/"
echo "Artifacts: ${ARTIFACTS[*]}"
echo ""
echo "Next steps:"
echo "  git push --follow-tags"
echo "  gh release create $TAG releases/$TAG/* --title '$TAG' --notes-file releases/$TAG/RELEASE.md"
