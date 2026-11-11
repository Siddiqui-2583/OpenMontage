#!/usr/bin/env python3
"""Collect final deliverables into projects/<name>/DELIVERY/ and print that path.

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
a = ap.parse_args()
out = ROOT / "projects" / a.name / "DELIVERY"
out.mkdir(parents=True, exist_ok=True)
pairs = [(a.video, f"{a.name}.mp4"), (a.thumbnail, "thumbnail" + Path(a.thumbnail).suffix),
         (a.caption, "caption.md")]
if a.transcript:
    pairs.append((a.transcript, "transcript.txt"))
for src, name in pairs:
    p = Path(src)
    if not p.is_file():
        sys.exit(f"missing: {p}")
    shutil.copy2(p, out / name)
print(out)
