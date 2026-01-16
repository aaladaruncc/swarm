# 🧪 UX Testing Platform

AI-powered user experience testing with realistic personas. Test your website with simulated users that think, behave, and react like real humans — get actionable UX insights in minutes.

## ✨ Features

- **🎭 AI Personas** - Generate realistic user personas based on your target audience
- **🤖 Autonomous UX Agents** - Agents explore your website, making decisions like real users
- **🧠 Thought Analysis** - See exactly what the agent was thinking at each step
- **💡 AI-Powered Insights** - Get actionable recommendations from Gemini AI
- **💬 Chat with Personas** - Ask follow-up questions to understand user behavior
- **📸 Screenshot Timeline** - Visual record of every step taken
- **🌐 Cloud Browser Testing** - Real browser testing via Browserbase

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Next.js Frontend (Vercel)                       │    │
│  │   • Dashboard & Test Management                                      │    │
│  │   • Persona Generation UI                                            │    │
│  │   • Thoughts, Insights, Chat Tabs                                    │    │
│  │   • Screenshot Timeline                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND SERVICES                                │
│                                                                              │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│  │      Hono API (Node.js)     │────│         UXAgent (Python)        │    │
│  │      apps/api               │    │      apps/UXAgent-master        │    │
│  │                             │    │                                 │    │
│  │  • Auth (Better Auth)       │    │  • Stagehand Browser Control    │    │
│  │  • Test Management          │    │  • LLM-based Decision Making    │    │
│  │  • Insights Generation      │    │  • Memory & Thought Tracking    │    │
│  │  • Chat with Persona        │    │  • Persona Simulation           │    │
│  │  • Screenshot Storage (S3)  │    │  • Action Execution             │    │
│  └──────────────┬──────────────┘    └──────────────┬──────────────────┘    │
│                 │                                   │                        │
└─────────────────┼───────────────────────────────────┼────────────────────────┘
                  │                                   │
    ┌─────────────┼───────────────────────────────────┼─────────────────┐
    │             ▼                                   ▼                 │
    │  ┌─────────────────────┐              ┌─────────────────────┐    │
    │  │  Neon PostgreSQL    │              │    Browserbase      │    │
    │  │                     │              │   (Cloud Browser)   │    │
    │  │  • Users & Auth     │              │                     │    │
    │  │  • Test Runs        │              │  • Remote Chromium  │    │
    │  │  • UXAgent Runs     │              │  • Session Replay   │    │
    │  │  • Thoughts         │              │  • Screenshots      │    │
    │  │  • Insights         │              └─────────────────────┘    │
    │  │  • Chat History     │                        │                │
    │  └─────────────────────┘                        │                │
    │                                                 ▼                │
    │                                   ┌─────────────────────────┐    │
    │                                   │     Gemini AI (LLM)     │    │
    │                                   │                         │    │
    │                                   │  • Agent Planning       │    │
    │                                   │  • Perception           │    │
    │                                   │  • Insight Generation   │    │
    │                                   │  • Chat Responses       │    │
    │                                   └─────────────────────────┘    │
    │                         EXTERNAL SERVICES                        │
    └──────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
1. USER CREATES TEST
   └─▶ Frontend → API → Generate Personas (Gemini)
   
2. USER STARTS TEST
   └─▶ API → Invoke UXAgent Service
       └─▶ UXAgent creates Stagehand browser session
       └─▶ Agent navigates, observes, thinks, acts
       └─▶ Memories/thoughts stored in agent context
       └─▶ On completion: Callback to API with results
       
3. RESULTS STORED
   └─▶ API receives callback
       └─▶ Store run data in uxagent_runs
       └─▶ Parse memoryTrace → uxagent_thoughts
       └─▶ Upload screenshots to S3
       
4. USER VIEWS RESULTS
   └─▶ Thoughts Tab: Shows agent's thinking process
   └─▶ Insights Tab: Generate/view AI insights
   └─▶ Chat Tab: Talk to the simulated persona
   └─▶ Screenshots: Visual timeline
