# CLAUDE.md — ARWeb API Tester: guided tours (docs/guida)

Rules for building the narrated step-by-step screen walkthroughs with progressive
Italian subtitles. Two tours, one per guide:

1. **arapi** — from `docs/guide/work/ARAPI-Complete-Client-Guide.scrubbed.docx`,
   screenshots in `docs/guide/screenshots/` (26 PNG, 1296x839)
2. **conversational** — from `docs/guide/work/AR-Conversational-Complete-Client-Guide.scrubbed.docx`,
   screenshots in `docs/guide/screenshots-ar-conversational/` (17 PNG, 1296x839;
   `01-current.png` duplicates `01-home.png`)

Deliverables live in `docs/guida/<tour>/steps.json`, scaffolded by
`tools/guide_to_steps.py`, played by `docs/guida/index.html` (supplied, not built here).

## Branch & scope

- Work on `allinweb-deliver`, never on master/main.
- Touch only `docs/guida/`, `tools/` and this file.
- Never commit or push without asking first.
- Never commit generated audio or video files.
- Do not rewrite the existing guides.

## Cost constraint

Zero paid services. Browser `speechSynthesis` for playback; `edge-tts` (free)
only if downloadable audio is needed later. Never call HeyGen, ElevenLabs,
OpenAI or any metered API. Ask before installing anything.

## Language — Italian-speaking Switzerland (Ticino, Lugano), not Italy

- Register: impersonal infinitive. YES «inserire le proprie credenziali»,
  NO «inserite le vostre credenziali».
- Swiss vocabulary: *formulario* (not modulo), *annunciarsi* (not accedere/login),
  *linguetta* (not scheda, for UI tabs), *scaricamento* (not download).
  Avoid anglicisms more aggressively than Italy-Italian would.
- Formats: dates `27.08.2026`, thousands `1'000`, currency `CHF`.
- **Never translate UI control names.** If the button says "Submit", the narration
  says «premere Submit». Labels come from the guides and the source code — never
  invented.
- Each step: 2–4 sentences, 25–55 words. Longer and the subtitle band scrolls
  past what a viewer can read.

## Technical constraints — established, do not rediscover

- `utterance.lang` must stay `"it-IT"`. No platform has an it-CH voice;
  requesting it falls back to the system default (often German or English).
  The HTML document language tag stays `it-CH`.
- Hotspot coordinates are **fractions of the IMAGE**, not the viewport.
- All screenshots in one tour must share one resolution or hotspots drift
  between steps. Report mismatches; never silently rescale.
- Write JSON with `ensure_ascii=False` and explicit `encoding="utf-8"`.
  Windows cp1252 mangles accented characters on both read and write.
- When stripping Markdown code fences, preserve string length (replace
  non-space chars with spaces) or heading offsets shift and sections
  come out misaligned.
- Re-running the scaffolder must never overwrite hand-written `testo`,
  `titolo` or `hotspot` — it merges over the existing `steps.json`.
- The player fetches `steps.json`, so `file://` is blocked by CORS.
  Serve with: `python -m http.server 8000` (from the repo root), then open
  `http://localhost:8000/docs/guida/index.html`.

## steps.json contract

```json
{
  "titolo": "…",
  "lingua": "it-CH",
  "linguaVoce": "it-IT",
  "immagini": { "larghezza": 1296, "altezza": 839 },
  "steps": [
    {
      "id": "01-home",
      "ordine": 1,
      "immagine": "../guide/screenshots/01-home.png",
      "capitolo": "…source H1…",
      "sezione": "…source H2…",
      "titolo": "…shown as the step title…",
      "testo": "…narration / progressive subtitle, hand-written…",
      "hotspot": { "x": 0.0, "y": 0.0, "w": 1.0, "h": 1.0 }
    }
  ]
}
```

- `immagine` paths are relative to `docs/guida/` (where `index.html` lives).
- `hotspot: null` means no highlight for that step.
- Steps are ordered by where each screenshot appears in the guide
  (document order), not by screenshot filename.
- A step kept from a previous run whose image no longer maps gets
  `"obsoleto": true` — review and delete by hand.

## Scaffolder

```
python tools/guide_to_steps.py --guide <file.docx|file.md> --screenshots <dir> \
       --out docs/guida/<tour>/steps.json --titolo "Tour title"
```

Stdlib only. Maps embedded docx images to screenshot files by content hash
(embedded order differs from filename order). Duplicate-hash screenshots and
unmatched files are reported, never silently dropped.
