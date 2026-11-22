/**
 * Automated Instagram Reels Scraper & Syncer for Abhitak News
 * 
 * Runs in GitHub Actions on a cron schedule or manually.
 * Discovers new reels from @abhitaknews, extracts captions & thumbnails,
 * and syncs them into Supabase so they appear at the top of the Reels tab.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const INSTAGRAM_USERNAME = "abhitaknews";
const PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/reels/`;

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
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    const page = await context.newPage();
    console.log(`[Playwright] Navigating to ${PROFILE_URL}...`);
    await page.goto(PROFILE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Allow page scripts and initial tiles to hydrate
    await page.waitForTimeout(4000);

    // Extract all /reel/ and /p/ shortcodes from anchor tags
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]'));
      return anchors.map((a) => a.getAttribute("href")).filter(Boolean);
    });

    await browser.close();

    const shortcodes = [];
    for (const link of links) {
      const match = link.match(/\/(?:reel|p)\/([A-Za-z0-9_-]{5,40})/);
      if (match && !shortcodes.includes(match[1])) {
        shortcodes.push(match[1]);
      }
    }

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

  if (!shortcodes.length) {
    console.log("No new shortcodes detected in this run. If running locally, Playwright can be installed via 'npm i playwright'.");
  }

  // 2. Connect to Supabase
  let supabase = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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
        posted_at: reel.posted_at,
      };
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
