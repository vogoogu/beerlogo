// Cloudflare Worker: serves the static site (./public via ASSETS) and handles POST /api/generate
// with Workers AI (FLUX.1 schnell). No API key needed; the AI binding is set in wrangler.toml.

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Edit these lists to tune the results.
// The user's description is sanitised (letters, numbers, basic punctuation, max 80 chars) and used as the subject.
const STYLE_MOTIFS = {
  helles: "a golden wheat ear and a foamy beer stein",
  "pale ale": "a hop cone with a citrus slice",
  ipa: "a big resinous hop cone with leaves",
  weizen: "a wheat sheaf and a tall wheat beer glass",
  dunkel: "a toasted malt grain and a dark beer mug",
};
const TWISTS = { "citrus peel": "citrus peel", elderflower: "elderflower blossoms", "smoked malt": "wisps of smoke", "cold coffee": "coffee beans" };
const COLOR_NAMES = {
  ember: "fiery orange-red and cream",
  "hop green": "deep green, gold and cream",
  night: "dark brown, gold and cream",
  gold: "golden yellow, dark brown and orange",
  cream: "cream, dark brown and orange",
  "alpine blue": "alpine blue, cream and amber",
};

const pick = (map, key, fallback) => map[String(key ?? "").toLowerCase().trim()] ?? fallback;
const clean = (v, n) => String(v ?? "").replace(/[^\p{L}\p{N} ,.\-']/gu, " ").replace(/\s+/g, " ").trim().slice(0, n);
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toUpperCase() : null);

function buildPrompt(body) {
  const type = body.type === "label" ? "label" : "logo";
  const format = body.format === "bottle" ? "bottle" : "can";
  const desc = clean(body.description, 80);
  const twist = pick(TWISTS, body.twist, "");
  const motif = pick(STYLE_MOTIFS, body.style, "a hop cone and barley ear");
  const names = pick(COLOR_NAMES, body.palette, "warm orange, cream and dark brown");
  const hexes = Array.isArray(body.colors) ? body.colors.map(hex).filter(Boolean).slice(0, 3) : [];
  const colors = hexes.length ? `${names} (${hexes.join(", ")})` : names;
  const subject = desc || `${motif}${twist ? ` with ${twist}` : ""}`;
  if (type === "logo") {
    return (
      `Striking, characterful emblem illustration for a craft beer: ${subject}. ` +
      `Bold flat vector badge art with confident thick outlines, dynamic composition, clever details and strong silhouette, ` +
      `like a professional craft-brewery mascot. Limited palette of ${colors}. ` +
      `The artwork is large and fills the whole square frame edge to edge, centred, solid background in one of the palette colours. ` +
      `No text, no letters, no words, no watermark, no border. Still clear when printed small on a ${format}.`
    );
  }
  return (
    `Wrap-around label artwork for a craft beer: ${subject}, as a rich repeating illustrated pattern of hops, barley and bubbles. ` +
    `Flat graphic illustration, bold shapes, palette of ${colors}. ` +
    `Leave the centre third calmer and simpler. No text, no letters, no logos, no watermark.`
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
  try {
    const res = await env.AI.run(MODEL, { prompt: buildPrompt(body), steps: 8 });
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
