import { createServerFn } from "@tanstack/react-start";

export type WordPressPostItem = {
  slug: string;
  title_hi: string;
  summary_hi: string | null;
  body_hi: string;
  cover_url: string | null;
  published_at: string;
  terms: string[];
};

/**
 * Server function to fetch and clean posts from WordPress API.
 * Runs on the server to prevent CORS issues, with zero Supabase key dependency.
 */
export const fetchWordPressPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; posts?: WordPressPostItem[]; error?: string }> => {
    try {
      const wpRes = await fetch("https://abhitaknews.in/wp-json/wp/v2/posts?_embed=1&per_page=50");
      if (!wpRes.ok) {
        return { success: false, error: `WordPress API returned status ${wpRes.status}` };
      }

      const rawPosts = await wpRes.json();
      if (!Array.isArray(rawPosts)) {
        return { success: false, error: "Invalid WordPress API response format" };
      }

      const posts: WordPressPostItem[] = [];

      for (const post of rawPosts) {
        let coverUrl: string | null = null;
        if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
          coverUrl = post._embedded["wp:featuredmedia"][0].source_url;
        }

        const terms: string[] = [];
        const wpTerms = post._embedded?.["wp:term"]?.[0] || [];
        if (Array.isArray(wpTerms)) {
          for (const term of wpTerms) {
            if (term?.name) terms.push(term.name.trim());
          }
        }

        const summaryHtml = post.excerpt?.rendered || "";
        const summaryClean = summaryHtml
          .replace(/<[^>]*>?/gm, "")
          .replace(/&nbsp;/g, " ")
          .trim();

        posts.push({
          slug: post.slug,
          title_hi: post.title?.rendered ?? "",
          summary_hi: summaryClean || null,
          body_hi: post.content?.rendered ?? "",
          cover_url: coverUrl,
          published_at: post.date,
          terms,
        });
      }

      return { success: true, posts };
    } catch (err: any) {
      console.error("fetchWordPressPosts error:", err);
      return { success: false, error: err.message || "Failed to fetch from WordPress" };
    }
  },
);

/**
 * Legacy server-side sync handler.
 * Safely checks for SUPABASE_SERVICE_ROLE_KEY before attempting server-side database writes.
 */
export const syncWordPressArticles = createServerFn({ method: "POST" }).handler(async () => {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Please sync directly via the Admin CMS.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const wpResult = await fetchWordPressPosts();
    if (!wpResult.success || !wpResult.posts) {
      return { success: false, error: wpResult.error || "Failed to fetch from WP API" };
    }

    const { data: towns } = await supabaseAdmin.from("towns").select("id, name_hi, name_en");
    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id, name_hi, name_en");

    let imported = 0;

    for (const post of wpResult.posts) {
      let townId: string | null = null;
      let categoryId: string | null = null;

      for (const termName of post.terms) {
        const matchedTown = towns?.find((t) => t.name_hi === termName || t.name_en === termName);
        if (matchedTown && !townId) townId = matchedTown.id;

        const matchedCat = categories?.find(
          (c) => c.name_hi === termName || c.name_en === termName,
        );
        if (matchedCat && !categoryId) categoryId = matchedCat.id;
      }

      const articleData = {
        slug: post.slug,
        title_hi: post.title_hi,
        summary_hi: post.summary_hi,
        body_hi: post.body_hi,
        cover_url: post.cover_url,
        published_at: post.published_at,
        status: "published" as const,
        town_id: townId,
        category_id: categoryId,
      };

      const { data: existing } = await supabaseAdmin
        .from("articles")
        .select("id")
        .eq("slug", post.slug)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from("articles").update(articleData).eq("id", existing.id);
      } else {
        const { data: adminUser } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin")
          .limit(1)
          .single();

        await supabaseAdmin.from("articles").insert({
          ...articleData,
          author_id: adminUser?.user_id || undefined,
        });
      }
      imported++;
    }

    return { success: true, imported };
  } catch (err: any) {
    console.error("Sync error:", err);
    return { success: false, error: err.message };
  }
});
