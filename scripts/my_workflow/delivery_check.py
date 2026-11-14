#!/usr/bin/env python3
"""delivery_check.py - pre-delivery QA for a finished vertical video (warn-only, never edits).

Idea and row set adapted from kajisho5/ffmpeg-skill check.py (MIT, https://github.com/kajisho5/ffmpeg-skill).
Re-implemented from scratch on plain ffprobe/ffmpeg filters (no vendored code).

Rows: format (size/aspect/fps/codec/pix_fmt), loudness + true peak, black frames, frozen spans, silence share,
audio dropouts (digital silence with sound on both sides), single-frame flashes, flat first frame.
Exit 0 = no FAIL (WARNs allowed), 1 = a FAIL. deliver.py calls this and only prints it.

  python3 delivery_check.py video.mp4 [--platform facebook|reels|youtube] [--json]
"""
import argparse, json, re, subprocess, sys

PLATFORMS = {
    # target aspect, LUFS window (warn outside), true peak ceiling dBFS
    "facebook": dict(aspect=(9, 16), lufs=(-17.0, -13.0), tp=-1.0, fps_max=60),
    "reels":    dict(aspect=(9, 16), lufs=(-17.0, -13.0), tp=-1.0, fps_max=60),
    "youtube":  dict(aspect=None,    lufs=(-16.0, -12.0), tp=-1.0, fps_max=60),
}


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, errors="replace")


def probe(path):
    r = sh(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path])
    if r.returncode:
        sys.exit("ffprobe failed: " + r.stderr.strip())
    return json.loads(r.stdout)


