# Roadmap — Interview preparation audios in my own cloned voice

Goal: turn my interview answers into audio files read by MY voice (HeyGen clone
"Calm and Proofessional"), so I can rehearse by listening and speaking along.
Hard deadline: the HeyGen subscription expires on **01.09.2026** — after that the
clone is gone. Everything below must be produced before then.

---

## 0. What I have, what it costs, what dies on 01.09

| Resource | Amount | Used via | Buys | After 01.09 |
| --- | --- | --- | --- | --- |
| API wallet | **$2.70** | `tools/voice_read.py` (script) | ≈ 10–12 min of speech ≈ 1'500–1'800 words | gone |
| Plan credits | **1'200** | HeyGen website (Studio) only — NOT the API | avatar videos / voice audio in the app (check the credits/minute shown in Studio) | gone |
| Voice clone | 1 (+6 variants) | both | — | **deleted** — cannot be exported |
| Rendered MP3/MP4 files | whatever I produce | — | — | **mine forever** |

Two separate pools. The script drains only the $2.70 wallet; the 1'200 plan
credits can ONLY be spent in the HeyGen web app — so use BOTH channels:
- **Script (wallet):** clean, fast, one MP3 per answer — the rehearsal library.
- **Studio (plan credits):** longer pieces and avatar videos — e.g. my avatar
  delivering the full 2-minute "tell me about yourself", useful to watch my own
  body-language-free delivery and pacing. Download every render immediately.

Measured cost reference: 73 characters / 5.5 s of speech = $0.02.

---

## 1. Folder layout (copy into the interview project)

    interview-audio/
    ├── INTERVIEW-AUDIO-ROADMAP.md      ← this file
    ├── tools/voice_read.py             ← copy from ARWeb-Api-Tester/tools/
    ├── .env                            ← HEYGEN_API_KEY=... (never commit; add to .gitignore)
    ├── texts/                          ← one .txt per answer, UTF-8, blank line between paragraphs
    │   ├── 01-tell-me-about-yourself.txt
    │   ├── 02-why-this-role.txt
    │   ├── 10-star-conflict.txt
    │   └── ...
    ├── audio/                          ← generated MP3s, same numbering as texts/
    │   └── 01-tell-me-about-yourself.mp3
    └── samples/                        ← voice previews + the 41 ARAPI narration clips
                                           (re-cloning material for after 01.09)

Naming: `NN-topic.txt` → `NN-topic.mp3`. Numbers give the practice order.

Note: `voice_read.py` reads `.env` from its parent-of-parent folder (repo
root). Keep the same `tools/` + root `.env` shape, or edit `ROOT` in the script.

---

## 2. Phases and timeline

### Phase A — Write the texts (today → 29.08)
Write every answer as I would SAY it, not as I would write it:
- short sentences; contractions ("I've", "we'd"); no bullet lists — prose only;
- numbers spelled the way they are spoken ("two thousand twenty-four", "CHF one
  point two million") — TTS reads digits inconsistently;
- put a full stop where I want a breath; an em dash or "…" for a longer pause;
- acronyms: write them as spoken ("A P I", "S Q L") or as a word ("SQL" → "sequel");
- keep each answer 60–200 words (≈ 25–80 s). The classic 2-minute opener ≈ 280 words.

Priority order (do the first tier first — it covers 80 % of interviews):
1. **Tier 1 (must):** tell me about yourself · why this company/role · why are you
   leaving/looking · biggest achievement · a failure and what you learned ·
   strengths · weaknesses · salary expectations · questions for them.
2. **Tier 2 (STAR stories, 5–7):** conflict in a team · tight deadline · led a
   change · disagreed with a manager · mistake in production · mentored someone ·
   handled an ambiguous requirement.
3. **Tier 3 (technical, role-specific):** architecture walkthrough of my main
   project · test automation philosophy · CI/CD · a hard bug I diagnosed ·
   security/data-privacy handling (the Banca Stato real-data episode is a good one).
4. **Tier 4 (extras, if budget remains):** 30-second elevator pitch · voicemail-
   style intro · closing statement · thank-you follow-up script.

### Phase B — Generate (29.08 → 30.08) — leave one full day of margin
For each text, in priority order:

    python tools/voice_read.py --text-file texts/01-tell-me-about-yourself.txt \
           --out audio/01-tell-me-about-yourself.mp3 --lang en --speed 0.95

- Start with ONE Tier-1 answer, listen, fix the text (pauses, spelled numbers),
  regenerate. Only then batch the rest.
- After every 4–5 files check the wallet:
  `curl -s -H "x-api-key: $KEY" https://api.heygen.com/v3/users/me`
  (`remaining_balance`). Stop Tier 4 when it drops under ~$0.30.
- Speed: 0.95 for rehearsal (slightly slower than natural); 1.0 for the pitch.
- Italian answers: `--lang it`. German/French: `--lang de` / `--lang fr` — test
  one short sentence first; the clone is tagged English.

### Phase C — Spend the plan credits in Studio (30.08 → 31.08)
- In the HeyGen app: create videos with my avatar reading the Tier-1 answers
  (paste the same texts). Choose a plain background — content, not decoration.
- Also render the long pieces there (the 2-minute opener, a 5-minute technical
  walkthrough) to save the wallet for many short files.
- **Download every render as soon as it finishes** — the account content
  disappears with the subscription. Save into `audio/` (MP3) or `video/` (MP4).
- Last check on 31.08: nothing left un-downloaded; drafts either rendered or
  deleted (drafts have no file to download — that already cost me 5 videos in
  the first rescue).

### Phase D — Preserve re-cloning material (before 01.09)
Voice clones cannot be exported, but I can re-clone later on another service
(ElevenLabs, HeyGen again, or a local open-source model) if I keep samples:
- the 7 preview MP3s (already in `Marketing/HeyGen/voices/`);
- the 41 narration MP3s from the ARWeb presentation (`docs/guida/*/audio/`);
- the interview audios themselves — long, clean, single-speaker: excellent
  training material;
- ideally 2–3 minutes of MY REAL recorded voice (phone recorder, quiet room,
  reading any text) — a real recording clones better than a clone of a clone.
Put copies in `samples/`. This is the insurance policy.

---

## 3. Rehearsal method (how to actually use the files)
1. **Listen** to an answer twice without speaking.
2. **Shadow**: play it and speak simultaneously, matching pace and pauses.
3. **Solo**: say it without audio; record on the phone; compare with the file.
4. **Compress**: make a 30-second version of each Tier-1 answer — interviewers
   interrupt; the short form is what survives.
5. Play the Tier-1 set on loop while commuting the day before.

---

## 4. Checklist
- [ ] Folder created, `voice_read.py` + `.env` copied, `.env` gitignored
- [ ] Tier-1 texts written and spoken-style checked
- [ ] First test file generated, listened, text adjusted
- [ ] Tier 1 generated · [ ] Tier 2 · [ ] Tier 3 · [ ] Tier 4 (budget permitting)
- [ ] Studio videos rendered AND downloaded
- [ ] Wallet ≈ $0 and plan credits used — nothing left on the table
- [ ] `samples/` filled (previews + narration + a real recording)
- [ ] 31.08 evening: final download sweep; account has nothing I still need

Written 28.08.2026 — API voice_id `2d45c0a3378f4315b1474874c3f68c3d`.
