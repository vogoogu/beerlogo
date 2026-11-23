// Cloudflare Pages Function: POST /api/generate
// The API key lives ONLY here, as a Cloudflare secret. It never reaches the browser.
//
// Required environment variables (secrets):
//   GENERATOR_API_KEY  – your logo/label API key
//   GENERATOR_API_URL  – the endpoint to call
//
// Adjust the request body and response parsing below to match your API.

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// Edit the wording here to tune the results. Runs on the server only.
function buildPrompt({ type, name, style, twist, palette, format }) {
  const twistPart = twist && twist !== "None" ? ` with a ${twist.toLowerCase()} twist` : "";
  if (type === "logo") {
    return (
      `A simple, bold emblem logo for a craft beer called "${name}" (${style} style${twistPart}). ` +
      `Flat vector style, thick clean shapes, maximum two colours, centred on a plain background. ` +
      `No text, no letters, no watermark. It must stay readable when printed small on a ${format}. ` +
      `Colour palette: ${palette.toLowerCase()}.`
    );
  }
  return (
    `Wrap-around label artwork for a craft beer called "${name}" (${style}${twistPart}). ` +
    `Flat graphic illustration, bold shapes, ${palette.toLowerCase()} colour palette. ` +
    `Leave the centre third clear and calm so the beer name can be printed on top. ` +
    `No text, no logos, no watermark.`
  );
}

function toBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function onRequestPost({ request, env }) {
  if (!env.GENERATOR_API_KEY || !env.GENERATOR_API_URL) {
    return json({ error: "not_configured" }, 501);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const type = body.type === "label" ? "label" : "logo";
  // Strip quotes and line breaks so user text cannot break out of the prompt.
  const clean = (v, n) => String(v ?? "").replace(/["“”\r\n]+/g, " ").trim().slice(0, n);
  const name = clean(body.name, 40) || "Untitled";
  const style = clean(body.style, 30) || "beer";
  const twist = clean(body.twist, 30);
  const palette = clean(body.palette, 30) || "warm";
  const format = body.format === "bottle" ? "bottle" : "can";

  const prompt = buildPrompt({ type, name, style, twist, palette, format });

  const payload = {
    type, // "logo" or "label"
    prompt, // ready-to-use text prompt
    // Raw fields, in case your API takes structured input instead of a prompt:
    beerName: name,
    tagline: clean(body.tagline, 60),
    style,
    twist,
    palette,
    format,
  };

  let upstream;
  try {
    upstream = await fetch(env.GENERATOR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GENERATOR_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return json({ error: "upstream_unreachable" }, 502);
  }
  if (!upstream.ok) return json({ error: "upstream_error" }, 502);

  const data = await upstream.json().catch(() => null);
  if (!data) return json({ error: "bad_upstream_response" }, 502);

  // Expected: { image: "data:image/png;base64,..." } or { url: "https://..." }.
  // The browser needs a data URI (a remote URL would block the 3D texture).
  let image = data.image;
  if (!image && data.url) {
    const img = await fetch(data.url);
    if (!img.ok) return json({ error: "image_fetch_failed" }, 502);
    const type = img.headers.get("Content-Type") || "image/png";
    image = `data:${type};base64,${toBase64(await img.arrayBuffer())}`;
  }
  if (!image) return json({ error: "no_image" }, 502);
  return json({ image });
}
