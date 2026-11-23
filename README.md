# Brauatelier – UI prototype

One Cloudflare Worker: it serves the website and makes images with Cloudflare Workers AI
(FLUX.1 schnell). **No API key is needed.**

```
public/index.html   the whole prototype (landing, book a slot, design studio)
public/vendor/      three.js r128 (MIT), served locally
src/worker.js       POST /api/generate (logo + label pattern prompts live here)
wrangler.toml       Worker + assets + AI binding
```

## Deploy (Cloudflare Workers Builds from GitHub)

1. Push this folder to GitHub (folder contents = repo root).
2. Cloudflare dashboard → Workers & Pages → Create → Import a repository → pick the repo.
3. Project name: must match `name` in `wrangler.toml` (currently `brauatelier`). If your project
   has another name, change `name` in `wrangler.toml` to match.
4. Build command: leave empty. Deploy command: `npx wrangler deploy` (the default).
5. Save and deploy. Every push to `main` redeploys.

The AI binding is declared in `wrangler.toml` (`[ai]`), so there is nothing else to configure.
If you are asked to enable Workers AI, accept (the free plan includes a daily allowance).

## Prompts

Edit the lists at the top of `src/worker.js` (`MOTIFS`, `PATTERN_MOTIFS`, `TWISTS`, `COLORS`).
No user-typed text goes into a prompt, only the chosen beer style, flavour twist and colour.

## Before real traffic

- Add a rate-limiting rule for `/api/generate` (Cloudflare → Security → WAF → Rate limiting).
- Prices, batches and dates are placeholders; reservations are not stored or charged yet.

## Local testing

`npx wrangler dev` (Workers AI runs against your Cloudflare account, so you must be logged in).
