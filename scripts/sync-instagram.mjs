/**
 * Automated Instagram Reels Scraper & Syncer for Abhitak News
 * 
 * Runs in GitHub Actions on a cron schedule or manually.
 * Discovers new reels from @abhitaknews, extracts captions & thumbnails,
 * and syncs them into Supabase so they appear at the top of the Reels tab.
 */

// 1. Polyfill WebSocket if not natively available in current Node runtime (Node < 22).
// Since this CLI sync script only performs REST database queries and does not use Realtime subscriptions,
// a minimal stub satisfies @supabase/supabase-js initialization.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class NoOpWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
    send() {}
  };
}

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const INSTAGRAM_USERNAME = "abhitaknews";
const PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/reels/`;

// Verified fallback catalog of official @abhitaknews reels
// Ensures the database stays populated even if Instagram rate-limits (HTTP 429) the runner IP
const VERIFIED_FALLBACK_SHORTCODES = [
  "Df1x0IDvKBB",
  "Df1fxf6PllL",
  "Df1UA3FvSNs",
  "Df1RsY8vsFB",
  "DfznIGCPhbN",
  "DfzW5DEPz_N",
  "Dfy17avvsFX",
  "DfwnqV8vhiv",
  "DfwgWw8PQlx",
  "DfwdiQ3PAol",
  "Dfuqmr8PcTz",
  "Dft0LC-vht1",
  "DftnjpHP0-D",
  "DQg2kYaj-JF",
  "DVaoJ02j1by",
  "DVlGMqlDwPA",
];

// Load local .env if available (for local testing)
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const APP_URL = process.env.APP_URL;

function decodeJsonString(value) {
  try {
    const decoded = JSON.parse(`"${value}"`);
    if (typeof decoded !== "string") return null;
    return decoded
      .replace(/\\\//g, "/")
      .replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
  } catch {
    return null;
  }
}

/**
 * Fetches caption, poster image, and direct video MP4 URL from Instagram embed page.
 */
async function fetchEmbedDetails(shortcode) {
  try {
    const res = await fetch(`https://www.instagram.com/reel/${shortcode}/embed/captioned/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { caption: null, posterUrl: null, videoUrl: null };
    const html = await res.text();

    let caption = null;
    let posterUrl = null;

    const captionMatch = html.match(/<div class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
    if (captionMatch) {
      let raw = captionMatch[1];
      raw = raw.replace(/<a class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/gi, "");
      raw = raw.replace(/<div class="CaptionComments"[\s\S]*$/gi, "");
      caption = raw
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (caption.startsWith(`${INSTAGRAM_USERNAME} `)) {
        caption = caption.slice(INSTAGRAM_USERNAME.length + 1).trim();
      }
    }

    const posterMatch = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/);
    if (posterMatch) {
      posterUrl = posterMatch[1].replace(/&amp;/g, "&");
    }

    let videoUrl = null;
    const m1 = html.match(/\\"video_url\\":\\"((?:\\\\.|[^"\\])*)\\"/);
    const m2 = html.match(/"video_url":"((?:\\.|[^"\\])*)"/);
    const raw = m1?.[1] || m2?.[1];
    if (raw) {
      const decoded = decodeJsonString(raw);
      if (decoded && decoded.startsWith("https://")) {
        videoUrl = decoded;
      }
    }

    return { caption: caption ? caption.slice(0, 500) : null, posterUrl, videoUrl };
  } catch (err) {
    return { caption: null, posterUrl: null, videoUrl: null };
  }
}

/**
 * Method 1: Playwright Headless Browser (Used in GitHub Actions)
 */
async function scrapeWithPlaywright() {
  try {
    const { chromium } = await import("playwright");
    console.log("[Playwright] Launching headless browser to scrape reels...");
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
      ],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const shortcodes = [];

    // Helper to evaluate and collect shortcodes from DOM, links, scripts & HTML
    async function extractFromPage() {
      const found = await page.evaluate(() => {
        const set = new Set();
        // 1. Anchor links
        const anchors = Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]'));
        for (const a of anchors) {
          const href = a.getAttribute("href") || "";
          const m = href.match(/\/(?:reel|p)\/([A-Za-z0-9_-]{5,40})/);
          if (m) set.add(m[1]);
        }
        // 2. HTML text
        const html = document.body ? document.body.innerHTML : "";
        const r = /\/(?:reel|p)\/([A-Za-z0-9_-]{5,40})/g;
        let match;
        while ((match = r.exec(html)) !== null) {
          set.add(match[1]);
        }
        // 3. Embedded JSON script blocks
        const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script:not([src])'));
        for (const s of scripts) {
          const content = s.textContent || "";
          const sm = content.match(/"shortcode":"([A-Za-z0-9_-]{5,40})"/g) || [];
          for (const item of sm) {
            const code = item.replace(/"shortcode":"|"/g, "");
            if (code) set.add(code);
          }
        }
        return Array.from(set);
      });
      return found;
    }

    // Try dedicated reels path first
    console.log(`[Playwright] Navigating to ${PROFILE_URL}...`);
    try {
      await page.goto(PROFILE_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
      await page.waitForTimeout(3000);
      const list1 = await extractFromPage();
      list1.forEach((c) => !shortcodes.includes(c) && shortcodes.push(c));
    } catch (e) {
      console.warn("[Playwright] Reels navigation note:", e.message);
    }

    // If 0 shortcodes, also check main profile grid
    if (shortcodes.length === 0) {
      const mainProfileUrl = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
      console.log(`[Playwright] Trying main profile URL ${mainProfileUrl}...`);
      try {
        await page.goto(mainProfileUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForTimeout(3000);
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(2000);
        const list2 = await extractFromPage();
        list2.forEach((c) => !shortcodes.includes(c) && shortcodes.push(c));
      } catch (e) {
        console.warn("[Playwright] Profile navigation note:", e.message);
      }
    }

    await browser.close();
    console.log(`[Playwright] Discovered ${shortcodes.length} reel shortcode(s):`, shortcodes);
    return shortcodes;
  } catch (err) {
    console.warn("[Playwright] Note / not installed:", err.message);
    return [];
  }
}

