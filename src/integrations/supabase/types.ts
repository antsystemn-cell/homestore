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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      active_carts: {
        Row: {
          items: Json
          reminded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          items?: Json
          reminded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          items?: Json
          reminded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_images: {
        Row: {
          created_at: string
          device: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          placement: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          device?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          placement?: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          device?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          placement?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          category: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          product_id: string | null
          session_id: string | null
          session_token: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          product_id?: string | null
          session_id?: string | null
          session_token?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          product_id?: string | null
          session_id?: string | null
          session_token?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          country: string | null
          device: string | null
          id: string
          ip_hash: string | null
          is_returning: boolean
          landing_path: string | null
          last_seen_at: string
          referrer: string | null
          session_token: string
          started_at: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country?: string | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          is_returning?: boolean
          landing_path?: string | null
          last_seen_at?: string
          referrer?: string | null
          session_token: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country?: string | null
          device?: string | null
          id?: string
          ip_hash?: string | null
          is_returning?: boolean
          landing_path?: string | null
          last_seen_at?: string
          referrer?: string | null
          session_token?: string
          started_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string | null
          button_link: string | null
          button_text: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          position: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      body_profiles: {
        Row: {
          body_shape: string | null
          bust_cm: number | null
          created_at: string
          height_cm: number | null
          hip_cm: number | null
          id: string
          preferred_fit: string | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_shape?: string | null
          bust_cm?: number | null
          created_at?: string
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          preferred_fit?: string | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_shape?: string | null
          bust_cm?: number | null
          created_at?: string
          height_cm?: number | null
          hip_cm?: number | null
          id?: string
          preferred_fit?: string | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          position: number | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          position?: number | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          position?: number | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_settings: {
        Row: {
          bot_name: string
          greeting_message: string
          id: number
          is_enabled: boolean
          system_prompt: string
          updated_at: string
        }
        Insert: {
          bot_name?: string
          greeting_message?: string
          id?: number
          is_enabled?: boolean
          system_prompt?: string
          updated_at?: string
        }
        Update: {
          bot_name?: string
          greeting_message?: string
          id?: number
          is_enabled?: boolean
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      deleted_orders: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          deleted_by_email: string | null
          id: string
          order_id: string
          order_ref: string | null
          snapshot: Json
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_email?: string | null
          id?: string
          order_id: string
          order_ref?: string | null
          snapshot: Json
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_email?: string | null
          id?: string
          order_id?: string
          order_ref?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      delivery_options: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          estimated_days_max: number | null
          estimated_days_min: number | null
          id: string
          is_active: boolean
          name: string
          payment_terms: string | null
          phone: string | null
          position: number | null
          price: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean
          name: string
          payment_terms?: string | null
          phone?: string | null
          position?: number | null
          price?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          estimated_days_max?: number | null
          estimated_days_min?: number | null
          id?: string
          is_active?: boolean
          name?: string
          payment_terms?: string | null
          phone?: string | null
          position?: number | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      driver_role_requests: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          note: string | null
          phone: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          note?: string | null
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          note: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          note?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      easy_rewards_audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      easy_rewards_engagement_events: {
        Row: {
          action_key: string
          action_type: string
          created_at: string
          event_date: string
          id: string
          ledger_id: string | null
          metadata: Json
          points_awarded: number
          user_id: string
        }
        Insert: {
          action_key: string
          action_type: string
          created_at?: string
          event_date?: string
          id?: string
          ledger_id?: string | null
          metadata?: Json
          points_awarded?: number
          user_id: string
        }
        Update: {
          action_key?: string
          action_type?: string
          created_at?: string
          event_date?: string
          id?: string
          ledger_id?: string | null
          metadata?: Json
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "easy_rewards_engagement_events_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "easy_rewards_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      easy_rewards_fraud_flags: {
        Row: {
          created_at: string
          details: Json
          flag_type: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          flag_type: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          flag_type?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      easy_rewards_ledger: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string | null
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string | null
          parent_entry_id: string | null
          reason: string
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          expires_at?: string | null
          id?: string
          idempotency_key: string
          metadata?: Json
          order_id?: string | null
          parent_entry_id?: string | null
          reason: string
          source_id?: string | null
          source_type: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          metadata?: Json
          order_id?: string | null
          parent_entry_id?: string | null
          reason?: string
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "easy_rewards_ledger_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "easy_rewards_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      easy_rewards_missions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          ledger_id: string | null
          login_days: number
          reels_watched: number
          updated_at: string
          user_id: string
          week_start: string
          wishlist_added: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          ledger_id?: string | null
          login_days?: number
          reels_watched?: number
          updated_at?: string
          user_id: string
          week_start: string
          wishlist_added?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          ledger_id?: string | null
          login_days?: number
          reels_watched?: number
          updated_at?: string
          user_id?: string
          week_start?: string
          wishlist_added?: number
        }
        Relationships: [
          {
            foreignKeyName: "easy_rewards_missions_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "easy_rewards_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      easy_rewards_referrals: {
        Row: {
          approved_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          invitee_ledger_id: string | null
          invitee_user_id: string
          inviter_ledger_id: string | null
          inviter_user_id: string
          qualifying_order_id: string | null
          referral_code: string
          rejection_reason: string | null
          signup_fingerprint: string | null
          signup_ip: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          invitee_ledger_id?: string | null
          invitee_user_id: string
          inviter_ledger_id?: string | null
          inviter_user_id: string
          qualifying_order_id?: string | null
          referral_code: string
          rejection_reason?: string | null
          signup_fingerprint?: string | null
          signup_ip?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          invitee_ledger_id?: string | null
          invitee_user_id?: string
          inviter_ledger_id?: string | null
          inviter_user_id?: string
          qualifying_order_id?: string | null
          referral_code?: string
          rejection_reason?: string | null
          signup_fingerprint?: string | null
          signup_ip?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "easy_rewards_referrals_invitee_ledger_id_fkey"
            columns: ["invitee_ledger_id"]
            isOneToOne: false
            referencedRelation: "easy_rewards_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "easy_rewards_referrals_inviter_ledger_id_fkey"
            columns: ["inviter_ledger_id"]
            isOneToOne: false
            referencedRelation: "easy_rewards_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      easy_rewards_settings: {
        Row: {
          campaign_ends_at: string | null
          campaign_starts_at: string | null
          category_multipliers: Json
          engagement_monthly_cap: number
          engagement_rules: Json
          excluded_categories: Json
          excluded_product_ids: Json
          id: number
          is_enabled: boolean
          launch_date: string
          point_value_mnt: number
          points_expiry_months: number
          points_per_mnt: number
          redemption_cap_percent: number
          referral_credit_amount: number
          referral_credit_expiry_days: number
          referral_hold_days: number
          referral_min_order: number
          referral_monthly_limit: number
          referral_points: number
          sku_multipliers: Json
          updated_at: string
          welcome_credit_amount: number
          welcome_expiry_days: number
          welcome_min_order: number
        }
        Insert: {
          campaign_ends_at?: string | null
          campaign_starts_at?: string | null
          category_multipliers?: Json
          engagement_monthly_cap?: number
          engagement_rules?: Json
          excluded_categories?: Json
          excluded_product_ids?: Json
          id?: number
          is_enabled?: boolean
          launch_date?: string
          point_value_mnt?: number
          points_expiry_months?: number
          points_per_mnt?: number
          redemption_cap_percent?: number
          referral_credit_amount?: number
          referral_credit_expiry_days?: number
          referral_hold_days?: number
          referral_min_order?: number
          referral_monthly_limit?: number
          referral_points?: number
          sku_multipliers?: Json
          updated_at?: string
          welcome_credit_amount?: number
          welcome_expiry_days?: number
          welcome_min_order?: number
        }
        Update: {
          campaign_ends_at?: string | null
          campaign_starts_at?: string | null
          category_multipliers?: Json
          engagement_monthly_cap?: number
          engagement_rules?: Json
          excluded_categories?: Json
          excluded_product_ids?: Json
          id?: number
          is_enabled?: boolean
          launch_date?: string
          point_value_mnt?: number
          points_expiry_months?: number
          points_per_mnt?: number
          redemption_cap_percent?: number
          referral_credit_amount?: number
          referral_credit_expiry_days?: number
          referral_hold_days?: number
          referral_min_order?: number
          referral_monthly_limit?: number
          referral_points?: number
          sku_multipliers?: Json
          updated_at?: string
          welcome_credit_amount?: number
          welcome_expiry_days?: number
          welcome_min_order?: number
        }
        Relationships: []
      }
      easy_rewards_users: {
        Row: {
          created_at: string
          credit_balance: number
          device_fingerprint: string | null
          enrolled_at: string
          fraud_status: string
          last_ip: string | null
          lifetime_points: number
          pending_credit: number
          pending_points: number
          phone_verified_at: string | null
          points_balance: number
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
          welcome_consumed_at: string | null
          welcome_granted_at: string | null
          welcome_revoked_at: string | null
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          device_fingerprint?: string | null
          enrolled_at?: string
          fraud_status?: string
          last_ip?: string | null
          lifetime_points?: number
          pending_credit?: number
          pending_points?: number
          phone_verified_at?: string | null
          points_balance?: number
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          user_id: string
          welcome_consumed_at?: string | null
          welcome_granted_at?: string | null
          welcome_revoked_at?: string | null
        }
        Update: {
          created_at?: string
          credit_balance?: number
          device_fingerprint?: string | null
          enrolled_at?: string
          fraud_status?: string
          last_ip?: string | null
          lifetime_points?: number
          pending_credit?: number
          pending_points?: number
          phone_verified_at?: string | null
          points_balance?: number
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          welcome_consumed_at?: string | null
          welcome_granted_at?: string | null
          welcome_revoked_at?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          product_id: string
          sale_price: number
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          product_id: string
          sale_price: number
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          sale_price?: number
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_redemptions: {
        Row: {
          claimed_at: string
          coupon_id: string | null
          id: string
          order_id: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          coupon_id?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          coupon_id?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "spin_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_redemptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_rewards: {
        Row: {
          created_at: string
          id: string
          inventory: number
          is_active: boolean
          product_id: string
          reward_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory?: number
          is_active?: boolean
          product_id: string
          reward_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory?: number
          is_active?: boolean
          product_id?: string
          reward_tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_rewards_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_spin_balances: {
        Row: {
          available_spins: number
          created_at: string
          expires_at: string
          fingerprint: string
          last_ip: string | null
          updated_at: string
        }
        Insert: {
          available_spins: number
          created_at?: string
          expires_at: string
          fingerprint: string
          last_ip?: string | null
          updated_at?: string
        }
        Update: {
          available_spins?: number
          created_at?: string
          expires_at?: string
          fingerprint?: string
          last_ip?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guest_spin_history: {
        Row: {
          coupon_id: string | null
          created_at: string
          fingerprint: string
          gift_product_id: string | null
          id: string
          ip: string | null
          reward_type: string
          reward_value: number
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          fingerprint: string
          gift_product_id?: string | null
          id?: string
          ip?: string | null
          reward_type: string
          reward_value?: number
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          fingerprint?: string
          gift_product_id?: string | null
          id?: string
          ip?: string | null
          reward_type?: string
          reward_value?: number
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          link_url: string | null
          message: string
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          link_url?: string | null
          message: string
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          message?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_scores: {
        Row: {
          created_at: string
          id: string
          last_activity: string
          last_event_type: string | null
          last_product_id: string | null
          name: string | null
          phone: string | null
          score: number
          session_id: string | null
          session_token: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity?: string
          last_event_type?: string | null
          last_product_id?: string | null
          name?: string | null
          phone?: string | null
          score?: number
          session_id?: string | null
          session_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_activity?: string
          last_event_type?: string | null
          last_product_id?: string | null
          name?: string | null
          phone?: string | null
          score?: number
          session_id?: string | null
          session_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_config: {
        Row: {
          created_at: string
          earn_rate_percent: number
          id: number
          is_enabled: boolean
          max_redeem_percent: number
          min_redeem_points: number
          points_per_mnt: number
          updated_at: string
          vip_threshold: number
        }
        Insert: {
          created_at?: string
          earn_rate_percent?: number
          id?: number
          is_enabled?: boolean
          max_redeem_percent?: number
          min_redeem_points?: number
          points_per_mnt?: number
          updated_at?: string
          vip_threshold?: number
        }
        Update: {
          created_at?: string
          earn_rate_percent?: number
          id?: number
          is_enabled?: boolean
          max_redeem_percent?: number
          min_redeem_points?: number
          points_per_mnt?: number
          updated_at?: string
          vip_threshold?: number
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          applied_coupon_id: string | null
          assigned_at: string | null
          branch: string | null
          coupon_discount: number
          created_at: string
          delivered_at: string | null
          delivery_completed_photo: string | null
          delivery_failed_at: string | null
          delivery_fee: number | null
          delivery_gps_lat: number | null
          delivery_gps_lng: number | null
          delivery_option_id: string | null
          delivery_order_id: string | null
          delivery_pickup_photo: string | null
          delivery_proof_photo: string | null
          delivery_return_reason: string | null
          delivery_signature_name: string | null
          delivery_status: string | null
          delivery_surcharge: number
          driver_id: string | null
          external_ref: string | null
          gift_redemption_id: string | null
          guest_name: string | null
          id: string
          is_guest: boolean | null
          items: Json
          order_ref: string | null
          payment_collected_at: string | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string | null
          phone: string | null
          picked_up_at: string | null
          points_earned: number
          points_redeemed: number
          sale_date: string | null
          shipping_address: string | null
          source: string
          source_note: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          applied_coupon_id?: string | null
          assigned_at?: string | null
          branch?: string | null
          coupon_discount?: number
          created_at?: string
          delivered_at?: string | null
          delivery_completed_photo?: string | null
          delivery_failed_at?: string | null
          delivery_fee?: number | null
          delivery_gps_lat?: number | null
          delivery_gps_lng?: number | null
          delivery_option_id?: string | null
          delivery_order_id?: string | null
          delivery_pickup_photo?: string | null
          delivery_proof_photo?: string | null
          delivery_return_reason?: string | null
          delivery_signature_name?: string | null
          delivery_status?: string | null
          delivery_surcharge?: number
          driver_id?: string | null
          external_ref?: string | null
          gift_redemption_id?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean | null
          items?: Json
          order_ref?: string | null
          payment_collected_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          phone?: string | null
          picked_up_at?: string | null
          points_earned?: number
          points_redeemed?: number
          sale_date?: string | null
          shipping_address?: string | null
          source?: string
          source_note?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          applied_coupon_id?: string | null
          assigned_at?: string | null
          branch?: string | null
          coupon_discount?: number
          created_at?: string
          delivered_at?: string | null
          delivery_completed_photo?: string | null
          delivery_failed_at?: string | null
          delivery_fee?: number | null
          delivery_gps_lat?: number | null
          delivery_gps_lng?: number | null
          delivery_option_id?: string | null
          delivery_order_id?: string | null
          delivery_pickup_photo?: string | null
          delivery_proof_photo?: string | null
          delivery_return_reason?: string | null
          delivery_signature_name?: string | null
          delivery_status?: string | null
          delivery_surcharge?: number
          driver_id?: string | null
          external_ref?: string | null
          gift_redemption_id?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean | null
          items?: Json
          order_ref?: string | null
          payment_collected_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          phone?: string | null
          picked_up_at?: string | null
          points_earned?: number
          points_redeemed?: number
          sale_date?: string | null
          shipping_address?: string | null
          source?: string
          source_note?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_applied_coupon_id_fkey"
            columns: ["applied_coupon_id"]
            isOneToOne: false
            referencedRelation: "spin_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_option_id_fkey"
            columns: ["delivery_option_id"]
            isOneToOne: false
            referencedRelation: "delivery_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_gift_redemption_id_fkey"
            columns: ["gift_redemption_id"]
            isOneToOne: false
            referencedRelation: "gift_redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string | null
          order_id: string | null
          phone: string
          provider: string
          request_id: string
          status: string
          storepay_response: Json | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id?: string | null
          order_id?: string | null
          phone: string
          provider?: string
          request_id: string
          status?: string
          storepay_response?: Json | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string | null
          order_id?: string | null
          phone?: string
          provider?: string
          request_id?: string
          status?: string
          storepay_response?: Json | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          position: number | null
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          position?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          position?: number | null
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          product_ids: Json
          short_code: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          product_ids?: Json
          short_code: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          product_ids?: Json
          short_code?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      product_fit_feedback: {
        Row: {
          created_at: string
          fit_feedback: string | null
          id: string
          order_id: string | null
          product_id: string
          purchased_size: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          fit_feedback?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          purchased_size: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          fit_feedback?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          purchased_size?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_fit_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_fit_feedback_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_returns: {
        Row: {
          condition: string
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          images: Json | null
          note: string | null
          order_id: string | null
          order_ref: string | null
          phone: string
          product_name: string
          quantity: number
          reason: string
          refund_amount: number
          refunded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          condition?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          images?: Json | null
          note?: string | null
          order_id?: string | null
          order_ref?: string | null
          phone: string
          product_name: string
          quantity?: number
          reason: string
          refund_amount?: number
          refunded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          images?: Json | null
          note?: string | null
          order_id?: string | null
          order_ref?: string | null
          phone?: string
          product_name?: string
          quantity?: number
          reason?: string
          refund_amount?: number
          refunded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_size_guides: {
        Row: {
          created_at: string
          id: string
          measurement_type: string
          measurement_value: number
          product_id: string
          size: string
          sort_order: number
          source: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_type: string
          measurement_value: number
          product_id: string
          size: string
          sort_order?: number
          source?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          measurement_type?: string
          measurement_value?: number
          product_id?: string
          size?: string
          sort_order?: number
          source?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_guides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          average_reorder_days: number | null
          brand_id: string | null
          brand_position: number | null
          category: string
          colors: Json | null
          compression_level: string | null
          created_at: string
          description: string | null
          detail_media: Json | null
          discount: number | null
          fabric_material: string | null
          fit_type: string | null
          gift_name: string | null
          gift_packages: Json
          gifts: Json
          has_gift: boolean
          id: string
          image_url: string | null
          is_active: boolean
          is_bogo: boolean | null
          is_new: boolean | null
          is_on_sale: boolean | null
          name: string
          original_price: number | null
          price: number
          product_code: string | null
          sales: number | null
          shrinkage_percent: number | null
          size_chart: Json | null
          sizes: Json | null
          slug: string
          specifications: Json | null
          stock_quantity: number
          stretch_level: string | null
          thumbnail_url: string | null
          updated_at: string
          variant_stock: Json
        }
        Insert: {
          average_reorder_days?: number | null
          brand_id?: string | null
          brand_position?: number | null
          category?: string
          colors?: Json | null
          compression_level?: string | null
          created_at?: string
          description?: string | null
          detail_media?: Json | null
          discount?: number | null
          fabric_material?: string | null
          fit_type?: string | null
          gift_name?: string | null
          gift_packages?: Json
          gifts?: Json
          has_gift?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bogo?: boolean | null
          is_new?: boolean | null
          is_on_sale?: boolean | null
          name: string
          original_price?: number | null
          price: number
          product_code?: string | null
          sales?: number | null
          shrinkage_percent?: number | null
          size_chart?: Json | null
          sizes?: Json | null
          slug: string
          specifications?: Json | null
          stock_quantity?: number
          stretch_level?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variant_stock?: Json
        }
        Update: {
          average_reorder_days?: number | null
          brand_id?: string | null
          brand_position?: number | null
          category?: string
          colors?: Json | null
          compression_level?: string | null
          created_at?: string
          description?: string | null
          detail_media?: Json | null
          discount?: number | null
          fabric_material?: string | null
          fit_type?: string | null
          gift_name?: string | null
          gift_packages?: Json
          gifts?: Json
          has_gift?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bogo?: boolean | null
          is_new?: boolean | null
          is_on_sale?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          product_code?: string | null
          sales?: number | null
          shrinkage_percent?: number | null
          size_chart?: Json | null
          sizes?: Json | null
          slug?: string
          specifications?: Json | null
          stock_quantity?: number
          stretch_level?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variant_stock?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          device_fingerprint: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          last_ip: string | null
          loyalty_points: number
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
          sms_reminders_consent: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          last_ip?: string | null
          loyalty_points?: number
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          sms_reminders_consent?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          last_ip?: string | null
          loyalty_points?: number
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          sms_reminders_consent?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_banners: {
        Row: {
          banner_image: string | null
          button_link: string | null
          button_text: string | null
          created_at: string
          id: string
          is_active: boolean
          position: number | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          banner_image?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          banner_image?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_settings: {
        Row: {
          cart_weights: Json
          id: number
          related_weights: Json
          updated_at: string
        }
        Insert: {
          cart_weights?: Json
          id?: number
          related_weights?: Json
          updated_at?: string
        }
        Update: {
          cart_weights?: Json
          id?: number
          related_weights?: Json
          updated_at?: string
        }
        Relationships: []
      }
      recovery_actions: {
        Row: {
          cart_snapshot: Json | null
          channel: string | null
          contacted_at: string | null
          created_at: string
          handled_by: string | null
          handled_by_email: string | null
          id: string
          invoice_id: string | null
          name: string | null
          note: string | null
          phone: string | null
          recovered_at: string | null
          session_id: string | null
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_snapshot?: Json | null
          channel?: string | null
          contacted_at?: string | null
          created_at?: string
          handled_by?: string | null
          handled_by_email?: string | null
          id?: string
          invoice_id?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          recovered_at?: string | null
          session_id?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_snapshot?: Json | null
          channel?: string | null
          contacted_at?: string | null
          created_at?: string
          handled_by?: string | null
          handled_by_email?: string | null
          id?: string
          invoice_id?: string | null
          name?: string | null
          note?: string | null
          phone?: string | null
          recovered_at?: string | null
          session_id?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          id: string
          is_hidden: boolean
          reel_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          reel_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          reel_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          reel_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          reel_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          reel_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          created_at: string
          description: string | null
          facebook_embed_url: string
          facebook_page_url: string | null
          id: string
          is_active: boolean
          product_id: string | null
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          facebook_embed_url: string
          facebook_page_url?: string | null
          id?: string
          is_active?: boolean
          product_id?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          facebook_embed_url?: string
          facebook_page_url?: string | null
          id?: string
          is_active?: boolean
          product_id?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_order_id: string | null
          created_at: string
          id: string
          invited_email: string | null
          invited_fingerprint: string | null
          invited_ip: string | null
          invited_phone: string | null
          invited_user_id: string
          invitee_coupon_id: string | null
          inviter_coupon_id: string | null
          inviter_user_id: string
          rejection_reason: string | null
          rewarded_at: string | null
          rewarded_spins: number
          status: string
        }
        Insert: {
          completed_order_id?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          invited_fingerprint?: string | null
          invited_ip?: string | null
          invited_phone?: string | null
          invited_user_id: string
          invitee_coupon_id?: string | null
          inviter_coupon_id?: string | null
          inviter_user_id: string
          rejection_reason?: string | null
          rewarded_at?: string | null
          rewarded_spins?: number
          status?: string
        }
        Update: {
          completed_order_id?: string | null
          created_at?: string
          id?: string
          invited_email?: string | null
          invited_fingerprint?: string | null
          invited_ip?: string | null
          invited_phone?: string | null
          invited_user_id?: string
          invitee_coupon_id?: string | null
          inviter_coupon_id?: string | null
          inviter_user_id?: string
          rejection_reason?: string | null
          rewarded_at?: string | null
          rewarded_spins?: number
          status?: string
        }
        Relationships: []
      }
      reminder_config: {
        Row: {
          cart_delay_hours: number
          cart_enabled: boolean
          cart_message_template: string
          created_at: string
          id: number
          order_link_base: string
          reorder_enabled: boolean
          reorder_message_template: string
          sms_provider: string
          sms_sender: string
          updated_at: string
        }
        Insert: {
          cart_delay_hours?: number
          cart_enabled?: boolean
          cart_message_template?: string
          created_at?: string
          id?: number
          order_link_base?: string
          reorder_enabled?: boolean
          reorder_message_template?: string
          sms_provider?: string
          sms_sender?: string
          updated_at?: string
        }
        Update: {
          cart_delay_hours?: number
          cart_enabled?: boolean
          cart_message_template?: string
          created_at?: string
          id?: number
          order_link_base?: string
          reorder_enabled?: boolean
          reorder_message_template?: string
          sms_provider?: string
          sms_sender?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          order_id: string | null
          phone: string | null
          product_id: string | null
          provider: string | null
          provider_response: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          order_id?: string | null
          phone?: string | null
          product_id?: string | null
          provider?: string | null
          provider_response?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          order_id?: string | null
          phone?: string | null
          product_id?: string | null
          provider?: string | null
          provider_response?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          images: string[]
          is_hidden: boolean
          order_id: string | null
          product_id: string
          rating: number
          updated_at: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_hidden?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_hidden?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_sales: {
        Row: {
          amount: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          note: string | null
          product_name: string
          quantity: number
          sale_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          note?: string | null
          product_name: string
          quantity?: number
          sale_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          note?: string | null
          product_name?: string
          quantity?: number
          sale_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_branding: {
        Row: {
          favicon_url: string | null
          id: string
          logo_url: string | null
          og_image_url: string | null
          site_description: string | null
          site_title: string | null
          updated_at: string | null
        }
        Insert: {
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          og_image_url?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string | null
        }
        Update: {
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          og_image_url?: string | null
          site_description?: string | null
          site_title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      size_finder_events: {
        Row: {
          confidence: string | null
          created_at: string
          event_type: string
          fit_preference: string | null
          height_cm: number | null
          id: string
          metadata: Json
          product_id: string | null
          recommended_size: string | null
          selected_size: string | null
          session_token: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          event_type: string
          fit_preference?: string | null
          height_cm?: number | null
          id?: string
          metadata?: Json
          product_id?: string | null
          recommended_size?: string | null
          selected_size?: string | null
          session_token?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          event_type?: string
          fit_preference?: string | null
          height_cm?: number | null
          id?: string
          metadata?: Json
          product_id?: string | null
          recommended_size?: string | null
          selected_size?: string | null
          session_token?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "size_finder_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      size_recommendation_config: {
        Row: {
          algorithm_version: string
          category: string
          chart_image_url: string | null
          created_at: string
          enabled: boolean
          fit_type: string
          height_weight_rules: Json
          id: string
          material: string | null
          product_id: string
          score_weights: Json
          stretch_level: string
          updated_at: string
        }
        Insert: {
          algorithm_version?: string
          category?: string
          chart_image_url?: string | null
          created_at?: string
          enabled?: boolean
          fit_type?: string
          height_weight_rules?: Json
          id?: string
          material?: string | null
          product_id: string
          score_weights?: Json
          stretch_level?: string
          updated_at?: string
        }
        Update: {
          algorithm_version?: string
          category?: string
          chart_image_url?: string | null
          created_at?: string
          enabled?: boolean
          fit_type?: string
          height_weight_rules?: Json
          id?: string
          material?: string | null
          product_id?: string
          score_weights?: Json
          stretch_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_recommendation_config_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_balances: {
        Row: {
          available_spins: number
          created_at: string
          expires_at: string
          id: string
          source: string
          source_ref: string | null
          user_id: string
        }
        Insert: {
          available_spins: number
          created_at?: string
          expires_at: string
          id?: string
          source: string
          source_ref?: string | null
          user_id: string
        }
        Update: {
          available_spins?: number
          created_at?: string
          expires_at?: string
          id?: string
          source?: string
          source_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spin_config: {
        Row: {
          daily_referral_cap: number
          extra_spin_lifetime_cap: number
          id: number
          invitee_referral_spins: number
          is_enabled: boolean
          max_active_spins: number
          probabilities: Json
          referral_spins: number
          reward_expiry_hours: number
          signup_spins: number
          spin_expiry_hours: number
          updated_at: string
        }
        Insert: {
          daily_referral_cap?: number
          extra_spin_lifetime_cap?: number
          id?: number
          invitee_referral_spins?: number
          is_enabled?: boolean
          max_active_spins?: number
          probabilities?: Json
          referral_spins?: number
          reward_expiry_hours?: number
          signup_spins?: number
          spin_expiry_hours?: number
          updated_at?: string
        }
        Update: {
          daily_referral_cap?: number
          extra_spin_lifetime_cap?: number
          id?: number
          invitee_referral_spins?: number
          is_enabled?: boolean
          max_active_spins?: number
          probabilities?: Json
          referral_spins?: number
          reward_expiry_hours?: number
          signup_spins?: number
          spin_expiry_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      spin_coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          guest_fingerprint: string | null
          id: string
          invalidated_at: string | null
          is_used: boolean
          minimum_order_amount: number
          reward_type: string
          reward_value: number
          used_at: string | null
          used_order_id: string | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          guest_fingerprint?: string | null
          id?: string
          invalidated_at?: string | null
          is_used?: boolean
          minimum_order_amount?: number
          reward_type: string
          reward_value?: number
          used_at?: string | null
          used_order_id?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          guest_fingerprint?: string | null
          id?: string
          invalidated_at?: string | null
          is_used?: boolean
          minimum_order_amount?: number
          reward_type?: string
          reward_value?: number
          used_at?: string | null
          used_order_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_coupons_used_order_id_fkey"
            columns: ["used_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_history: {
        Row: {
          coupon_id: string | null
          created_at: string
          device_fingerprint: string | null
          gift_product_id: string | null
          id: string
          ip: string | null
          reward_type: string
          reward_value: number
          user_id: string
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string
          device_fingerprint?: string | null
          gift_product_id?: string | null
          id?: string
          ip?: string | null
          reward_type: string
          reward_value?: number
          user_id: string
        }
        Update: {
          coupon_id?: string | null
          created_at?: string
          device_fingerprint?: string | null
          gift_product_id?: string | null
          id?: string
          ip?: string | null
          reward_type?: string
          reward_value?: number
          user_id?: string
        }
        Relationships: []
      }
      stock_deduction_log: {
        Row: {
          brand_id: string | null
          color: string | null
          created_at: string
          id: string
          order_id: string | null
          order_ref: string | null
          product_id: string | null
          product_name: string | null
          quantity_deducted: number
          size: string | null
          stock_after: number | null
          stock_before: number | null
          variant_key: string | null
        }
        Insert: {
          brand_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          order_ref?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity_deducted: number
          size?: string | null
          stock_after?: number | null
          stock_before?: number | null
          variant_key?: string | null
        }
        Update: {
          brand_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          order_ref?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity_deducted?: number
          size?: string | null
          stock_after?: number | null
          stock_before?: number | null
          variant_key?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string | null
          performed_by: string | null
          performed_by_email: string | null
          product_id: string
          quantity: number
          reason: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          product_id: string
          quantity: number
          reason?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string | null
          performed_by?: string | null
          performed_by_email?: string | null
          product_id?: string
          quantity?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      story_videos: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          position: number | null
          product_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number | null
          product_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number | null
          product_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "story_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      user_size_profiles: {
        Row: {
          created_at: string
          height_cm: number | null
          id: string
          preferred_fit: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          height_cm?: number | null
          id?: string
          preferred_fit?: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          height_cm?: number | null
          id?: string
          preferred_fit?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      wallet_credits: {
        Row: {
          created_at: string
          credit_type: string
          expires_at: string | null
          id: string
          max_discount_amount: number | null
          min_order_amount: number
          note: string | null
          order_id: string | null
          source_coupon_id: string | null
          status: string
          used_at: string | null
          user_id: string
          value: number
          value_type: string
        }
        Insert: {
          created_at?: string
          credit_type: string
          expires_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_order_amount?: number
          note?: string | null
          order_id?: string | null
          source_coupon_id?: string | null
          status?: string
          used_at?: string | null
          user_id: string
          value: number
          value_type: string
        }
        Update: {
          created_at?: string
          credit_type?: string
          expires_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_order_amount?: number
          note?: string | null
          order_id?: string | null
          source_coupon_id?: string | null
          status?: string
          used_at?: string | null
          user_id?: string
          value?: number
          value_type?: string
        }
        Relationships: []
      }
      welcome_showcase_items: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          position: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      welcome_showcase_settings: {
        Row: {
          columns: number
          id: number
          image_size: number
          is_enabled: boolean
          show_delay_ms: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          columns?: number
          id?: number
          image_size?: number
          is_enabled?: boolean
          show_delay_ms?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          columns?: number
          id?: number
          image_size?: number
          is_enabled?: boolean
          show_delay_ms?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_wallet_credit: { Args: { _id: string }; Returns: boolean }
      admin_grant_wallet_credit: {
        Args: {
          _expires_in_days?: number
          _max_discount_amount?: number
          _min_order_amount?: number
          _note?: string
          _user_id: string
          _value: number
          _value_type: string
        }
        Returns: {
          created_at: string
          credit_type: string
          expires_at: string | null
          id: string
          max_discount_amount: number | null
          min_order_amount: number
          note: string | null
          order_id: string | null
          source_coupon_id: string | null
          status: string
          used_at: string | null
          user_id: string
          value: number
          value_type: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_credits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_list_deleted_orders: {
        Args: { _limit?: number }
        Returns: {
          deleted_at: string
          deleted_by: string
          deleted_by_email: string
          id: string
          order_id: string
          order_ref: string
          snapshot: Json
        }[]
      }
      admin_list_orders_light: {
        Args: never
        Returns: {
          applied_coupon_id: string | null
          assigned_at: string | null
          branch: string | null
          coupon_discount: number
          created_at: string
          delivered_at: string | null
          delivery_completed_photo: string | null
          delivery_failed_at: string | null
          delivery_fee: number | null
          delivery_gps_lat: number | null
          delivery_gps_lng: number | null
          delivery_option_id: string | null
          delivery_order_id: string | null
          delivery_pickup_photo: string | null
          delivery_proof_photo: string | null
          delivery_return_reason: string | null
          delivery_signature_name: string | null
          delivery_status: string | null
          delivery_surcharge: number
          driver_id: string | null
          external_ref: string | null
          gift_redemption_id: string | null
          guest_name: string | null
          id: string
          is_guest: boolean | null
          items: Json
          order_ref: string | null
          payment_collected_at: string | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string | null
          phone: string | null
          picked_up_at: string | null
          points_earned: number
          points_redeemed: number
          sale_date: string | null
          shipping_address: string | null
          source: string
          source_note: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_reviews: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          comment: string
          created_at: string
          id: string
          images: string[]
          is_hidden: boolean
          product_id: string
          product_image: string
          product_name: string
          rating: number
          user_id: string
          user_name: string
        }[]
      }
      admin_list_spin_winners: {
        Args: { _limit?: number }
        Returns: {
          coupon_code: string
          coupon_id: string
          coupon_used: boolean
          created_at: string
          gift_product_id: string
          gift_product_name: string
          id: string
          reward_type: string
          reward_value: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_list_used_coupons: {
        Args: { _limit?: number }
        Returns: {
          code: string
          created_at: string
          expires_at: string
          id: string
          minimum_order_amount: number
          order_ref: string
          order_total: number
          reward_type: string
          reward_value: number
          source: string
          used_at: string
          used_order_id: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          address: string
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_vip: boolean
          loyalty_points: number
          order_count: number
          phone: string
          user_id: string
        }[]
      }
      admin_list_wallet_credits: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          credit_type: string
          expires_at: string
          id: string
          max_discount_amount: number
          min_order_amount: number
          note: string
          order_id: string
          status: string
          used_at: string
          user_email: string
          user_id: string
          user_name: string
          value: number
          value_type: string
        }[]
      }
      admin_referral_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          completed_count: number
          email: string
          full_name: string
          invited_count: number
          inviter_user_id: string
          last_invite_at: string
          referral_code: string
        }[]
      }
      admin_referral_summary: {
        Args: never
        Returns: {
          total_completed: number
          total_inviters: number
          total_invites: number
          total_reward_amount: number
        }[]
      }
      admin_restore_deleted_order: {
        Args: { _archive_id: string }
        Returns: string
      }
      apply_referral_code: { Args: { _code: string }; Returns: Json }
      attach_lead_contact: {
        Args: { _name?: string; _phone?: string; _token: string }
        Returns: undefined
      }
      bump_lead_score: {
        Args: {
          _delta: number
          _event: string
          _product_id?: string
          _token: string
        }
        Returns: undefined
      }
      claim_driver_role: { Args: never; Returns: undefined }
      create_guest_order: {
        Args: { payload: Json }
        Returns: {
          id: string
          order_ref: string
        }[]
      }
      current_user_branch: {
        Args: never
        Returns: {
          code: string
          id: string
          name: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delivery_entry_submit: {
        Args: {
          _note?: string
          _order_id: string
          _phone: string
          _shipping_address: string
        }
        Returns: {
          applied_coupon_id: string | null
          assigned_at: string | null
          branch: string | null
          coupon_discount: number
          created_at: string
          delivered_at: string | null
          delivery_completed_photo: string | null
          delivery_failed_at: string | null
          delivery_fee: number | null
          delivery_gps_lat: number | null
          delivery_gps_lng: number | null
          delivery_option_id: string | null
          delivery_order_id: string | null
          delivery_pickup_photo: string | null
          delivery_proof_photo: string | null
          delivery_return_reason: string | null
          delivery_signature_name: string | null
          delivery_status: string | null
          delivery_surcharge: number
          driver_id: string | null
          external_ref: string | null
          gift_redemption_id: string | null
          guest_name: string | null
          id: string
          is_guest: boolean | null
          items: Json
          order_ref: string | null
          payment_collected_at: string | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string | null
          phone: string | null
          picked_up_at: string | null
          points_earned: number
          points_redeemed: number
          sale_date: string | null
          shipping_address: string | null
          source: string
          source_note: string | null
          status: string
          total: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      er_enroll: {
        Args: { _fingerprint?: string; _referral_code?: string }
        Returns: {
          created_at: string
          credit_balance: number
          device_fingerprint: string | null
          enrolled_at: string
          fraud_status: string
          last_ip: string | null
          lifetime_points: number
          pending_credit: number
          pending_points: number
          phone_verified_at: string | null
          points_balance: number
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
          welcome_consumed_at: string | null
          welcome_granted_at: string | null
          welcome_revoked_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "easy_rewards_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      er_generate_referral_code: { Args: never; Returns: string }
      er_is_eligible: { Args: { _user_id: string }; Returns: boolean }
      er_my_summary: { Args: never; Returns: Json }
      er_post_ledger: {
        Args: {
          _amount: number
          _created_by?: string
          _currency: string
          _expires_at?: string
          _idempotency_key?: string
          _metadata?: Json
          _order_id?: string
          _reason: string
          _source_id?: string
          _source_type: string
          _status: string
          _user_id: string
        }
        Returns: {
          amount: number
          approved_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          expires_at: string | null
          id: string
          idempotency_key: string
          metadata: Json
          order_id: string | null
          parent_entry_id: string | null
          reason: string
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "easy_rewards_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      er_recompute_balance: { Args: { _user_id: string }; Returns: undefined }
      generate_referral_code: { Args: never; Returns: string }
      generate_slug: { Args: { name: string }; Returns: string }
      get_active_flash_sales: {
        Args: never
        Returns: {
          discount_percent: number
          ends_at: string
          id: string
          product_id: string
          product_image: string
          product_name: string
          product_price: number
          product_slug: string
          product_thumbnail: string
          sale_price: number
          starts_at: string
        }[]
      }
      get_frequently_bought_together: {
        Args: { _limit?: number; _product_id: string }
        Returns: {
          product_id: string
          score: number
          source: string
        }[]
      }
      get_guest_coupons: {
        Args: { _fp: string }
        Returns: {
          code: string
          created_at: string
          expires_at: string
          guest_fingerprint: string | null
          id: string
          invalidated_at: string | null
          is_used: boolean
          minimum_order_amount: number
          reward_type: string
          reward_value: number
          used_at: string | null
          used_order_id: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "spin_coupons"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_guest_spin_balance: {
        Args: { _fp: string }
        Returns: {
          available_spins: number
          expires_at: string
        }[]
      }
      get_my_order_count: { Args: never; Returns: number }
      get_my_referral_stats: {
        Args: never
        Returns: {
          completed_count: number
          invited_count: number
          pending_count: number
          referral_code: string
        }[]
      }
      get_my_wallet_credits: {
        Args: never
        Returns: {
          created_at: string
          credit_type: string
          expires_at: string | null
          id: string
          max_discount_amount: number | null
          min_order_amount: number
          note: string | null
          order_id: string | null
          source_coupon_id: string | null
          status: string
          used_at: string | null
          user_id: string
          value: number
          value_type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "wallet_credits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_welcome_coupon: {
        Args: never
        Returns: {
          code: string
          expires_at: string
          is_used: boolean
          minimum_order_amount: number
          reward_value: number
        }[]
      }
      get_personalized_recommendations: {
        Args: { _limit?: number }
        Returns: {
          product_id: string
          score: number
        }[]
      }
      get_product_buyer_count: {
        Args: { _product_id: string }
        Returns: number
      }
      get_product_review_stats: {
        Args: { _ids: string[] }
        Returns: {
          avg_rating: number
          product_id: string
          review_count: number
        }[]
      }
      has_purchased_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_collection_view: {
        Args: { _short_code: string }
        Returns: undefined
      }
      increment_story_view: { Args: { _story_id: string }; Returns: undefined }
      list_driver_requests: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          note: string
          phone: string
          review_note: string
          reviewed_at: string
          status: string
          user_id: string
        }[]
      }
      list_drivers: {
        Args: never
        Returns: {
          email: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_wallet_credit: {
        Args: { _credit_id: string; _order_id: string }
        Returns: boolean
      }
      touch_analytics_session: {
        Args: { _token: string; _user_id?: string }
        Returns: undefined
      }
      user_active_spins: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "driver"
        | "delivery_entry"
        | "seller"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "driver",
        "delivery_entry",
        "seller",
      ],
    },
  },
} as const
