#!/usr/bin/env bash
# Headless smoke check: loads a page, fails if the SPA root is empty or the
# console shows uncaught errors. Usage: scripts/smoke.sh <url> [virtual-time-budget-ms]
set -euo pipefail

URL="${1:?usage: smoke.sh <url> [budget-ms]}"
BUDGET="${2:-10000}"
TMP=$(mktemp -d)

google-chrome-stable --headless=new --no-sandbox --disable-gpu \
  --enable-logging=stderr --v=0 \
  --virtual-time-budget="$BUDGET" \
  --dump-dom "$URL" > "$TMP/dom.html" 2> "$TMP/console.log" || true

python3 - "$TMP/dom.html" "$TMP/console.log" <<'PY'
import re, sys

html = open(sys.argv[1], errors="ignore").read()
log = open(sys.argv[2], errors="ignore").read()

m = re.search(r'<div id="root">(.*)</div>', html, re.S)
root = m.group(1) if m else ""
if len(root) < 2000:
    print("SMOKE FAIL: root rendered too little content", file=sys.stderr)
    sys.exit(1)

uncaught = [l for l in log.splitlines() if "Uncaught" in l]
if uncaught:
    print("SMOKE FAIL: uncaught console errors:", file=sys.stderr)
    for l in uncaught[:5]:
        print("  " + l[:200], file=sys.stderr)
    sys.exit(1)

print(f"smoke ok: {len(root)} bytes rendered, 0 uncaught errors")
PY

rm -rf "$TMP"
