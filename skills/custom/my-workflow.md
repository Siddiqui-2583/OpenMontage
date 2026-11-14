# Skill: my-workflow (inbox -> finished video + thumbnail + caption)

Trigger: user says "process inbox/<name>" (or drops footage in `inbox/<name>/` and asks to edit it).
This wraps the `talking-head` pipeline (`pipeline_defs/talking-head.yaml`); every Rule Zero /
checkpoint / human-gate rule in AGENT_GUIDE.md still applies. It adds ingest, transcript, stock/AI
assets, thumbnail, caption, and a final delivery folder.

**End result the user wants:** the agent's last message gives ONE folder path:
`projects/<name>/DELIVERY/` containing the final video, `thumbnail.png`, `caption.md`, `captions.<locale>.srt` (viewer-toggle captions for
platform upload) and `transcript.txt` (plain text, no timestamps). Always all five: the user uploads the SRT and transcript to Facebook/YouTube.

## 0. Preflight
`python3 -c "from tools.tool_registry import registry; registry.discover(); print(registry.provider_menu())"`
Check: ffmpeg, node/remotion (`remotion-composer/`), `codex` CLI logged in, Chrome tools available.
Announce render runtime = remotion (talking-head requires it) before acting.

## 1. Ingest
`python3 scripts/my_workflow/ingest.py <name>` -> `projects/<name>/artifacts/ingest_manifest.json`
   `ingest.py` also runs a black-bar check (1 frame/s cropdetect): if it prints `BLACK BARS ... suggested ffmpeg filter: crop=...`, add that crop (then scale to 1080x1920) in the build, after checking a still. Result is stored as `black_bars` in `ingest_manifest.json`.
Read `notes.txt` (language, tone, platform). Look at user assets (logos, photos) and plan to use them
FIRST before any stock/AI asset.

## 2. Transcript
Run `scripts/my_workflow/gemini_transcribe.py` (see `skills/custom/youtube-transcript.md`; Gemini is the primary route,
unlisted YouTube upload is the fallback). If the user pasted a transcript, use that. Save into `artifacts/`.

## 3. Idea -> script -> scene plan (gated, one at a time)
Use the talking-head stage directors in `skills/pipelines/talking-head/`. Checkpoint with
`lib/checkpoint.py write_checkpoint(...)`. Gotchas learned:
- decision_log `category` must be one of the schema enums (provider_selection, render_runtime_selection, ...).
- enhancement_cue `type`: overlay | broll | diagram | stat_card | code_snippet | animation.
- asset objects take only: id, type, path, source_tool, scene_id (no source_url).
- Re-log a changed decision with the same (category, subject).
- Gated stages cannot be "completed" without `human_approved=True`, only after the user says approve.
Cut mindfully: remove repeated/false-start lines (find them from timestamps + silence), trim pauses
(>0.35 s -> 0.24 s), loudnorm -16 LUFS / TP -1.5.

## 4. Assets (record source + license for each)
- **Free stock images/video:** prefer CC0/public-domain sources (Wikimedia Commons CC0, Pexels,
  Pixabay, Unsplash). Check the license page; save URL + license in the asset's `generation_summary`.
  Use a User-Agent header with curl. Don't scrape sites whose terms forbid it.
- **Logos:** user-supplied PNG/SVG first; else simple-icons (CC0 paths) via `npm pack simple-icons`.
  Paths go in `remotion-composer/src/components/LogoPop.tsx` ICONS. Trademarks still belong to owners.
- **AI images:** `scripts/my_workflow/codex_image.sh out.png "prompt" [reference.png]`.
  (`-i` swallows the prompt unless `--` is used; the script handles it.) Review every image.
- **Motion graphics (Claude-written Remotion):** `remotion-composer/src/components/MotionGraphic.tsx`
  kinds: keyboard_vs_pen, brain_activation, tools_vs_notebook, idea_flow, magic_sparkle. Add new kinds
  there; keep Bangla text in Hind Siliguri. Overlay types: motion_graphic, image_card, logo_pop,
  hero_title (see `TalkingHead.tsx`).

