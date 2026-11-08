#!/usr/bin/env bash
# Syncs the source to the server and rebuilds/restarts the Docker stack.
# The server keeps its own /opt/trener/app/.env (secrets + DOMAIN) and
# /opt/trener/data (SQLite) – neither is touched here.
#
# Usage: scripts/deploy.sh            (DEPLOY_HOST overrides the target)
set -euo pipefail

HOST="${DEPLOY_HOST:-root@2.29.139.62}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
APP_DIR=/opt/trener/app

cd "$(dirname "$0")/.."

rsync -az --delete -e "ssh -i $SSH_KEY" \
  --filter='P .env' \
  --exclude=node_modules --exclude=.output --exclude=.nitro \
  --exclude=.tanstack --exclude=.vinxi --exclude=.wrangler \
  --exclude=dist --exclude=coverage --exclude=.git --exclude=.DS_Store \
  --exclude='.env' --exclude='.env.local' --exclude='*.db' \
  --exclude='*.db-wal' --exclude='*.db-shm' --exclude='*.db-journal' \
  --exclude=data/ \
  ./ "$HOST:$APP_DIR/"

ssh -i "$SSH_KEY" "$HOST" "cd $APP_DIR && docker compose up -d --build && docker image prune -f >/dev/null"
