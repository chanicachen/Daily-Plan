#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker Desktop is not installed. Install it from https://www.docker.com/products/docker-desktop/ and run this file again."
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Open Docker Desktop, wait until it is running, then run this file again."
  exit 1
fi

read -r -s -p "Choose your Daylight password (10+ characters): " planner_password
echo
read -r -s -p "Enter it again: " planner_password_confirm
echo
if [[ "$planner_password" != "$planner_password_confirm" ]]; then
  echo "The passwords did not match. Nothing was changed."
  exit 1
fi

password_hash="$(printf '%s' "$planner_password" | docker run --rm -i -v "$project_dir/scripts:/scripts:ro" node:22-alpine node /scripts/hash-password.mjs)"
unset planner_password planner_password_confirm
session_secret="$(openssl rand -hex 32)"

umask 077
{
  printf 'PLANNER_PASSWORD_HASH=%s\n' "$password_hash"
  printf 'SESSION_SECRET=%s\n' "$session_secret"
  printf 'DATA_DIR=/data\n'
  printf 'COOKIE_SECURE=false\n'
} > .env

mkdir -p data
docker compose up -d --build

echo
echo "Daylight is ready at http://localhost:3000"
echo "Your password was not saved in plain text."
if command -v open >/dev/null 2>&1; then open http://localhost:3000; fi
