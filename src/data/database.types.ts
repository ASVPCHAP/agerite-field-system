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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      certification_attempts: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          passed: boolean
          rep_id: string
          score: number
        }
        Insert: {
          completed_at?: string
          id: string
          module_id: string
          passed: boolean
          rep_id: string
          score: number
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          passed?: boolean
          rep_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "certification_attempts_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "certification_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_attempts_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_modules: {
        Row: {
          id: string
          order: number
          questions: Json
          title: string
        }
        Insert: {
          id: string
          order: number
          questions: Json
          title: string
        }
        Update: {
          id?: string
          order?: number
          questions?: Json
          title?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          city: string
          cluster: string
          id: string
          last_touch_at: string | null
          name: string
          next_step: string | null
          owner_rep_id: string | null
          segment: string
          stage: string
          tier: string
          website: string | null
        }
        Insert: {
          city: string
          cluster: string
          id: string
          last_touch_at?: string | null
          name: string
          next_step?: string | null
          owner_rep_id?: string | null
          segment: string
          stage?: string
          tier: string
          website?: string | null
        }
        Update: {
          city?: string
          cluster?: string
          id?: string
          last_touch_at?: string | null
          name?: string
          next_step?: string | null
          owner_rep_id?: string | null
          segment?: string
          stage?: string
          tier?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_owner_rep_id_fkey"
            columns: ["owner_rep_id"]
            isOneToOne: false
            referencedRelation: "reps"
            referencedColumns: ["id"]
          },
        ]
      }
      licensed_states: {
        Row: {
          id: string
          state_name: string
          status: string
          target_quarter: string | null
        }
        Insert: {
          id: string
          state_name: string
          status: string
          target_quarter?: string | null
        }
        Update: {
          id?: string
          state_name?: string
          status?: string
          target_quarter?: string | null
        }
        Relationships: []
      }
      patients_refills: {
        Row: {
          clinic_id: string
          id: string
          patient_ref: string
          product_id: string
          protocol_weeks: number
          started_at: string
        }
        Insert: {
          clinic_id: string
          id: string
          patient_ref: string
          product_id: string
          protocol_weeks: number
          started_at: string
        }
        Update: {
          clinic_id?: string
          id?: string
          patient_ref?: string
          product_id?: string
          protocol_weeks?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_refills_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_refills_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_refills_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_change_log: {
        Row: {
          changed_at: string
          changed_by: string
          field_changed: string
          id: string
          new_value: string
          old_value: string
          product_id: string
        }
        Insert: {
          changed_at: string
          changed_by: string
          field_changed: string
          id: string
          new_value: string
          old_value: string
          product_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          field_changed?: string
          id?: string
          new_value?: string
          old_value?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_change_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          concentration: string
          id: string
          name: string
          price_10ml: number | null
          price_5ml: number | null
          protocol_duration: string
          rep_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          version: number
        }
        Insert: {
          category: string
          concentration: string
          id: string
          name: string
          price_10ml?: number | null
          price_5ml?: number | null
          protocol_duration: string
          rep_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version?: number
        }
        Update: {
          category?: string
          concentration?: string
          id?: string
          name?: string
          price_10ml?: number | null
          price_5ml?: number | null
          protocol_duration?: string
          rep_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version?: number
        }
        Relationships: []
      }
      reps: {
        Row: {
          cert_status: string
          email: string
          hire_date: string
          id: string
          name: string
          territory: string
        }
        Insert: {
          cert_status?: string
          email: string
          hire_date: string
          id: string
          name: string
          territory: string
        }
        Update: {
          cert_status?: string
          email?: string
          hire_date?: string
          id?: string
          name?: string
          territory?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_products: {
        Row: {
          category: string | null
          concentration: string | null
          id: string | null
          name: string | null
          price_10ml: number | null
          price_5ml: number | null
          protocol_duration: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          under_review: boolean | null
          version: number | null
        }
        Relationships: []
      }
      refills_with_status: {
        Row: {
          clinic_id: string | null
          id: string | null
          patient_ref: string | null
          product_id: string | null
          protocol_weeks: number | null
          runs_out_at: string | null
          started_at: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_refills_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_refills_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_refills_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      log_clinic_contact: {
        Args: { p_clinic_id: string; p_rep_id: string; p_today?: string }
        Returns: {
          ok: boolean
          owner_name: string
          owner_rep_id: string
          since: string
          stage: string
        }[]
      }
      reset_demo_data: { Args: Record<PropertyKey, never>; Returns: undefined }
      submit_certification_attempt: {
        Args: { p_answers: number[]; p_module_id: string; p_rep_id: string }
        Returns: {
          passed: boolean
          score: number
          total: number
        }[]
      }
      slugify: { Args: { input: string }; Returns: string }
      upsert_product: {
        Args: {
          p_id: string | null
          p_name: string
          p_category: string
          p_concentration: string
          p_price_5ml: number | null
          p_price_10ml: number | null
          p_protocol_duration: string
          p_status: string
          p_rep_note: string | null
          p_changed_by: string
        }
        Returns: {
          id: string
          name: string
          category: string
          concentration: string
          price_5ml: number | null
          price_10ml: number | null
          protocol_duration: string
          rep_note: string | null
          status: string
          version: number
          reviewed_by: string | null
          reviewed_at: string | null
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
