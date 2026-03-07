# Plaque App

A mobile app that gamifies discovering historical plaques. Check in at plaques, upload photos, read AI-generated narratives, take quizzes, and earn badges.

## Stack

- **Expo React Native** (TypeScript)
- **Supabase** (database, auth, storage, edge functions)
- **react-native-maps** for the map view
- **expo-location** for GPS check-ins
- **expo-image-picker** for photo uploads

## Local Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone <repo-url>
cd plaque-app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase project URL and anon key in `.env`.

### 3. Set up Supabase

Run the migration against your Supabase project:

```bash
supabase db push
```

Or run the SQL in `supabase/migrations/001_initial_schema.sql` manually via the Supabase SQL editor.

Create a storage bucket called `plaque-photos` in your Supabase dashboard.

### 4. Deploy the edge function

```bash
supabase functions deploy generate-narrative
```

Set the `OPENAI_API_KEY` secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### 5. Run the app

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone.

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
  migrations/        # Database schema
  functions/         # Edge functions (AI narrative)
```

## Features

- **Map View**: Browse nearby plaques on an interactive map
- **GPS Check-in**: Verify you're within 50m of a plaque to check in
- **Photo Upload**: Snap and upload photos of plaques
- **AI Narrative**: Generate engaging stories from plaque data (server-side, no secrets exposed)
- **Quiz**: Answer questions about plaques for bonus points
- **Points & Badges**: Earn points for check-ins, photos, and quizzes. Unlock badges at milestones.
