#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if [[ ! -f .env.local ]]; then
  echo "Daylight has not been set up yet. Run ./setup-native-mac.sh first."
  read -r -p "Press Return to close."
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js could not be found. Reinstall Node.js, then try again."
  read -r -p "Press Return to close."
  exit 1
fi

(sleep 2; open http://localhost:3000 >/dev/null 2>&1 || true) &
echo "Daylight is starting at http://localhost:3000"
echo "Keep this window open. Press Control-C to stop Daylight."
echo
exec npm start -- --hostname 127.0.0.1 --port 3000
