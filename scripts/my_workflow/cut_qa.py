#!/usr/bin/env python3
"""Self-check every cut of an edited video: (1) filmstrip+waveform PNG per boundary, (2) automatic audio-pop score.

  .venv-matte/bin/python scripts/my_workflow/cut_qa.py <edited.mp4> <cut_segments.json> -o <out_dir> [--max 12]

cut_segments.json = {"segments": [[src_start, src_end], ...]} (source timeline, as written by build.py).
Boundary i sits at the cumulative duration of segments 0..i in the edited video.
Idea (self-eval at every cut boundary) from browser-use/video-use (MIT); pop detector is our own.
"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent


def pcm(video, t0, t1, sr=16000):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, t0):.3f}", "-to", f"{t1:.3f}", "-i", str(video), "-vn", "-ac", "1", "-ar", str(sr),
                        "-f", "s16le", "-"], capture_output=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768.0, sr


def pop_score(video, t, sr=16000):
    """Largest sample-to-sample jump within +-4 ms of the cut vs the typical jump in +-150 ms. >~8 and >0.15 FS = audible click."""
    x, sr = pcm(video, t - 0.15, t + 0.15, sr)
    if len(x) < sr * 0.1:
        return 0.0, 0.0
    d = np.abs(np.diff(x)); mid = len(d) // 2; w = int(0.004 * sr)
    local = float(d[max(0, mid - w): mid + w].max()); typical = float(np.median(d) + 1e-6)
    return local / typical, local


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("segments"); ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--max", type=int, default=12, help="max filmstrip PNGs (pop scores are computed for ALL cuts)")
    a = ap.parse_args()
    segs = json.load(open(a.segments))["segments"]
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    t, bounds = 0.0, []
    for s, e in segs[:-1]:
        t += e - s; bounds.append(t)
    rows, flagged = [], []
    for i, b in enumerate(bounds):
        ratio, jump = pop_score(a.video, b)
        bad = ratio > 8 and jump > 0.15
        rows.append((i, b, ratio, jump, bad))
        if bad: flagged.append(i)
    # filmstrips: all flagged cuts first, then evenly spaced others
    pick = list(flagged)
    others = [i for i in range(len(bounds)) if i not in flagged]
    step = max(1, len(others) // max(1, a.max - len(pick))) if others else 1
    pick += others[::step][: max(0, a.max - len(pick))]
    for i in sorted(pick):
        b = bounds[i]
        subprocess.run([sys.executable, str(HERE / "timeline_view.py"), str(a.video), f"{max(0, b - 1.0):.2f}", f"{b + 1.0:.2f}",
                        "-o", str(out / f"cut_{i:02d}_{b:.2f}s.png"), "--n-frames", "8"], check=True, stdout=subprocess.DEVNULL)
    lines = [f"cut {i:02d} @ {b:7.2f}s  pop-ratio {r:5.1f}  jump {j:.3f}  {'POP?' if bad else 'ok'}" for i, b, r, j, bad in rows]
    (out / "cut_qa.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\n{len(bounds)} cuts, {len(flagged)} flagged, {len(pick)} filmstrips in {out}")


if __name__ == "__main__":
    main()
