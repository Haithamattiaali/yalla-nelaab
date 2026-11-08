#!/bin/sh
# Serves the folder on a free local port, runs tests/e2e.html in headless Chrome, prints the results.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"
# serve the PARENT folder so the app runs under a subpath, like GitHub Pages does
PARENT="$(dirname "$ROOT")"; SUB="$(basename "$ROOT")"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PARENT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 0.6
URL="http://127.0.0.1:$PORT/$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$SUB")/tests/e2e.html"
DOM=$("$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
  --user-data-dir="$(mktemp -d)" --autoplay-policy=no-user-gesture-required \
  --virtual-time-budget="${E2E_BUDGET:-60000}" --window-size=1400,1000 --dump-dom "$URL" 2>/dev/null)
echo "$DOM" | python3 -c '
import sys, re, html
d = sys.stdin.read()
m = re.search(r"<pre id=\"results\" data-pass=\"(\w+)\">(.*?)</pre>", d, re.S)
if not m: print("e2e: no results"); sys.exit(2)
print(html.unescape(m.group(2)))
print("e2e:", m.group(1))
sys.exit(0 if m.group(1) == "yes" else 1)'
