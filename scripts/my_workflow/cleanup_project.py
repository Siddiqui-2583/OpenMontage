#!/usr/bin/env python3
"""After a video is PUBLISHED: archive its DELIVERY folder to published-videos/<slug>/ and delete the rest of the project.

  python3 scripts/my_workflow/cleanup_project.py <slug> [--inbox "Inbox Folder Name"] [--yes]

Dry run by default (lists what would go, with sizes). Deletes only with --yes.
Moves projects/<slug>/DELIVERY -> published-videos/<slug>/ (a rename: no copying, big files stay put), then removes
projects/<slug>/ entirely, remotion-composer/public/<slug>/,
remotion-composer/public/demo-props/<slug>*.json, and (only if --inbox is given) inbox/<name>/ (the copied raw footage).
Refuses if DELIVERY is missing or holds no video file, or if published-videos/<slug>/ already has files. Never touches ~/Movies or your original OBS recordings.
"""
import argparse, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VIDEO = {".mp4", ".mov", ".mkv", ".webm"}


def size(p: Path) -> int:
    if p.is_symlink() or p.is_file():
        return p.stat().st_size if p.exists() else 0
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file())


def human(n: float) -> str:
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024 or u == "GB":
            return f"{n:.1f} {u}"
        n /= 1024


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug"); ap.add_argument("--inbox"); ap.add_argument("--yes", action="store_true")
    a = ap.parse_args()
    proj = ROOT / "projects" / a.slug
    if not proj.is_dir():
        sys.exit(f"no such project: {proj}")
    dl = proj / "DELIVERY"
    vids = [f for f in dl.glob("*") if f.suffix.lower() in VIDEO] if dl.is_dir() else []
    if not vids:
        sys.exit(f"REFUSING: {dl} missing or has no video. Build DELIVERY first (scripts/my_workflow/deliver.py).")
    arch = ROOT / "published-videos" / a.slug
    if arch.exists() and any(arch.iterdir()):
        sys.exit(f"REFUSING: {arch} already has files (would overwrite). Move or rename it first.")
    targets = [p for p in sorted(proj.iterdir()) if p.name != "DELIVERY"]
    pub = ROOT / "remotion-composer" / "public"
    targets += [p for p in [pub / a.slug, *sorted((pub / "demo-props").glob(f"{a.slug}*.json"))] if p.exists()]
    if a.inbox:
        ib = ROOT / "inbox" / a.inbox
        if ib.exists(): targets.append(ib)
    print(f"MOVE   {dl.relative_to(ROOT)}  ->  {arch.relative_to(ROOT)}  ({', '.join(f.name for f in sorted(dl.iterdir()))})")
    total = 0
    for t in targets:
        s = size(t); total += s
        print(f"DELETE {t.relative_to(ROOT)}  {human(s)}")
    print(f"-- {len(targets)} items deleted, {human(total)} (the project folder itself is removed after the move)")
    if not a.yes:
        print("dry run: nothing deleted. Re-run with --yes."); return
    arch.parent.mkdir(parents=True, exist_ok=True)
    if arch.exists(): arch.rmdir()
    dl.rename(arch)                                   # same filesystem: instant, keeps hard links
    for t in targets:
        shutil.rmtree(t) if t.is_dir() and not t.is_symlink() else t.unlink()
    proj.rmdir()                                      # now empty
    print(f"done. Archived in {arch}")


if __name__ == "__main__":
    main()
