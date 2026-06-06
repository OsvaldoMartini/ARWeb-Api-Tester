"""
_release_finalize.py  —  called by release.bat after tauri build
Usage: python _release_finalize.py <tag> <release_dir> <index_path>
Writes RELEASE.md in release_dir and updates INDEX.md.
"""
import glob, os, re, sys
from datetime import date

tag         = sys.argv[1]          # e.g. v0.1.1
release_dir = sys.argv[2]          # e.g. D:\...\releases\v0.1.1
index_path  = sys.argv[3]          # e.g. D:\...\releases\INDEX.md

today = date.today().strftime('%Y-%m-%d')

# ── collect artifacts ─────────────────────────────────────────────────────────
exes = glob.glob(os.path.join(release_dir, '*.exe'))
msis = glob.glob(os.path.join(release_dir, '*.msi'))
artifacts = [os.path.basename(f) for f in exes + msis]
art_lines = '\n'.join(f'- `{a}`' for a in artifacts) if artifacts else '- (none found)'
art_str   = ', '.join(artifacts) if artifacts else '—'

# ── write RELEASE.md ──────────────────────────────────────────────────────────
release_md = os.path.join(release_dir, 'RELEASE.md')
with open(release_md, 'w') as f:
    f.write(f"""# Release {tag}  ({today})

## Artifacts
{art_lines}

## What's new
<!-- fill in before distributing -->

## Installation (Windows)
Run the `-setup.exe` installer.
The app includes a bundled Node.js sidecar — no separate server setup required.

## SQLite database
Stored at: `%APPDATA%\\com.arweb.apitester\\arweb.db`
""")
print(f'   wrote {release_md}')

# ── update INDEX.md ───────────────────────────────────────────────────────────
entry = f'| {tag} | {today} | {art_str} |'
if os.path.exists(index_path):
    content = open(index_path).read()
    if tag not in content:
        # insert after the header separator row
        content = re.sub(r'(\|[-| ]+\|\n)', r'\1' + entry + '\n', content, count=1)
        open(index_path, 'w').write(content)
        print(f'   updated {index_path}')
    else:
        print(f'   {tag} already in INDEX.md — skipped')
else:
    with open(index_path, 'w') as f:
        f.write('# Release Index\n\n| Version | Date | Artifacts |\n|---------|------|---|\n' + entry + '\n')
    print(f'   created {index_path}')
