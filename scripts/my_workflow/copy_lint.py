#!/usr/bin/env python3
"""Lint a video's title + thumbnail text + social caption (Bangla-aware).

  python3 scripts/my_workflow/copy_lint.py title   --title "..." [--thumb "..."]
  python3 scripts/my_workflow/copy_lint.py caption caption.md [--keywords "a,b"] [--truncate 125]

Rules and structure adapted from two MIT projects, with Unicode (Bangla) fixes of our own:
  - yt-package/title.py    (Jakeschincariol/youtube-agent-skill)  title+thumbnail pairing, 60/40 char cuts, <=3 thumb words
  - ig-caption/caption.py  (Jakeschincariol/instagram-agent-skill) 125-char visible window, one ask, <=5 hashtags, no filler tags
Their versions only tokenize ASCII, so Bangla titles/hashtags were invisible to them; here words and hashtags use \\w plus the Indic blocks (Python's \\w skips Bengali vowel signs).
Their platform claims (e.g. Instagram's 5-hashtag cap since Dec 2025) are THEIR claims: verify before relying on them.
Exit code 0 = no failures.
"""
import argparse, json, re, sys, textwrap

DESKTOP, MOBILE, HARD = 60, 40, 100
VAGUE = {"amazing", "incredible", "insane", "crazy", "huge", "massive", "ultimate", "best", "powerful", "secret", "revolutionary", "epic", "perfect", "complete", "everything"}
STOP = {"the", "a", "an", "of", "for", "to", "in", "on", "and", "or", "is", "are", "with", "your", "you", "my", "i", "this", "that", "it", "how", "what", "why",
        "আর", "ও", "এবং", "কি", "কী", "এই", "যে", "দিয়ে", "জন্য", "না", "তো", "থেকে"}
# Python's \w does NOT match Bengali vowel signs/conjunct marks (they are combining marks), so name the Indic blocks explicitly.
WORDCH = r"\w\u0300-\u036f\u0900-\u0DFF'’"
W = lambda t: re.findall(rf"[{WORDCH}]+", t.lower())


def title_check(title, thumb=None):
    t = title.strip(); n = len(t); bad, ok = [], []
    if n > HARD: bad.append(("FAIL", "length", f"{n} chars, over the {HARD} hard limit"))
    elif n > DESKTOP: bad.append(("WARN", "length", f"{n} chars, desktop search cuts near {DESKTOP}"))
    else: ok.append(f"{n} chars, inside the {DESKTOP}-char desktop cut")
    if n > MOBILE: bad.append(("WARN", "mobile", f'mobile feed shows about "{t[:MOBILE].rsplit(" ", 1)[0]}…": check the subject survives'))
    caps = [w for w in t.split() if len(w) > 2 and w.isupper() and w.isascii()]
    if len(caps) > 2: bad.append(("WARN", "shouting", f"{len(caps)} all-caps words"))
    v = [w for w in W(t) if w in VAGUE]
    if v: bad.append(("WARN", "vague", f"{', '.join(sorted(set(v)))}: swap for a number, a name or a date"))
    names = re.findall(r"\b[A-Z][A-Za-z0-9]{2,}\b|\d[\d,.]*%?", t)
    (ok.append(f"concrete name/number: {', '.join(names[:3])}") if names else bad.append(("WARN", "no-name", "no number, date or product name")))
    if t.endswith("?") or t.endswith("？"): ok.append("open question")
    if not [w for w in W(t)[:3] if w not in STOP]: bad.append(("WARN", "front-load", "first three words are all filler"))
    if thumb:
        shared = (set(W(t)) - STOP) & (set(W(thumb)) - STOP)
        (bad.append(("FAIL", "duplicate", f"thumbnail repeats the title on: {', '.join(sorted(shared))}")) if shared else ok.append("thumbnail and title carry different words"))
        tw = len(W(thumb))
        (bad.append(("WARN", "thumb-length", f"{tw} words on the thumbnail, three is the ceiling at feed size")) if tw > 3 else ok.append(f"thumbnail text is {tw} word(s)"))
    return {"title": t, "chars": n, "issues": bad, "ok": ok}


# ---- caption
LIMIT, TRUNC, TAGCAP = 2200, 125, 5
HASH = re.compile(rf"(?:^|\s)(#[{WORDCH}]+)")
LINK = re.compile(r"https?://\S+|\bwww\.\S+", re.I)
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿←-⇿️]")
CONCRETE = re.compile(r"\d|\b[A-Z][A-Za-z]{2,}\b")
FILLER = {"#viral", "#fyp", "#explore", "#explorepage", "#foryou", "#trending", "#instagood", "#love", "#follow", "#like4like", "#reels", "#reelsinstagram", "#shorts", "#viralreels"}
ASKS = [(re.compile(r"(?i)\bcomment\b|কমেন্ট"), "comment"), (re.compile(r"(?i)\bsave\b|সেভ"), "save"), (re.compile(r"(?i)\bshare\b|শেয়ার"), "share"),
        (re.compile(r"(?i)\bfollow\b|ফলো"), "follow"), (re.compile(r"(?i)\bdm\b|ইনবক্স"), "dm"), (re.compile(r"(?i)link in bio|বায়োতে"), "link in bio")]


