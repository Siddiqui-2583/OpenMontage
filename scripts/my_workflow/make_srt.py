#!/usr/bin/env python3
"""Word-timed captions JSON -> platform files: an .srt (viewer-toggle captions) and a plain-text transcript.

  python3 scripts/my_workflow/make_srt.py projects/<slug>/assets/captions_words.json -o projects/<slug>/DELIVERY --locale bn_IN

Input: [{"word","startMs","endMs","pageBreakAfter"?}] on the FINAL video timeline (what build.py writes).
Writes <out>/captions.<locale>.srt and <out>/transcript.txt (no timestamps, one line per sentence/page).
Cue rules: break at pageBreakAfter, sentence punctuation (।?!), after 8 words, a pause > 0.7 s, or 6 s. Timing is only as good as the
caption alignment (approximate, see the project's warnings). Facebook names uploads like captions.en_US.srt: pick the locale its UI offers.
"""
import argparse, json
from pathlib import Path


def ts(ms):
    h, r = divmod(int(ms), 3600000); m, r = divmod(r, 60000); s, ms = divmod(r, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def build(words_path, out_dir, locale="bn_IN"):
    """Write captions.<locale>.srt + transcript.txt into out_dir; returns (n_cues, n_lines)."""
    import sys
    old = sys.argv; sys.argv = ["make_srt", str(words_path), "-o", str(out_dir), "--locale", locale]
    try:
        return main()
    finally:
        sys.argv = old


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("words"); ap.add_argument("-o", "--out", required=True); ap.add_argument("--locale", default="bn_IN")
    a = ap.parse_args()
    W = json.load(open(a.words, encoding="utf-8")); cues, cur = [], []
    def flush():
        nonlocal cur
        if cur: cues.append(cur); cur = []
    for i, w in enumerate(W):
        cur.append(w); nxt = W[i + 1] if i + 1 < len(W) else None
        end = w["word"].rstrip()[-1:] in "।?!"
        if (w.get("pageBreakAfter") or end or len(cur) >= 8 or (nxt and nxt["startMs"] - w["endMs"] > 700) or w["endMs"] - cur[0]["startMs"] > 6000 or not nxt):
            flush()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    srt = []
    for n, c in enumerate(cues, 1):
        e = max(c[-1]["endMs"], c[0]["startMs"] + 400)
        if n < len(cues): e = min(e, cues[n][0]["startMs"] - 20) if cues[n][0]["startMs"] - 20 > c[0]["startMs"] + 300 else e
        srt.append(f"{n}\n{ts(c[0]['startMs'])} --> {ts(e)}\n{' '.join(x['word'] for x in c)}\n")
    (out / f"captions.{a.locale}.srt").write_text("\n".join(srt), encoding="utf-8")
    lines, cur = [], []
    has_breaks = any(w.get("pageBreakAfter") for w in W)
    for w in W:
        cur.append(w["word"])
        if w.get("pageBreakAfter") or (not has_breaks and w["word"].rstrip()[-1:] in "।?!."): lines.append(" ".join(cur)); cur = []
    if cur: lines.append(" ".join(cur))
    (out / "transcript.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(cues)} cues, {len(lines)} transcript lines -> {out}")
    return len(cues), len(lines)


if __name__ == "__main__":
    main()
