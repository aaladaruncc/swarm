# 🧪 UX Testing Platform

AI-powered user experience testing with realistic personas. Test your website with simulated users and get actionable UX feedback in minutes.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  Backend API     │────▶│  Neon Database  │
│  (Next.js)      │     │  (Hono)          │     │  (PostgreSQL)   │
│  Vercel         │     │  Railway         │     │                 │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │  Browserbase   │
                        │  (Cloud Browser)│
                        └────────────────┘
```

## Project Structure

```
├── apps/
│   ├── api/                 # Hono backend API
│   │   ├── src/
│   │   │   ├── index.ts     # Entry point
│   │   │   ├── routes/      # API routes
│   │   │   ├── lib/         # Auth, agent logic
│   │   │   └── db/          # Database client
│   │   └── Dockerfile
│   │
│   └── web/                 # Next.js frontend
│       └── src/
│           ├── app/         # Pages
│           ├── components/  # UI components
│           └── lib/         # Auth client, API
│
├── packages/
│   └── db/                  # Shared database schema (Drizzle)
│
├── pnpm-workspace.yaml
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for local Postgres)
- Accounts on:
  - [Browserbase](https://browserbase.com) (cloud browser)
  - [Anthropic](https://console.anthropic.com) (AI model)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Local Postgres

```bash
docker compose up -d
```

This starts a Postgres container at `localhost:5432`.

### 3. Set Up Environment Variables

```bash
# Copy example env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/api/.env` with your credentials:

```env
# Database (Local Postgres - default works out of the box)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ux_testing

# Authentication
BETTER_AUTH_SECRET=your-secret-key  # Generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:8080

# Browserbase
BROWSERBASE_API_KEY=...
BROWSERBASE_PROJECT_ID=...

# Anthropic
ANTHROPIC_API_KEY=...

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Set Up Database

```bash
# Push schema to Postgres
pnpm db:push
```

### 5. Run Development Servers

```bash
# Run both frontend and backend
pnpm dev

# Or run separately:
pnpm dev:api   # Backend on http://localhost:8080
pnpm dev:web   # Frontend on http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/*` | Better Auth endpoints |
| GET | `/api/tests` | List user's tests |
| POST | `/api/tests` | Create a new test |
| GET | `/api/tests/:id` | Get test details + report |
| GET | `/api/tests/:id/screenshots` | Get screenshots |

## Deployment

### Backend (Railway)

1. Connect your GitHub repo to Railway
2. Set the root directory to `apps/api`
3. Add environment variables
4. Deploy with the included Dockerfile

### Frontend (Vercel)

1. Import your GitHub repo to Vercel
2. Set the root directory to `apps/web`
3. Add `NEXT_PUBLIC_API_URL` pointing to your Railway backend
4. Deploy

### Database

**Local Development:**
```bash
docker compose up -d    # Start Postgres
pnpm db:push           # Sync schema
```

**Production (Neon):**
1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Run `pnpm db:push` to sync the schema

## Available Personas

| Index | Name | Profile |
|-------|------|---------|
| 0 | Maria | 34yo teacher from Brazil, beginner tech user |
| 1 | James | 62yo retired worker from US, beginner tech user |
| 2 | Priya | 28yo software engineer from India, advanced tech user |

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Hono, Better Auth
- **Database**: PostgreSQL (local or Neon), Drizzle ORM
- **Browser Automation**: Stagehand, Browserbase
- **AI**: Claude (Anthropic)

## Scripts

```bash
pnpm dev          # Run all apps in dev mode
pnpm dev:api      # Run backend only
pnpm dev:web      # Run frontend only
pnpm build        # Build all apps
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
pnpm test:agent   # Run agent CLI directly
```

## License

MIT
