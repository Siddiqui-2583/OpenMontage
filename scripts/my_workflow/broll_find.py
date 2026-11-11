#!/usr/bin/env python3
"""Free public-domain b-roll from the Internet Archive, with a licence record per clip (wraps broll-mcp, MIT,
https://github.com/edigeh/broll-mcp, pinned in requirements-matte.txt). Run with .venv-matte/bin/python.

  broll_find.py search  "people typing on old computers" [--cursor C]
  broll_find.py inspect ID [--file NAME] [--out-dir DIR]       # scenes + keyframe JPGs you can LOOK at before cutting
  broll_find.py extract ID START DURATION --project NAME [--file NAME] [--label TXT] [--audio]

extract copies the clip + its provenance JSON into projects/<NAME>/assets/stock/ and appends the licence to
projects/<NAME>/artifacts/stock_credits.json (use it for the asset manifest / credits).
Scope: archive.org public-domain film (Prelinger etc.): mostly 1930s-70s, 4:3, ~480p. Good for retro/period b-roll,
not for modern UI or people. Only items whose licence says commercial_use=allowed are safe for client work: CHECK the flag.
Network: archive.org only (polite rate limits). First inspect of a long film can take ~90 s (scene detection); cached after.
"""
import argparse, asyncio, json, shutil, sys
from pathlib import Path

from broll_mcp.config import Settings
from broll_mcp.errors import ToolError
from broll_mcp.server import build_app, run_search

ROOT = Path(__file__).resolve().parents[2]
HOME = Path.home() / ".cache" / "my_workflow" / "broll"


async def with_app(fn):
    app = build_app(Settings(home=HOME, agent_model="claude", cache_max_mb=500))
    await app.media.probe_tools()
    try:
        return await fn(app)
    finally:
        await app.client.aclose()


def lic_line(lic):
    return f"{lic.get('label') or lic.get('license_label')} | commercial_use={lic.get('commercial_use')}"


async def cmd_search(app, a):
    data, _ = await run_search(app, {"brief": a.brief, **({"cursor": a.cursor} if a.cursor else {})})
    for i, r in enumerate(data["results"], 1):
        print(f"{i}. {r['identifier']}  {r['title']} ({r['year'] or 'n.d.'})  tier {r['tier']}  {lic_line(r['license'])}")
    print(f"-- {data['results_total']} ranked, {data['total_upstream']} upstream" + (f"; next: --cursor {data['next_cursor']}" if data.get("next_cursor") else ""))


async def cmd_inspect(app, a):
    res = await app.scenes.inspect(a.identifier, a.file, None, 8, None)
    d = res.data
    print(f"{d['identifier']} · {d.get('file')} ({d.get('file_length_s')} s, {d.get('resolution')})  {lic_line(d['license'])}")
    if d.get("shotlist_excerpt"):
        print("Shotlist:", d["shotlist_excerpt"][:400])
    if d["mode"] == "clip_list":
        print(f"{d['clips_total']} separate clips; re-run with --file NAME:", [c.get("file") or c for c in d["clips"][:6]])
    for s in d.get("scenes", []):
        print(f"  scene {s['scene']}: {s['start_s']:.1f}-{s['end_s']:.1f}s")
    if a.out_dir:
        out = Path(a.out_dir); out.mkdir(parents=True, exist_ok=True)
        for cap, path in res.images:
            dst = out / Path(path).name
            shutil.copy2(path, dst); print("  keyframe:", dst, "|", cap)
    if d.get("next_cursor"):
        print("More scenes: cursor", d["next_cursor"])


async def cmd_extract(app, a):
    from broll_mcp.server import run_extract, run_inspect
    fname = a.file
    if not fname:
        d, _ = await run_inspect(app, {"identifier": a.identifier})
        fname = d["file"]
    args = {"identifier": a.identifier, "file": fname, "start_s": float(a.start), "duration_s": float(a.duration), "audio": bool(a.audio)}
    if a.label:
        args["label"] = a.label
    data, _ = await run_extract(app, args)
    prov = data["provenance"]
    stock = ROOT / "projects" / a.project / "assets" / "stock"; stock.mkdir(parents=True, exist_ok=True)
    clip = Path(prov["clip_path"]); pj = clip.with_suffix(".provenance.json")
    shutil.copy2(clip, stock / clip.name)
    if pj.exists():
        shutil.copy2(pj, stock / pj.name)
    ledger = ROOT / "projects" / a.project / "artifacts" / "stock_credits.json"; ledger.parent.mkdir(parents=True, exist_ok=True)
    rows = json.loads(ledger.read_text()) if ledger.exists() else []
    lic = prov["license"]; src = prov["source"]
    rows.append({"file": f"assets/stock/{clip.name}", "title": src["title"], "creator": src.get("creator"), "date": src.get("date"),
                 "item_url": src["item_url"], "license": lic.get("license_label"), "commercial_use": lic.get("commercial_use"),
                 "attribution_required": lic.get("attribution_required"), "sha256": prov["clip_sha256"]})
    ledger.write_text(json.dumps(rows, indent=1, ensure_ascii=False))
    print(f"{stock / clip.name}\n  {src['title']} ({src.get('date')}) | {lic.get('license_label')} | commercial_use={lic.get('commercial_use')}\n  credits ledger: {ledger}")


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("brief"); s.add_argument("--cursor")
    i = sub.add_parser("inspect"); i.add_argument("identifier"); i.add_argument("--file"); i.add_argument("--out-dir")
    e = sub.add_parser("extract"); e.add_argument("identifier"); e.add_argument("start"); e.add_argument("duration")
    e.add_argument("--project", required=True); e.add_argument("--file"); e.add_argument("--label"); e.add_argument("--audio", action="store_true")
    a = ap.parse_args()
    fn = {"search": cmd_search, "inspect": cmd_inspect, "extract": cmd_extract}[a.cmd]
    try:
        asyncio.run(with_app(lambda app: fn(app, a)))
    except ToolError as err:
        sys.exit(f"broll error: {err}")


if __name__ == "__main__":
    main()
