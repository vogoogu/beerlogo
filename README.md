# Brauatelier – UI prototype

Five files, no folders. One Cloudflare Worker serves the website and makes images with
Cloudflare Workers AI (FLUX.1 schnell). No API key needed.

- index.html      the whole prototype (landing, book a slot, design studio)
- three.min.txt   three.js r128 (MIT licence), the 3D library
- worker.js       serves the site and handles POST /api/generate (prompts live here)
- wrangler.toml   Worker + AI binding. `name` must match your Cloudflare project name.

Deploy: put all five files at the TOP LEVEL of the GitHub repo, then Cloudflare →
Workers & Pages → Import a repository. Build command empty, deploy command `npx wrangler deploy`.

Prompts: edit the lists at the top of worker.js. Only the chosen beer style, flavour twist and
colour go into prompts, never typed text.

Before real traffic: add a rate-limiting rule for /api/generate in Cloudflare.
