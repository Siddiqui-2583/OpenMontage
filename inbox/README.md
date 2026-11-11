# inbox/

Drop work here. One sub-folder per video project:

```
inbox/<project-name>/
  raw1.mp4  raw2.mp4 ...     raw footage (mp4/mov/mkv/webm)
  assets/                    optional: your logos (png/svg), photos, music, notes
  notes.txt                  optional: language, tone, platform, anything the agent should know
```

Then tell the agent: **"process inbox/<project-name>"**.
The agent follows `skills/custom/my-workflow.md` and finishes by printing the
output folder path (`projects/<project-name>/DELIVERY/`).

Contents of inbox/ are git-ignored (only this README is tracked).