def caption_check(text, cut=TRUNC, keywords=None):
    s = text.strip(); n = len(s); lines = s.split("\n"); first = lines[0].strip() if lines else ""
    tags = HASH.findall(s); win = s[:cut]; asks = [name for rx, name in ASKS if rx.search(s)]; filler = [t for t in tags if t.lower() in FILLER]
    c = []
    add = lambda st, name, d: c.append((st, name, d))
    add("FAIL" if n > LIMIT else "PASS", "LENGTH", f"{n}/{LIMIT} chars")
    if not first: add("FAIL", "FIRST LINE", "opens on a blank line")
    elif first[0] in "#@": add("FAIL", "FIRST LINE", "opens on a hashtag/mention")
    elif len(first) > cut: add("WARN", "FIRST LINE", f"{len(first)} chars, cut at {cut}: fine only if the cut is a cliffhanger")
    else: add("PASS", "FIRST LINE", f"{len(first)} chars, lands whole")
    add("PASS" if CONCRETE.search(win) else "WARN", "CONCRETE HOOK", "name/number in the visible window" if CONCRETE.search(win) else "nothing checkable before the tap")
    if len(tags) > TAGCAP: add("FAIL", "HASHTAGS", f"{len(tags)} tags, over the cap of {TAGCAP}")
    elif filler: add("WARN", "HASHTAGS", f"generic tags: {', '.join(filler)}")
    else: add("PASS", "HASHTAGS", f"{len(tags)} tag(s)")
    add("WARN" if any(re.search(re.escape(t), win) for t in tags) else "PASS", "TAG PLACEMENT", "tags below the fold" if not any(re.search(re.escape(t), win) for t in tags) else "a hashtag sits in the visible window")
    add("WARN" if LINK.search(s) else "PASS", "LINKS", "links in captions are not clickable" if LINK.search(s) else "no dead links")
    add("PASS" if len(asks) == 1 else "WARN", "ONE ASK", f"{len(asks)} ask(s): {', '.join(asks) or 'none'}")
    d = len(EMOJI.findall(s)) * 100 / max(n, 1)
    add("WARN" if d > 4 else "PASS", "EMOJI", f"{d:.1f} per 100 chars")
    kw = [k.strip() for k in (keywords or "").split(",") if k.strip()]
    if kw:
        miss = [k for k in kw if k.lower() not in s.lower()]
        add("PASS" if not miss else "WARN", "SEARCH TERMS", f"{len(kw) - len(miss)}/{len(kw)} present" + (f"; missing: {', '.join(miss)}" if miss else ""))
    fails = sum(x[0] == "FAIL" for x in c); warns = sum(x[0] == "WARN" for x in c)
    return {"chars": n, "visible": win, "checks": c, "verdict": "FIX" if fails else "REVIEW" if warns else "READY"}


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("title"); t.add_argument("--title", required=True); t.add_argument("--thumb")
    c = sub.add_parser("caption"); c.add_argument("file"); c.add_argument("--keywords", default=""); c.add_argument("--truncate", type=int, default=TRUNC)
    a = ap.parse_args()
    if a.cmd == "title":
        r = title_check(a.title, a.thumb); print(f'\n  "{r["title"]}"  ({r["chars"]} chars)')
        for st, k, m in r["issues"]: print(f"    {st:<4} {k:<13} {m}")
        for m in r["ok"]: print(f"    ok               {m}")
        sys.exit(1 if any(i[0] == "FAIL" for i in r["issues"]) else 0)
    raw = sys.stdin.read() if a.file == "-" else open(a.file, encoding="utf-8").read()
    r = caption_check(raw, a.truncate, a.keywords)
    print(f"\nCAPTION LINT  {r['chars']} chars\n  WHAT THE FEED SHOWS (first {a.truncate}):")
    for ln in textwrap.wrap(r["visible"].replace("\n", " ⏎ "), 60): print("   | " + ln)
    print()
    for st, k, m in r["checks"]: print(f"  {st:<5} {k:<14} {m}")
    print(f"\n  VERDICT  {r['verdict']}\n"); sys.exit(1 if r["verdict"] == "FIX" else 0)


if __name__ == "__main__":
    main()
