import { createServerFn } from "@tanstack/react-start";

export const syncWordPressArticles = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      // Dynamic import keeps supabaseAdmin out of the client bundle
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Fetch towns & categories to map WP names
      const { data: towns } = await supabaseAdmin.from("towns").select("id, name_hi, name_en");
      const { data: categories } = await supabaseAdmin.from("categories").select("id, name_hi, name_en");

      // 2. Fetch WP posts
      const wpRes = await fetch(`https://abhitaknews.in/wp-json/wp/v2/posts?_embed=1&per_page=50`);
      if (!wpRes.ok) {
        return { success: false, error: "Failed to fetch from WP API" };
      }
      
      const posts = await wpRes.json();
      let imported = 0;

      // 3. Process each post
      for (const post of posts) {
        // Find Cover Image
        let coverUrl = null;
        if (post._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
          coverUrl = post._embedded["wp:featuredmedia"][0].source_url;
        }

        // Map Categories & Towns
        let townId = null;
        let categoryId = null;
        const wpTerms = post._embedded?.["wp:term"]?.[0] || [];
        
        for (const term of wpTerms) {
          const termName = term.name.trim();
          
          // Check if term matches a town
          const matchedTown = towns?.find(t => t.name_hi === termName || t.name_en === termName);
          if (matchedTown && !townId) townId = matchedTown.id;

          // Check if term matches a category
          const matchedCat = categories?.find(c => c.name_hi === termName || c.name_en === termName);
          if (matchedCat && !categoryId) categoryId = matchedCat.id;
        }

        // Strip HTML from excerpt
        const summaryHtml = post.excerpt.rendered || "";
        const summaryClean = summaryHtml.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim();

        const articleData = {
          slug: post.slug,
          title_hi: post.title.rendered,
          summary_hi: summaryClean || null,
          body_hi: post.content.rendered,
          cover_url: coverUrl,
          published_at: post.date,
          status: "published",
          // The database trigger will handle `author_id` or we leave it null.
          town_id: townId,
          category_id: categoryId,
        };

        // Upsert
        const { data: existing } = await supabaseAdmin
          .from("articles")
          .select("id")
          .eq("slug", post.slug)
          .maybeSingle();

        if (existing) {
          await supabaseAdmin.from("articles").update(articleData).eq("id", existing.id);
        } else {
          // Get super admin for author_id
          const { data: adminUser } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "super_admin")
            .limit(1)
            .single();
            
          await supabaseAdmin.from("articles").insert({
            ...articleData,
            author_id: adminUser?.user_id || undefined
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
