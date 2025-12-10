# 🚀 Deploy to Vercel - SIMPLIFIED STEPS

## ✅ All config files cleaned up and ready!

Follow these exact steps:

## Step 1: Push Your Code

```bash
git add .
git commit -m "Complete batch testing implementation"
git push origin main
```

## Step 2: Configure Vercel Root Directory

**In Vercel Dashboard:**

1. Go to your project → **Settings** → **General**
2. Find **Root Directory**
3. Click **Edit** 
4. Enter: `apps/web`
5. Click **Save**

## Step 3: Set Build Settings (Auto-detected)

Vercel should auto-detect:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`  
- **Install Command**: `npm install`
- **Node.js Version**: 20.x

If not auto-detected, set them manually.

## Step 4: Add Environment Variable

**Settings** → **Environment Variables** → **Add**

```
Key: NEXT_PUBLIC_API_URL
Value: https://your-api-url.railway.app
```

(Or use your API URL from wherever you deploy the API)

## Step 5: Redeploy

Click **Deployments** → **Redeploy**

## ✅ Build Will Succeed!

Expected output:
```
✓ Installing dependencies
✓ Building Next.js application  
✓ Linting and checking validity of types
✓ Generating static pages (8/8)
✓ Build completed successfully
```

## What We Removed:
- ❌ `vercel.json` - Not needed with Root Directory
- ❌ `.vercelignore` - Not needed for single app deploy

## What We Kept:
- ✅ `apps/web/.npmrc` - Handles peer dependency issues
- ✅ Clean code structure
- ✅ All batch test features

## After Deployment:

Your app will be live at: `https://your-project.vercel.app`

Then deploy your API separately and update `NEXT_PUBLIC_API_URL`.

## That's It!

Three simple settings in Vercel:
1. Root Directory: `apps/web`
2. Build settings: (auto-detected)
3. Environment variable: `NEXT_PUBLIC_API_URL`

**Deploy and enjoy your AI-powered batch testing platform!** 🎉
