# Skill: youtube-transcript (timestamped transcript via unlisted YouTube upload)

Use when: the local ASR is unreliable for the language (Bangla gibberish from faster-whisper
small/medium) and the user wants a timestamped transcript. Owner's channel account:
**nurnabysiddiqui2583@gmail.com**.

Inputs: a raw video (or proxy), project name. Output: `projects/<name>/artifacts/transcript_yt.json`
(`[[seconds, "text"], ...]`) and `transcript_yt.txt`, plus the unlisted video URL in the project notes.

## Tools
Browser automation through the user's already-logged-in Chrome: `mcp__claude-in-chrome__*`
(load via ToolSearch first: tabs_context_mcp, navigate, computer, find, read_page,
get_page_text, file_upload, form_input).

## Hard rules
1. **Never type, request, or store a Google password / 2FA code.** If Chrome is not signed in as
   nurnabysiddiqui2583@gmail.com, stop and ask the user to sign in, then continue.
2. Verify the account before uploading: open https://studio.youtube.com and read the account/avatar
   menu. If it is a different account, stop and ask.
3. Visibility is always **Unlisted**. Never Public. Never "made for kids" = Yes (select "No, it's not
   made for kids"). Do not enable monetization, comments changes or anything else.
4. Uploading publishes the footage to a third party (YouTube). On the FIRST upload of a project, state
   what will be uploaded (file, duration) and get the user's go-ahead unless they already said
   "go" for this project in this session.
5. Do not delete the uploaded video unless the user asks. Offer to delete it at the end.

## Steps
1. **Make a proxy** (faster upload, same speech): 
   `ffmpeg -i raw.mp4 -vf scale=-2:480 -c:v libx264 -crf 30 -preset veryfast -c:a aac -b:a 96k proxy.mp4`
   Transcript timestamps come from audio, so a 480p proxy is fine. Multiple raw clips: upload each, or
   concatenate first and remember the concat offsets.
2. **Upload** at https://studio.youtube.com -> Create -> Upload videos -> file_upload the proxy.
   Title: `tmp-<project>-transcript`. Audience: not for kids. Next ... Next ... Visibility: **Unlisted**
   -> Save/Publish. Copy the video URL (`https://youtu.be/<id>`).
3. **Wait for processing.** YouTube auto-captions can take a few minutes after upload. Poll the Studio
   video page (Subtitles tab) instead of sleeping blindly; use Monitor/run_in_background, not chained sleeps.
4. **Get the transcript with timestamps**, first choice:
   https://www.youtube-transcript.io/  -> paste the URL -> generate -> copy the timestamped text
   (`get_page_text`). Fallback: https://youtubetotranscript.com/ (same). If both fail or block
   automation, use YouTube's own transcript panel ("...more" -> Show transcript) on the watch page.
   Pick the correct language track (e.g. Bangla/bn) if several appear.
5. **Normalize** to `[[seconds, text]]` and save both files in `artifacts/`. Print 5 sample lines.
6. **Sanity-check** against the audio before trusting it:
   - Auto-captions can mis-spell product names and mix languages: show the user the corrected spelling
     list (tool/brand names) instead of silently "fixing".
   - Timestamps from these sites are line-level and can **lag the audio by up to ~2 s**, especially after
     long pauses (seen on the pen-and-paper project). Do NOT use them as word timing. Snap each line
     start to the nearest speech onset from `ffmpeg silencedetect` (-32dB, 0.12 s) and distribute words
     inside the speech-active time. See `scripts/my_workflow/build_template.py`.
7. Report: video URL, language track used, number of lines, and anything that looked wrong.

## Fallback when the browser route is unavailable
Local `faster-whisper large-v3` on short windows gives rough Bangla timing (about +-0.4 s) but full runs
are slow on CPU (~10 min per 2.5 min of audio). Ask the user for a pasted transcript rather than ship gibberish.
