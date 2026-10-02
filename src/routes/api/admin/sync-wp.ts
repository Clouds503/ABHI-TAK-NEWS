import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// We use supabaseAdmin to bypass RLS for importing articles
export const Route = createFileRoute("/api/admin/sync-wp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get("secret");
        const page = parseInt(url.searchParams.get("page") || "1", 10);
        
        // Basic security for cron job triggers
        if (secret !== (process.env.SYNC_SECRET || "dev-secret")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          // 1. Fetch towns & categories to map WP names
          const { data: towns } = await supabaseAdmin.from("towns").select("id, name_hi, name_en");
          const { data: categories } = await supabaseAdmin.from("categories").select("id, name_hi, name_en");

          // 2. Fetch WP posts
          const wpRes = await fetch(`https://abhitaknews.in/wp-json/wp/v2/posts?_embed=1&per_page=50&page=${page}`);
          if (!wpRes.ok) {
            return Response.json({ error: "Failed to fetch from WP API", status: wpRes.status }, { status: 500 });
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
              author_id: "00000000-0000-0000-0000-000000000000", // Will be replaced by actual admin later if needed, or we can use a system author. Wait, author_id is an FK to auth.users. 
              // We should probably just omit author_id and let the DB trigger handle it or fetch a default admin.
              town_id: townId,
              category_id: categoryId,
            };

            // Upsert (we rely on unique slug, but Supabase standard is upsert by Primary Key. 
            // If we don't know the ID, we can query by slug first or use ON CONFLICT)
            const { data: existing } = await supabaseAdmin
              .from("articles")
              .select("id")
              .eq("slug", post.slug)
              .maybeSingle();

            if (existing) {
              await supabaseAdmin.from("articles").update(articleData).eq("id", existing.id);
            } else {
              // We need an author ID. We'll just grab the first admin user
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

          return Response.json({ success: true, imported, page, total_in_page: posts.length });
        } catch (err: any) {
          console.error("Sync error:", err);
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