/**
 * Method 2: Direct HTTP Fetch from public Instagram profile
 */
async function scrapeWithFetch() {
  try {
    const profileUrl = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
    console.log(`[Fetch] Querying ${profileUrl}...`);
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Fetch] Response status ${res.status}`);
      return [];
    }

    const html = await res.text();
    const shortcodes = [];
    const regex = /\/(?:reel|reels|p)\/([A-Za-z0-9_-]{5,40})/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const code = match[1];
      if (code && !shortcodes.includes(code)) {
        shortcodes.push(code);
      }
    }

    // Also scan for JSON script properties
    const jsonMatches = html.match(/"shortcode":"([A-Za-z0-9_-]{5,40})"/g) || [];
    for (const item of jsonMatches) {
      const code = item.replace(/"shortcode":"|"/g, "");
      if (code && !shortcodes.includes(code)) {
        shortcodes.push(code);
      }
    }

    console.log(`[Fetch] Extracted ${shortcodes.length} shortcode(s) dynamically from HTML.`);
    return shortcodes;
  } catch (err) {
    console.warn("[Fetch] Error:", err.message);
    return [];
  }
}

async function main() {
  console.log("=== Starting Automated Instagram Reels Sync ===");
  console.log(`Target Instagram account: @${INSTAGRAM_USERNAME}`);

  // 1. Discover reel shortcodes
  let shortcodes = await scrapeWithPlaywright();
  if (!shortcodes.length) {
    shortcodes = await scrapeWithFetch();
  }

  // If live discovery returned 0 (e.g. rate-limit or IP challenge on runner), fall back to verified catalog
  if (!shortcodes.length) {
    console.log("[Fallback] Discovered 0 live shortcodes (likely rate-limited). Using verified catalog of @abhitaknews reels.");
    shortcodes = [...VERIFIED_FALLBACK_SHORTCODES];
  }

  console.log(`[Sync] Processing ${shortcodes.length} reel shortcodes for synchronization.`);

  // 2. Connect to Supabase
  let supabase = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      realtime: {
        transport: globalThis.WebSocket || class NoOpWebSocket {},
      },
    });
    console.log("[Supabase] Connected to database:", SUPABASE_URL);
  } else {
    console.warn("[Supabase] SUPABASE_URL or SUPABASE_KEY not provided.");
  }

  // 3. Process discovered reels
  const reelsToSync = [];
  const existingCodes = new Set();

  if (supabase) {
    const { data: existingRows } = await supabase.from("reels").select("shortcode");
    (existingRows || []).forEach((r) => existingCodes.add(r.shortcode));
  }

  for (const code of shortcodes) {
    const isNew = !existingCodes.has(code);
    console.log(`[Reel ${code}] ${isNew ? "NEW" : "Already exists"}. Fetching metadata...`);

    const { caption, posterUrl, videoUrl } = await fetchEmbedDetails(code);
    reelsToSync.push({
      shortcode: code,
      caption,
      thumbnail_url: posterUrl,
      video_url: videoUrl,
      posted_at: new Date().toISOString(),
      is_active: true,
    });
  }

  // 4. Save to Supabase directly
  let added = 0;
  let updated = 0;

  if (supabase && reelsToSync.length > 0) {
    for (const reel of reelsToSync) {
      const isNew = !existingCodes.has(reel.shortcode);
      const payload = {
        shortcode: reel.shortcode,
        caption: reel.caption,
        is_active: true,
      };
      if (isNew) {
        payload.posted_at = reel.posted_at;
      }
      if (reel.thumbnail_url) {
        payload.thumbnail_url = reel.thumbnail_url;
      }
      if (reel.video_url) {
        payload.video_url = reel.video_url;
      }

      const { error } = await supabase.from("reels").upsert(payload, { onConflict: "shortcode" });
      if (error) {
        console.error(`[Supabase] Upsert error for ${reel.shortcode}:`, error.message);
      } else {
        if (isNew) added++;
        else updated++;
      }
    }
    console.log(`[Supabase] Sync finished: ${added} added, ${updated} updated.`);
  }

  // 5. Ping website public API route if APP_URL is provided
  if (APP_URL && reelsToSync.length > 0) {
    try {
      const endpoint = `${APP_URL.replace(/\/$/, "")}/api/public/sync-instagram`;
      console.log(`[App API] Notifying deployed app at ${endpoint}...`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reels: reelsToSync }),
      });
      const data = await res.json().catch(() => null);
      console.log("[App API] Response:", data);
    } catch (err) {
      console.warn("[App API] Notification note:", err.message);
    }
  }

  console.log("=== Instagram Reels Sync Completed Successfully ===");
}

main().catch((err) => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
