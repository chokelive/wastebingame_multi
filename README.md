# WasteBin Multiplayer Deployment

## How it works

- Mobile players open `index.html`, enter any name, play, and submit scores automatically when a round finishes.
- Desktop players can open the game without login and are not tracked.
- The TV opens `dashboard.html`; it polls `/api/state` and displays every mobile player's score.
- Dashboard `Start Game` creates a new shared round for connected phones.

## Vercel backend

The shared backend is `api/state.js`. It uses Vercel KV or Upstash Redis through these environment variables:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Upstash-compatible names also work:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

On Vercel, add the KV/Redis integration from Storage/Marketplace and connect it to this project. Vercel will add the env vars automatically for the deployment.

Without those env vars, the API falls back to temporary in-memory storage for local testing only.

## URLs

- Player page: `/index.html`
- TV dashboard: `/dashboard.html`
