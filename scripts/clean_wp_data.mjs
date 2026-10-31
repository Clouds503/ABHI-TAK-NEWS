import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://xhxjroxdgdftsngfkggi.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoeGpyb3hkZ2RmdHNuZ2ZrZ2dpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkxNTA0NywiZXhwIjoyMTA2NDkxMDQ3fQ.KfbG4ak7XsYtFuIPafG1Zf9A3oSOr8BaNJHYbiv0fA8"
);

function cleanArticleBody(html) {
  if (!html) return "";
  return html
    .replace(/<!--\s*\/?wp:[^>]*-->/gi, "")
    .replace(/<figure[^>]*>[\s\S]*?wp-content[\s\S]*?<\/figure>/gi, "")
    .replace(/<img[^>]*wp-content[^>]*\/?>/gi, "")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .trim();
}

function getAssetForArticle(article) {
  const catSlug = article.categories?.slug;
  if (catSlug === "sports") return "asset:cricket";
  if (catSlug === "agriculture") return "asset:sugarcane";
  if (catSlug === "education") return "asset:school";
  if (catSlug === "health") return "asset:health";
  if (catSlug === "business") return "asset:market";
  if (catSlug === "traffic") return "asset:road";

  const pool = [
    "asset:river",
    "asset:road",
    "asset:market",
    "asset:sugarcane",
    "asset:health",
    "asset:school",
  ];
  let hash = 0;
  const str = article.title_hi || article.slug || article.id;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

async function run() {
  console.log("Fetching articles...");
  const { data: articles, error } = await sb
    .from("articles")
    .select("id, slug, title_hi, cover_url, body_hi, category_id, categories:category_id(slug)");

  if (error || !articles) {
    console.error("Failed to fetch articles:", error);
    process.exit(1);
  }

  let updatedCount = 0;
  for (const a of articles) {
    const updates = {};
    if (a.cover_url && a.cover_url.includes("wp-content")) {
      updates.cover_url = getAssetForArticle(a);
    }
    if (a.body_hi && a.body_hi.includes("wp-content")) {
      updates.body_hi = cleanArticleBody(a.body_hi);
    }

    if (Object.keys(updates).length > 0) {
      const { error: uErr } = await sb.from("articles").update(updates).eq("id", a.id);
      if (uErr) {
        console.error(`Failed to update ${a.slug}:`, uErr);
      } else {
        updatedCount++;
        console.log(`Updated [${updatedCount}]: ${a.slug} -> cover: ${updates.cover_url || "unchanged"}`);
      }
    }
  }

  console.log(`Done! Successfully updated ${updatedCount} articles.`);
}

run();
