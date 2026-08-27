# Future Search

AI-powered search chat connected to the internet via SearXNG, with web, academic, YouTube, and Reddit focus modes.

## Prerequisites

- Node.js 20+
- [Ollama](https://ollama.com/) running locally (for embeddings)
- [Docker](https://www.docker.com/) (for SearXNG)

## Quick start

### 1. Backend environment

Copy `.env.example` to `.env` and fill in API keys:

```bash
cp .env.example .env
```

Required services:
- **SearXNG** on port 8080
- **Ollama** on port 11434 with embedding model `qwen3-embedding:0.6b`

### 2. Frontend environment

```bash
cp ui/.env.example ui/.env
```

The frontend runs on port **3001** because the backend uses port **3000**.

### 3. Install dependencies

```bash
npm install
cd ui && npm install
```

### 4. Start services

```bash
# SearXNG
docker compose up searxng

# Backend (port 3000)
npm run dev

# Frontend (port 3001)
npm run dev:ui
```

Open [http://localhost:3001](http://localhost:3001).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend with nodemon |
| `npm run build` | Compile backend TypeScript |
| `npm run dev:ui` | Start Next.js frontend on port 3001 |
| `npm run build:ui` | Build frontend for production |

## Architecture

- **Backend** — Express HTTP API + WebSocket on port 3000
- **Frontend** — Next.js App Router on port 3001
- **SearXNG** — Meta-search engine on port 8080
- **Ollama** — Local embeddings on port 11434

## API routes

All routes are prefixed with `/api`:

- `GET /api` — Health check
- `GET/POST /api/config` — Model and Ollama settings
- `POST /api/suggestions` — Follow-up question suggestions
- `POST /api/images` — Image search
- `POST /api/videos` — Video search

WebSocket connects to `ws://localhost:3000` for streaming chat.
