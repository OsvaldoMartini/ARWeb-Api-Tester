# App icons

This folder is referenced by `tauri.conf.json -> bundle.icon`. Generate the full
icon set from a single 1024x1024 PNG with:

```bash
(from project root)
npx tauri icon path/to/source-icon.png
```

That command writes `32x32.png`, `128x128.png`, `icon.ico`, `icon.icns` and the
platform variants here. `tauri dev` runs without icons; `tauri build` needs them.
