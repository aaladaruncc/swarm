# ✅ Vercel + pnpm Monorepo Fix

## The Solution

Use pnpm from the **monorepo root** even when Root Directory is set to `apps/web`.

## Configuration

### 1. Root `package.json`
```json
{
  "packageManager": "pnpm@9.15.0"
}
```

This tells Vercel to use pnpm with corepack.

### 2. `vercel.json` (in root)
```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @ux-testing/web build",
  "installCommand": "cd ../.. && pnpm install --no-frozen-lockfile",
  "outputDirectory": ".next"
}
```

This:
- Goes up to repo root (`cd ../..`)
- Installs with pnpm from root (workspace context)
- Builds only the web app with pnpm filter
- Outputs to `.next` (relative to apps/web)

### 3. Vercel Settings

**Root Directory**: `apps/web`  
**Framework**: Next.js  
**Node.js Version**: 20.x  

**Environment Variables**:
```
ENABLE_EXPERIMENTAL_COREPACK=1
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

The `ENABLE_EXPERIMENTAL_COREPACK=1` enables pnpm support.

## Why This Works

1. **Root Directory** = `apps/web` (where Vercel runs commands)
2. **vercel.json** commands `cd ../..` to go back to repo root
3. **pnpm install** runs from root (preserves workspace)
4. **pnpm --filter** builds only web app
5. **Output** goes to `apps/web/.next`

## Deploy Steps

1. **Add environment variable in Vercel**:
   ```
   ENABLE_EXPERIMENTAL_COREPACK=1
   ```

2. **Push code**:
   ```bash
   git add .
   git commit -m "Fix Vercel pnpm monorepo build"
   git push origin frontend-dev
   ```

3. **Redeploy in Vercel**

## Expected Output

```
✓ pnpm install (from root)
✓ pnpm --filter @ux-testing/web build
✓ Compiled successfully
✓ Build completed
```

## Alternative: Use npm Only

If pnpm still doesn't work on Vercel:

1. **Remove vercel.json**
2. **Root Directory**: `apps/web`
3. **Install Command**: `npm install --legacy-peer-deps`
4. **Build Command**: `npm run build`

But you'll need to ensure all dependencies are in `apps/web/package.json` (not workspace references).

## Current Setup

Your project now has:
- ✅ `packageManager` field in root package.json
- ✅ vercel.json with pnpm commands
- ✅ Root Directory set to apps/web
- ✅ All dependencies in apps/web/package.json

This should work! If not, try the npm-only alternative above.

Deploy and it should succeed! 🚀
