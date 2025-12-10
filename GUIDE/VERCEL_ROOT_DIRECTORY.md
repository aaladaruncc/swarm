# Vercel Root Directory Configuration

## The Issue

Vercel is installing at the root but Next.js is in `apps/web/package.json`.

## Solution Options

### Option 1: Set Root Directory in Vercel (Recommended)

In Vercel Dashboard → Project Settings → General:

1. **Root Directory**: `apps/web`
2. **Framework Preset**: Next.js (auto-detected)
3. **Build Command**: (leave default or use `npm run build`)
4. **Output Directory**: (leave default `.next`)
5. **Install Command**: `npm install --legacy-peer-deps`

Then **DELETE** the `vercel.json` file from your repo (not needed).

### Option 2: Keep vercel.json (Current Setup)

The updated `vercel.json` should work:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd apps/web && npm install --legacy-peer-deps && npm run build",
  "installCommand": "echo 'Skipping root install'",
  "outputDirectory": "apps/web/.next"
}
```

This:
- Skips root install
- Changes to apps/web directory
- Installs dependencies there
- Builds from apps/web

## Recommended: Use Option 1

**Best practice for Vercel monorepos:**

1. Go to Vercel Dashboard
2. Project Settings → General
3. Set **Root Directory** to `apps/web`
4. Remove `vercel.json` from repo
5. Redeploy

This is cleaner and more maintainable.

## Quick Fix Command

If using Option 1:
```bash
# Remove vercel.json
rm vercel.json

# Commit
git add .
git commit -m "Remove vercel.json - using Root Directory setting"
git push
```

Then in Vercel:
- Settings → General → Root Directory → `apps/web`
- Redeploy

## Verify Settings

After setting Root Directory to `apps/web`, Vercel should show:

```
Framework: Next.js 14.2.21
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Root Directory: apps/web
Node.js Version: 20.x
```

## Environment Variables

Add in Vercel (same for both options):

```
NEXT_PUBLIC_API_URL=https://your-api-url.railway.app
```

Your deployment should now succeed! 🚀
