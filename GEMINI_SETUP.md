# Gemini 2.5 Computer Use Setup

## ✅ Updated to Gemini 2.5!

Your agent now uses **Google Gemini 2.5 Computer Use** instead of Claude Haiku. This provides:

- ⚡ **Faster execution** - Quicker test completion
- 💰 **Lower costs** - More affordable per test
- 🎯 **Great performance** - Excellent at browser automation

## Required API Key

Add to your `apps/api/.env`:

```bash
# Google Gemini API Key (required for agents)
GEMINI_API_KEY=your_gemini_api_key_here

# OR use this alternative name
GOOGLE_API_KEY=your_gemini_api_key_here

# You can now remove ANTHROPIC_API_KEY (no longer needed for agents)
# ANTHROPIC_API_KEY=...  # Not needed anymore
```

## Get Your Gemini API Key

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy the key (starts with `AIza...`)
5. Add it to your `.env` file

### Free Tier
- Gemini has a generous free tier
- Perfect for development and testing
- Check current limits at: https://ai.google.dev/pricing

## What Changed

### Before:
```typescript
model: {
  modelName: "anthropic/claude-haiku-4-5-20251001",
  apiKey: process.env.ANTHROPIC_API_KEY,
}
```

### After:
```typescript
model: {
  modelName: "google/gemini-2.5-computer-use-preview-10-2025",
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
}
```

## Cost Comparison

**Per 5-Persona Batch Test:**

| Component | Claude Haiku | Gemini 2.5 | Savings |
|-----------|--------------|------------|---------|
| 5 AI Agents | $0.10-$0.50 | $0.05-$0.20 | ~50-60% |
| Persona Gen | $0.02-$0.05 | $0.02-$0.05 | Same (OpenAI) |
| Aggregation | $0.02-$0.05 | $0.02-$0.05 | Same (OpenAI) |
| **Total** | **$0.15-$0.60** | **$0.10-$0.30** | **~50% cheaper** |

## Testing the Change

1. **Update your .env**:
   ```bash
   cd apps/api
   nano .env
   # Add: GEMINI_API_KEY=your_key_here
   ```

2. **Restart the API server**:
   ```bash
   # Stop current server (Ctrl+C)
   pnpm dev:api
   ```

3. **Run a test**:
   - Go to http://localhost:3000
   - Create a new batch test
   - Monitor the console - you should see "Gemini" in logs

## Troubleshooting

### "GEMINI_API_KEY is not set"
→ Add the API key to `apps/api/.env`

### "Invalid API key"
→ Make sure you copied the full key from Google AI Studio

### "Model not found"
→ The model name is correct, check your API key has access

### Tests failing
→ Gemini might be slightly different in behavior. Check the console logs for specific errors.

## Environment Variables Summary

Your `apps/api/.env` should now have:

```bash
# Required
GEMINI_API_KEY=AIza...                    # NEW - For test agents
OPENAI_API_KEY=sk-...                     # For persona generation
BROWSERBASE_API_KEY=...                   # For browser sessions
BROWSERBASE_PROJECT_ID=...

# Optional (can remove)
# ANTHROPIC_API_KEY=...                   # No longer needed

# Other required
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:8080/api/auth
FRONTEND_URL=http://localhost:3000
PORT=8080
```

## Benefits of Gemini 2.5

1. **Cost Effective**: ~50% cheaper than Claude
2. **Fast**: Quick response times for browser actions
3. **Reliable**: Google's latest computer use model
4. **Free Tier**: Great for development and testing
5. **No Rate Limits**: (within free tier quotas)

## Deployment Note

When deploying to production (Vercel, Railway, etc.), make sure to:

1. Add `GEMINI_API_KEY` to your environment variables
2. Remove or keep `ANTHROPIC_API_KEY` if you have other uses for it
3. Restart your services after adding the key

That's it! Your tests now run on Gemini 2.5 Computer Use! 🚀
