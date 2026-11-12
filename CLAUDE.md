# OpenMontage

**MANDATORY: Read [`AGENT_GUIDE.md`](AGENT_GUIDE.md) before responding to ANY user message.**

Do not act on the user's request until you have read AGENT_GUIDE.md.
It contains routing rules that determine your first action based on what the user asked.
Skipping it WILL cause you to take the wrong action.

All workflow instructions are in AGENT_GUIDE.md. The only rule kept in this file is the GitHub account rule below.

## GitHub account rule (this fork, binding)

This machine has two GitHub accounts logged in with `gh`: **Siddiqui-2583** (the owner of this fork, the one to use) and
**Nurnaby-2583** (do NOT use for this repo). The active account sometimes flips back to Nurnaby-2583.

Before ANY git or GitHub work (push, pull, fetch, commit that will be pushed, PR, fork, repo create/delete, `gh api`):

1. Run `scripts/my_workflow/gh_ensure_account.sh`. If `gh` shows `Nurnaby-2583` active it switches automatically to
   `Siddiqui-2583` (`gh auth switch -u Siddiqui-2583`) and verifies. Do this without asking; no need to mention it unless it failed.
2. `origin` must be `git@github.com:Siddiqui-2583/OpenMontage.git`; `upstream` is the original project (read-only: never push there).
   Work on branch `custom/my-workflow` unless told otherwise.
3. Never push to, create repos under, or delete repos of Nurnaby-2583 or upstream. Never delete any repo without the user's explicit go-ahead.
4. Only commit or push when the user asks. Scan staged changes for keys before pushing (`AIza…`, `ghp_…`, `sk-…`).
