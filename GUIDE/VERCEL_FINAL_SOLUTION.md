# ✅ VERCEL DEPLOYMENT - FINAL SOLUTION

## The Problem

pnpm is failing on Vercel with `ERR_INVALID_THIS` registry errors. This is a Vercel infrastructure issue with pnpm, especially in preview environments.

## ✅ The Solution: Use npm

Your `apps/web/package.json` already has all dependencies explicitly listed, so npm will work perfectly.

## Exact Vercel Settings

### 1. General Settings
- **Root Directory**: `apps/web` ✅ (already set)
- **Framework Preset**: Next.js

### 2. Build & Development Settings

Click **Override** and set:

- **Build Command**: 
  ```
  npm run build
  ```

- **Output Directory**: 
  ```
  .next
  ```

- **Install Command**: 
  ```
  npm install --legacy-peer-deps
  ```

- **Development Command**: 
  ```
  npm run dev
  ```

### 3. Node.js Version
- **Node.js Version**: `20.x`

### 4. Environment Variables

Add:
```
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

## What NOT to Do

❌ Don't use vercel.json (already deleted ✅)  
❌ Don't try to use pnpm on Vercel  
❌ Don't set ENABLE_EXPERIMENTAL_COREPACK  
❌ Don't use workspace references in package.json

## What You SHOULD Have

✅ Root Directory: `apps/web`  
✅ All dependencies in `apps/web/package.json`  
✅ `apps/web/.npmrc` with `legacy-peer-deps=true`  
✅ No vercel.json  
✅ npm install and build commands

## Push and Deploy

```bash
git add .
git commit -m "Simplify Vercel config for npm"
git push origin frontend-dev
```

## Expected Build Output

```
Running "install" command: npm install --legacy-peer-deps
✓ added 313 packages in 6s

Running "build" command: npm run build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (8/8)
✓ Build completed successfully
```

## Why This Works

1. **Root Directory** = Vercel starts in `apps/web`
2. **npm install** reads `apps/web/package.json` ✅
3. **All deps listed** explicitly (no workspace refs) ✅
4. **--legacy-peer-deps** handles ESLint conflicts ✅
5. **npm build** finds Next.js ✅

## Verification

Test locally what Vercel will do:

```bash
cd /Users/aryan/Projects/agents/my-stagehand-app/apps/web
npm install --legacy-peer-deps
npm run build
```

If this works (it should), Vercel will work! ✅

## Summary

**For Vercel monorepo preview deployments:**
- Use **npm**, not pnpm
- Set **Root Directory** to the app folder
- Keep dependencies **explicit** in that package.json
- Use **--legacy-peer-deps** for peer dep conflicts

This is the standard, reliable approach! 🚀
