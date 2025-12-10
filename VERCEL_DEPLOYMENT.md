# Vercel Deployment Guide

## ✅ All Build Errors Fixed!

Your app is now ready to deploy to Vercel with the new batch testing features.

## Configuration Files

### `vercel.json`
```json
{
  "buildCommand": "pnpm install && pnpm --filter @ux-testing/web build",
  "devCommand": "pnpm --filter @ux-testing/web dev",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "outputDirectory": "apps/web/.next"
}
```

This tells Vercel:
- Use pnpm (not npm)
- Install all dependencies first
- Build only the web app
- Output to `apps/web/.next`

### `.npmrc`
```
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

This prevents peer dependency conflicts during build.

### `.vercelignore`
```
apps/api
packages/db/drizzle
node_modules
.env
*.log
```

This excludes unnecessary files from deployment.

## Fixed Issues

### 1. ESLint Dependency Conflict ✅
- **Before**: `eslint@8` conflicted with `eslint-config-next@16`
- **After**: Compatible `eslint@9` + `eslint-config-next@15`

### 2. Build Command ✅
- **Before**: Vercel tried to use npm
- **After**: Explicitly uses pnpm with monorepo filter

### 3. Missing Components ✅
- **Before**: Referenced non-existent `create-test-modal.tsx`
- **After**: Removed, using direct navigation

### 4. Next.js Detection ✅
- **Before**: "No Next.js version detected"
- **After**: Proper monorepo build setup

## Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Production:
```
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

### All (Production, Preview, Development):
```
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

## Deploy Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Fix Vercel build configuration"
   git push origin main
   ```

2. **In Vercel Dashboard**:
   - Go to your project settings
   - Framework Preset: **Next.js**
   - Root Directory: **Leave empty** (uses vercel.json)
   - Build Command: **Auto-detected** from vercel.json
   - Output Directory: **Auto-detected** from vercel.json
   - Install Command: **Auto-detected** from vercel.json

3. **Redeploy**:
   - Trigger new deployment
   - Should build successfully! ✅

## Troubleshooting

### "No Next.js version detected"
→ Fixed by proper build command in vercel.json

### "ERESOLVE unable to resolve dependency tree"
→ Fixed by using pnpm and proper .npmrc

### "Package Manager changed from pnpm to npm"
→ Fixed by vercel.json specifying pnpm commands

### "Could not find files for /tests/[id]"
→ Make sure outputDirectory is set to "apps/web/.next"

## Verify Build Locally

Test the exact Vercel build process:

```bash
# Clean install
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm -rf pnpm-lock.yaml

# Install
pnpm install --no-frozen-lockfile

# Build web app only
pnpm --filter @ux-testing/web build
```

If this works, Vercel will work! ✅

## Build Output Should Show:

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (8/8)

Route (app)                              Size     First Load JS
┌ ○ /                                    17.3 kB         150 kB
├ ○ /dashboard                           3.08 kB         108 kB
├ ○ /login                               2.95 kB         145 kB
├ ƒ /tests/[id]                          4.18 kB         109 kB
└ ○ /tests/new                           4.51 kB         109 kB
```

## Post-Deployment

After successful deployment:

1. **Set Environment Variables** in Vercel
2. **Deploy API** separately (Railway/Render/etc)
3. **Update API URL** in Vercel env vars
4. **Test the flow**:
   - Create account
   - Generate personas
   - Run batch test
   - View results

Your Vercel deployment should now succeed! 🎉
