# AI-Powered Batch Testing Setup Guide

## What's New

Your UX testing platform now features:

### 🎯 AI-Powered Persona Generation
- Users describe their target audience in natural language
- OpenAI GPT-4o generates 10 diverse, realistic personas
- AI automatically selects the 5 most relevant personas
- Users can adjust selection before running tests

### 🚀 Concurrent Multi-Persona Testing
- Runs 5 Browserbase sessions simultaneously
- Each persona tests your website with unique perspectives
- Real-time progress tracking for all 5 tests

### 🤖 AI-Powered Report Aggregation
- Aggregates insights from all 5 persona reports
- Identifies common issues across user types
- Provides persona-specific insights
- Generates prioritized recommendations
- Executive summary with strategic guidance

### 📊 Comprehensive Reporting
- View aggregated report with overall UX score
- Switch between individual persona reports
- See common issues affecting multiple personas
- Get actionable, prioritized recommendations

## Environment Variables

You'll need to add the following to your API `.env` file:

```bash
# Existing variables (keep these)
BROWSERBASE_API_KEY=your_browserbase_key
BROWSERBASE_PROJECT_ID=your_project_id
ANTHROPIC_API_KEY=your_anthropic_key

# NEW: Add OpenAI API key for persona generation and aggregation
OPENAI_API_KEY=your_openai_api_key
```

## Database Setup

The database schema has been updated with new tables. You need to set up your database:

### Option 1: Local Postgres (Development)

1. Install and start PostgreSQL:
```bash
brew install postgresql@16
brew services start postgresql@16
```

2. Create a database:
```bash
createdb ux_testing
```

3. Set your database URL in `packages/db/.env`:
```bash
DATABASE_URL=postgresql://localhost:5432/ux_testing
```

4. Push the schema:
```bash
pnpm db:push
```

### Option 2: Remote Database (Production)

Use a hosted Postgres service like:
- Neon (https://neon.tech) - Recommended, free tier available
- Supabase (https://supabase.com)
- Railway (https://railway.app)
- Vercel Postgres

1. Create a database in your chosen service
2. Copy the connection string
3. Set it in `packages/db/.env`:
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

4. Push the schema:
```bash
pnpm db:push
```

## New Database Tables

- `batch_test_runs` - Contains batch test metadata and generated personas
- `test_runs` - Individual persona tests (linked to batch)
- `aggregated_reports` - AI-generated comprehensive reports
- `reports` - Individual persona reports (unchanged)
- `screenshots` - Screenshots from tests (unchanged)

## Running the Application

1. Start the API server:
```bash
pnpm dev:api
```

2. Start the web app:
```bash
pnpm dev:web
```

3. Navigate to http://localhost:3000

## How It Works

### 1. Create a Test
- Enter your website URL
- Describe your target audience (e.g., "busy parents looking for meal planning tools")
- Click "Generate Personas with AI"

### 2. Review & Select Personas
- AI generates 10 diverse personas
- Top 5 most relevant are pre-selected
- Adjust selection if needed (must select exactly 5)

### 3. Run Tests
- Click "Start 5 Concurrent Tests"
- 5 AI agents test your site simultaneously
- Watch real-time progress

### 4. View Results
- See aggregated report with overall insights
- Switch to individual persona reports
- Get prioritized, actionable recommendations

## API Endpoints

### Batch Tests
- `POST /api/batch-tests/generate-personas` - Generate personas
- `POST /api/batch-tests` - Start batch test
- `GET /api/batch-tests` - List batch tests
- `GET /api/batch-tests/:id` - Get batch test details

### Legacy Single Tests (still available)
- `POST /api/tests` - Single persona test
- `GET /api/tests` - List single tests
- `GET /api/tests/:id` - Get single test details

## Cost Considerations

### OpenAI API Usage
- Persona generation: ~$0.02-0.05 per batch (GPT-4o)
- Report aggregation: ~$0.02-0.05 per batch (GPT-4o)
- Total: ~$0.04-0.10 per batch test

### Browserbase Usage
- 5 concurrent sessions per batch test
- Each session: 5-10 minutes
- Check your Browserbase plan limits

### Anthropic API Usage
- 5 concurrent Claude Haiku sessions per batch
- Each session: Testing and observation
- Lower cost than full Claude Sonnet

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: Make sure PostgreSQL is running and DATABASE_URL is correct.

### OpenAI API Error
```
Error: Failed to generate personas
```
**Solution**: Check that OPENAI_API_KEY is set and valid.

### Persona Generation Takes Long
**Expected**: Generating 10 diverse personas takes 10-20 seconds.

### Tests Running Slowly
**Expected**: 5 concurrent tests take 5-10 minutes total. Each AI agent is exploring your site in real-time.

## Features Removed

- ❌ Session replay viewer (removed as requested)
- ❌ Single persona selection UI (replaced with batch workflow)

## Next Steps

1. Set up your environment variables
2. Configure your database
3. Run database migrations
4. Test the persona generation flow
5. Run your first batch test!

## Support

For issues or questions:
- Check the console logs for detailed error messages
- Ensure all API keys are valid
- Verify database connection
- Check that all dependencies are installed (`pnpm install`)
