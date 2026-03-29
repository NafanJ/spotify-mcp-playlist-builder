@AGENTS.md

# Project: Spotify Playlist Builder

A collaborative playlist-building app where users submit songs to events and AI helps discover tracks by vibe. No approval step — submissions go live immediately.

## Stack

- **Next.js 16.2.1** (App Router, React 19, React Compiler enabled)
- **TypeScript** (strict mode, path alias `@/*` → `./src/*`)
- **Supabase** — PostgreSQL DB + auth (`@supabase/ssr` for server, `@supabase/supabase-js` for client)
- **Tailwind CSS 4**
- **Spotify Web API** — track search, playlist management, cover art sync
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) — vibe-to-search-query interpretation

## Key File Locations

| Path | Role |
|------|------|
| `src/app/page.tsx` | Home — redirects to latest open event |
| `src/app/event/[slug]/page.tsx` | Public event page + submission UI |
| `src/app/search/page.tsx` | Track search interface |
| `src/app/vibe/page.tsx` | AI vibe-based discovery |
| `src/app/admin/dashboard/page.tsx` | Admin dashboard — event management + playlist view |
| `src/app/api/` | All API routes |
| `src/components/` | Shared React components |
| `src/components/SuccessScreen.tsx` | Post-submission screen: playlist + Spotify follow link |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/lib/spotify.ts` | Spotify API wrapper |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |

## Environment Variables

```
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI          # e.g. http://localhost:3000/api/auth/spotify/callback
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
```

## Conventions

- **Styling**: Tailwind only — no CSS modules. Dark theme (`zinc-950`/`zinc-900`), Spotify green (`#1DB954`) as accent.
- **Server vs Client**: Pages/data-fetching use Server Components; interactive UI uses `"use client"`.
- **Auth**: Admins authenticate via Supabase. Public users identified by localStorage UUID fingerprint.
- **Spotify OAuth**: Admins connect their Spotify account to manage playlists (authorization code flow). Public search uses client credentials.
- **AI vibe flow**: User prompt → Claude generates 3-5 search queries → parallel Spotify searches → deduplicated results.
- **Submission flow**: Submissions insert directly as `approved` and are added to the Spotify playlist immediately. No moderation step.
- **Spotify add on submit**: Uses `get_event_spotify_connection` and `update_event_spotify_token` SECURITY DEFINER RPCs to read/refresh the admin's token from `admin_spotify_connections` without needing service role.
- **Duplicate detection**: 409 response if the same track is submitted twice to the same event.

## Database Tables (Supabase)

- `playlist_events` — event metadata (slug, title, theme, Spotify playlist ID, open/closed)
- `submissions` — song submissions (track info, status, fingerprint, source)
- `admin_spotify_connections` — stored Spotify OAuth tokens per admin user

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run lint    # ESLint
```
