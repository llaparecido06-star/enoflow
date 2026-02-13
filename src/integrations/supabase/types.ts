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
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          winery_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          password_hash: string
          role?: Database["public"]["Enums"]["admin_role"]
          winery_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
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
            foreignKeyName: "automations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads_public"
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
      menu_items: {
        Row: {
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
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads_public"
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
          auth_user_id: string | null
          created_at: string
          id: string
          name: string
          preferences_summary: string | null
          whatsapp: string
          winery_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          name: string
          preferences_summary?: string | null
          whatsapp: string
          winery_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
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
            foreignKeyName: "vouchers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads_public"
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
          id: string
          logo_url: string | null
          name: string
          plan_level: Database["public"]["Enums"]["plan_level"]
          primary_color: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan_level?: Database["public"]["Enums"]["plan_level"]
          primary_color?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan_level?: Database["public"]["Enums"]["plan_level"]
          primary_color?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      wines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          on_restaurant: boolean
          on_shop: boolean
          on_tasting: boolean
          price_bottle: number
          price_glass: number | null
          sensory_acidity: number
          sensory_body: number
          sensory_sweetness: number
          type: string
          winery_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          on_restaurant?: boolean
          on_shop?: boolean
          on_tasting?: boolean
          price_bottle?: number
          price_glass?: number | null
          sensory_acidity?: number
          sensory_body?: number
          sensory_sweetness?: number
          type: string
          winery_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          on_restaurant?: boolean
          on_shop?: boolean
          on_tasting?: boolean
          price_bottle?: number
          price_glass?: number | null
          sensory_acidity?: number
          sensory_body?: number
          sensory_sweetness?: number
          type?: string
          winery_id?: string
        }
        Relationships: [
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
          email: string | null
          id: string | null
          name: string | null
          role: Database["public"]["Enums"]["admin_role"] | null
          winery_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"] | null
          winery_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
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
      users_leads_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          preferences_summary: string | null
          winery_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          preferences_summary?: string | null
          winery_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          preferences_summary?: string | null
          winery_id?: string | null
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
