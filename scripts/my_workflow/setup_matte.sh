#!/usr/bin/env bash
# One-time: isolated venv for person_matte.py (MediaPipe needs Python 3.10-3.12; 3.14 has no wheels).
set -euo pipefail
cd "$(dirname "$0")/../.."
PY=""
for v in python3.12 python3.11 python3.10; do command -v "$v" >/dev/null 2>&1 && { PY="$v"; break; }; done
[ -n "$PY" ] || { echo "need python3.10-3.12 (brew install python@3.12)"; exit 1; }
[ -x .venv-matte/bin/python ] || "$PY" -m venv .venv-matte
.venv-matte/bin/python -m pip install -q --upgrade pip
.venv-matte/bin/python -m pip install -q -r scripts/my_workflow/requirements-matte.txt
.venv-matte/bin/python -c "import mediapipe, cv2, numpy; print('READY')"