### 4b. Free public-domain b-roll (`broll_find.py`)
```bash
.venv-matte/bin/python scripts/my_workflow/broll_find.py search "people typing on old computers"
.venv-matte/bin/python scripts/my_workflow/broll_find.py inspect OnGuard1956 --out-dir /tmp/bk    # scenes + keyframe JPGs: LOOK at them
.venv-matte/bin/python scripts/my_workflow/broll_find.py extract OnGuard1956 120 6 --project <name> --label "mainframe room"
```
Internet Archive public-domain film via broll-mcp (MIT, pinned commit). `extract` copies the clip and its provenance JSON into
`projects/<name>/assets/stock/` and appends `stock_credits.json` (title, creator, licence, commercial_use, sha256) for the asset manifest.
Limits: mostly 1930s-70s, 4:3, ~480p; great for retro/period b-roll, wrong for modern UI or people. Check `commercial_use=allowed`
before client work. First extract of a film takes ~2 min (scene detection + download), cached afterwards. archive.org only, polite rate limits.

## 5. Edit + compose
Copy `scripts/my_workflow/build_template.py` to `projects/<name>/scripts/build.py` and adapt. It
writes `remotion-composer/public/demo-props/<name>.json` and media under `public/<name>/`. Render:
`cd remotion-composer && npx remotion render TalkingHead ../projects/<name>/renders/final.mp4 --props=public/demo-props/<name>.json --codec=h264 --crf=18`
(run in background; do not chain `sleep`).
Layout rules (9:16): image_card and motion_graphic "dock": the speaker slides down 380 px so the
graphic sits above the head, uncropped (image card 780x520, `objectFit: contain`). Logo/title banners
stay at top 60..460 and must stay above the eyes (eyes ~ y 580). Captions: Hind Siliguri, 10 px dark
stroke on white backgrounds, bottom offset ~260.
QA: render stills (`npx remotion still ... --frame=N`) at every overlay, look at them, then
ffprobe duration/size and loudness check. Report caption-timing limits honestly.

### 5a. Silence-trim segment list (auto-editor)
```bash
.venv-matte/bin/python scripts/my_workflow/auto_cuts.py projects/<name>/assets/video/source.mp4 \
    -o projects/<name>/assets/cut_segments.json --cut-out 120.313-126.447     # forced cuts for repeats (seconds)
```
Replaces hand-rolled silence math: same `cut_segments.json` format (seconds, source timeline), 7 s for a 2.4 min video.
On pen-and-paper it kept a strict subset of our old trimmer's ranges (97% overlap). Render the cuts with ffmpeg (30 ms fades +
loudnorm) as in `build_template.py`, then run 5b. Frame-accurate cuts (1/fps); repeats/false starts still need `--cut-out`.

### 5b. Cut QA (before presenting)
```bash
.venv-matte/bin/python scripts/my_workflow/cut_qa.py projects/<name>/assets/video/edited.mp4 \
    projects/<name>/assets/cut_segments.json -o projects/<name>/renders/qa_cuts --max 12
```
Scores every cut for audio pops (flag = jump > 0.15 FS AND > 8x typical; the ratio alone is noisy at word endings) and writes
filmstrip+waveform PNGs (`timeline_view.py`, from browser-use/video-use, MIT). Look at the PNGs of flagged cuts and a few others.
Segments are faded 30 ms at every boundary in `build_template.py` (a pop-free default).

### 9c. Animated caption styles (`captionStyle`)
Props: `"captionStyle": "pop-sticker"` (also `editorial-highlight`, `rolodex-flip`, `retro-typer`, `paper-plane`, `explosive-breakup`, `smoke-exit`),
optional `captionY` (% from top, default 78), `captionScale`, `wordsPerPage` (= max words per line, default 3), `highlightColor`.
It replaces the default `CaptionOverlay`. Engine: vendored `src/vendor/captions.js` (claude-caption-styles, MIT; patched for Bangla fonts and a
last-word crash). One key word per line (the longest) gets the highlight colour. Tested with Bangla: pop-sticker, editorial-highlight, rolodex-flip,
retro-typer look good; **smoke-exit draws dotted rings around Bangla letters, avoid**. White text on a white kurta is weak for rolodex/retro/smoke:
prefer pop-sticker or editorial-highlight (colour blocks) on light outfits. Not yet combined with `screen_split` seam positioning.
`pop-sticker` decorations (stars, flowers, hearts) are OFF by default (user dislikes them); `setOption('stickers', true)` in `vendor/captions.js` restores them.
**`dim` overlay: avoid unless the user asks.** It drops the speaker to ~35% brightness and reads as a sudden dark screen; the user rejected it on dead-internet-theory.

