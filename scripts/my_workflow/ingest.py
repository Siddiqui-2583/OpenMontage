#!/usr/bin/env python3
"""Ingest an inbox/<name>/ folder into projects/<name>/.

- probes every video with ffprobe
- copies videos -> projects/<name>/assets/video/raw/
- copies user assets (png/jpg/svg/mp3/wav...) -> projects/<name>/assets/user/
- writes projects/<name>/artifacts/ingest_manifest.json
Prints the manifest path. Never modifies the inbox.

Usage: python3 scripts/my_workflow/ingest.py <name> [--inbox inbox]
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

VIDEO = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}
ROOT = Path(__file__).resolve().parents[2]


def probe(p: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate:format=duration,size",
         "-of", "json", str(p)], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return {"width": s["width"], "height": s["height"],
            "fps": round(int(num) / int(den), 3),
            "duration_s": round(float(j["format"]["duration"]), 2),
            "size_bytes": int(j["format"]["size"])}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--inbox", default="inbox")
    a = ap.parse_args()
    src = ROOT / a.inbox / a.name
    if not src.is_dir():
        print(f"no such inbox folder: {src}", file=sys.stderr)
        return 1
    slug = re.sub(r"[^a-z0-9]+", "-", a.name.lower()).strip("-") or "project"   # inbox name may have spaces/caps
    proj = ROOT / "projects" / slug
    (raw := proj / "assets/video/raw").mkdir(parents=True, exist_ok=True)
    (usr := proj / "assets/user").mkdir(parents=True, exist_ok=True)
    (art := proj / "artifacts").mkdir(parents=True, exist_ok=True)
    videos, assets, notes = [], [], None
    for f in sorted(src.rglob("*")):
        if not f.is_file() or f.name.startswith("."):
            continue
        if f.name.lower() == "notes.txt":
            notes = f.read_text(encoding="utf-8", errors="replace")
        elif f.suffix.lower() in VIDEO and f.parent == src:
            shutil.copy2(f, raw / f.name)
            videos.append({"file": f"assets/video/raw/{f.name}", **probe(f)})
        else:
            rel = f.relative_to(src)
            dest = usr / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)
            assets.append(f"assets/user/{rel}")
    if not videos:
        print("no videos found at top level of the inbox folder", file=sys.stderr)
        return 1
    m = {"project": slug, "inbox": a.name, "videos": videos, "user_assets": assets, "notes": notes}
    (art / "ingest_manifest.json").write_text(json.dumps(m, indent=2, ensure_ascii=False))
    print(f"project slug: {slug}")
    print(art / "ingest_manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
