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
      campaigns: {
        Row: {
          created_at: string
          id: string
          message: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          target_filter: Json
          title: string
          type: string
          winery_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_filter?: Json
          title: string
          type?: string
          winery_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          target_filter?: Json
          title?: string
          type?: string
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_winery_id_fkey"
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
          linked_restaurant_cp_id: string | null
          linked_shop_cp_id: string | null
          linked_tasting_cp_id: string | null
          linked_tasting_package_ids: string[]
          name: string
          redirect_url: string | null
          winery_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          linked_restaurant_cp_id?: string | null
          linked_shop_cp_id?: string | null
          linked_tasting_cp_id?: string | null
          linked_tasting_package_ids?: string[]
          name: string
          redirect_url?: string | null
          winery_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          linked_restaurant_cp_id?: string | null
          linked_shop_cp_id?: string | null
          linked_tasting_cp_id?: string | null
          linked_tasting_package_ids?: string[]
          name?: string
          redirect_url?: string | null
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capture_points_linked_restaurant_cp_id_fkey"
            columns: ["linked_restaurant_cp_id"]
            isOneToOne: false
            referencedRelation: "capture_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_points_linked_shop_cp_id_fkey"
            columns: ["linked_shop_cp_id"]
            isOneToOne: false
            referencedRelation: "capture_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_points_linked_tasting_cp_id_fkey"
            columns: ["linked_tasting_cp_id"]
            isOneToOne: false
            referencedRelation: "capture_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capture_points_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_assignment_queue: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_assigned_admin_id: string | null
          mode: string
          updated_at: string
          winery_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_assigned_admin_id?: string | null
          mode?: string
          updated_at?: string
          winery_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_assigned_admin_id?: string | null
          mode?: string
          updated_at?: string
          winery_id?: string
        }
        Relationships: []
      }
      crm_assignment_queue_members: {
        Row: {
          active: boolean
          admin_id: string
          created_at: string
          id: string
          position: number
          winery_id: string
        }
        Insert: {
          active?: boolean
          admin_id: string
          created_at?: string
          id?: string
          position?: number
          winery_id: string
        }
        Update: {
          active?: boolean
          admin_id?: string
          created_at?: string
          id?: string
          position?: number
          winery_id?: string
        }
        Relationships: []
      }
      crm_lead_notes: {
        Row: {
          admin_id: string
          body: string
          created_at: string
          id: string
          lead_id: string
          winery_id: string
        }
        Insert: {
          admin_id: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
          winery_id: string
        }
        Update: {
          admin_id?: string
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          winery_id?: string
        }
        Relationships: []
      }
      crm_lead_state: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          estimated_value: number
          id: string
          lead_id: string
          lost_reason: string | null
          stage: string
          stage_changed_at: string
          tags: string[]
          updated_at: string
          winery_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          estimated_value?: number
          id?: string
          lead_id: string
          lost_reason?: string | null
          stage?: string
          stage_changed_at?: string
          tags?: string[]
          updated_at?: string
          winery_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          estimated_value?: number
          id?: string
          lead_id?: string
          lost_reason?: string | null
          stage?: string
          stage_changed_at?: string
          tags?: string[]
          updated_at?: string
          winery_id?: string
        }
        Relationships: []
      }
      crm_message_log: {
        Row: {
          admin_id: string
          body: string | null
          channel: string
          id: string
          lead_id: string
          sent_at: string
          template_id: string | null
          winery_id: string
        }
        Insert: {
          admin_id: string
          body?: string | null
          channel?: string
          id?: string
          lead_id: string
          sent_at?: string
          template_id?: string | null
          winery_id: string
        }
        Update: {
          admin_id?: string
          body?: string | null
          channel?: string
          id?: string
          lead_id?: string
          sent_at?: string
          template_id?: string | null
          winery_id?: string
        }
        Relationships: []
      }
      crm_message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          stage: string | null
          winery_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          stage?: string | null
          winery_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          stage?: string | null
          winery_id?: string
        }
        Relationships: []
      }
      crm_notification_prefs: {
        Row: {
          admin_id: string
          digest_frequency: string
          id: string
          notify_new_lead: boolean
          notify_overdue: boolean
          notify_scheduled_ready: boolean
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          updated_at: string
          winery_id: string
        }
        Insert: {
          admin_id: string
          digest_frequency?: string
          id?: string
          notify_new_lead?: boolean
          notify_overdue?: boolean
          notify_scheduled_ready?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          updated_at?: string
          winery_id: string
        }
        Update: {
          admin_id?: string
          digest_frequency?: string
          id?: string
          notify_new_lead?: boolean
          notify_overdue?: boolean
          notify_scheduled_ready?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          updated_at?: string
          winery_id?: string
        }
        Relationships: []
      }
      crm_saved_segments: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          winery_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          winery_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          winery_id?: string
        }
        Relationships: []
      }
      crm_scheduled_messages: {
        Row: {
          attempted_at: string | null
          body_resolved: string
          created_at: string
          created_by: string
          error_reason: string | null
          id: string
          last_status_change_by: string | null
          lead_id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          template_id: string | null
          winery_id: string
        }
        Insert: {
          attempted_at?: string | null
          body_resolved: string
          created_at?: string
          created_by: string
          error_reason?: string | null
          id?: string
          last_status_change_by?: string | null
          lead_id: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          winery_id: string
        }
        Update: {
          attempted_at?: string | null
          body_resolved?: string
          created_at?: string
          created_by?: string
          error_reason?: string | null
          id?: string
          last_status_change_by?: string | null
          lead_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          winery_id?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          admin_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string
          id: string
          lead_id: string | null
          status: string
          title: string
          type: string
          winery_id: string
        }
        Insert: {
          admin_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at: string
          id?: string
          lead_id?: string | null
          status?: string
          title: string
          type?: string
          winery_id: string
        }
        Update: {
          admin_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string
          id?: string
          lead_id?: string | null
          status?: string
          title?: string
          type?: string
          winery_id?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          contact_name: string
          contact_whatsapp: string | null
          created_at: string
          event_id: string
          id: string
          lead_id: string | null
          party_size: number
          status: string
          winery_id: string
        }
        Insert: {
          contact_name: string
          contact_whatsapp?: string | null
          created_at?: string
          event_id: string
          id?: string
          lead_id?: string | null
          party_size?: number
          status?: string
          winery_id: string
        }
        Update: {
          contact_name?: string
          contact_whatsapp?: string | null
          created_at?: string
          event_id?: string
          id?: string
          lead_id?: string | null
          party_size?: number
          status?: string
          winery_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          capacity: number
          capture_point_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          price: number
          rsvp_count: number
          starts_at: string
          status: string
          title: string
          updated_at: string
          winery_id: string
        }
        Insert: {
          capacity?: number
          capture_point_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          price?: number
          rsvp_count?: number
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          winery_id: string
        }
        Update: {
          capacity?: number
          capture_point_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          price?: number
          rsvp_count?: number
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          winery_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          wine_id: string
          winery_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          wine_id: string
          winery_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          wine_id?: string
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          winery_name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          winery_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          winery_name?: string | null
        }
        Relationships: []
      }
      loyalty_redemptions: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          points_spent: number
          redeemed_at: string | null
          reward_id: string
          status: string
          user_id: string
          winery_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          points_spent: number
          redeemed_at?: string | null
          reward_id: string
          status?: string
          user_id: string
          winery_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          points_spent?: number
          redeemed_at?: string | null
          reward_id?: string
          status?: string
          user_id?: string
          winery_id?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          points_cost: number
          threshold: number
          title: string
          winery_id: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          points_cost?: number
          threshold: number
          title: string
          winery_id: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          points_cost?: number
          threshold?: number
          title?: string
          winery_id?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          color: string
          created_at: string
          id: string
          min_points: number
          name: string
          perks: Json
          position: number
          winery_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          min_points?: number
          name: string
          perks?: Json
          position?: number
          winery_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          min_points?: number
          name?: string
          perks?: Json
          position?: number
          winery_id?: string
        }
        Relationships: []
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
      nps_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          score: number
          user_id: string | null
          voucher_id: string | null
          winery_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          score: number
          user_id?: string | null
          voucher_id?: string | null
          winery_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          score?: number
          user_id?: string | null
          voucher_id?: string | null
          winery_id?: string
        }
        Relationships: []
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
      reservation_slots: {
        Row: {
          active: boolean
          capacity: number
          capture_point_id: string | null
          created_at: string
          end_time: string
          id: string
          price: number
          start_time: string
          updated_at: string
          weekday: number
          winery_id: string
        }
        Insert: {
          active?: boolean
          capacity?: number
          capture_point_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          price?: number
          start_time: string
          updated_at?: string
          weekday: number
          winery_id: string
        }
        Update: {
          active?: boolean
          capacity?: number
          capture_point_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          price?: number
          start_time?: string
          updated_at?: string
          weekday?: number
          winery_id?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          assigned_admin_id: string | null
          capture_point_id: string | null
          contact_name: string | null
          contact_whatsapp: string | null
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          party_size: number
          scheduled_at: string
          slot_id: string | null
          source: string
          status: string
          updated_at: string
          winery_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          capture_point_id?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          party_size?: number
          scheduled_at: string
          slot_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          winery_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          capture_point_id?: string | null
          contact_name?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          party_size?: number
          scheduled_at?: string
          slot_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          winery_id?: string
        }
        Relationships: []
      }
      staff_login_activity: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          winery_id: string
        }
        Insert: {
          action?: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          winery_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          winery_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_login_activity_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_login_activity_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_login_activity_winery_id_fkey"
            columns: ["winery_id"]
            isOneToOne: false
            referencedRelation: "wineries"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          admin_id: string | null
          created_at: string
          delta: number
          id: string
          note: string | null
          reason: string
          voucher_id: string | null
          wine_id: string
          winery_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          reason?: string
          voucher_id?: string | null
          wine_id: string
          winery_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          reason?: string
          voucher_id?: string | null
          wine_id?: string
          winery_id?: string
        }
        Relationships: []
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
          loyalty_points: number
          name: string
          preferences_summary: string | null
          referral_count: number
          referred_by: string | null
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
          loyalty_points?: number
          name: string
          preferences_summary?: string | null
          referral_count?: number
          referred_by?: string | null
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
          loyalty_points?: number
          name?: string
          preferences_summary?: string | null
          referral_count?: number
          referred_by?: string | null
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
          channel: string
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
          channel?: string
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
          channel?: string
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
      wine_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          public_response: string | null
          responded_at: string | null
          responded_by: string | null
          stars: number
          user_id: string | null
          wine_id: string
          winery_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          public_response?: string | null
          responded_at?: string | null
          responded_by?: string | null
          stars: number
          user_id?: string | null
          wine_id: string
          winery_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          public_response?: string | null
          responded_at?: string | null
          responded_by?: string | null
          stars?: number
          user_id?: string | null
          wine_id?: string
          winery_id?: string
        }
        Relationships: []
      }
      wineries: {
        Row: {
          address: string | null
          business_hours: Json
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          default_language: string
          enabled_modules: string[]
          id: string
          instagram_url: string | null
          lgpd_policy_url: string | null
          logo_url: string | null
          loyalty_rules: Json
          max_locations: number
          name: string
          plan_level: Database["public"]["Enums"]["plan_level"]
          platform_commission_rate: number
          primary_color: string
          slug: string
          status: string
          subscription_value: number
          supported_languages: string[]
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_hours?: Json
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          default_language?: string
          enabled_modules?: string[]
          id?: string
          instagram_url?: string | null
          lgpd_policy_url?: string | null
          logo_url?: string | null
          loyalty_rules?: Json
          max_locations?: number
          name: string
          plan_level?: Database["public"]["Enums"]["plan_level"]
          platform_commission_rate?: number
          primary_color?: string
          slug: string
          status?: string
          subscription_value?: number
          supported_languages?: string[]
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_hours?: Json
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          default_language?: string
          enabled_modules?: string[]
          id?: string
          instagram_url?: string | null
          lgpd_policy_url?: string | null
          logo_url?: string | null
          loyalty_rules?: Json
          max_locations?: number
          name?: string
          plan_level?: Database["public"]["Enums"]["plan_level"]
          platform_commission_rate?: number
          primary_color?: string
          slug?: string
          status?: string
          subscription_value?: number
          supported_languages?: string[]
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
          stock_min: number
          stock_qty: number
          track_stock: boolean
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
          stock_min?: number
          stock_qty?: number
          track_stock?: boolean
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
          stock_min?: number
          stock_qty?: number
          track_stock?: boolean
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
        | "sales"
        | "atendente"
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
        "sales",
        "atendente",
      ],
      automation_status: ["sent", "scheduled"],
      plan_level: ["bronze", "silver", "gold"],
      trigger_type: ["D+1", "D+15"],
    },
  },
} as const
