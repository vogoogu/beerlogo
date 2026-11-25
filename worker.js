// Brauatelier Worker.
//  - GET /            : the website (index.html is bundled into this Worker).
//  - GET /vendor/three.min.js : the 3D library (three.min.txt, bundled).
//  - POST /api/generate: makes a logo or label pattern with Cloudflare Workers AI (FLUX.1 schnell).
//
// No user text goes into the prompts. The beer style, flavour twist and colour are looked up in
// the fixed lists below, so nobody can inject their own wording. Edit the lists to tune results.

import INDEX_HTML from "./index.html";
import THREE_JS from "./three.min.txt";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Logo motif per beer style.
const MOTIFS = {
  helles: "a rising sun over wheat ears",
  pale: "a hop cone with a citrus slice",
  ipa: "a hop cone with leaves",
  weizen: "bundled wheat ears",
  dunkel: "a crescent moon above roasted malt grains",
};
// Repeating-pattern motif per beer style.
const PATTERN_MOTIFS = {
  helles: "wheat ears and small suns",
  pale: "hop cones and citrus slices",
  ipa: "hop cones and leaves",
  weizen: "wheat ears and small flowers",
  dunkel: "crescent moons and malt grains",
};
// Optional extra element per flavour twist.
const TWISTS = {
  "Citrus peel": "a citrus slice",
  Elderflower: "small elderflower blossoms",
  "Smoked malt": "a small flame",
  "Cold coffee": "coffee beans",
};
// Colour words per label colour (keys match the page's palette keys).
const COLORS = {
  ember: "orange and dark brown",
  hop: "green and gold",
  night: "dark brown and gold",
  gold: "gold and orange",
  cream: "cream and orange",
  sky: "blue and gold",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export function buildPrompt({ type, style, twist, palette }) {
  const extra = TWISTS[twist];
  if (type === "logo") {
    let motif = MOTIFS[style] || MOTIFS.ipa;
    if (extra && !motif.includes(extra)) motif += ` and ${extra}`;
    return (
      `A flat vector emblem of ${motif}, bold simple shapes, single colour black on a solid white background, ` +
      `symmetrical, centred with generous empty margin, minimalist brand mark, symbol only.`
    );
  }
  let motif = PATTERN_MOTIFS[style] || PATTERN_MOTIFS.ipa;
  if (extra && !motif.includes(extra)) motif += ` and ${extra}`;
  return (
    `A seamless repeating pattern of ${motif}, flat graphic illustration, bold shapes, two colours, ` +
    `${COLORS[palette] || COLORS.ember}, even density, wallpaper style.`
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

  const type = body.type === "label" ? "label" : "logo";
  const prompt = buildPrompt({
    type,
    style: String(body.style || ""),
    twist: String(body.twist || ""),
    palette: String(body.palette || ""),
  });

  let res;
  try {
    res = await env.AI.run(MODEL, { prompt, steps: type === "logo" ? 6 : 4 });
  } catch {
    return json({ error: "upstream_error" }, 502);
  }
  if (!res || !res.image) return json({ error: "no_image" }, 502);
  return json({ image: `data:image/jpeg;base64,${res.image}` });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/api/generate") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return generate(request, env);
    }
    if (path === "/" || path === "/index.html") {
      return new Response(INDEX_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
      });
    }
    if (path === "/vendor/three.min.js") {
      return new Response(THREE_JS, {
        headers: {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};
