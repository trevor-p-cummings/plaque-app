# Plaque App

A mobile app that gamifies discovering historical plaques. Check in at plaques, upload photos, read AI-generated narratives, take quizzes, and earn badges.

## Stack

- **Expo React Native** (TypeScript)
- **Supabase** (database, auth, storage, edge functions)
- **react-native-maps** for the map view
- **expo-location** for GPS check-ins
- **expo-image-picker** for photo uploads

## Environment Variables

### Client-side (in `.env`)

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → `anon` `public` key |

These are bundled into the app at build time via Expo's `EXPO_PUBLIC_` prefix.

### Server-side (Supabase Edge Function secrets)

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Used by the `generate-narrative` edge function to call OpenAI. Set via `supabase secrets set`, never in `.env`. |

## Connect to a New Supabase Project

### 1. Create a Supabase project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project. Note your **Project URL** and **anon key** from Settings → API.

### 2. Install the Supabase CLI and log in

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Run the database migration

This creates all tables, indexes, RLS policies, the `increment_points` function, and seeds 20 Toronto plaques with quiz questions.

```bash
supabase db push
```

Or paste `supabase/migrations/001_initial_schema.sql` into the SQL Editor in your Supabase dashboard.

### 4. Create the storage bucket

In your Supabase dashboard → Storage → New Bucket:
- Name: `plaque-photos`
- Public: **yes** (so photo URLs are accessible)

### 5. Deploy the edge function

```bash
supabase functions deploy generate-narrative
supabase secrets set OPENAI_API_KEY=sk-...
```

### 6. Enable auth (optional for testing)

The app uses Supabase Auth for check-ins, photo uploads, and quizzes. Enable at least **email/password** sign-up in Authentication → Providers. For quick local testing, you can create a test user in the dashboard under Authentication → Users.

## Run the App

```bash
# 1. Install dependencies
npm install

# 2. Create your .env from the example
cp .env.example .env
# Edit .env — fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# 3. Start the dev server
npx expo start
```

Then:
- **Phone**: Scan the QR code with Expo Go ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Web**: Press `w` in the terminal
- **Simulator**: Press `i` (iOS) or `a` (Android) if you have simulators installed

### What to test

1. **Map** — the map should center on your location (or Toronto by default) and show 20 plaque markers. Tap a marker callout to open the detail screen.
2. **Plaque detail** — shows title, year, address, and description.
3. **Check-in** — requires GPS within 10 meters of the plaque. For desktop/simulator testing, you can temporarily increase `CHECK_IN_RADIUS` in `lib/location.ts`.
4. **Photo upload** — opens the photo picker; uploads to Supabase Storage.
5. **AI Narrative** — tap "Get AI Narrative" to generate a grounded story and (if no seeded quiz exists) an AI-generated quiz.
6. **Quiz** — answer the quiz question. Seeded quizzes award points; AI quizzes are for fun.

### Typecheck

```bash
npm run typecheck
```

## Project Structure

```
app/
  _layout.tsx        # Root layout with navigation
  index.tsx          # Map screen showing nearby plaques
  plaque/[id].tsx    # Plaque detail: check-in, photo, narrative, quiz
lib/
  supabase.ts        # Supabase client config
  location.ts        # GPS helpers and distance calculation
  badges.ts          # Badge definitions and point constants
types/
  index.ts           # TypeScript type definitions
supabase/
  migrations/        # Database schema + seed data
  functions/         # Edge functions (AI narrative)
```

## Features

- **Map View**: Browse nearby plaques on an interactive map
- **GPS Check-in**: Verify you're within 10m of a plaque to check in
- **Photo Upload**: Snap and upload photos of plaques
- **AI Narrative**: Generate engaging stories from plaque data (server-side, no secrets exposed)
- **Quiz**: Answer questions about plaques for bonus points
- **Points & Badges**: Earn points for check-ins (10), photos (5), and quizzes (15). Unlock badges at 1, 5, 10, 25, and 50 check-ins.
