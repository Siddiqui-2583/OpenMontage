#!/usr/bin/env python3
"""Timestamped transcript of a video/audio file via the Gemini API (good Bangla; no YouTube upload needed).

  python3 scripts/my_workflow/gemini_transcribe.py INPUT -o projects/<name>/artifacts/transcript [--lang Bangla] [--video] [--chunk 15] [--align snap]

Writes <out>.json  ([{start,end,text,start_gemini}]), <out>.txt and <out>.srt.
Sends compact mono audio by default (--video sends the video). The uploaded file is deleted afterwards.

Privacy: the audio goes to Google. Free-tier API terms may let Google use submitted content; use a paid key
(or the YouTube route in skills/custom/youtube-transcript.md) for client/sensitive footage.
Key lookup (never printed): $GEMINI_API_KEY, ~/.config/my_workflow/.env, ~/.config/watch/.env, ./.env
Upload/Files API flow adapted from claude-video (c) bradautomates, MIT. Standard library only.
"""
import argparse, json, os, re, subprocess, sys, tempfile, time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API = "https://generativelanguage.googleapis.com"
DEFAULT_MODEL = "gemini-flash-latest"


def load_key():
    k = os.environ.get("GEMINI_API_KEY", "").strip()
    if k:
        return k
    for p in (Path.home() / ".config/my_workflow/.env", Path.home() / ".config/watch/.env", Path(".env")):
        try:
            for line in p.read_text().splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    v = line.split("=", 1)[1].strip().strip("'\"")
                    if v:
                        return v
        except OSError:
            pass
    sys.exit("No GEMINI_API_KEY (env, ~/.config/my_workflow/.env or ~/.config/watch/.env). Free key: https://aistudio.google.com/apikey")


def load_model():
    if os.environ.get("WATCH_GEMINI_MODEL"):
        return os.environ["WATCH_GEMINI_MODEL"]
    return DEFAULT_MODEL


class Api:
    def __init__(self, key):
        self.key = key

    def call(self, method, url, data=None, headers=None, timeout=120, tries=6):
        for attempt in range(tries):
            if hasattr(data, "seek"):
                data.seek(0)
            req = Request(url, data=data, method=method, headers={"x-goog-api-key": self.key, **(headers or {})})
            try:
                with urlopen(req, timeout=timeout) as r:
                    return dict(r.headers), r.read()
            except HTTPError as e:
                msg = e.read().decode("utf-8", "replace").replace(self.key, "[redacted]")[:500]
                if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                    wait = min(60, 5 * 2 ** attempt)
                    print(f"[gemini] HTTP {e.code}, retry {attempt + 1}/{tries - 1} in {wait}s", file=sys.stderr)
                    time.sleep(wait); continue
                sys.exit(f"Gemini HTTP {e.code}: {msg}")
            except (URLError, TimeoutError, OSError) as e:
                if attempt < tries - 1:
                    time.sleep(5); continue
                sys.exit(f"Gemini network error: {type(e).__name__}")

    def upload(self, path: Path, mime):
        size = path.stat().st_size
        h, _ = self.call("POST", f"{API}/upload/v1beta/files", json.dumps({"file": {"display_name": "transcribe"}}).encode(),
                         {"X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
                          "X-Goog-Upload-Header-Content-Length": str(size), "X-Goog-Upload-Header-Content-Type": mime,
                          "Content-Type": "application/json"})
        url = {k.lower(): v for k, v in h.items()}.get("x-goog-upload-url")
        if not url:
            sys.exit("Files API gave no upload URL")
        with path.open("rb") as f:
            _, body = self.call("POST", url, f, {"Content-Length": str(size), "X-Goog-Upload-Offset": "0",
                                                  "X-Goog-Upload-Command": "upload, finalize"}, timeout=3600)
        info = json.loads(body)["file"]
        for _ in range(450):
            if info.get("state") != "PROCESSING":
                break
            time.sleep(2)
            info = json.loads(self.call("GET", f"{API}/v1beta/{info['name']}")[1])
        if info.get("state") != "ACTIVE":
            sys.exit(f"upload state {info.get('state')}")
        return info

    def delete(self, name):
        try:
            self.call("DELETE", f"{API}/v1beta/{name}")
        except SystemExit:
            print(f"warning: could not delete {name}; it expires within 48 h", file=sys.stderr)


