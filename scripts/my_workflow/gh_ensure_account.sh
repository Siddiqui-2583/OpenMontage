#!/usr/bin/env bash
# Make sure the ACTIVE gh account is Siddiqui-2583 before any git/GitHub work (the machine also has Nurnaby-2583 logged in).
# Switches automatically when the wrong account is active, then verifies. Also checks origin points at Siddiqui-2583/OpenMontage.
set -uo pipefail
WANT="Siddiqui-2583"
active="$(gh api user --jq .login 2>/dev/null || true)"
if [ -z "$active" ]; then   # offline fallback: parse `gh auth status`
  active="$(gh auth status 2>&1 | awk '/Logged in to/{acct=$7} /Active account: true/{print acct; exit}')"
fi
if [ "$active" != "$WANT" ]; then
  echo "gh active account is '${active:-unknown}', switching to $WANT"
  gh auth switch -u "$WANT" >/dev/null 2>&1 || { echo "ERROR: could not switch to $WANT (not logged in? run: gh auth login)"; exit 1; }
  active="$(gh api user --jq .login 2>/dev/null || echo "$WANT")"
fi
[ "$active" = "$WANT" ] || { echo "ERROR: active account is still '$active'"; exit 1; }
origin="$(git remote get-url origin 2>/dev/null || true)"
case "$origin" in
  *Siddiqui-2583/OpenMontage*) echo "OK: gh=$active, origin=$origin" ;;
  "") echo "OK: gh=$active (no git origin here)" ;;
  *) echo "WARNING: gh=$active but origin is '$origin' (expected git@github.com:Siddiqui-2583/OpenMontage.git). Do not push until fixed."; exit 2 ;;
esac
