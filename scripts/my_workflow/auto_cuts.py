#!/usr/bin/env python3
"""Silence-trim segment list via auto-editor (https://github.com/WyattBlue/auto-editor, Unlicense).

  .venv-matte/bin/python scripts/my_workflow/auto_cuts.py SRC.mp4 -o projects/<name>/assets/cut_segments.json \
      [--margin 0.12] [--threshold 0.025] [--cut-out 120.313-126.447,150-152]

Writes {"segments": [[src_start, src_end], ...]} in SECONDS (source timeline), the same format as build_template.py's
cut_segments.json, so cut_qa.py and the ffmpeg render (30 ms fades + loudnorm) can use it directly.
- margin: padding kept around speech on each side (a pause between sentences ends up ~2x margin).
- threshold: loudness 0..1 below which audio counts as silence (0.025 ~ -32 dB).
- cut-out: forced cuts (repeated lines, false starts), "start-end" seconds, comma separated.
Note: cuts are frame-accurate (1/fps), not sample-accurate; the 30 ms fades hide that.
Tested on pen-and-paper: 97% overlap with our hand-written trimmer (keeps a strict subset), 57 vs 45 segments.
"""
import argparse, json, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AE = ROOT / ".venv-matte" / "bin" / "auto-editor"


def fps_of(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", path],
                       capture_output=True, text=True, check=True).stdout.strip()
    n, d = r.split("/")
    return float(n) / float(d or 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--margin", type=float, default=0.12)
    ap.add_argument("--threshold", type=float, default=0.025)
    ap.add_argument("--cut-out", default="")
    a = ap.parse_args()
    exe = str(AE) if AE.exists() else "auto-editor"
    cmd = [exe, a.src, "--margin", f"{a.margin}sec", "--edit", f"audio:threshold={a.threshold}", "--export", "v1"]
    if a.cut_out:
        for r in a.cut_out.split(","):
            s, e = r.split("-")
            cmd += ["--cut-out", f"{float(s)}sec,{float(e)}sec"]
    tmp = Path(tempfile.mkdtemp()) / "tl.json"
    cmd += ["-o", str(tmp)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode or not tmp.exists():
        sys.exit("auto-editor failed:\n" + (r.stdout + r.stderr)[-600:])
    fps = fps_of(a.src)
    segs = [[round(s / fps, 3), round(e / fps, 3)] for s, e, speed in json.load(open(tmp))["chunks"] if speed == 1.0]
    out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"segments": segs, "tool": "auto-editor", "margin": a.margin, "threshold": a.threshold}))
    kept = sum(e - s for s, e in segs)
    print(f"{len(segs)} segments, {kept:.1f}s kept -> {out}")


if __name__ == "__main__":
    main()
