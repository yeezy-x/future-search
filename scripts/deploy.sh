#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE from .env.production.example"
  cp .env.production.example "$ENV_FILE"
  echo ""
  echo "Edit $ENV_FILE and add your API keys, then re-run:"
  echo "  ./scripts/deploy.sh"
  exit 1
fi

if ! grep -qE '^(OPENROUTER_API_KEY|GEMINI_API_KEY)=.+' "$ENV_FILE"; then
  echo "Warning: no LLM API key set in $ENV_FILE"
  echo "Set at least OPENROUTER_API_KEY or GEMINI_API_KEY before using the app."
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "Building and starting Future Search (production)..."
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up --build -d

echo ""
echo "Deployment started."
echo "  App:  http://localhost:${APP_PORT:-80}"
echo "  Logs: docker compose -f docker-compose.prod.yml logs -f"
echo "  Stop: docker compose -f docker-compose.prod.yml down"
