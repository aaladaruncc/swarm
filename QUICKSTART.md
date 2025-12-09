# Quick Start Guide - AI-Powered Batch UX Testing

## 🚀 What You Need

1. **OpenAI API Key** (NEW) - For persona generation and report aggregation
2. **Anthropic API Key** - For AI testing agents
3. **Browserbase Account** - For browser automation
4. **PostgreSQL Database** - Local or hosted

## ⚡ Setup (5 minutes)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Database

**Option A: Local PostgreSQL**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb ux_testing
```

**Option B: Use Neon (Free Hosted)**
1. Go to https://neon.tech
2. Create free account and database
3. Copy connection string

### 3. Configure Environment Variables

Edit `apps/api/.env`:
```bash
# Database
DATABASE_URL=postgresql://localhost:5432/ux_testing  # or your Neon URL

# API Keys
OPENAI_API_KEY=sk-...        # Get from https://platform.openai.com
GEMINI_API_KEY=AIza...       # Get from https://aistudio.google.com/apikey
BROWSERBASE_API_KEY=...      # Get from https://browserbase.com
BROWSERBASE_PROJECT_ID=...   # From Browserbase dashboard

# Other
PORT=8080
FRONTEND_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-here-minimum-32-chars
BETTER_AUTH_URL=http://localhost:8080/api/auth
```

Edit `apps/web/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 4. Push Database Schema
```bash
pnpm db:push
```

### 5. Run the App
```bash
# Terminal 1 - API
pnpm dev:api

# Terminal 2 - Web
pnpm dev:web
```

Visit: **http://localhost:3000**

## 🎯 How It Works

### Step 1: Create Test
- Enter your website URL
- Describe your target users in plain English:
  ```
  "My app is for busy professionals who need quick recipes. 
  They're usually 25-45 years old, working full-time, with 
  varying cooking skills. Some are tech-savvy, others struggle 
  with complex interfaces."
  ```

### Step 2: AI Generates Personas
- Click "Generate Personas with AI"
- Wait 10-20 seconds
- AI creates 10 diverse personas
- Top 5 are automatically selected

### Step 3: Adjust Selection (Optional)
- Review the 10 generated personas
- Click to select/deselect (must have exactly 5)
- See relevance scores and details

### Step 4: Run Tests
- Click "Start 5 Concurrent Tests"
- 5 AI agents test your site simultaneously
- Takes 5-10 minutes
- Watch real-time progress

### Step 5: View Results
- **Aggregated Report**: Overall insights, common issues, recommendations
- **Individual Reports**: Switch tabs to see each persona's experience
- Get actionable, prioritized improvements

## 💡 Example Target Audience Descriptions

**E-commerce Site:**
```
Small business owners and online shoppers aged 25-65. Mix of tech 
levels from beginners to advanced. Need quick checkout, clear product 
info, and mobile-friendly design. Some have accessibility needs.
```

**SaaS Dashboard:**
```
Project managers and team leads at tech companies. Advanced tech users 
who expect efficiency and keyboard shortcuts. Ages 28-50. Value clean 
design and fast performance. Work on multiple devices.
```

**Educational Platform:**
```
Students and teachers, ages 16-70. Wide range of tech comfort levels. 
Students are digital natives but teachers may need guidance. Must work 
on older devices. Clear instructions essential.
```

## 📊 What You Get

### Aggregated Report
- **Overall UX Score** (0-10 across all personas)
- **Executive Summary** (strategic overview)
- **Common Issues** (problems affecting multiple user types)
- **Strengths** (what works well for everyone)
- **Prioritized Recommendations** (high/medium/low priority)
- **Persona-Specific Insights** (unique findings per persona)

### Individual Persona Reports
- Personal profile and context
- Individual score and experience summary
- What worked well for them
- Confusion points and frustrations
- Usability issues with severity
- Tailored recommendations

## 💰 Costs

Per batch test (5 concurrent personas):
- Persona Generation: $0.02-0.05 (OpenAI)
- 5 AI Test Agents: $0.05-0.20 (Gemini 2.5)
- Report Aggregation: $0.02-0.05 (OpenAI)
- **Total: ~$0.10-0.30 per batch**

*Now 50% cheaper using Gemini 2.5 Computer Use!*

Plus Browserbase session costs (check your plan).

## 🐛 Troubleshooting

### "Database connection refused"
→ Start PostgreSQL: `brew services start postgresql@16`

### "Failed to generate personas"
→ Check OPENAI_API_KEY is set and valid

### "GEMINI_API_KEY is not set"
→ Get your API key from https://aistudio.google.com/apikey

### "Browserbase session failed"
→ Verify BROWSERBASE_API_KEY and PROJECT_ID

### Tests taking too long
→ Normal! Each AI agent browses your site like a real user (5-10 min)

### Can't select personas
→ Must select exactly 5 personas to proceed

## 📚 More Info

- **Full Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **Detailed Setup Guide**: See `BATCH_TESTING_SETUP.md`
- **Project README**: See `README.md`

## 🎉 You're Ready!

Your AI-powered batch UX testing platform is ready to use. Create your first test and get comprehensive insights from 5 different user perspectives!

**Pro Tip**: Start with a clear, detailed target audience description. The better your description, the more relevant the AI-generated personas will be!
