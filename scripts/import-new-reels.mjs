import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// All newly scraped reels from @abhitaknews/reels/ in strict chronological order (newest to oldest)
const NEW_REELS_CHRONO = [
  "Df_1Ea0vNsI",
  "Df_zRrIvUMX",
  "Df_l3y7PWH3",
  "Df_iMZIvnJC",
  "Df_fnB6vydN",
  "Df90PiLP-iv",
  "Df9zqn0PuXI",
  "Df9rd83P5Jx",
  "Df9iFTcPk1v",
  "Df9IP5Nv75C",
  "Df8_6ZqvrYX",
  "Df88GPCPa4s",
  "Df82t0lv-32",
  "Df7HIhfPhnL",
  "Df7D7v5P1pU",
  "Df7AmrkPeum",
  "Df69IHRveTA",
  "Df65GCOPDot",
  "Df61a18P56z",
  "Df6yVCDPPeL",
  "Df6x8SWPy7i",
  "Df6hyG7P9kh",
  "Df6UGd_PTFE",
  "Df4gfK_PiqE",
  "Df4dixrPd1W",
  "Df4YJjyvJbx",
  "Df4SwlNvy2B",
  "Df4BYHUvPLd",
  "Df38NQKvnJP",
  "Df3ytLdPrRN",
  "Df3xQNGPc5n",
  "Df2KSiPvjPe",
  "Df2GM8EvT08",
  "Df2DzYNPHBE",
];

async function fetchEmbed(code) {
  try {
    const res = await fetch(`https://www.instagram.com/reel/${code}/embed/captioned/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { caption: null, posterUrl: null };
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
      if (caption.startsWith("abhitaknews ")) {
        caption = caption.slice("abhitaknews ".length).trim();
      }
    }

    const posterMatch = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/);
    if (posterMatch) {
      posterUrl = posterMatch[1].replace(/&amp;/g, "&");
    }

    return { caption: caption ? caption.slice(0, 500) : null, posterUrl };
  } catch (err) {
    return { caption: null, posterUrl: null };
  }
}

async function run() {
  console.log(`Starting sync of ${NEW_REELS_CHRONO.length} latest reels from @abhitaknews...`);

  const { data: existingRows } = await supabase.from("reels").select("shortcode");
  const existingSet = new Set((existingRows || []).map((r) => r.shortcode));

  console.log(`Currently ${existingSet.size} reels exist in the database.`);

  const nowMs = Date.now();
  let addedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < NEW_REELS_CHRONO.length; i++) {
    const code = NEW_REELS_CHRONO[i];
    const isNew = !existingSet.has(code);

    // Spread timestamps smoothly so newest is NOW, each subsequent is ~2-4 hours earlier
    const postedTime = new Date(nowMs - i * 3.5 * 3600 * 1000).toISOString();
    const { caption, posterUrl } = await fetchEmbed(code);

    const payload = {
      shortcode: code,
      caption: caption || `अभी तक न्यूज़ डिजिटल बुलेटिन - @abhitaknews`,
      thumbnail_url: posterUrl,
      posted_at: postedTime,
      is_active: true,
      sort_order: (NEW_REELS_CHRONO.length - i) * 10,
    };

    const { error } = await supabase.from("reels").upsert(payload, { onConflict: "shortcode" });
    if (error) {
      console.error(`Error saving ${code}:`, error.message);
    } else {
      if (isNew) addedCount++;
      else updatedCount++;
      console.log(`[${i + 1}/${NEW_REELS_CHRONO.length}] ${code} synced (${isNew ? "NEW" : "UPDATED"}): ${caption?.slice(0, 60) ?? "No caption"}`);
    }

    // brief pause between embed requests
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nSync Completed!`);
  console.log(`New reels added: ${addedCount}`);
  console.log(`Existing reels updated: ${updatedCount}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