def prompt(lang):
    lang_line = f"The speech is in {lang}. " if lang else "Detect the spoken language. "
    return (lang_line + "Transcribe the speech verbatim, in the script the speaker's language is normally written in "
            "(for Bangla use Bangla script; write English words the way a Bangla speaker would, in Bangla script, unless it is a "
            "brand/product name, which stays in Latin). Do NOT translate, summarise or correct the grammar; keep fillers and repetitions. "
            "Return one entry per natural phrase or sentence of at most about 12 words. "
            "'start' and 'end' are seconds (decimal) from the very beginning of the audio, at the first/last spoken word of the entry. "
            "Do not output anything for silence, music or noise.")


SCHEMA = {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
    "start": {"type": "NUMBER"}, "end": {"type": "NUMBER"}, "text": {"type": "STRING"}},
    "required": ["start", "end", "text"]}}


def speech_intervals(path, noise="-32dB", dur=0.12):
    """Speech-active [start,end] intervals (complement of ffmpeg silencedetect silences)."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-af", f"silencedetect=noise={noise}:d={dur}", "-f", "null", "-"],
                       capture_output=True, text=True)
    total = 0.0
    m = re.search(r"Duration: (\d+):(\d+):([0-9.]+)", r.stderr)
    if m:
        total = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    sil, cur = [], None
    for line in r.stderr.splitlines():
        if "silence_start:" in line:
            cur = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and cur is not None:
            sil.append((cur, float(line.split("silence_end:")[1].split()[0]))); cur = None
    if cur is not None:
        sil.append((cur, total))
    speech, t = [], 0.0
    for a_, b_ in sorted(sil):
        if a_ - t > 0.15:
            speech.append((t, a_))
        t = max(t, b_)
    if total - t > 0.15:
        speech.append((t, total))
    return speech


def align_by_speech(lines, speech, window=0.7):
    """Ignore Gemini's (drifting) times: place each line start where the cumulative speech time matches the
    cumulative share of text before it, then snap to a real speech onset within `window` s."""
    if not speech or not lines:
        return lines
    weights = [max(1, len(re.sub(r"\s+", "", l["text"]))) for l in lines]
    W, S = float(sum(weights)), sum(b - a for a, b in speech)
    onsets = [a for a, _ in speech]

    def at_speech_time(x):
        for a, b in speech:
            if x <= b - a:
                return a + x
            x -= b - a
        return speech[-1][1]

    acc = 0.0
    for l, w in zip(lines, weights):
        l["start_gemini"] = l["start"]
        t = at_speech_time(acc / W * S)
        near = [o for o in onsets if abs(o - t) <= window]
        l["start"] = round(min(near, key=lambda o: abs(o - t)) if near else t, 3)
        acc += w
    for i, l in enumerate(lines):
        nxt = lines[i + 1]["start"] if i + 1 < len(lines) else speech[-1][1]
        l["end"] = round(max(l["start"] + 0.2, nxt - 0.05), 3)
    return lines


def transcribe_media(api, media, mime, lang, model):
    f = api.upload(media, mime)
    try:
        body = {"contents": [{"parts": [{"fileData": {"mimeType": f.get("mimeType", mime), "fileUri": f["uri"]}}, {"text": prompt(lang)}]}],
                "generationConfig": {"responseMimeType": "application/json", "responseSchema": SCHEMA, "temperature": 0}}
        _, resp = api.call("POST", f"{API}/v1beta/models/{model}:generateContent", json.dumps(body).encode(),
                           {"Content-Type": "application/json"}, timeout=900)
        data = json.loads(resp)
        return json.loads("".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"]))
    except (KeyError, IndexError, ValueError) as e:
        sys.exit(f"unreadable Gemini response ({type(e).__name__})")
    finally:
        api.delete(f["name"])


def chunk_points(speech, dur, target):
    """[(start,end)] chunks of ~target seconds, cut in the middle of the silence nearest each multiple of target
    (Gemini's timestamps drift on long audio; short chunks keep them within ~1 s)."""
    gaps = [((a1 + b0) / 2) for (_, a1), (b0, _) in zip(speech, speech[1:])]
    cuts, t = [], target
    while t < dur - target / 2:
        near = [g for g in gaps if abs(g - t) <= target / 3]
        cuts.append(min(near, key=lambda g: abs(g - t)) if near else t)
        t = cuts[-1] + target
    pts = [0.0] + cuts + [None]
    return list(zip(pts[:-1], pts[1:]))


def snap_to_onsets(lines, speech, window=0.8):
    """Move each line start to the nearest real speech onset within `window` s (keeps Gemini's time otherwise)."""
    onsets = [a for a, _ in speech]
    for l in lines:
        l["start_gemini"] = l["start"]
        near = [o for o in onsets if abs(o - l["start"]) <= window]
        if near:
            l["start"] = round(min(near, key=lambda o: abs(o - l["start"])), 3)
    for i, l in enumerate(lines):
        nxt = lines[i + 1]["start"] if i + 1 < len(lines) else l["end"]
        l["end"] = round(max(l["start"] + 0.2, min(l["end"], nxt - 0.03)), 3)
    return lines


def ts(sec, comma=True):
    h, r = divmod(sec, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", "," if comma else ".")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("-o", "--out", required=True, help="output path without extension")
    ap.add_argument("--lang", default="", help='e.g. "Bangla" (default: auto-detect)')
    ap.add_argument("--video", action="store_true", help="send the video instead of extracted audio")
    ap.add_argument("--align", choices=["snap", "proportional", "none"], default="snap", help="snap: nearest speech onset (default); proportional: ignore Gemini times, spread by text length; none: raw")
    ap.add_argument("--chunk", type=float, default=15.0, help="audio chunk length in s (0 = one upload); short chunks keep timestamps accurate")
    ap.add_argument("--model", default=load_model())
    a = ap.parse_args()
    src = Path(a.input).expanduser()
    if not src.is_file():
        sys.exit(f"not found: {src}")
    api = Api(load_key())
    tmp = Path(tempfile.mkdtemp(prefix="gtx-"))
    if a.video:
        media_full, mime = src, "video/mp4"
    else:
        media_full, mime = tmp / "audio.mp3", "audio/mpeg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", str(media_full)], check=True)
    speech = speech_intervals(src)
    dur = speech[-1][1] if speech else 0.0
    chunks = chunk_points(speech, dur, a.chunk) if (not a.video and a.chunk and dur > a.chunk * 1.5) else [(0.0, None)]
    lines = []
    for ci, (c0, c1) in enumerate(chunks):
        if len(chunks) == 1:
            media = media_full
        else:
            media = tmp / f"chunk{ci}.mp3"
            cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{c0:.3f}"] + (["-to", f"{c1:.3f}"] if c1 else []) + \
                  ["-i", str(src), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", str(media)]
            subprocess.run(cmd, check=True)
        print(f"[gemini] chunk {ci + 1}/{len(chunks)}: uploading {media.name} ({media.stat().st_size // 1024} KB)…", file=sys.stderr)
        cache = Path(str(Path(a.out)) + ".chunks") / f"{ci:03d}_{c0:.2f}.json"
        if cache.exists():
            part = json.loads(cache.read_text()); print(f"[gemini] chunk {ci + 1}: cached", file=sys.stderr)
        else:
            part = transcribe_media(api, media, mime, a.lang, a.model)
            cache.parent.mkdir(parents=True, exist_ok=True); cache.write_text(json.dumps(part, ensure_ascii=False))
        for l in part:
            l["start"] += c0; l["end"] += c0
        lines += part
    lines = [l for l in lines if str(l.get("text", "")).strip()]
    lines.sort(key=lambda l: l["start"])
    if a.align == "snap":
        lines = snap_to_onsets(lines, speech)
    elif a.align == "proportional":
        lines = align_by_speech(lines, speech)
    out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
    out.with_suffix(".json").write_text(json.dumps(lines, ensure_ascii=False, indent=1))
    out.with_suffix(".txt").write_text("\n".join(f"[{ts(l['start'], False)[3:]}] {l['text']}" for l in lines), encoding="utf-8")
    out.with_suffix(".srt").write_text("\n".join(f"{i}\n{ts(l['start'])} --> {ts(max(l['end'], l['start'] + 0.3))}\n{l['text']}\n" for i, l in enumerate(lines, 1)), encoding="utf-8")
    print(f"{len(lines)} lines -> {out}.json/.txt/.srt (model {a.model}, {'video' if a.video else 'audio'}, align={a.align})")


if __name__ == "__main__":
    main()
