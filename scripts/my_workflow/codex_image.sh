#!/usr/bin/env bash
# Generate an image with Codex CLI (image_generation feature, uses your ChatGPT login).
# Usage: codex_image.sh <out.png> "<prompt>" [reference.png]
#
# GOTCHA: `-i` is greedy and swallows the following positional prompt as another
# image path, so Codex hangs waiting on stdin. Always pass `--` before the prompt
# and redirect stdin from /dev/null.
set -euo pipefail
out="$1"; prompt="$2"; ref="${3:-}"
workdir="$(mktemp -d)"
args=(exec --skip-git-repo-check -s workspace-write -C "$workdir")
[ -n "$ref" ] && args+=(-i "$ref")
marker="$workdir/.marker"; touch "$marker"
codex "${args[@]}" -- "$prompt" </dev/null >"$workdir/codex.log" 2>&1 || true
# Codex saves to ~/.codex/generated_images/<session>/exec-*.png
img="$(find "$HOME/.codex/generated_images" -type f -name '*.png' -newer "$marker" 2>/dev/null | sort | tail -1)"
[ -n "$img" ] || { echo "no image produced; see $workdir/codex.log" >&2; exit 1; }
cp "$img" "$out"; echo "$out"
