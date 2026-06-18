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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
          name: string
          position: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          position?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          position?: number | null
        }
        Relationships: []
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
      products: {
        Row: {
          brand_id: string | null
          brand_position: number | null
          category: string
          colors: Json | null
          created_at: string
          description: string | null
          detail_media: Json | null
          discount: number | null
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
          sizes: Json | null
          slug: string
          specifications: Json | null
          stock_quantity: number
          thumbnail_url: string | null
          updated_at: string
          variant_stock: Json
        }
        Insert: {
          brand_id?: string | null
          brand_position?: number | null
          category?: string
          colors?: Json | null
          created_at?: string
          description?: string | null
          detail_media?: Json | null
          discount?: number | null
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
          sizes?: Json | null
          slug: string
          specifications?: Json | null
          stock_quantity?: number
          thumbnail_url?: string | null
          updated_at?: string
          variant_stock?: Json
        }
        Update: {
          brand_id?: string | null
          brand_position?: number | null
          category?: string
          colors?: Json | null
          created_at?: string
          description?: string | null
          detail_media?: Json | null
          discount?: number | null
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
          sizes?: Json | null
          slug?: string
          specifications?: Json | null
          stock_quantity?: number
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
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
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
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
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
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
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
      referrals: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          invited_fingerprint: string | null
          invited_ip: string | null
          invited_phone: string | null
          invited_user_id: string
          inviter_user_id: string
          rejection_reason: string | null
          rewarded_at: string | null
          rewarded_spins: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          invited_fingerprint?: string | null
          invited_ip?: string | null
          invited_phone?: string | null
          invited_user_id: string
          inviter_user_id: string
          rejection_reason?: string | null
          rewarded_at?: string | null
          rewarded_spins?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          invited_fingerprint?: string | null
          invited_ip?: string | null
          invited_phone?: string | null
          invited_user_id?: string
          inviter_user_id?: string
          rejection_reason?: string | null
          rewarded_at?: string | null
          rewarded_spins?: number
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
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
          id: string
          invalidated_at: string | null
          is_used: boolean
          minimum_order_amount: number
          reward_type: string
          reward_value: number
          used_at: string | null
          used_order_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          invalidated_at?: string | null
          is_used?: boolean
          minimum_order_amount?: number
          reward_type: string
          reward_value?: number
          used_at?: string | null
          used_order_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          invalidated_at?: string | null
          is_used?: boolean
          minimum_order_amount?: number
          reward_type?: string
          reward_value?: number
          used_at?: string | null
          used_order_id?: string | null
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      admin_list_users: {
        Args: never
        Returns: {
          address: string
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          user_id: string
        }[]
      }
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
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_slug: { Args: { name: string }; Returns: string }
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
