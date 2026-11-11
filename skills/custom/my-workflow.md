# Skill: my-workflow (inbox -> finished video + thumbnail + caption)

Trigger: user says "process inbox/<name>" (or drops footage in `inbox/<name>/` and asks to edit it).
This wraps the `talking-head` pipeline (`pipeline_defs/talking-head.yaml`); every Rule Zero /
checkpoint / human-gate rule in AGENT_GUIDE.md still applies. It adds ingest, transcript, stock/AI
assets, thumbnail, caption, and a final delivery folder.

**End result the user wants:** the agent's last message gives ONE folder path:
`projects/<name>/DELIVERY/` containing the final video, `thumbnail.png`, `caption.md`, `transcript.txt`.

## 0. Preflight
`python3 -c "from tools.tool_registry import registry; registry.discover(); print(registry.provider_menu())"`
Check: ffmpeg, node/remotion (`remotion-composer/`), `codex` CLI logged in, Chrome tools available.
Announce render runtime = remotion (talking-head requires it) before acting.

## 1. Ingest
`python3 scripts/my_workflow/ingest.py <name>` -> `projects/<name>/artifacts/ingest_manifest.json`
Read `notes.txt` (language, tone, platform). Look at user assets (logos, photos) and plan to use them
FIRST before any stock/AI asset.

## 2. Transcript
Follow `skills/custom/youtube-transcript.md` (unlisted upload -> transcript site). If the user pasted a
transcript, use that. Save into `artifacts/`.

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

## 6. Thumbnail (Codex)
Grab a clean frame of the speaker (`ffmpeg -ss <t> -i edited.mp4 -frames:v 1 speaker.png`), then
`codex_image.sh thumbnail.png "<prompt>" speaker.png`. Prompt: keep face/beard/cap/clothes EXACTLY,
speaker in lower ~60%, topic illustration up top, exact headline text in the video's language,
small bottom badge, high contrast, no extra text. **Read the image and verify the headline glyphs**
(Bangla is usually correct, but check); if garbled, regenerate art without text and overlay the text
in Remotion/ffmpeg with Hind Siliguri.

## 7. Caption (write it yourself, not with Codex)
`caption.md`: Shorts title (<70 chars), 1-line hook, 3-4 short body lines, CTA, ~10 hashtags.
Only claims the speaker actually made. Language = the video's language.

## 8. Deliver
`python3 scripts/my_workflow/deliver.py <name> --video <final.mp4> --thumbnail <png> --caption <md> --transcript <txt>`
Final message: the printed folder path, file specs, and honest caveats. Publishing/upload to social
platforms is a separate gated step: offer, don't do.
