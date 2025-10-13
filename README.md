# TarkovBuddy - Escape from Tarkov Quest Tracker

Professional Next.js 14 web application for tracking Escape from Tarkov quests, items, and hideout progression.

## 🚀 Features

- **Quest Tracking** - Track Kappa, Lightkeeper, and BTR questlines with automatic dependency handling
- **Quest Items** - Manage quest item requirements with +/− counting
- **Hideout Tracker** - Track hideout station upgrades and required items
- **Quest Path Visualizer** - Interactive dependency diagram
- **Cloud Sync** - Supabase authentication and cloud storage
- **Multi-language** - English and Norwegian support
- **Dark Theme** - Modern, professional design optimized for Tarkov

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **Animations**: Framer Motion
- **Auth**: Supabase Auth (Google, Twitch, Discord)
- **Database**: Supabase PostgreSQL
- **API**: Tarkov.dev GraphQL
- **Deployment**: Vercel-ready

## 📁 Project Structure

```
/app
  /(core)/page.tsx               # Home page (index.html)
  /(core)/about/page.tsx         # About page
  /(core)/quest/page.tsx         # Quest tracker (to be added)
  /(core)/quest-items/page.tsx   # Quest items tracker (to be added)
  /(core)/hideout-items/page.tsx # Hideout tracker (to be added)
  /(core)/quest-path/page.tsx    # Quest path visualizer (to be added)
  /(core)/optimizer/page.tsx     # Route optimizer (to be added)
  /(auth)/login/page.tsx         # Login page (to be added)
  /(embed)/obs-overlay/page.tsx  # OBS overlay (to be added)
  layout.tsx                     # Root layout with metadata
  globals.css                    # Global styles

/components
  Navbar.tsx                     # Navigation bar with auth
  Footer.tsx                     # Footer component
  /ui                            # shadcn/ui components

/lib
  tarkovApi.ts                   # Tarkov.dev API wrapper
  storage.ts                     # Unified localStorage + Supabase storage
  i18n.tsx                       # i18n context provider
  /supabase
    client.ts                    # Browser Supabase client
    server.ts                    # Server Supabase client

/locales
  en.json                        # English translations
  no.json                        # Norwegian translations
```

## 🏃 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for auth and cloud sync)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
Create a `.env.local` file in the root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Run the development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Building for Production

```bash
npm run build
npm start
```

## 📦 Adding New Pages

When you upload additional HTML files, follow this pattern:

1. **Create the route file** in the appropriate directory:
   - Core pages: `/app/(core)/[page-name]/page.tsx`
   - Auth pages: `/app/(auth)/[page-name]/page.tsx`
   - Embed pages: `/app/(embed)/[page-name]/page.tsx`

2. **Use the existing utilities**:
```tsx
"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { storage } from "@/lib/storage";
import { gql, QUERIES } from "@/lib/tarkovApi";

export default function YourPage() {
  const { t } = useI18n();

  // Your page logic here

  return (
    <>
      <Navbar />
      {/* Your content */}
      <Footer />
    </>
  );
}
```

3. **Preserve original JavaScript logic**:
   - Convert to React hooks (useState, useEffect)
   - Use the `storage` utility for data persistence
   - Keep all Tarkov.dev API calls via `gql()` helper

## 🗄️ Database Setup

Run these migrations in your Supabase SQL editor:

```sql
-- User progress storage table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data_key text NOT NULL,
  data_value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, data_key)
);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
  ON user_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

## 🔐 Authentication Setup

Configure OAuth providers in Supabase Dashboard:

1. Go to Authentication → Providers
2. Enable Google, Twitch, and Discord
3. Add redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

## 🌍 Translations

Add translations to `/locales/en.json` and `/locales/no.json`:

```json
{
  "your": {
    "translation": {
      "key": "Translation value"
    }
  }
}
```

Use in components:
```tsx
const { t } = useI18n();
<h1>{t("your.translation.key")}</h1>
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The project is pre-configured for Vercel deployment.

### Other Platforms

The app builds as a standard Next.js application and can be deployed to any Node.js hosting platform.

## 🔧 Development

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Format Code (when Prettier is configured)
```bash
npm run format
```

## 📝 Migration Notes

- All original HTML pages maintain their exact functionality
- JavaScript logic is preserved in React hooks
- Tarkov.dev API calls remain unchanged
- localStorage is used as fallback; Supabase syncs when logged in
- All text content and design intent preserved from original HTML

## 🤝 Contributing

This is a hobby project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

Free to use. Made by players, for players.

## 🔗 Links

- **Live Site**: https://www.tarkovbuddy.org
- **Discord**: https://discord.gg/g8xS66WA3p
- **Tarkov.dev API**: https://tarkov.dev

---

Made with ❤️ for the Tarkov community by Knivet
