#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker is not available. Use setup-native-mac.sh instead."
  exit 1
fi

echo "Create a GitHub OAuth App before continuing:"
echo "  Homepage URL:              http://localhost:3000"
echo "  Authorization callback:   http://localhost:3000/api/auth/github/callback"
echo
read -r -p "GitHub OAuth Client ID: " github_client_id
read -r -s -p "GitHub OAuth Client Secret: " github_client_secret
echo
read -r -p "GitHub username allowed to open Daylight: " allowed_github_login

if [[ -z "$github_client_id" || -z "$github_client_secret" || -z "$allowed_github_login" ]]; then
  echo "All three values are required. Nothing was changed."
  exit 1
fi

session_secret="$(openssl rand -hex 32)"
umask 077
{
  printf 'GITHUB_CLIENT_ID=%s\n' "$github_client_id"
  printf 'GITHUB_CLIENT_SECRET=%s\n' "$github_client_secret"
  printf 'ALLOWED_GITHUB_LOGINS=%s\n' "$allowed_github_login"
  printf 'APP_URL=http://localhost:3000\n'
  printf 'SESSION_SECRET=%s\n' "$session_secret"
  printf 'DATA_DIR=/data\n'
  printf 'COOKIE_SECURE=false\n'
} > .env
unset github_client_secret session_secret

mkdir -p data
docker compose up -d --build
echo
echo "Daylight is ready at http://localhost:3000"
if command -v open >/dev/null 2>&1; then open http://localhost:3000; fi
