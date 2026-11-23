// Cloudflare Worker: serves the static site (./public via ASSETS) and handles POST /api/generate
// with Workers AI (FLUX.1 schnell). No API key needed; the AI binding is set in wrangler.toml.

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Edit these lists to tune the results. Only chosen options go into prompts, never free text.
const MOTIFS = {
  default: "a bold hop cone and barley ear",
};
const PATTERN_MOTIFS = "repeating flat geometric pattern of hops, barley and bubbles";
const TWISTS = { "citrus peel": "citrus peel", elderflower: "elderflower", "smoked malt": "smoked malt", "cold coffee": "cold coffee beans" };
const COLORS = {
  warm: "warm amber, orange and cream",
  cool: "cool teal, navy and white",
  dark: "deep black, gold and copper",
  fresh: "fresh green, yellow and cream",
};

const pick = (map, key, fallback) => map[String(key ?? "").toLowerCase().trim()] ?? fallback;
const clean = (v, n) => String(v ?? "").replace(/[^\p{L}\p{N} \-']/gu, "").trim().slice(0, n);

function buildPrompt(body) {
  const type = body.type === "label" ? "label" : "logo";
  const format = body.format === "bottle" ? "bottle" : "can";
  const twist = pick(TWISTS, body.twist, "");
  const twistPart = twist ? `, hinting at ${twist}` : "";
  const colors = pick(COLORS, body.palette, "warm amber, orange and cream");
  if (type === "logo") {
    return (
      `A simple, bold emblem logo for a craft beer, featuring ${MOTIFS.default}${twistPart}. ` +
      `Flat vector style, thick clean shapes, maximum two colours from ${colors}, centred on a plain background. ` +
      `No text, no letters, no watermark. Must stay readable when printed small on a ${format}.`
    );
  }
  return (
    `Wrap-around label artwork for a craft beer: ${PATTERN_MOTIFS}${twistPart}. ` +
    `Flat graphic illustration, bold shapes, colours: ${colors}. ` +
    `Leave the centre third clear and calm. No text, no logos, no watermark.`
  );
}

async function generate(request, env) {
  if (!env.AI) return json({ error: "not_configured" }, 501);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  // style is only used as a hint and sanitised
  body.style = clean(body.style, 30);
  try {
    const res = await env.AI.run(MODEL, { prompt: buildPrompt(body), steps: 4 });
    if (!res || !res.image) return json({ error: "no_image" }, 502);
    return json({ image: `data:image/jpeg;base64,${res.image}` });
  } catch {
    return json({ error: "upstream_error" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return generate(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