## 6. Thumbnail (Codex)
Grab a clean frame of the speaker (`ffmpeg -ss <t> -i edited.mp4 -frames:v 1 speaker.png`), then
`codex_image.sh thumbnail.png "<prompt>" speaker.png`. Prompt: keep face/beard/cap/clothes EXACTLY,
speaker in lower ~60%, topic illustration up top, exact headline text in the video's language,
small bottom badge, high contrast, no extra text. **Read the image and verify the headline glyphs**
(Bangla is usually correct, but check); if garbled, regenerate art without text and overlay the text
in Remotion/ffmpeg with Hind Siliguri.

Pairing rules (from yt-package, MIT; Jakeschincariol/youtube-agent-skill): decide the title and the thumbnail text TOGETHER. Thumbnail
<= 3 words and must NOT repeat the title's words; title <= 60 chars (40 on mobile), product/person names or a number up front, no vague
words. Thumbnail brief = expression, framing, the <=3 words, and what the background does for contrast at feed size. Pick the speaker
reference frame at a pause (mouth closed, eyes open): open-mouth speech frames look awkward in stills. Re-creation of the face is OK
(user-approved), keep cap/beard/clothes. Check: `python3 scripts/my_workflow/copy_lint.py title --title "..." --thumb "..."`.

## 7. Caption (write it yourself, not with Codex)
`caption.md`: Shorts title (<60 chars), 1-line hook, short body, ONE CTA, <=5 hashtags.
Structure (from ig-caption, MIT; Jakeschincariol/instagram-agent-skill): line 1 = the hook if the video's own hook is weak (name/number in the
first 125 chars, no greeting, no hashtag first), else the ask + context; short body paragraphs with the search phrases people would type;
ONE ask; <= 5 hashtags on the last line (their claim: Instagram capped tags at 5 on 2025-12-18, verify); no generic tags (#viral #fyp).
Only claims the speaker made. ALWAYS lint before delivering: `python3 scripts/my_workflow/copy_lint.py caption caption.txt --keywords "a,b"`
(Bangla-aware port; the original tools could not see Bangla words/hashtags). Keep a plain `caption.txt` for the linter; `caption.md` adds title + thumbnail text.

Only claims the speaker actually made. Language = the video's language.

## 8. Deliver
`python3 scripts/my_workflow/deliver.py <name> --video <final.mp4> --thumbnail <png> --caption <md> [--locale bn_IN]`
It generates `captions.<locale>.srt` + `transcript.txt` from `projects/<name>/assets/captions_words.json` (final-timeline word timings, via `make_srt.py`).
Upload advice: upload the SRT, turn OFF the platform's auto-captions (ours are burned in), skip audio description (talking head).
Final message: the printed folder path, file specs, and honest caveats. Publishing/upload to social
platforms is a separate gated step: offer, don't do.
`deliver.py` also runs `delivery_check.py` (warn-only QA: format, LUFS/true peak, black/frozen/silence, dropouts, single-frame flashes, flat first frame; idea from kajisho5/ffmpeg-skill, MIT). Fix real WARNs before handing over; `yuvj420p` (OBS full-range tag) is known and accepted by Facebook; gaps <=50 ms are our cut fades.

## 9. Demo template (software demo / product explainer reels)
Pattern reverse-engineered with rea-video from two reference reels (talker + real screen on top,
glass cards, dim-to-focus, one-word seam captions, "comment X for the link" ending). All of it is
overlay-driven in `remotion-composer/src/TalkingHead.tsx`; put these in the props JSON `overlays`
(seconds on the FINAL timeline, `position: "full_overlay"`):

| type | effect | fields |
|---|---|---|
| `screen_split` | Screen on top (y 36..996), speaker clipped into the bottom region, captions move to the seam | `image` (png/jpg/mp4/mov in `public/`), `text` (chip e.g. `localhost:3010`), `fit` cover/contain, `focus {x,y,scale}` = slow zoom to a region |
| `glass_card` | Frosted card above the head; speaker docks down | `title`, `text`, or `items[]` (checklist ticks in), `accentColor` |
| `dim` | Speaker darkens to ~35% so the caption word reads | none |
| `image_card`, `motion_graphic` | as in section 5 | |

Recommended props: `wordsPerPage: 1`, `fontSize: 84`, `captionBackgroundColor: "rgba(8,8,12,0.78)"`,
`captionStrokeWidth: 0` (pill style). Screen recordings: record 1020x960-ish crops or any 16:9 clip and
use `fit: "cover"` plus a `focus` zoom on the UI area being discussed; keep each split 5-8 s, cut to a
different screen every ~3-5 s, add a `dim` beat before each "reveal" word, end with a `glass_card`
CTA ("Want the link? Comment ..."). Layout constants: `SPLIT_TOP = 1020` in `components/ScreenPanel.tsx`.
Reference breakdowns live outside the repo (rea-video output); copy structure, never wording or likeness.

### 9b. Words behind the speaker (`behind_word`)
Needs a person cut-out of the speaker video (the same file as `videoSrc`):
```bash
bash scripts/my_workflow/setup_matte.sh          # once: .venv-matte (Python 3.10-3.12, MediaPipe)
.venv-matte/bin/python scripts/my_workflow/person_matte.py projects/<name>/assets/video/edited.mp4 \
    remotion-composer/public/<name>/cutout.webm --ranges 12-16,40-44     # only the windows you need
```
Then in props: `"cutoutSrc": "<name>/cutout.webm"` and overlays like
`{"type":"behind_word","in_seconds":12.5,"out_seconds":15.5,"text":"খাতা-কলম","color":"#16264a","y":120}`.
The word drops in behind the head and the cut-out is drawn over it. Use a DARK colour on a light wall.
Bangla works (Hind Siliguri); font auto-fits ~92% of the width. Speed: about real time (12 s clip = 12 s).
Always check stills with fast hand/head movement: mask edges can flicker. Credit: `scripts/my_workflow/models/NOTICE.md`.

## 10. After publishing: archive + cleanup (only when the user says the video is published)
```bash
python3 scripts/my_workflow/cleanup_project.py <slug> [--inbox "Inbox Folder Name"]          # dry run: lists what happens
python3 scripts/my_workflow/cleanup_project.py <slug> [--inbox "Inbox Folder Name"] --yes    # does it
```
Moves `projects/<slug>/DELIVERY/` to **`published-videos/<slug>/`** (repo root, git-ignored; a rename, so big files are not copied), then deletes the rest
of the project: `projects/<slug>/`, its Remotion staging (`remotion-composer/public/<slug>/`, `public/demo-props/<slug>*.json`) and, with `--inbox`,
the copied raw footage in `inbox/`. Refuses unless DELIVERY holds a video, or if `published-videos/<slug>/` already has files.
Never run it on an unpublished project, and never without the user's go-ahead. `~/Movies` copies and the original OBS files are not touched.
Older projects without a DELIVERY folder: hard-link the final video, thumbnail and caption into DELIVERY first (`ln`), then run it.

## 11. Publish to the user's PERSONAL Facebook profile (route B: browser automation, per-post approval)
Personal profiles cannot be posted to via Graph API, so drive the user's own logged-in Chrome with the `mcp__claude-in-chrome__*` tools
(load them with ToolSearch first). Never ask for or type the Facebook password, 2FA codes or tokens; if logged out, ask the user to log in.
1. Pre-flight: `DELIVERY/` has the 5 files; run `copy_lint.py` on `caption.md`.
2. **Show the user the exact post** (video path, caption text, audience, time) and wait for an explicit "approve" for THAT post. Approval never carries over to the next video.
3. Open facebook.com in Chrome, Reel/video composer, upload the video (`file_upload`), paste caption, set audience as told (default: ask), thumbnail = `thumbnail.png`,
   captions panel = upload `captions.<locale>.srt` and turn auto-captions OFF. Screenshot before clicking Post; stop and ask if the UI differs from expectations.
4. After posting: report the post URL, then ask whether to archive (section 10). Do not retry blindly on a failed upload (risk of duplicate posts).
5. Go slow, no bulk posting, no repeated rapid retries (Meta may flag automation). The UI changes often: expect to re-read the page, not replay a fixed script.

Planned, not built (route A): Facebook **Page** + Graph API Page token in `~/.config/my_workflow/.env` (FB_PAGE_ID, FB_PAGE_TOKEN, FB_APP_ID, FB_APP_SECRET, chmod 600,
user creates the file) with `scripts/my_workflow/fb_publish.py` (dry-run token check first, then Reel upload + schedule). Only relevant if the user moves to a Page.
