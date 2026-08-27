#!/bin/sh
set -e

MODEL="${EMBEDDING_MODEL:-qwen3-embedding:0.6b}"
OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"

echo "Waiting for Ollama at ${OLLAMA_HOST}..."
until curl -sf "${OLLAMA_HOST}/" > /dev/null 2>&1; do
  sleep 2
done

echo "Pulling embedding model: ${MODEL}"
curl -sf "${OLLAMA_HOST}/api/pull" -d "{\"name\":\"${MODEL}\"}"

echo "Ollama model ready: ${MODEL}"
