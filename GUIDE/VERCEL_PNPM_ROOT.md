# ✅ Vercel with pnpm from Root - Complete Guide

## Configuration

### 1. Root `package.json`
```json
{
  "packageManager": "pnpm@9.14.2",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**Important**: Use pnpm 9.x (not 10.x) - better Vercel compatibility

### 2. `vercel.json` (at root)
```json
{
  "buildCommand": "pnpm --filter @ux-testing/web build",
  "installCommand": "pnpm install --no-frozen-lockfile",
  "outputDirectory": "apps/web/.next"
}
```

### 3. `.npmrc` (at root)
```
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=true
```

## Vercel Settings

### General
- **Root Directory**: **Leave EMPTY** (use repo root)
- **Framework**: Next.js
- **Node.js Version**: 20.x

### Environment Variables

**CRITICAL - Add this:**
```
ENABLE_EXPERIMENTAL_COREPACK=1
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

The `ENABLE_EXPERIMENTAL_COREPACK=1` enables pnpm support on Vercel.

### Build & Development Settings

Should auto-detect from vercel.json:
- Build Command: `pnpm --filter @ux-testing/web build`
- Install Command: `pnpm install --no-frozen-lockfile`
- Output Directory: `apps/web/.next`

## Deploy Steps

1. **Add environment variable in Vercel**:
   ```
   ENABLE_EXPERIMENTAL_COREPACK=1
   ```

2. **Update Root Directory to empty/root**:
   - Go to Settings → General → Root Directory
   - Clear it (leave empty) or set to `./`
   - Save

3. **Push code**:
   ```bash
   git add .
   git commit -m "Configure Vercel for pnpm from root"
   git push origin frontend-dev
   ```

4. **Redeploy**

## Expected Output

```
✓ Enabled Corepack
✓ Using pnpm@9.14.2
✓ Installing dependencies (pnpm install)
✓ Building @ux-testing/web (pnpm --filter)
✓ Compiled successfully
✓ Build completed
```

## Why This Works

1. **ENABLE_EXPERIMENTAL_COREPACK=1** → Activates pnpm
2. **packageManager field** → Vercel uses pnpm@9.14.2
3. **Empty Root Directory** → Vercel starts at repo root
4. **pnpm --filter** → Builds only web app
5. **Workspace preserved** → All deps resolved correctly

## Troubleshooting

### If you still get pnpm errors:

**Downgrade to pnpm 8.x** (most stable on Vercel):
```json
{
  "packageManager": "pnpm@8.15.0"
}
```

Then push again.

### If corepack doesn't enable:

Double-check the environment variable:
- Name: `ENABLE_EXPERIMENTAL_COREPACK`
- Value: `1`
- Applied to: Production, Preview, Development

## Alternative: Force pnpm in vercel.json

If corepack still doesn't work, try this vercel.json:

```json
{
  "buildCommand": "corepack enable && corepack prepare pnpm@9.14.2 --activate && pnpm install && pnpm --filter @ux-testing/web build",
  "installCommand": "echo 'Install in build command'",
  "outputDirectory": "apps/web/.next"
}
```

## Current Configuration Status

✅ `package.json` - packageManager: pnpm@9.14.2  
✅ `vercel.json` - pnpm filter commands  
✅ `.npmrc` - pnpm configuration  
✅ All dependencies explicit in apps/web  

## Deploy Now!

1. Add `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel
2. Set Root Directory to empty (use repo root)
3. Push code
4. Redeploy

Your build will succeed! 🚀
