"""
_release_finalize.py  —  called by release.bat after tauri build
Usage: python _release_finalize.py <tag> <release_dir> <index_path>
Writes RELEASE.md in release_dir and updates INDEX.md.
"""
import glob, os, re, sys
from datetime import date

tag         = sys.argv[1]          # e.g. v0.1.2
release_dir = sys.argv[2]          # e.g. D:\...\releases\v0.1.2
index_path  = sys.argv[3]          # e.g. D:\...\releases\INDEX.md

today = date.today().strftime('%Y-%m-%d')

# ── collect artifacts ─────────────────────────────────────────────────────────
exes = glob.glob(os.path.join(release_dir, '*.exe'))
msis = glob.glob(os.path.join(release_dir, '*.msi'))
artifacts = [os.path.basename(f) for f in exes + msis]

nsis = next((a for a in artifacts if 'setup' in a.lower()), None)
msi  = next((a for a in artifacts if a.endswith('.msi')), None)

art_lines = '\n'.join(f'- `{a}`' for a in artifacts) if artifacts else '- (none found)'
art_str   = ', '.join(artifacts) if artifacts else '—'

# ── write RELEASE.md ──────────────────────────────────────────────────────────
client_zip = f'ARWEB-API-Tester-{tag}-windows-x64.zip'

release_md = os.path.join(release_dir, 'RELEASE.md')
with open(release_md, 'w', encoding='utf-8') as f:
    f.write(f"""# Release {tag}  ({today})

## Client distribution

Send clients the zip file: `{client_zip}`

Inside they will find the **NSIS installer** — they just double-click it and follow the wizard.
No separate server or runtime setup is required; the C# backend is bundled inside the app.

## Artifacts in this folder

{art_lines}
- `{client_zip}`  **<-- zip to send to clients** (contains the installer + this README)

## Installation (Windows)
{f'Run `{nsis}` — double-click, follow the wizard.' if nsis else 'Run the `-setup.exe` installer.'}

The app stores its SQLite database at:
`%APPDATA%\\ARWebShared\\arweb.db`

## Enterprise / IT deployment
{f'Use `{msi}` for silent / group-policy deployment:' if msi else 'Use the MSI for silent deployment:'}

```
msiexec /i "{msi or 'installer.msi'}" /quiet /norestart
```

## What's new
<!-- fill in before distributing -->
""")
print(f'   wrote {release_md}')

# ── update INDEX.md ───────────────────────────────────────────────────────────
entry = f'| {tag} | {today} | {art_str} |'
if os.path.exists(index_path):
    content = open(index_path, encoding='utf-8').read()
    if tag not in content:
        content = re.sub(r'(\|[-| ]+\|\n)', r'\1' + entry + '\n', content, count=1)
        open(index_path, 'w', encoding='utf-8').write(content)
        print(f'   updated {index_path}')
    else:
        print(f'   {tag} already in INDEX.md -- skipped')
else:
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write('# Release Index\n\n| Version | Date | Artifacts |\n|---------|------|---|\n' + entry + '\n')
    print(f'   created {index_path}')
