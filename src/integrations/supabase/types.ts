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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          winery_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          password_hash: string
          role?: Database["public"]["Enums"]["admin_role"]
          winery_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["admin_role"]
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          commission_value: number | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["automation_status"]
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          user_id: string
          winery_id: string
        }
        Insert: {
          commission_value?: number | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["automation_status"]
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          user_id: string
          winery_id: string
        }
        Update: {
          commission_value?: number | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["automation_status"]
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          user_id?: string
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automations_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_history: {
        Row: {
          capture_category: string | null
          capture_location: string | null
          capture_point_id: string | null
          created_at: string
          id: string
          user_id: string
          winery_id: string
        }
        Insert: {
          capture_category?: string | null
          capture_location?: string | null
          capture_point_id?: string | null
          created_at?: string
          id?: string
          user_id: string
          winery_id: string
        }
        Update: {
          capture_category?: string | null
          capture_location?: string | null
          capture_point_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_history_capture_point_id_fkey"
            columns: ["capture_point_id"]
            isOneToOne: false
            referencedRelation: "capture_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_history_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      capture_points: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          redirect_url: string | null
          winery_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          name: string
          redirect_url?: string | null
          winery_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          redirect_url?: string | null
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_points_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          capture_point_ids: string[]
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          suggested_wine_id: string | null
          winery_id: string
        }
        Insert: {
          capture_point_ids?: string[]
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          suggested_wine_id?: string | null
          winery_id: string
        }
        Update: {
          capture_point_ids?: string[]
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          suggested_wine_id?: string | null
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_suggested_wine_id_fkey"
            columns: ["suggested_wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          stars_acidity: number
          stars_body: number
          stars_sweetness: number
          user_id: string
          wine_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stars_acidity?: number
          stars_body?: number
          stars_sweetness?: number
          user_id: string
          wine_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stars_acidity?: number
          stars_body?: number
          stars_sweetness?: number
          user_id?: string
          wine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          commission_rate: number
          created_at: string
          enabled_modules: string[]
          features: string[]
          id: string
          is_active: boolean
          max_locations: number
          max_staff: number | null
          max_wines: number | null
          name: string
          plan_key: string
          price: number
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          enabled_modules?: string[]
          features?: string[]
          id?: string
          is_active?: boolean
          max_locations?: number
          max_staff?: number | null
          max_wines?: number | null
          name: string
          plan_key: string
          price?: number
        }
        Update: {
          commission_rate?: number
          created_at?: string
          enabled_modules?: string[]
          features?: string[]
          id?: string
          is_active?: boolean
          max_locations?: number
          max_staff?: number | null
          max_wines?: number | null
          name?: string
          plan_key?: string
          price?: number
        }
        Relationships: []
      }
      tasting_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          wine_ids: string[]
          winery_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: number
          wine_ids?: string[]
          winery_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          wine_ids?: string[]
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasting_packages_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      users_leads: {
        Row: {
          accepted_terms: boolean
          acquisition_category: string | null
          acquisition_location: string | null
          auth_user_id: string | null
          birth_date: string | null
          created_at: string
          gender: string | null
          id: string
          income_class: string | null
          lgpd_consent_date: string | null
          name: string
          preferences_summary: string | null
          whatsapp: string
          winery_id: string
        }
        Insert: {
          accepted_terms?: boolean
          acquisition_category?: string | null
          acquisition_location?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          income_class?: string | null
          lgpd_consent_date?: string | null
          name: string
          preferences_summary?: string | null
          whatsapp: string
          winery_id: string
        }
        Update: {
          accepted_terms?: boolean
          acquisition_category?: string | null
          acquisition_location?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          income_class?: string | null
          lgpd_consent_date?: string | null
          name?: string
          preferences_summary?: string | null
          whatsapp?: string
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_leads_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          id: string
          items: Json
          nps_score: number | null
          redeemed: boolean
          total: number
          user_id: string
          winery_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          items?: Json
          nps_score?: number | null
          redeemed?: boolean
          total?: number
          user_id: string
          winery_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          items?: Json
          nps_score?: number | null
          redeemed?: boolean
          total?: number
          user_id?: string
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      wineries: {
        Row: {
          created_at: string
          currency: string
          enabled_modules: string[]
          id: string
          logo_url: string | null
          max_locations: number
          name: string
          plan_level: Database["public"]["Enums"]["plan_level"]
          platform_commission_rate: number
          primary_color: string
          slug: string
          status: string
          subscription_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          enabled_modules?: string[]
          id?: string
          logo_url?: string | null
          max_locations?: number
          name: string
          plan_level?: Database["public"]["Enums"]["plan_level"]
          platform_commission_rate?: number
          primary_color?: string
          slug: string
          status?: string
          subscription_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          enabled_modules?: string[]
          id?: string
          logo_url?: string | null
          max_locations?: number
          name?: string
          plan_level?: Database["public"]["Enums"]["plan_level"]
          platform_commission_rate?: number
          primary_color?: string
          slug?: string
          status?: string
          subscription_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      wines: {
        Row: {
          aging: string | null
          alcohol_content: string | null
          aromatic_notes: string[] | null
          capture_point_id: string | null
          created_at: string
          description: string | null
          enologist: string | null
          grape: string | null
          harmonization: string[] | null
          id: string
          image_url: string | null
          name: string
          on_restaurant: boolean
          on_shop: boolean
          on_tasting: boolean
          price_bottle: number
          price_glass: number | null
          region: string | null
          sensory_acidity: number
          sensory_body: number
          sensory_sweetness: number
          serving_temp: string | null
          type: string
          winery_id: string
          year: number | null
        }
        Insert: {
          aging?: string | null
          alcohol_content?: string | null
          aromatic_notes?: string[] | null
          capture_point_id?: string | null
          created_at?: string
          description?: string | null
          enologist?: string | null
          grape?: string | null
          harmonization?: string[] | null
          id?: string
          image_url?: string | null
          name: string
          on_restaurant?: boolean
          on_shop?: boolean
          on_tasting?: boolean
          price_bottle?: number
          price_glass?: number | null
          region?: string | null
          sensory_acidity?: number
          sensory_body?: number
          sensory_sweetness?: number
          serving_temp?: string | null
          type: string
          winery_id: string
          year?: number | null
        }
        Update: {
          aging?: string | null
          alcohol_content?: string | null
          aromatic_notes?: string[] | null
          capture_point_id?: string | null
          created_at?: string
          description?: string | null
          enologist?: string | null
          grape?: string | null
          harmonization?: string[] | null
          id?: string
          image_url?: string | null
          name?: string
          on_restaurant?: boolean
          on_shop?: boolean
          on_tasting?: boolean
          price_bottle?: number
          price_glass?: number | null
          region?: string | null
          sensory_acidity?: number
          sensory_body?: number
          sensory_sweetness?: number
          serving_temp?: string | null
          type?: string
          winery_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wines_capture_point_id_fkey"
            columns: ["capture_point_id"]
            isOneToOne: false
            referencedRelation: "capture_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wines_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_users_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          role: Database["public"]["Enums"]["admin_role"] | null
          winery_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          winery_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          winery_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_login: {
        Args: { p_email: string; p_password: string; p_winery_id: string }
        Returns: {
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["admin_role"]
          winery_id: string
        }[]
      }
      hash_password: { Args: { p_password: string }; Returns: string }
      master_login: {
        Args: { p_email: string; p_password: string }
        Returns: {
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["admin_role"]
          winery_id: string
        }[]
      }
      sso_login: {
        Args: { p_email: string; p_password: string }
        Returns: {
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["admin_role"]
          winery_id: string
          winery_name: string
          winery_slug: string
          winery_status: string
        }[]
      }
    }
    Enums: {
      admin_role:
        | "funcionario"
        | "gerente"
        | "dono"
        | "master"
        | "owner"
        | "manager"
        | "staff"
      automation_status: "sent" | "scheduled"
      plan_level: "bronze" | "silver" | "gold"
      trigger_type: "D+1" | "D+15"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      admin_role: [
        "funcionario",
        "gerente",
        "dono",
        "master",
        "owner",
        "manager",
        "staff",
      ],
      automation_status: ["sent", "scheduled"],
      plan_level: ["bronze", "silver", "gold"],
      trigger_type: ["D+1", "D+15"],
    },
  },
} as const
