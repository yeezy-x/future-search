# Future Search

AI-powered search chat connected to the internet via SearXNG. Ask questions, get streamed answers with cited sources, and switch between web, academic, YouTube, Reddit, and writing focus modes.

## Features

- **Streaming chat** over WebSocket with source citations
- **Focus modes** — web, academic, YouTube, Reddit, and writing assistant
- **Image and video search** inline in chat responses
- **Follow-up suggestions** generated after each answer
- **Multiple LLM providers** — OpenRouter (free models) and Google Gemini
- **Local embeddings** via Ollama for semantic search ranking
- **Session-based UI** — chat history stored in the browser

## Prerequisites

- Node.js 20+
- [Docker](https://www.docker.com/) (for SearXNG)
- [Ollama](https://ollama.com/) (for embeddings)
- At least one LLM API key: [OpenRouter](https://openrouter.ai/) and/or [Google AI Studio](https://aistudio.google.com/) (Gemini)

## Quick start

### 1. Backend environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys. At minimum, set one of `OPENROUTER_API_KEY` or `GEMINI_API_KEY`.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend HTTP + WebSocket port | `3000` |
| `SEARXNG_URL` | SearXNG instance URL | `http://localhost:8080` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
| `OPENROUTER_API_KEY` | OpenRouter API key | — |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `SELECTED_MODEL_ID` | Default chat model ID | `openrouter-auto-free` |
| `EMBEDDING_PROVIDER` | Embedding backend | `ollama` |
| `EMBEDDING_MODEL` | Ollama embedding model | `qwen3-embedding:0.6b` |
| `SIMILARITY_MEASURE` | Vector similarity metric | `cosine` |

Pull the embedding model in Ollama:

```bash
ollama pull qwen3-embedding:0.6b
```

### 2. Frontend environment

Create `ui/.env` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

The frontend runs on port **3001** because the backend uses port **3000**.

### 3. Install dependencies

```bash
npm install
cd ui && npm install
```

### 4. Start services

```bash
# SearXNG (port 8080)
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
| `npm start` | Run compiled backend |
| `npm run dev:ui` | Start Next.js frontend on port 3001 |
| `npm run build:ui` | Build frontend for production |

## Focus modes

| Mode | Key | Description |
|------|-----|-------------|
| All | `webSearch` | Search across the web |
| Academic | `academicSearch` | Search published academic papers |
| Writing | `writingAssistant` | Chat without web search |
| YouTube | `youtubeSearch` | Search and summarize videos |
| Reddit | `redditSearch` | Search discussions and opinions |

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────────────────────┐
│  Next.js UI │ ◄────────────────► │  Express + WebSocket (port 3000) │
│  (port 3001)│     REST /api      │                                  │
└─────────────┘                    │  Agents: web, academic, youtube, │
                                   │  reddit, writing, image, video   │
                                   └──────────┬───────────┬───────────┘
                                              │           │
                                   ┌──────────▼──┐   ┌────▼─────┐
                                   │  SearXNG    │   │  Ollama  │
                                   │  (port 8080)│   │ (embeds) │
                                   └─────────────┘   └──────────┘
```

- **Backend** (`src/`) — Express HTTP API + WebSocket server
- **Frontend** (`ui/`) — Next.js App Router with client-side chat sessions
- **SearXNG** — Meta-search engine for web, academic, YouTube, and Reddit results
- **Ollama** — Local embeddings for semantic ranking and deduplication
- **LLMs** — OpenRouter and Gemini via LangChain

## API routes

All REST routes are prefixed with `/api`:

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api` | Health check |
| `GET` | `/api/config` | List available models and current settings |
| `POST` | `/api/config` | Update model and Ollama URL for the server session |
| `POST` | `/api/suggestions` | Generate follow-up question suggestions |
| `POST` | `/api/images` | Image search |
| `POST` | `/api/videos` | Video search |

WebSocket connects to `ws://localhost:3000` for streaming chat. Messages include `content`, `focusMode`, `copilot`, and `history`.

## Available models

Models are filtered by which API keys are configured:

| ID | Provider | Model |
|----|----------|-------|
| `openrouter-auto-free` | OpenRouter | `openrouter/free` (default) |
| `llama-3.2-3b-free` | OpenRouter | `meta-llama/llama-3.2-3b-instruct:free` |
| `qwen-free` | OpenRouter | `qwen/qwen3-4b:free` |
| `glm-5.2-free` | OpenRouter | `z-ai/glm-5.2:free` |
| `gemini-2.5-flash` | Gemini | `gemini-2.5-flash` |
| `gemini-2.5-flash-lite` | Gemini | `gemini-2.5-flash-lite` |

Change the active model in the UI settings dialog or via `SELECTED_MODEL_ID` in `.env`.

## Project structure

```
future-search/
├── src/                  # Backend
│   ├── agents/           # Search and chat agents
│   ├── modules/          # AI providers, search pipeline
│   ├── routes/           # Express REST routes
│   ├── websocket/        # WebSocket connection handling
│   └── utils/            # Parsers and helpers
├── ui/                   # Next.js frontend
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   └── lib/              # Client utilities and session storage
├── docker-compose.yml    # SearXNG service
└── searxng-settings.yml  # SearXNG configuration
```
