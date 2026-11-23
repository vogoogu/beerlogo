# Brauatelier – UI prototype

Static site plus one serverless function, deployed on Cloudflare Pages from GitHub.

```
public/index.html          the whole prototype (landing, book a slot, design studio)
public/vendor/             three.js r128 (MIT), served locally
functions/api/generate.js  server-side proxy to your logo/label API (holds the key)
wrangler.toml              Cloudflare Pages settings
.dev.vars.example          template for local secrets
```

## Where the API key goes

Never in `index.html`, never in GitHub. The browser calls `/api/generate`; that function
adds the key on the server.

1. **Production:** Cloudflare dashboard → Workers & Pages → your project → Settings →
   Variables and Secrets → Add. Create two entries, type **Secret**:
   - `GENERATOR_API_KEY` – your key
   - `GENERATOR_API_URL` – your API endpoint
   Add them for Production (and Preview if you want it on preview branches), then redeploy.
2. **Local testing:** copy `.dev.vars.example` to `.dev.vars`, fill it in, run
   `npx wrangler pages dev public`. `.dev.vars` is git-ignored.

Until both secrets exist, the Generate buttons show "Generator not connected yet".

Then open `functions/api/generate.js`. It builds a text prompt for the logo and for the label art
(`buildPrompt`, edit the wording there) and sends it to your API as `prompt`, together with the
raw fields (`beerName`, `style`, `twist`, `palette`, `format`). Match the request body and
response to your API.
The function must return `{ "image": "data:image/png;base64,..." }` (it also converts
`{ "url": "..." }` for you).

## Deploy

1. Create a GitHub repo and push this folder (the folder contents are the repo root).
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo.
3. Build settings: Framework preset **None**, Build command **(empty)**, Build output
   directory **public**.
4. Save and deploy. Every push to `main` redeploys.
5. Add the two secrets above, then redeploy once.

## Before real traffic

- Add a rate-limiting rule for `/api/generate` (Cloudflare → Security → WAF → Rate limiting).
  Each call costs you money.
- Prices, batches and dates in `index.html` are placeholders; reservations are not
  stored or charged yet.