```

## Project Structure

```
├── apps/
│   ├── api/                     # Hono backend API (Node.js)
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Authentication routes
│   │   │   │   ├── batch-tests.ts # Test management
│   │   │   │   └── uxagent.ts   # UXAgent runs, thoughts, insights, chat
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts      # Better Auth config
│   │   │   │   ├── s3.ts        # AWS S3 for screenshots
│   │   │   │   └── uxagent-client.ts # UXAgent service client
│   │   │   └── db/              # Database client
│   │   └── Dockerfile
│   │
│   ├── web/                     # Next.js frontend
│   │   └── src/
│   │       ├── app/             # App router pages
│   │       │   ├── dashboard/   # Main dashboard
│   │       │   └── tests/[id]/  # Test results page
│   │       ├── components/
│   │       │   ├── UXAgentReportView.tsx  # Main report component
│   │       │   ├── ThoughtsTab.tsx        # Agent thoughts display
│   │       │   ├── InsightsTab.tsx        # AI insights generation
│   │       │   ├── ChatTab.tsx            # Chat with persona
│   │       │   └── ...
│   │       └── lib/
│   │           └── batch-api.ts  # API client functions
│   │
│   └── UXAgent-master/          # Python UXAgent service
│       ├── src/simulated_web_agent/
│       │   ├── agent/
│       │   │   ├── agent.py     # Main agent logic
│       │   │   ├── memory.py    # Memory & thought tracking
│       │   │   └── gpt.py       # LLM router (Gemini/OpenAI)
│       │   ├── executor/
│       │   │   └── stagehand_env.py  # Stagehand browser control
│       │   └── main/
│       │       ├── app.py       # Flask API server
│       │       ├── run.py       # Background run orchestration
│       │       └── experiment.py # Test execution logic
│       ├── pyproject.toml       # Python dependencies
│       └── Dockerfile
│
├── packages/
│   └── db/                      # Shared database schema (Drizzle)
│       └── src/
│           └── schema.ts        # All table definitions
│               ├── users, sessions, accounts  # Auth tables
│               ├── batchTestRuns, testRuns    # Test management
│               ├── uxagentRuns                # Agent run results
│               ├── uxagentThoughts            # Structured thoughts
│               ├── uxagentInsights            # AI-generated insights
│               └── uxagentChatMessages        # Persona chat history
│
├── docker-compose.yml           # Local Postgres
├── pnpm-workspace.yaml
└── package.json
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Auth sessions |
| `batch_test_runs` | Test configurations with personas |
| `test_runs` | Individual test executions |
| `uxagent_runs` | UXAgent execution results |
| `uxagent_screenshots` | Screenshot metadata with S3 URLs |

### New Tables (AI Features)

