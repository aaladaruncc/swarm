# Rate Limit Fix - Scaled to 3 Concurrent Agents

## ✅ Updated to 3 Concurrent Tests

To avoid hitting rate limits (429 errors), the system has been scaled down from 5 to 3 concurrent agents per batch test.

## What Changed

### Before:
- Generated 10 personas, selected 5
- Ran 5 concurrent Browserbase sessions
- Higher chance of hitting rate limits

### After:
- Generate 10 personas, select **3** (auto-selected)
- Run **3** concurrent Browserbase sessions
- Lower rate limit risk
- Still get comprehensive insights

## Benefits

1. **No More 429 Errors** - Stays within rate limits
2. **Faster Completion** - Less queue time
3. **Lower Cost** - ~$0.07-0.22 per batch (down from $0.10-0.30)
4. **Still Comprehensive** - 3 diverse perspectives is plenty

## Rate Limit Considerations

### Gemini 2.5 Free Tier Limits:
- **15 requests per minute** (RPM)
- **1 million tokens per minute** (TPM)
- **1,500 requests per day** (RPD)

### With 3 Concurrent Tests:
- Each test makes ~10-20 API calls
- 3 tests = ~30-60 calls total
- Stays well within free tier limits

### If You Still Hit Limits:

1. **Wait between tests**: Give 2-3 minutes between batch runs
2. **Upgrade API plan**: Get higher limits
3. **Reduce to 2 agents**: Change `count: number = 3` to `2` in `persona-generator.ts`
4. **Add delays**: Implement request spacing in the agent

## Files Updated:

- ✅ `apps/api/src/lib/persona-generator.ts` - Default selection: 3
- ✅ `apps/api/src/routes/batch-tests.ts` - Validation: exactly 3
- ✅ `apps/web/src/app/tests/new/page.tsx` - UI: select 3, show 3
- ✅ `apps/web/src/app/dashboard/page.tsx` - Display: 3 personas
- ✅ All documentation updated

## Current Limits Per Batch Test:

- **Personas Generated**: 10 (view all, select 3)
- **Concurrent Tests**: 3 
- **Test Duration**: 5-10 minutes
- **Cost**: ~$0.07-0.22
- **Rate Limit Risk**: Low ✅

## If You Want More Than 3 Tests:

Run multiple batch tests sequentially with a few minutes gap:

```bash
# Test 1 (3 personas) - Run at 2:00 PM
# Test 2 (3 personas) - Run at 2:10 PM  
# Test 3 (3 personas) - Run at 2:20 PM

# Total: 9 different personas tested, no rate limits!
```

## Monitoring Rate Limits:

Check your API usage:
- **Gemini**: https://aistudio.google.com/app/apikey
- **OpenAI**: https://platform.openai.com/usage
- **Browserbase**: https://browserbase.com/dashboard

Your tests should now run smoothly without hitting rate limits! 🎉
