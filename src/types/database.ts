export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      wedding_config: {
        Row: {
          id: string
          partner_1_name: string
          partner_2_name: string
          wedding_date: string
          venue_name: string | null
          venue_address: string | null
          venue_maps_url: string | null
          rsvp_deadline: string
          welcome_message: string | null
          dress_code: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partner_1_name: string
          partner_2_name: string
          wedding_date: string
          venue_name?: string | null
          venue_address?: string | null
          venue_maps_url?: string | null
          rsvp_deadline: string
          welcome_message?: string | null
          dress_code?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['wedding_config']['Insert']>
        Relationships: []
      }
      program_items: {
        Row: {
          id: string
          config_id: string
          time_label: string
          title: string
          description: string | null
          icon: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          config_id: string
          time_label: string
          title: string
          description?: string | null
          icon?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['program_items']['Insert']>
        Relationships: []
      }
      faq_items: {
        Row: {
          id: string
          config_id: string
          question: string
          answer: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          config_id: string
          question: string
          answer: string
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['faq_items']['Insert']>
        Relationships: []
      }
      wedding_content: {
        Row: {
          config_id: string
          fragen: Json | null
          texte: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          config_id: string
          fragen?: Json | null
          texte?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['wedding_content']['Insert']>
        Relationships: []
      }
      couple_accounts: {
        Row: {
          id: string
          wedding_source: 'modern' | 'legacy'
          wedding_source_id: string
          email: string
          password_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_source: 'modern' | 'legacy'
          wedding_source_id: string
          email: string
          password_hash: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['couple_accounts']['Insert']>
        Relationships: []
      }
      planner_accounts: {
        Row: {
          id: string
          customer_number: string
          display_name: string
          email: string
          password_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_number: string
          display_name: string
          email: string
          password_hash: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['planner_accounts']['Insert']>
        Relationships: []
      }
      planner_wedding_access: {
        Row: {
          planner_account_id: string
          wedding_source: 'modern' | 'legacy'
          wedding_source_id: string
          linked_via_customer_number: string | null
          linked_at: string
        }
        Insert: {
          planner_account_id: string
          wedding_source: 'modern' | 'legacy'
          wedding_source_id: string
          linked_via_customer_number?: string | null
          linked_at?: string
        }
        Update: Partial<Database['public']['Tables']['planner_wedding_access']['Insert']>
        Relationships: []
      }
      gallery_media: {
        Row: {
          id: string
          wedding_source: 'modern' | 'legacy'
          wedding_source_id: string
          visibility: 'public' | 'private'
          storage_provider: 'supabase' | 'r2'
          file_name: string
          original_key: string
          preview_key: string | null
          lightbox_key: string | null
          original_content_type: string | null
          preview_content_type: string | null
          lightbox_content_type: string | null
          width: number | null
          height: number | null
          original_bytes: number | null
          preview_bytes: number | null
          lightbox_bytes: number | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_source: 'modern' | 'legacy'
          wedding_source_id: string
          visibility: 'public' | 'private'
          storage_provider: 'supabase' | 'r2'
          file_name: string
          original_key: string
          preview_key?: string | null
          lightbox_key?: string | null
          original_content_type?: string | null
          preview_content_type?: string | null
          lightbox_content_type?: string | null
          width?: number | null
          height?: number | null
          original_bytes?: number | null
          preview_bytes?: number | null
          lightbox_bytes?: number | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['gallery_media']['Insert']>
        Relationships: []
      }
      app_einstellungen: {
        Row: {
          id: number
          brautpaar: string | null
          hochzeitsdatum: string | null
          rsvp_deadline: string | null
          fragen: Json | null
          texte: Json | null
        }
        Insert: {
          id?: number
          brautpaar?: string | null
          hochzeitsdatum?: string | null
          rsvp_deadline?: string | null
          fragen?: Json | null
          texte?: Json | null
        }
        Update: Partial<Database['public']['Tables']['app_einstellungen']['Insert']>
        Relationships: []
      }
      rsvps: {
        Row: {
          id: string
          config_id: string
          guest_name: string
          guest_email: string | null
          is_attending: boolean
          plus_one: boolean | null
          plus_one_name: string | null
          total_guests: number | null
          menu_choice: string | null
          plus_one_menu: string | null
          dietary_notes: string | null
          message: string | null
          ip_address: string | null
          user_agent: string | null
          honeypot: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          config_id: string
          guest_name: string
          guest_email?: string | null
          is_attending: boolean
          plus_one?: boolean | null
          plus_one_name?: string | null
          total_guests?: number | null
          menu_choice?: string | null
          plus_one_menu?: string | null
          dietary_notes?: string | null
          message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          honeypot?: string | null
          submitted_at?: string
        }
        Update: Partial<Database['public']['Tables']['rsvps']['Insert']>
        Relationships: []
      }
      hochzeiten: {
        Row: {
          id: string
          user_id: string | null
          gastcode: string | null
          brautpaar_name: string | null
          hochzeitsdatum: string | null
          rsvp_deadline: string | null
          foto_passwort: string | null
          fragen: Json | null
          texte: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          gastcode?: string | null
          brautpaar_name?: string | null
          hochzeitsdatum?: string | null
          rsvp_deadline?: string | null
          foto_passwort?: string | null
          fragen?: Json | null
          texte?: Json | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['hochzeiten']['Insert']>
        Relationships: []
      }
      rsvp_antworten: {
        Row: {
          id: string
          hochzeit_id: string
          name: string | null
          teilnahme: string | null
          anzahl_personen: number | null
          zeremonie: string | null
          abendfeier: string | null
          menuwahl: string | null
          ernaehrung: string | null
          liedwunsch: string | null
          vorfreude: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          hochzeit_id: string
          name?: string | null
          teilnahme?: string | null
          anzahl_personen?: number | null
          zeremonie?: string | null
          abendfeier?: string | null
          menuwahl?: string | null
          ernaehrung?: string | null
          liedwunsch?: string | null
          vorfreude?: number | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['rsvp_antworten']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
