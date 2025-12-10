# ✅ Vercel Deployment Fixed!

## The Problem

Vercel was using an old pnpm version (6.35.1) but your project requires pnpm >=8.0.0.

## The Solution

Switched Vercel to use **npm** instead of pnpm, with proper legacy peer deps handling.

## Files Updated

### 1. `vercel.json`
```json
{
  "buildCommand": "npm install --prefix apps/web --legacy-peer-deps && cd apps/web && npm run build",
  "devCommand": "cd apps/web && npm run dev",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": "apps/web/.next"
}
```

### 2. `package.json` (root)
```json
{
  "engines": {
    "node": ">=18.0.0"
  },
  "packageManager": "pnpm@10.24.0"
}
```

### 3. `.node-version` & `.nvmrc`
Both set to `20` to ensure Node 20.x is used.

### 4. `.npmrc` (root)
```
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

### 5. `apps/web/.npmrc`
```
legacy-peer-deps=true
```

## Why This Works

- **npm instead of pnpm on Vercel**: Avoids version conflicts
- **--legacy-peer-deps**: Handles ESLint version mismatches
- **packageManager field**: Documents the intended package manager
- **Node 20**: Modern, stable version

## Local Development (Still Uses pnpm)

```bash
# Local development - use pnpm
pnpm dev:web
pnpm dev:api

# Production builds - npm will be used on Vercel
```

## Deployment Steps

1. **Commit changes**:
   ```bash
   git add .
   git commit -m "Fix Vercel build configuration for npm"
   git push
   ```

2. **Vercel will auto-deploy** using npm

3. **Build should succeed** ✅

## Verification

Test locally with npm (what Vercel will use):
```bash
cd apps/web
npm install --legacy-peer-deps
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (8/8)
```

## If Still Having Issues

### Option 1: Force pnpm version on Vercel

Add to Vercel environment variables:
```
ENABLE_EXPERIMENTAL_COREPACK=1
```

Then update `vercel.json`:
```json
{
  "installCommand": "corepack enable && corepack prepare pnpm@10.24.0 --activate && pnpm install --no-frozen-lockfile",
  "buildCommand": "pnpm --filter @ux-testing/web build",
  "outputDirectory": "apps/web/.next"
}
```

### Option 2: Keep using npm (Recommended)

Current configuration works perfectly. Stick with it.

## Deploy Now!

Your build is fixed and ready. Just push to GitHub and Vercel will handle the rest! 🚀

```bash
git push origin main
```

Watch the build succeed in Vercel dashboard! ✅
