#!/usr/bin/env python3
"""Read any text aloud in Osvaldo's cloned HeyGen voice and save it as MP3.

    python tools/voice_read.py --text-file speech.txt --out docs/voices/interview.mp3 --lang en
    python tools/voice_read.py --text "Buongiorno a tutti." --out docs/voices/test.mp3 --lang it

Long texts are split into paragraph chunks (API limit), rendered one by one and
joined into a single MP3 (parts are kept next to it as <out>.partNN.mp3).
Requires HEYGEN_API_KEY in the repo-root .env (gitignored). Stdlib only.
"""

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOICE_ID = "2d45c0a3378f4315b1474874c3f68c3d"  # "Calm and Proofessional"
MAX_CHARS = 1500


def api_key() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("HEYGEN_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("HEYGEN_API_KEY not found in .env")


def chunks(text: str):
    """Split on blank lines, then pack paragraphs up to MAX_CHARS."""
    paragraphs = [p.strip() for p in text.replace("\r", "").split("\n\n") if p.strip()]
    buf = ""
    for p in paragraphs:
        if len(p) > MAX_CHARS:  # very long paragraph: split on sentences
            for s in p.replace(". ", ".\n").split("\n"):
                if len(buf) + len(s) + 1 > MAX_CHARS and buf:
                    yield buf; buf = ""
                buf = (buf + " " + s).strip()
            continue
        if len(buf) + len(p) + 2 > MAX_CHARS and buf:
            yield buf; buf = ""
        buf = (buf + "\n\n" + p).strip()
    if buf:
        yield buf


def speak(key: str, text: str, lang: str | None, speed: float) -> bytes:
    payload = {"text": text, "voice_id": VOICE_ID, "speed": speed}
    if lang:
        payload["language"] = lang
    req = urllib.request.Request(
        "https://api.heygen.com/v3/voices/speech",
        data=json.dumps(payload).encode("utf-8"),
        headers={"x-api-key": key, "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.loads(r.read())["data"]
    with urllib.request.urlopen(data["audio_url"], timeout=180) as r:
        return r.read(), data.get("duration", 0)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--text")
    src.add_argument("--text-file", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--lang", default=None, help="e.g. en, it, de, fr (omit = auto)")
    ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()

    text = a.text if a.text else a.text_file.read_text(encoding="utf-8")
    key = api_key()
    parts = list(chunks(text))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    merged, total = b"", 0.0
    for i, part in enumerate(parts, 1):
        audio, dur = speak(key, part, a.lang, a.speed)
        total += dur
        if len(parts) > 1:
            a.out.with_suffix(f".part{i:02d}.mp3").write_bytes(audio)
        merged += audio
        print(f"[ok] part {i}/{len(parts)}  {len(part)} chars  {dur:.1f}s")
        time.sleep(0.3)
    a.out.write_bytes(merged)
    print(f"saved {a.out}  ({total/60:.1f} min, {len(merged)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
