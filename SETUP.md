# Travel Dashboard — Setup Guide

## What's Built

A professional travel deal dashboard with:
- **Package Grid** — Browse auto-generated travel packages (flights, hotels, cars)
- **Package Detail** — Click any package to see full deals, order links, and trip essentials
- **Trip Essentials/Extras** — Snorkels, insurance, gear for each destination
- **Intake Form** — Boss submits deals he finds manually; I build packages from them
- **Upload Area** — Upload screenshots, URLs, or notes → I parse and add to packages
- **Auto-expiry** — Packages expire after 7 days with refresh prompts

## Live URL

https://travel-dashboard-sage.vercel.app

Currently showing sample data. To connect real backend:

## Step 1: Create Supabase Project

1. Go to https://supabase.com → Sign in / Create account
2. Create a new project (pick region closest to you)
3. Once created, note your **Project URL** and **anon/public key** from Settings → API

## Step 2: Run the Schema

In Supabase SQL Editor, run `sup_schema.sql` (found in this repo). This creates all tables:
- `packages` — travel packages with expiry dates
- `deals` — flights, hotels, cars within each package  
- `extras` — trip essentials (snorkels, insurance, etc.)
- `manual_uploads` — Boss's screenshot/URL/note uploads
- `intake_submissions` — intake form submissions

## Step 3: Add Environment Variables on Vercel

Go to your Vercel project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Then redeploy. The app will connect and pull real data.

## Step 4: Connect Travel Scrapers (optional)

The scrapers at `D:\OpenClaw\TravelScraper\` can POST to the intake form endpoint:
```
POST /api/intake
{
  "destination": "Cancún, Mexico",
  "origin": "DFW",
  "start_date": "2026-09-15",
  "end_date": "2026-09-22",
  "flight_info": "...",
  "hotel_info": "...",
  "notes": "..."
}
```

## Cron for Intake Checking

I'll set up a Vercel cron or OpenClaw cron to check intake_submissions every 2 hours:
- Status = 'pending' → triggers package generation
- After processing → status = 'completed'

---

**TL;DR:** Just run the SQL on Supabase, add env vars to Vercel, and redeploy. The UI is fully functional right now with sample data! 🦞
