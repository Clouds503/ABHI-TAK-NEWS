import assert from "node:assert";
import { createClient } from "@supabase/supabase-js";

console.log("=== Testing Site Name/Title and Logo/Icon Persistence ===");

const supabaseUrl = "https://xhxjroxdgdftsngfkggi.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeGpyb3hkZ2RmdHNuZ2ZrZ2dpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkxNTA0NywiZXhwIjoyMTA2NDkxMDQ3fQ.KfbG4ak7XsYtFuIPafG1Zf9A3oSOr8BaNJHYbiv0fA8";
const anonKey = "sb_publishable_EiyprYhAi2XiwC-cbWBb3w_KJQPd37p";

const sbAdmin = createClient(supabaseUrl, serviceKey);
const sbAnon = createClient(supabaseUrl, anonKey);

// 1. Fetch current branding via anon client
console.log("1. Querying current branding via anon client...");
const { data: currentBranding, error: fetchErr } = await sbAnon
  .from("advertisements")
  .select("*")
  .eq("placement", "site_branding")
  .limit(1)
  .maybeSingle();

assert.ifError(fetchErr);
assert.ok(currentBranding, "Branding record should exist in advertisements");
console.log("  ✓ Current Title (EN):", currentBranding.title);
console.log("  ✓ Current Title (HI):", currentBranding.advertiser);
console.log("  ✓ Current Logo URL:", currentBranding.image_url);
console.log("  ✓ Current Icon URL:", currentBranding.link_url);

// 2. Test updating branding via admin client
console.log("2. Testing update with custom site title and logo...");
const testTitle = "Abhi Tak 24x7";
const testTitleHi = "अभी तक 24x7";
const testLogo = "/pwa-192.png";
const testIcon = "/favicon.png";
const testExtra = JSON.stringify({
  tagline: "Speed · Verified · Foremost",
  tagline_hi: "सत्यमेव जयते",
  description: "Bijnor Digital News",
});

const { error: updateErr } = await sbAdmin
  .from("advertisements")
  .update({
    title: testTitle,
    advertiser: testTitleHi,
    image_url: testLogo,
    link_url: testIcon,
    video_url: testExtra,
  })
  .eq("id", currentBranding.id);

assert.ifError(updateErr);
console.log("  ✓ Updated branding successfully.");

// 3. Verify anon client can read updated title and logo
console.log("3. Verifying updated branding is readable by public users...");
const { data: verified, error: verifyErr } = await sbAnon
  .from("advertisements")
  .select("*")
  .eq("placement", "site_branding")
  .limit(1)
  .single();

assert.ifError(verifyErr);
assert.strictEqual(verified.title, testTitle, "English title should match updated value");
assert.strictEqual(verified.advertiser, testTitleHi, "Hindi title should match updated value");
console.log("  ✓ Verified public anon user sees updated site name:", verified.title);

// 4. Revert to default branding
console.log("4. Restoring standard branding ('Abhi Tak' / 'अभी तक')...");
const { error: revertErr } = await sbAdmin
  .from("advertisements")
  .update({
    title: "Abhi Tak",
    advertiser: "अभी तक",
    image_url: "/pwa-192.png",
    link_url: "/favicon.png",
    video_url: JSON.stringify({
      tagline: "Truth · Timely · Foremost",
      tagline_hi: "सच, समय पर, सबसे पहले",
      description: "District Bijnor's Premier Digital Broadsheet & News Network",
    }),
  })
  .eq("id", currentBranding.id);

assert.ifError(revertErr);
console.log("  ✓ Restored standard branding successfully.");

console.log("=== All Site Branding persistence tests passed! ===");