| Table | Purpose |
|-------|---------|
| `uxagent_thoughts` | Structured agent thoughts (observation, action, plan, reflection) |
| `uxagent_insights` | AI-generated UX insights with recommendations |
| `uxagent_chat_messages` | Conversation history with persona |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/*` | Better Auth endpoints |

### Test Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/batch-tests` | List user's batch tests |
| POST | `/api/batch-tests` | Create batch test with personas |
| GET | `/api/batch-tests/:id` | Get test details + runs |
| POST | `/api/batch-tests/generate-personas` | Generate AI personas |

### UXAgent Runs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/uxagent/runs/:id` | Get run details |
| GET | `/api/uxagent/runs/:id/thoughts` | Get structured thoughts |
| GET | `/api/uxagent/runs/:id/insights` | Get AI insights |
| POST | `/api/uxagent/runs/:id/insights` | Generate AI insights |
| GET | `/api/uxagent/runs/:id/chat` | Get chat history |
| POST | `/api/uxagent/runs/:id/chat` | Send chat message |

### UXAgent Service (Python)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/run` | Invoke new agent run |
| POST | `/runs` | Callback with results |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ with uv
- pnpm 8+
- Docker (for local Postgres)
- Accounts:
  - [Browserbase](https://browserbase.com) - Cloud browser
  - [Google AI](https://makersuite.google.com/app/apikey) - Gemini API key

### 1. Install Dependencies

```bash
# Node.js dependencies
pnpm install

# Python dependencies (in apps/UXAgent-master)
cd apps/UXAgent-master
uv sync
```

### 2. Start Local Database

```bash
docker compose up -d
```

### 3. Configure Environment

```bash
# API environment
cp apps/api/.env.example apps/api/.env

# UXAgent environment  
cp apps/UXAgent-master/.env.example apps/UXAgent-master/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

**apps/api/.env:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ux_testing
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000

# For AI insights generation
GEMINI_API_KEY=your-gemini-key

# UXAgent service URL
UXAGENT_URL=http://localhost:5000
UXAGENT_API_KEY=dev-key

# S3 for screenshots (optional)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

**apps/UXAgent-master/.env:**
```env
GEMINI_API_KEY=your-gemini-key
BROWSERBASE_API_KEY=your-browserbase-key
BROWSERBASE_PROJECT_ID=your-project-id

# Callback to main API
MAIN_API_URL=http://localhost:8080
MAIN_API_KEY=dev-key
```

### 4. Set Up Database

```bash
pnpm db:push
```

### 5. Run Development Servers

```bash
# Terminal 1: Node.js apps (API + Web)
pnpm dev

# Terminal 2: Python UXAgent service
cd apps/UXAgent-master
uv run python -m src.simulated_web_agent.main.app
```

Access the app at http://localhost:3000

## How the Agent Works

### 1. Perception
The agent observes the current page state via Stagehand's extraction capabilities, identifying interactive elements, forms, navigation, and content.

### 2. Memory & Thoughts
All observations, plans, and reflections are stored as "memory pieces" with importance scores. The agent can recall relevant memories when making decisions.

### 3. Planning
Based on the persona's goals and current observations, the agent creates a step-by-step plan using the LLM.

### 4. Action
The agent executes actions via Stagehand:
- `click` - Click on elements
- `type` - Enter text in fields
- `scroll` - Navigate the page
- `wait` - Pause for loading
- `terminate` - End the session

### 5. Reflection
After key actions, the agent reflects on what happened and updates its understanding.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **Backend API** | Hono, Better Auth, TypeScript |
| **Agent Service** | Python, Flask, Stagehand, LiteLLM |
| **Database** | PostgreSQL (Neon), Drizzle ORM |
| **Browser** | Stagehand + Browserbase |
| **AI/LLM** | Gemini 2.0 Flash |
| **Storage** | AWS S3 (screenshots) |

## Deployment

### Backend API (AWS ECS / Railway)

1. Build Docker image from `apps/api/Dockerfile`
2. Set environment variables
3. Deploy to container service

### UXAgent Service (AWS ECS)

1. Build Docker image from `apps/UXAgent-master/Dockerfile`
2. Set environment variables
3. Deploy to container service
4. Configure networking between API and UXAgent

### Frontend (Vercel)

1. Import repo to Vercel
2. Set root directory: `apps/web`
3. Add `NEXT_PUBLIC_API_URL`
4. Deploy

### Database (Neon)

1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string to `DATABASE_URL`
3. Run `pnpm db:push`

## Scripts

```bash
# Development
pnpm dev           # Run API + Web in dev mode
pnpm dev:api       # Run backend only
pnpm dev:web       # Run frontend only

# Database
pnpm db:push       # Push schema to database
pnpm db:generate   # Generate migrations
pnpm db:studio     # Open Drizzle Studio

# Build
pnpm build         # Build all apps
pnpm build:api     # Build API only
pnpm build:web     # Build frontend only
```

## License

MIT
