import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";
import {
  syncInstagramReelsToDatabase,
  extractInstagramShortcode,
  VERIFIED_ABHITAK_REELS,
} from "../src/lib/instagram-sync.ts";

console.log("=== Testing Instagram Sync Engine ===");

// 1. Test shortcode extraction
console.log("1. Testing shortcode extraction...");
assert.strictEqual(
  extractInstagramShortcode("https://www.instagram.com/reel/Df1x0IDvKBB/"),
  "Df1x0IDvKBB",
);
assert.strictEqual(
  extractInstagramShortcode("https://www.instagram.com/abhitaknews/reel/Df1fxf6PllL/"),
  "Df1fxf6PllL",
);
assert.strictEqual(extractInstagramShortcode("Df1UA3FvSNs"), "Df1UA3FvSNs");
console.log("  ✓ Shortcode extraction verified.");

// 2. Test verified catalog
console.log("2. Checking verified catalog...");
assert.ok(VERIFIED_ABHITAK_REELS.length >= 10, "Should have at least 10 verified reels");
console.log(`  ✓ Found ${VERIFIED_ABHITAK_REELS.length} verified reels from @abhitaknews.`);

// 3. Test database synchronization
console.log("3. Testing database synchronization with Supabase...");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const syncResult = await syncInstagramReelsToDatabase(supabaseAdmin);
console.log("  ✓ Sync result:", syncResult);
assert.ok(syncResult.success, "Sync should succeed");
assert.ok(syncResult.count > 0, "Sync count should be greater than 0");

// 4. Verify reels are now in database
console.log("4. Verifying synced reels in database...");
const { data: dbReels, error: dbErr } = await supabaseAdmin
  .from("reels")
  .select("id, shortcode, caption, sort_order, is_active")
  .order("sort_order", { ascending: false });

if (dbErr) {
  console.error("Database query error:", dbErr);
  process.exit(1);
}

console.log(`  ✓ Found ${dbReels.length} reels in database!`);
assert.ok(dbReels.length >= 10, "Database should now contain at least 10 reels");
console.log("  Sample top reel in database:", dbReels[0]);

console.log("=== All Instagram Sync Engine tests passed! ===");
