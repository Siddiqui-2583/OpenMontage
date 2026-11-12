#!/usr/bin/env python3
"""Collect final deliverables into projects/<name>/DELIVERY/ and print that path.

DELIVERY always gets: the video, thumbnail, caption.md, captions.<locale>.srt and transcript.txt (plain text, no timestamps).
The SRT + transcript are generated from projects/<name>/assets/captions_words.json when it exists (see make_srt.py);
otherwise --transcript is copied as transcript.txt and no SRT is made (a warning is printed).

Usage: python3 scripts/my_workflow/deliver.py <name> --video X.mp4 --thumbnail Y.png --caption Z.md
Optional: --transcript T.txt
"""
import argparse, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ap = argparse.ArgumentParser()
ap.add_argument("name")
ap.add_argument("--video", required=True)
ap.add_argument("--thumbnail", required=True)
ap.add_argument("--caption", required=True)
ap.add_argument("--transcript")
ap.add_argument("--locale", default="bn_IN")
a = ap.parse_args()
out = ROOT / "projects" / a.name / "DELIVERY"
out.mkdir(parents=True, exist_ok=True)
pairs = [(a.video, f"{a.name}.mp4"), (a.thumbnail, "thumbnail" + Path(a.thumbnail).suffix),
         (a.caption, "caption.md")]
words = ROOT / "projects" / a.name / "assets" / "captions_words.json"
if not words.is_file() and a.transcript:
    pairs.append((a.transcript, "transcript.txt"))
for src, name in pairs:
    p = Path(src)
    if not p.is_file():
        sys.exit(f"missing: {p}")
    shutil.copy2(p, out / name)
if words.is_file():
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import make_srt
    make_srt.build(words, out, a.locale)
else:
    print("WARNING: no assets/captions_words.json, so no .srt was generated", file=sys.stderr)
print(out)
