# ALLCITY Pulse (v1)

Finds what's trending in each market's sports news and surfaces ALLCITY O&O audio, video, and articles that mention it, so producers can republish and share.

## How it works

1. **Ingest** (`/api/ingest`, every 30 min via Vercel Cron)
   - Pulls every feed in `config/markets.ts` and merges new items into a per-market index. Items stay in the index after they drop out of a feed, so the archive grows over time.
   - Pulls the last 2 days of Google News headlines for each team in the market.
   - Extracts trends: 2-3 word phrases (players, coaches, storylines) repeated across headlines. These are ranked by how many outlets cover them and how recent the coverage is, and duplicate story clusters are merged. Team nicknames and cities are excluded so trends name the story, not the team.
2. **Match** (on page load)
   - Content must contain the trend phrase. Title hits rank above description hits. Co-occurring phrases (e.g. "jacksonville jaguars" alongside "jalen hurts") and home-market content add weight.
   - Content older than a year shows its year in red, which marks it as an archive pull.
3. **Search** box: free-text search across the full library.
4. **Live feed** (`/live`): everything ALLCITY published in the last 6h / 24h / 3d / 7d across audio, video, articles, and FAST, newest first. Filter by market and type.
   - **Plays in place:** YouTube videos open an embedded player in the row; podcast episodes play in a sticky audio bar. Live YouTube streams are badged and pinned to the top (needs `YOUTUBE_API_KEY`). 24/7 live channels (HLS or audio streams) go in `config/streams.ts` and show in an "On air" strip.
   - **Real time:** the page polls `/api/live` every 15 seconds and new items slide in. While anyone has the page open, YouTube, article, and FAST feeds are re-checked at most once a minute. New YouTube uploads and Simplecast episodes are also **pushed** via WebSub (`/api/websub`): the full ingest subscribes to every feed that advertises a hub and renews every 4 days, so new items land within seconds of publishing.
   - The live page reads a small store (`pulse/live.json`, last ~8 days) rather than the full indexes.

YouTube channels for DNVR, CHGO, PHLY, PHNX, and DLLS are set in `config/markets.ts`. Each market's article RSS feed (and YouTube channel, for markets without one configured) is found automatically from its homepage (`site` in `config/markets.ts`), re-checked daily. The article feed falls back to WordPress's `/feed/` path. Any discovery failure shows up in the ingest response under `feedErrors`.

Storage is one JSON file per market in Vercel Blob. Local dev writes to `./.data`.

## Setup

```bash
npm install
npm run dev
# in another terminal, build the index:
curl http://localhost:3000/api/ingest
```

`config/markets.ts` is loaded with all 78 Simplecast feeds from the show list (active and inactive - inactive shows are indexed for their back catalogs). National and "Other" shows sit under an ALLCITY National tab.

To add video and article content:

```ts
{ url: "https://www.youtube.com/feeds/videos.xml?channel_id=...", type: "video" },
{ url: "https://.../articles/rss", type: "article" },
```

Still open: KCSN feeds and teams, a feed for PHNX Wildcats, and FAST channel MRSS feeds (`{ url, type: "fast" }`). Add extra YouTube channels as `{ url: "youtube:@Handle", type: "video" }`.

## Deploy (GitHub + Vercel)

1. Push this repo to GitHub and import it in Vercel. Framework preset: Next.js.
2. Go to Vercel project > Storage > create a **Blob** store and connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`.
3. Add env vars `CRON_SECRET` (any long random string) and `YOUTUBE_API_KEY`.
4. Deploy, then build the first index:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/ingest
   ```
   One market only: `/api/ingest?market=phly`.

**Scheduled refresh (works on Vercel Hobby).** One daily cron (10:00 UTC, about 6 AM ET) calls `/api/ingest?chain=0`. Each step refreshes one market in the background, then calls the next step, so every market gets its own function time limit. The sidebar toggle (Daily / 30 min) controls frequency: in 30 min mode, any visit to the app starts a new full refresh when the last one is over 30 minutes old. The live page's real-time updates (15-second polling, push notifications) run in either mode.

On a Pro plan you can add more crons to `vercel.json` (e.g. `{ "path": "/api/ingest?chain=0", "schedule": "*/30 * * * *" }`).

Simplecast feeds use the show homepage as every episode's link, so episodes link to `https://player.simplecast.com/<episode-id>` instead. Click-test a few after the first ingest.

### WebSub checklist
- Hubs must reach `https://<your-app>/api/websub`. If Deployment Protection is on, enable **Protection Bypass for Automation** in Vercel (it sets `VERCEL_AUTOMATION_BYPASS_SECRET`, which the callback URL includes).
- Subscriptions are created on the first full ingest after deploy. Failures show in `feedErrors` as `websub: ...`.
- Pushes are verified against a per-feed HMAC secret; unsigned or mis-signed pushes are ignored.

## Known v1 limits

- **Archive depth = feed depth.** Podcast feeds usually include full history. With `YOUTUBE_API_KEY` set, each YouTube channel's full upload history is backfilled once on the first full ingest (resumes if cut short; progress in the index under `youtubeBackfill`). Article feeds are short, so older articles need a sitemap/CMS backfill.
- **Matching is literal.** "Hurts" alone won't match "Jalen Hurts", and nicknames won't match. Both are fixed by the transcript + entity phase below.
- **Google News RSS** is a public but unofficial endpoint. If it rate-limits, swap `fetchGoogleNews` in `lib/rss.ts` for a news API.
- The page is open to anyone with the URL. Put it behind Vercel Deployment Protection or SSO before sharing widely.

## Next phases

- **Transcripts:** `ContentItem.transcript` is already searched when present. Write transcripts into the index (or move the index to Postgres full-text / Typesense once it outgrows a JSON file), and return timestamps so producers can jump to the clip.
- **Entity aliases:** a roster file (player > nicknames/last name) to widen matching.
- **Slack digest:** post the top matched trends per market to each market's channel.

## Code map

- `config/markets.ts` - markets, teams, feeds
- `lib/ingest.ts` - feed + trend refresh, merge into index
- `lib/trends.ts` - headline-to-trend extraction
- `lib/match.ts` - trend-to-content scoring, free-text search
- `lib/store.ts` - Blob / local file storage
- `app/page.tsx` - trending view
- `app/live/page.tsx` - live feed
- `lib/live.ts` - live store, on-view refresh, push handling
- `lib/websub.ts` - WebSub subscribe/verify
- `components/LiveView.tsx`, `components/Player.tsx` - live page, players
- `lib/discover.ts` - finds article feeds and YouTube channels from market homepages