def fps_of(v):
    n, _, d = (v.get("avg_frame_rate") or "0/1").partition("/")
    return float(n) / float(d or 1) if float(d or 1) else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--platform", default="facebook", choices=sorted(PLATFORMS))
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    spec = PLATFORMS[a.platform]
    rows = []

    def add(name, status, detail):
        rows.append({"check": name, "status": status, "detail": detail})

    p = probe(a.video)
    v = next((s for s in p["streams"] if s["codec_type"] == "video"), None)
    au = next((s for s in p["streams"] if s["codec_type"] == "audio"), None)
    dur = float(p["format"].get("duration", 0))
    if not v:
        sys.exit("no video stream")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        rot = int(sd.get("rotation", 0) or 0)
    if abs(rot) in (90, 270):
        w, h = h, w
    fps = fps_of(v)

    # ---- format
    add("DURATION", "PASS", f"{dur:.1f} s")
    if spec["aspect"]:
        ok = abs(w / h - spec["aspect"][0] / spec["aspect"][1]) < 0.01
        add("ASPECT", "PASS" if ok else "FAIL", f"{w}x{h}" + ("" if ok else f", wanted {spec['aspect'][0]}:{spec['aspect'][1]}"))
    else:
        add("ASPECT", "PASS", f"{w}x{h}")
    add("SIZE", "PASS" if (w, h) == (1080, 1920) or not spec["aspect"] else "WARN", f"{w}x{h} (1080x1920 is the usual vertical target)")
    add("FPS", "PASS" if 0 < fps <= spec["fps_max"] else "WARN", f"{fps:.2f} fps")
    add("CODEC", "PASS" if v["codec_name"] == "h264" else "WARN", f"video {v['codec_name']}")
    add("PIX_FMT", "PASS" if v.get("pix_fmt") == "yuv420p" else "WARN",
        f"{v.get('pix_fmt')} (8-bit 4:2:0 plays everywhere; others can be rejected)")
    if not au:
        add("AUDIO", "FAIL", "no audio stream")

    # ---- loudness + true peak (one pass)
    if au:
        r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
        txt = r.stderr
        mi = re.findall(r"I:\s+(-?[\d.]+) LUFS", txt)
        mp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", txt)
        if mi:
            lufs = float(mi[-1])
            lo, hi = spec["lufs"]
            add("LOUDNESS", "PASS" if lo <= lufs <= hi else "WARN", f"{lufs:.1f} LUFS (window {lo}..{hi})")
        if mp:
            tp = float(mp[-1])
            add("TRUE PEAK", "PASS" if tp <= spec["tp"] else "WARN", f"{tp:.1f} dBFS (ceiling {spec['tp']})")

        # ---- silence share (< -50 dB) and dropouts (<= -80 dB, 20 ms..1 s, sound both sides)
        r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-vn", "-af",
                "silencedetect=n=-50dB:d=0.3", "-f", "null", "-"])
        sil = sum(float(x) for x in re.findall(r"silence_duration:\s*([\d.]+)", r.stderr))
        share = sil / dur if dur else 0
        add("SILENCE", "FAIL" if share >= 0.95 else ("WARN" if share > 0.5 else "PASS"), f"{share*100:.0f}% below -50 dB")
        r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-vn", "-af",
                "silencedetect=n=-80dB:d=0.02", "-f", "null", "-"])
        starts = [float(x) for x in re.findall(r"silence_start:\s*(-?[\d.]+)", r.stderr)]
        durs = [float(x) for x in re.findall(r"silence_duration:\s*([\d.]+)", r.stderr)]
        # gaps <= 50 ms are our own 30 ms cut fades (build_template.py), not defects
        drops = [(s, d) for s, d in zip(starts, durs) if 0.05 < d <= 1.0 and s > 0.1 and s + d < dur - 0.1]
        fades = sum(1 for d in durs if 0.02 <= d <= 0.05)
        if drops:
            add("DROPOUTS", "WARN", f"{len(drops)} digital-silence gap(s) >50 ms, first at {drops[0][0]:.2f} s ({drops[0][1]*1000:.0f} ms)")
        else:
            add("DROPOUTS", "PASS", f"none ({fades} cut fades ignored)")

    # ---- black + frozen (one pass)
    r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-an", "-vf",
            "blackdetect=d=0.1:pix_th=0.10,freezedetect=n=-60dB:d=1", "-f", "null", "-"])
    black = sum(float(x) for x in re.findall(r"black_duration:([\d.]+)", r.stderr))
    bshare = black / dur if dur else 0
    add("BLACK", "FAIL" if bshare >= 0.95 else ("WARN" if bshare > 0.10 else "PASS"), f"{bshare*100:.1f}% black frames")
    frz = [float(x) for x in re.findall(r"freeze_duration:\s*([\d.]+)", r.stderr)]
    longest = max(frz) if frz else 0.0
    # a still talking head is rarely frozen; a card held while speech continues is normal, so only flag long spans
    add("FROZEN", "WARN" if longest > max(5.0, 0.3 * dur) else "PASS", f"longest frozen span {longest:.1f} s")

    # ---- flashes: single frame whose mean luma jumps away from both neighbours that agree with each other
    r = sh(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-an", "-vf",
            "scale=96:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"])
    ys = [float(x) for x in re.findall(r"YAVG=([\d.]+)", r.stdout)]
    fl = []
    T = 18.0
    for i in range(1, len(ys) - 1):
        if abs(ys[i] - ys[i - 1]) > T and abs(ys[i] - ys[i + 1]) > T and abs(ys[i - 1] - ys[i + 1]) < T / 3:
            fl.append(i / fps if fps else i)
    add("FLASHES", "WARN" if fl else "PASS",
        (f"{len(fl)} single-frame flash(es), first at {fl[0]:.2f} s" if fl else "none"))

    # ---- first frame (feed autoplay shows it): flat colour = wasted thumbnail
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-v", "error", "-i", a.video, "-frames:v", "1", "-vf",
                        "scale=96:-2,format=gray", "-f", "rawvideo", "-"], capture_output=True)
    px = list(r.stdout)
    if px:
        mean = sum(px) / len(px)
        std = (sum((x - mean) ** 2 for x in px) / len(px)) ** 0.5
        add("FIRST FRAME", "WARN" if std < 6 else "PASS", f"luma std {std:.1f}" + (" - flat colour, autoplay shows nothing" if std < 6 else ""))

    fails = sum(r["status"] == "FAIL" for r in rows)
    warns = sum(r["status"] == "WARN" for r in rows)
    verdict = "FIX" if fails else ("REVIEW" if warns else "OK")
    if a.json:
        print(json.dumps({"video": a.video, "platform": a.platform, "rows": rows, "verdict": verdict}, indent=1, ensure_ascii=False))
    else:
        print(f"\nDELIVERY CHECK  {a.video}  [{a.platform}]")
        for r in rows:
            print(f"  {r['status']:<5} {r['check']:<12} {r['detail']}")
        print(f"  VERDICT {verdict}\n")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
