#!/usr/bin/env python3
"""Generate narration MP3s for the guided tours with a HeyGen cloned voice.

Reads each tour's steps.json, synthesizes every step's "testo" via
POST /v3/voices/speech, and saves next to the manifest:

    docs/guida/<tour>/audio/<step-id>.mp3    the narration audio
    docs/guida/<tour>/audio/<step-id>.json   duration + word timestamps
                                             (the player uses these to sync
                                             the progressive subtitles)

Requires HEYGEN_API_KEY in the repo-root .env (gitignored).
Existing MP3s are skipped, so an interrupted run can simply be re-run;
delete a step's .mp3 to force regeneration after editing its testo.
Stdlib only.
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE_ID = "2d45c0a3378f4315b1474874c3f68c3d"  # "Calm and Proofessional"
LANGUAGE = "it"
SPEED = 1.0
TOURS = ["arapi", "conversational"]


def api_key() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("HEYGEN_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("HEYGEN_API_KEY not found in .env")


def speech(key: str, text: str) -> dict:
    req = urllib.request.Request(
        "https://api.heygen.com/v3/voices/speech",
        data=json.dumps({
            "text": text, "voice_id": VOICE_ID,
            "language": LANGUAGE, "speed": SPEED,
        }).encode("utf-8"),
        headers={"x-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())["data"]


def main():
    key = api_key()
    total = done = skipped = 0
    for tour in TOURS:
        manifest = ROOT / "docs" / "guida" / tour / "steps.json"
        audio_dir = manifest.parent / "audio"
        audio_dir.mkdir(exist_ok=True)
        steps = json.loads(manifest.read_text(encoding="utf-8"))["steps"]
        for s in steps:
            if not s.get("testo") or s.get("obsoleto"):
                continue
            total += 1
            mp3 = audio_dir / f"{s['id']}.mp3"
            meta = audio_dir / f"{s['id']}.json"
            if mp3.exists() and meta.exists():
                skipped += 1
                continue
            for attempt in range(3):
                try:
                    d = speech(key, s["testo"])
                    break
                except Exception as e:
                    if attempt == 2:
                        sys.exit(f"[fail] {tour}/{s['id']}: {e}")
                    print(f"[retry] {tour}/{s['id']}: {e}")
                    time.sleep(3)
            with urllib.request.urlopen(d["audio_url"], timeout=120) as r:
                mp3.write_bytes(r.read())
            with open(meta, "w", encoding="utf-8", newline="\n") as f:
                json.dump({
                    "durata": d.get("duration"),
                    "parole": d.get("word_timestamps") or [],
                }, f, ensure_ascii=False, indent=2)
            done += 1
            print(f"[ok] {tour}/{s['id']}.mp3  {d.get('duration', 0):.1f}s")
            time.sleep(0.5)  # gentle pacing for the API
    print(f"generated {done}, skipped {skipped} (already present), of {total}")


if __name__ == "__main__":
    main()
