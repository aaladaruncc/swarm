# 🎯 Vercel Monorepo + Preview Environments - DEFINITIVE FIX

## The Real Issue

Vercel's preview environments struggle with pnpm monorepos because:
1. Package manager auto-detection is inconsistent
2. Workspace dependencies aren't resolved properly with npm
3. Build cache gets confused when switching managers
4. Root Directory setting alone isn't enough

## ✅ The Complete Solution

### Option A: Standalone Web App (Recommended for Vercel)

Make `apps/web` buildable independently without workspace dependencies.

#### Step 1: Update `apps/web/package.json`

Make sure ALL dependencies are listed (not workspace references):

```json
{
  "dependencies": {
    "next": "14.2.21",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "better-auth": "^1.4.6",
    "ai": "^5.0.108",
    "@ai-sdk/openai": "^2.0.80",
    "lucide-react": "^0.556.0",
    "framer-motion": "^12.23.25",
    "lenis": "^1.3.15"
  }
}
```

✅ No workspace:* references  
✅ All deps explicitly listed  
✅ Works with npm install

#### Step 2: Vercel Settings

**In Vercel Dashboard:**

1. **General Settings**:
   - Root Directory: `apps/web`
   - Framework: Next.js
   - Node.js Version: 20.x

2. **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install --legacy-peer-deps`

3. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-url.com
   ```

4. **Remove** `vercel.json` from repo (not needed)

#### Step 3: Deploy

```bash
git add .
git commit -m "Make web app standalone for Vercel"
git push origin frontend-dev
```

---

### Option B: Keep pnpm Workspace (Advanced)

If you need workspace features, force Vercel to use pnpm properly.

#### Step 1: Enable Corepack in Vercel

Add environment variable:
```
ENABLE_EXPERIMENTAL_COREPACK=1
```

#### Step 2: Update Root `package.json`

```json
{
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

Use pnpm 9.x (Vercel's corepack supports this).

#### Step 3: Create `vercel.json` in Root

```json
{
  "buildCommand": "pnpm install && pnpm --filter @ux-testing/web build",
  "outputDirectory": "apps/web/.next"
}
```

#### Step 4: Vercel Settings

- Root Directory: **Leave empty** (use repo root)
- Let vercel.json handle everything

#### Step 5: Deploy

```bash
git add .
git commit -m "Configure Vercel for pnpm workspace"
git push origin frontend-dev
```

---

## 🎯 Which Option Should You Choose?

### Choose Option A (Standalone) if:
- ✅ You want simpler, more reliable Vercel deploys
- ✅ You don't share code between apps
- ✅ You want preview environments to "just work"
- ✅ You're okay with explicit dependency lists

**Pros**: Reliable, simple, works with npm  
**Cons**: Duplicate dependency versions possible

### Choose Option B (Workspace) if:
- ✅ You share packages between apps
- ✅ You need workspace dependency management
- ✅ You're comfortable with advanced config

**Pros**: True monorepo, shared dependencies  
**Cons**: More complex, Vercel-specific config needed

## 🚀 Recommended: Option A

For most projects, especially with preview environments, **Option A is more reliable**.

Current state: Your `apps/web/package.json` already has all dependencies listed explicitly, so you're ready for Option A!

## Quick Fix (Option A):

1. **Vercel Settings**:
   - Root Directory: `apps/web`
   - Build Command: `npm run build`
   - Install Command: `npm install --legacy-peer-deps`

2. **Delete vercel.json** (optional):
   ```bash
   git rm vercel.json
   git push origin frontend-dev
   ```

3. **Redeploy**

That's it! ✅

## Test Locally

Verify npm build works standalone:

```bash
cd apps/web
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

If this works, Vercel will work! ✅

## 🎉 Final Answer

**For preview environments on Vercel with monorepos:**
- Use **standalone app config** (Option A)
- Root Directory: `apps/web`
- Let Vercel use npm with `--legacy-peer-deps`
- No complex vercel.json needed

This is the most reliable setup for Vercel previews! 🚀
