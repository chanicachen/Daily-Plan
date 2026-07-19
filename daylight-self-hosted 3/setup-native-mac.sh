#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not installed. Download the macOS ARM64 installer for Node.js 22 or newer from:"
  echo "https://nodejs.org/en/download"
  echo "Install it, reopen Terminal, and run this file again."
  exit 1
fi

node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
if (( node_major < 22 )); then
  echo "Daylight needs Node.js 22 or newer. Your current version is $(node --version)."
  echo "Download the current macOS ARM64 installer from https://nodejs.org/en/download"
  exit 1
fi

echo "Preparing Daylight for this Mac…"
npm install --no-audit --no-fund

read -r -s -p "Choose your Daylight password (10+ characters): " planner_password
echo
read -r -s -p "Enter it again: " planner_password_confirm
echo
if [[ "$planner_password" != "$planner_password_confirm" ]]; then
  echo "The passwords did not match. Nothing was changed."
  exit 1
fi

password_hash="$(printf '%s' "$planner_password" | node scripts/hash-password.mjs)"
unset planner_password planner_password_confirm
session_secret="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"

mkdir -p data
umask 077
{
  printf 'PLANNER_PASSWORD_HASH=%s\n' "$password_hash"
  printf 'SESSION_SECRET=%s\n' "$session_secret"
  printf 'DATA_DIR=%s/data\n' "$project_dir"
  printf 'COOKIE_SECURE=false\n'
} > .env.local

npm run build

echo
echo "Daylight is ready. Double-click start-native-mac.command whenever you want to use it."
echo "You can also run ./start-native-mac.command from Terminal."
open "$project_dir" >/dev/null 2>&1 || true
