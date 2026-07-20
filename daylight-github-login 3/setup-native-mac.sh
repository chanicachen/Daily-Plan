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

if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 13) ? 0 : 1)' ; then
  echo "Daylight needs Node.js 22.13 or newer. Your current version is $(node --version)."
  echo "Download the current macOS ARM64 installer from https://nodejs.org/en/download"
  exit 1
fi

echo "Before continuing, create a GitHub OAuth App with:"
echo "  Homepage URL:              http://localhost:3000"
echo "  Authorization callback:   http://localhost:3000/api/auth/github/callback"
echo
echo "GitHub path: Settings > Developer settings > OAuth Apps > New OAuth App"
echo
read -r -p "GitHub OAuth Client ID: " github_client_id
read -r -s -p "GitHub OAuth Client Secret: " github_client_secret
echo
read -r -p "GitHub username allowed to open Daylight: " allowed_github_login

if [[ -z "$github_client_id" || -z "$github_client_secret" || -z "$allowed_github_login" ]]; then
  echo "Client ID, Client Secret, and GitHub username are all required. Nothing was changed."
  exit 1
fi
if [[ ! "$allowed_github_login" =~ ^[A-Za-z0-9-]+$ ]]; then
  echo "That GitHub username contains unexpected characters. Nothing was changed."
  exit 1
fi

echo "Preparing Daylight for this Mac…"
npm install --no-audit --no-fund
session_secret="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"

mkdir -p data
umask 077
{
  printf 'GITHUB_CLIENT_ID=%s\n' "$github_client_id"
  printf 'GITHUB_CLIENT_SECRET=%s\n' "$github_client_secret"
  printf 'ALLOWED_GITHUB_LOGINS=%s\n' "$allowed_github_login"
  printf 'APP_URL=http://localhost:3000\n'
  printf 'SESSION_SECRET=%s\n' "$session_secret"
  printf 'DATA_DIR=%s/data\n' "$project_dir"
  printf 'COOKIE_SECURE=false\n'
} > .env.local
unset github_client_secret session_secret

npm run build

echo
echo "Daylight is ready. Double-click start-native-mac.command whenever you want to use it."
echo "You can also run ./start-native-mac.command from Terminal."
open "$project_dir" >/dev/null 2>&1 || true
