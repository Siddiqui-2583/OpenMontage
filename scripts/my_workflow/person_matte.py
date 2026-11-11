#!/usr/bin/env python3
"""Cut the speaker out of a video: writes a transparent WebM (VP9 + alpha) used by Remotion
`behind_word` overlays, so text/graphics can sit BEHIND the head.

Usage (from repo root, after scripts/my_workflow/setup_matte.sh):
  .venv-matte/bin/python scripts/my_workflow/person_matte.py in.mp4 out_cutout.webm [--ranges 3.5-8,20-26]

--ranges: only segment inside these second-ranges (other frames are written fully transparent, which is
cheap). Omit to cut out the whole video. Output has the same size, fps and duration as the input.
Segmenter: MediaPipe Selfie Segmenter (Apache-2.0); refinement approach from claude-video-effects (MIT).
"""
import argparse, json, os, subprocess, sys
import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "models", "selfie_segmenter.tflite")


def probe(path):
    j = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout)
    s = j["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(n) / float(d or 1), float(j["format"]["duration"])


def guided(I, p, r=8, eps=2e-3):
    box = lambda x: cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))
    mI, mp = box(I), box(p)
    a = (box(I * p) - mI * mp) / (box(I * I) - mI * mI + eps)
    b = mp - a * mI
    return np.clip(box(a) * I + box(b), 0, 1)


def parse_ranges(s):
    if not s:
        return None
    out = []
    for part in s.split(","):
        a, b = part.split("-")
        out.append((float(a), float(b)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--ranges", default="")
    a = ap.parse_args()
    from mediapipe import Image, ImageFormat
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.core.base_options import BaseOptions

    W, H, fps, dur = probe(a.src)
    ranges = parse_ranges(a.ranges)
    seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=MODEL),
        running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True, output_category_mask=False))

    rd = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.src, "-vf", f"fps={fps}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                          stdout=subprocess.PIPE, bufsize=10 ** 8)
    wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                           "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "22", "-deadline", "realtime", "-cpu-used", "5",
                           "-row-mt", "1", "-auto-alt-ref", "0", a.dst], stdin=subprocess.PIPE)
    blank = np.zeros((H, W, 4), np.uint8).tobytes()
    n, prev, size = 0, None, W * H * 3
    total = int(round(dur * fps))
    while True:
        buf = rd.stdout.read(size)
        if len(buf) < size:
            break
        t = n / fps
        active = ranges is None or any(s <= t <= e for s, e in ranges)
        if not active:
            wr.stdin.write(blank); prev = None; n += 1
            continue
        rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        img = Image(image_format=ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
        m = seg.segment_for_video(img, int(t * 1000)).confidence_masks[-1].numpy_view().astype(np.float32)
        m = m.reshape(m.shape[0], m.shape[1])
        if m.shape != (H, W):
            m = cv2.resize(m, (W, H))
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
        m = guided(gray, m)                          # snap the mask edge to real image edges
        m = np.clip((m - 0.5) * 1.6 + 0.5, 0, 1)     # sharpen the soft edge
        if prev is not None:
            m = 0.65 * m + 0.35 * prev               # temporal smoothing (less edge flicker)
        prev = m
        rgba = np.dstack([rgb, (m * 255).astype(np.uint8)])
        wr.stdin.write(rgba.tobytes())
        n += 1
        if n % 150 == 0:
            print(f"  {n}/{total} frames", file=sys.stderr)
    rd.stdout.close(); rd.wait()
    wr.stdin.close(); wr.wait()
    print(a.dst)


if __name__ == "__main__":
    main()
