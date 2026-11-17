import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";

console.log("=== Testing Reel Likes & Views Registration ===");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

// 1. Get first reel from database
const { data: reels } = await supabaseAdmin
  .from("reels")
  .select("id, shortcode, caption")
  .limit(1);

assert.ok(reels?.length > 0, "Should have at least 1 reel");
const testReel = reels[0];
console.log(`1. Testing with reel: ${testReel.shortcode} (${testReel.id})`);

// 2. Register view event in app_analytics_events
console.log("2. Registering reel view event...");
const { error: viewErr } = await supabaseAdmin.from("app_analytics_events").insert({
  event_type: "reel_view",
  entity_type: "reel",
  entity_id: testReel.id,
  platform: "web",
});
assert.ifError(viewErr);
console.log("  ✓ Reel view event registered successfully in app_analytics_events.");

// 3. Count view events for this reel
console.log("3. Counting views for this reel...");
const { count: viewCount } = await supabaseAdmin
  .from("app_analytics_events")
  .select("id", { count: "exact", head: true })
  .eq("entity_type", "reel")
  .eq("entity_id", testReel.id)
  .eq("event_type", "reel_view");

console.log(`  ✓ Current registered view count: ${viewCount}`);
assert.ok(viewCount > 0, "View count should be at least 1");

// 4. Test like registration in app_analytics_events
console.log("4. Registering reel like engagement event...");
const { error: likeErr } = await supabaseAdmin.from("app_analytics_events").insert({
  event_type: "like",
  entity_type: "reel",
  entity_id: testReel.id,
  platform: "web",
});
assert.ifError(likeErr);
console.log("  ✓ Reel like event registered successfully.");

console.log("=== All Reel Likes & Views tests passed! ===");
