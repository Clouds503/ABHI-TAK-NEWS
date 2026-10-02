export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          advertiser: string | null
          campaign_type: string
          clicks: number
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          impressions: number
          is_active: boolean
          link_url: string | null
          media_type: string
          placement: string
          starts_at: string | null
          title: string
          town_id: string | null
          video_url: string | null
        }
        Insert: {
          advertiser?: string | null
          campaign_type?: string
          clicks?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          media_type?: string
          placement?: string
          starts_at?: string | null
          title: string
          town_id?: string | null
          video_url?: string | null
        }
        Update: {
          advertiser?: string | null
          campaign_type?: string
          clicks?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          impressions?: number
          is_active?: boolean
          link_url?: string | null
          media_type?: string
          placement?: string
          starts_at?: string | null
          title?: string
          town_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          body_en: string | null
          body_hi: string | null
          category_id: string | null
          city_id: string | null
          cover_url: string | null
          created_at: string
          id: string
          is_breaking: boolean
          is_featured: boolean
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary_en: string | null
          summary_hi: string | null
          title_en: string | null
          title_hi: string
          town_id: string | null
          updated_at: string
          views: number
          village_id: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          body_en?: string | null
          body_hi?: string | null
          category_id?: string | null
          city_id?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_breaking?: boolean
          is_featured?: boolean
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary_en?: string | null
          summary_hi?: string | null
          title_en?: string | null
          title_hi: string
          town_id?: string | null
          updated_at?: string
          views?: number
          village_id?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          body_en?: string | null
          body_hi?: string | null
          category_id?: string | null
          city_id?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          is_breaking?: boolean
          is_featured?: boolean
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary_en?: string | null
          summary_hi?: string | null
          title_en?: string | null
          title_hi?: string
          town_id?: string | null
          updated_at?: string
          views?: number
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }

      bookmarks: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_hi: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_hi: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_hi?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          is_active: boolean
          kind: string
          name_en: string
          name_hi: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          kind?: string
          name_en: string
          name_hi: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          kind?: string
          name_en?: string
          name_hi?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      epapers: {
        Row: {
          cover_url: string | null
          created_at: string
          edition_date: string
          id: string
          pdf_url: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          edition_date: string
          id?: string
          pdf_url: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          edition_date?: string
          id?: string
          pdf_url?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          full_name: string
          id: string
          message: string | null
          phone: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_join: boolean
          created_at: string
          description: string | null
          event_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          location: string | null
          title: string
        }
        Insert: {
          allow_join?: boolean
          created_at?: string
          description?: string | null
          event_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          location?: string | null
          title: string
        }
        Update: {
          allow_join?: boolean
          created_at?: string
          description?: string | null
          event_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          location?: string | null
          title?: string
        }
        Relationships: []
      }
      jan_ki_awaaz_posts: {
        Row: {
          admin_notes: string | null
          area: string | null
          category: string
          created_at: string
          description: string
          id: string
          is_anonymous: boolean
          is_featured: boolean
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          reporter_name: string | null
          status: Database["public"]["Enums"]["jka_status"]
          title: string
          town_id: string | null
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          area?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          is_anonymous?: boolean
          is_featured?: boolean
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          reporter_name?: string | null
          status?: Database["public"]["Enums"]["jka_status"]
          title: string
          town_id?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          area?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_anonymous?: boolean
          is_featured?: boolean
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          reporter_name?: string | null
          status?: Database["public"]["Enums"]["jka_status"]
          title?: string
          town_id?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jan_ki_awaaz_posts_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      jan_ki_awaaz_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          post_id: string
          status: Database["public"]["Enums"]["jka_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          post_id: string
          status: Database["public"]["Enums"]["jka_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["jka_status"]
        }
        Relationships: [
          {
            foreignKeyName: "jan_ki_awaaz_status_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "jan_ki_awaaz_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jan_ki_awaaz_status_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "jka_public"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          id: string
          is_live: boolean
          scheduled_at: string | null
          stream_url: string
          thumbnail_url: string | null
          title_en: string | null
          title_hi: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_live?: boolean
          scheduled_at?: string | null
          stream_url: string
          thumbnail_url?: string | null
          title_en?: string | null
          title_hi: string
        }
        Update: {
          created_at?: string
          id?: string
          is_live?: boolean
          scheduled_at?: string | null
          stream_url?: string
          thumbnail_url?: string | null
          title_en?: string | null
          title_hi?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string
          town_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
          town_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
          town_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_active: boolean
          shortcode: string
          sort_order: number
          video_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          shortcode: string
          sort_order?: number
          video_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          shortcode?: string
          sort_order?: number
          video_url?: string | null
        }
        Relationships: []
      }
      towns: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_hi: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_hi: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_hi?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category_id: string | null
          created_at: string
          duration: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_url: string | null
          title_en: string | null
          title_hi: string
          town_id: string | null
          video_url: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title_en?: string | null
          title_hi: string
          town_id?: string | null
          video_url: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          title_en?: string | null
          title_hi?: string
          town_id?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_hi: string
          town_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_hi: string
          town_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_hi?: string
          town_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villages_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      jka_public: {
        Row: {
          area: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_featured: boolean | null
          photo_url: string | null
          reporter_name: string | null
          status: Database["public"]["Enums"]["jka_status"] | null
          title: string | null
          town_id: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          area?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_featured?: boolean | null
          photo_url?: string | null
          reporter_name?: never
          status?: Database["public"]["Enums"]["jka_status"] | null
          title?: string | null
          town_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          area?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_featured?: boolean | null
          photo_url?: string | null
          reporter_name?: never
          status?: Database["public"]["Enums"]["jka_status"] | null
          title?: string | null
          town_id?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jan_ki_awaaz_posts_town_id_fkey"
            columns: ["town_id"]
            isOneToOne: false
            referencedRelation: "towns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      record_campaign_event: {
        Args: { _campaign_id: string; _event: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "editor"
        | "moderator"
        | "reporter"
        | "user"
      content_status: "draft" | "pending" | "published" | "archived"
      jka_status:
        | "pending"
        | "approved"
        | "rejected"
        | "forwarded"
        | "in_progress"
        | "resolved"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "editor",
        "moderator",
        "reporter",
        "user",
      ],
      content_status: ["draft", "pending", "published", "archived"],
      jka_status: [
        "pending",
        "approved",
        "rejected",
        "forwarded",
        "in_progress",
        "resolved",
        "archived",
      ],
    },
  },
} as const
