# Deployment & Environment Configuration Guide

## 1. Required Environment Variables

The application requires the following environment variables for Supabase database authentication and persistent cloud storage:

| Variable Name | Description | Example / Required Format |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Anonymous API Key | `sb_publishable_...` or `eyJ...` |

> **Security Rule**: Never commit `.env`, `.env.production`, or real secret keys to Git. These variables must be configured directly in your hosting platform (Vercel) settings or `.env.local` for local development.

---

## 2. Vercel Web Deployment Checklist

### A. Configuring Environment Variables in Vercel
1. Navigate to your Vercel Dashboard: `https://vercel.com/<team>/sports-video-analysis/settings/environment-variables`
2. Add `VITE_SUPABASE_URL` with Environment set to **Production, Preview, Development**.
3. Add `VITE_SUPABASE_ANON_KEY` with Environment set to **Production, Preview, Development**.
4. Click **Save**.

### B. Triggering a Clean Production Redeploy
Whenever you update environment variables, trigger a fresh redeployment:
1. Go to **Deployments** tab: `https://vercel.com/<team>/sports-video-analysis/deployments`
2. Click on the latest deployment -> click the `...` (options menu) -> Select **Redeploy**.
3. (Optional via CLI):
   ```bash
   npx vercel redeploy <deployment_id>
   ```

### C. Domain Aliasing & Cache Invalidation
Ensure your production alias points to the latest deployment:
```bash
npx vercel alias set <new_deployment_url> sports-video-analysis-n6ur.vercel.app
```

---

## 3. Local Desktop (macOS Electron) Build

To package and install the macOS application locally on your machine:
```bash
npm run package
```
This automatically compiles the TypeScript/Vite bundle and installs the `.app` directly to `/Applications/SportsVideoAnalysis.app`.

---

## 4. Troubleshooting

- **Login Error with "データベース接続が未設定です"**:
  - Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured in Vercel environment variables.
  - Redeploy the project after saving the variables.
- **Build Warning in Console**:
  - `vite.config.ts` will emit a build-time warning if Supabase environment variables are missing during `npm run build`.
