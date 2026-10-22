import "dotenv/config";
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

export function createServer() {
  const app = express();

  // 1. PROXY CONFIG (Handles /api requests to Backend Gateway)
  // Must be registered BEFORE express.json() to avoid consuming the request body
  app.use(
    createProxyMiddleware({
      pathFilter: (path) => {
        const localPrefixes = ["/api/places", "/api/gemini", "/api/ping-local", "/api/google-proxy"];
        const isLocal = localPrefixes.some(prefix => path.startsWith(prefix));
        return path.startsWith("/api") && !isLocal;
      },
      target: "http://127.0.0.1:8080",
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req: any, res) => {
          if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
        },
        error: (err, req, res) => {
          if (!(res as any).headersSent) (res as any).status(500).json({ error: "Gateway unreachable" });
        },
      }
    })
  );

  // 2. Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use((req, res, next) => {
    if (req.url.startsWith("/api") && !req.url.includes("ping")) {
      console.log(`[Express API] ${req.method} ${req.url}`);
    }
    next();
  });

  // ── LOCAL ROUTES (Define BEFORE Proxy) ──────────────────────────────────────

  // 1. Photo Proxy (Wikipedia-backed for high accuracy)
  app.get("/api/places/photo", async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Name required" });

    try {
      // 1. Try to get a real image from Wikipedia first
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1000&titles=${encodeURIComponent(String(name))}&redirects=1`;
      const wikiRes = await fetch(wikiUrl, { headers: { 'User-Agent': 'VoyzrBot/1.0' } });
      const wikiData = (await wikiRes.json()) as any;
      const pages = wikiData.query?.pages;
      
      let finalImageUrl = `https://loremflickr.com/800/600/travel,landmark,${encodeURIComponent(String(name))}`;

      if (pages) {
        const pageId = Object.keys(pages)[0];
        const thumbnail = pages[pageId]?.thumbnail?.source;
        if (thumbnail && pageId !== "-1") {
          finalImageUrl = thumbnail;
          console.log(`[Express] Found real Wikipedia photo for: ${name}`);
        }
      }

      // 2. Fetch the final image (either Wiki or fallback)
      const imgRes = await fetch(finalImageUrl, { signal: AbortSignal.timeout(8000) });
      if (!imgRes.ok) throw new Error("Image fetch failed");
      
      const buffer = await imgRes.arrayBuffer();
      res.setHeader("Content-Type", imgRes.headers.get("Content-Type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=604800"); // Cache for 1 week
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("[Express] Photo proxy failed, using SVG placeholder:", (error as Error).message);
      // Inline SVG — never fails, no external network required
      const placeholderName = String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f1f5f9"/>
  <rect x="300" y="180" width="200" height="160" rx="16" fill="#e2e8f0"/>
  <circle cx="400" cy="260" r="50" fill="#cbd5e1"/>
  <text x="400" y="400" font-family="sans-serif" font-size="18" fill="#94a3b8" text-anchor="middle">${placeholderName}</text>
  <text x="400" y="430" font-family="sans-serif" font-size="13" fill="#cbd5e1" text-anchor="middle">📍 Place Photo</text>
</svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(svg);
    }
  });

  // Wikipedia Summary Proxy (Deep Intel)
  app.get("/api/places/wikipedia-summary", async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: "Location name required" });

    try {
      // Search for the best match and get the extract (summary)
      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(String(name))}&redirects=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'VoyzrBot/1.0' } });
      const data = (await response.json()) as any;
      const pages = data.query?.pages;
      
      if (pages) {
        const pageId = Object.keys(pages)[0];
        const extract = pages[pageId]?.extract;
        if (extract && pageId !== "-1") {
          return res.json({ summary: extract });
        }
      }
      res.json({ summary: "No detailed historical data found for this specific location." });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Intel" });
    }
  });

  // 2. Geoapify Routing Proxy
  app.get("/api/places/routing", async (req, res) => {
    const { waypoints, mode = "drive" } = req.query;
    const apiKey = process.env.GEOAPIFY_ROUTING_KEY || process.env.VITE_GEOAPIFY_API_KEY || "6de209a5add94a398bfea16528c7981b";
    
    try {
      const params = new URLSearchParams();
      params.append("waypoints", String(waypoints));
      params.append("mode", String(mode));
      params.append("apiKey", apiKey);
      const url = `https://api.geoapify.com/v1/routing?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });

  // 3. Geoapify Geocoding Proxy
  app.get("/api/places/geocode", async (req, res) => {
    const { lat, lon, text } = req.query;
    const apiKey = process.env.GEOAPIFY_PLACES_KEY || process.env.VITE_GEOAPIFY_API_KEY || "6de209a5add94a398bfea16528c7981b";
    try {
      const params = new URLSearchParams();
      let baseUrl = "https://api.geoapify.com/v1/geocode/search";
      if (lat && lon) {
        baseUrl = "https://api.geoapify.com/v1/geocode/reverse";
        params.append("lat", String(lat));
        params.append("lon", String(lon));
      } else {
        params.append("text", String(text));
      }
      params.append("apiKey", apiKey);
      const response = await fetch(`${baseUrl}?${params.toString()}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to geocode" });
    }
  });

  // 4. Places Attractions Proxy (STRICTLY Database-backed for curated Kerala/Batch data)
  app.get("/api/places/attractions", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Coordinates required" });

    try {
      const response = await fetch(`http://127.0.0.1:8087/api/places/attractions?lat=${lat}&lng=${lng}`);
      const data = await response.json() as any[];
      const attractions = data.map((p: any) => ({
        id: p.id || `db-${p.name}-${p.lat}-${p.lng}`,
        name: p.name,
        address: p.address || "Kerala, India",
        lat: p.lat,
        lng: p.lng,
        category: p.category || "CURATED",
        rating: p.rating || 4.5,
        // FORCE the use of the real-time Wikipedia proxy to get real internet photos
        photoUrl: `/api/places/photo?name=${encodeURIComponent(p.name)}`
      }));
      res.json(attractions);
    } catch (error) {
      console.error("[Express] Attractions fetch failed:", error);
      res.status(500).json({ error: "Failed to fetch curated attractions" });
    }
  });

  app.get("/api/places/all", async (req, res) => {
    try {
      const response = await fetch("http://127.0.0.1:8087/api/places/all");
      const data = await response.json() as any[];
      const attractions = data.map((p: any) => ({
        id: p.id || `db-all-${p.name}-${p.lat}-${p.lng}`,
        name: p.name,
        address: p.address || "Kerala, India",
        lat: p.lat,
        lng: p.lng,
        category: p.category || "CURATED",
        rating: p.rating || 4.5,
        // FORCE the use of the real-time Wikipedia proxy to get real internet photos
        photoUrl: `/api/places/photo?name=${encodeURIComponent(p.name)}`
      }));
      res.json(attractions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch curated database" });
    }
  });

  // 5. Groq AI (Primary) — Gemini removed due to 503 errors
  app.post("/api/gemini", async (req, res) => {
    const { contents, prompt } = req.body || {};

    // Groq API key — use env var first, then the hardcoded key
    const groqKey = process.env.GROQ_API_KEY || "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";

    // Resolve user text — handle both { prompt: "string" } and { contents: [...] } formats
    let userText = "";
    if (typeof prompt === "string" && prompt.trim()) {
      userText = prompt.trim();
    } else if (Array.isArray(contents) && contents.length > 0) {
      userText = contents[0]?.parts?.[0]?.text || "";
    }

    if (!userText) return res.status(400).json({ error: "Missing prompt or contents" });

    // --- Groq (Primary) ---
    try {
      console.log(`[Groq] Sending request with key: ${groqKey.substring(0, 10)}...`);

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are Voyzr AI, an expert travel assistant specialising in Indian travel destinations. Be concise, friendly, and helpful. Format responses clearly.",
            },
            { role: "user", content: userText },
          ],
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (groqRes.ok) {
        const data = await groqRes.json() as any;
        const reply = data?.choices?.[0]?.message?.content || "I couldn't generate a response.";
        console.log("[Groq] Response OK");
        return res.json({ reply, source: "groq" });
      } else {
        const errorData = await groqRes.text();
        console.error(`[Groq] Error ${groqRes.status}:`, errorData);
        throw new Error(`Groq returned status ${groqRes.status}`);
      }
    } catch (err: any) {
      console.error("[Groq] Request failed:", err.message);
    }

    // --- Final fallback ---
    res.status(503).json({
      reply: "I'm having trouble connecting to my AI brain right now. Please try again in a moment! 🔄",
      error: "Groq AI unavailable",
    });
  });

  // 6. Local Ping
  app.get("/api/ping-local", (req, res) => {
    res.json({ status: "UP", message: "Voyzr Local Server" });
  });

  // Catch-all for /api routes that were NOT handled (Prevents HTML fallback)
  app.use("/api", (req, res) => {
    console.warn(`[Express] Unhandled API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: "API route not found", path: req.url });
  });

  return app;
}
