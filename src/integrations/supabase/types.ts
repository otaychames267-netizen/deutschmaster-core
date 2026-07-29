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
      achievements: {
        Row: {
          category: string
          description: string
          hidden: boolean
          icon: string
          id: string
          sort_order: number
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string
          description: string
          hidden?: boolean
          icon?: string
          id: string
          sort_order?: number
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string
          description?: string
          hidden?: boolean
          icon?: string
          id?: string
          sort_order?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          note: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          note?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      answer_keys: {
        Row: {
          answers: Json
          created_at: string
          exam_id: string
          id: string
          updated_at: string
        }
        Insert: {
          answers: Json
          created_at?: string
          exam_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          exam_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: true
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          bucket_key: string
          request_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          request_count?: number
          window_start: string
        }
        Update: {
          bucket_key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      api_usage_ledger: {
        Row: {
          id: string
          total_tokens: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          id?: string
          total_tokens?: number
          updated_at?: string
          usage_date?: string
        }
        Update: {
          id?: string
          total_tokens?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      attempt_answers: {
        Row: {
          answer: Json
          id: string
          item_id: string
          saved_at: string
          session_id: string
        }
        Insert: {
          answer: Json
          id?: string
          item_id: string
          saved_at?: string
          session_id: string
        }
        Update: {
          answer?: Json
          id?: string
          item_id?: string
          saved_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "exam_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attempt_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_results: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          max_score: number | null
          passed: boolean | null
          points_earned: number | null
          points_total: number | null
          score: number | null
          scored_at: string
          section: string | null
          section_scores: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          points_earned?: number | null
          points_total?: number | null
          score?: number | null
          scored_at?: string
          section?: string | null
          section_scores?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          max_score?: number | null
          passed?: boolean | null
          points_earned?: number | null
          points_total?: number | null
          score?: number | null
          scored_at?: string
          section?: string | null
          section_scores?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "attempt_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_sessions: {
        Row: {
          created_at: string
          exam_id: string
          expires_at: string | null
          id: string
          started_at: string
          status: string
          submitted_at: string | null
          time_spent_sec: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_spent_sec?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          time_spent_sec?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_assets: {
        Row: {
          created_at: string
          created_by: string | null
          duration_ms: number | null
          filename: string
          id: string
          size_bytes: number | null
          storage_path: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          filename: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          filename?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_files: {
        Row: {
          created_at: string
          created_by: string | null
          duration_sec: number | null
          id: string
          storage_path: string
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          id?: string
          storage_path: string
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          id?: string
          storage_path?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      auth_email_log: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          email_type: string
          error_message: string | null
          id: string
          last_attempted_at: string | null
          provider: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          email_type: string
          error_message?: string | null
          id?: string
          last_attempted_at?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          email_type?: string
          error_message?: string | null
          id?: string
          last_attempted_at?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          issued_at: string
          milestone: string
          title: string
          user_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          milestone: string
          title: string
          user_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          milestone?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: Database["public"]["Enums"]["user_level"] | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          title?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_protection_incidents: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          route: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          route?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          route?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_protection_suspensions: {
        Row: {
          account_locked: boolean
          id: string
          incident_count: number
          last_incident_id: string | null
          locked_reason: string | null
          pending_permanent_review: boolean
          suspended_until: string | null
          tier: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_locked?: boolean
          id?: string
          incident_count?: number
          last_incident_id?: string | null
          locked_reason?: string | null
          pending_permanent_review?: boolean
          suspended_until?: string | null
          tier?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_locked?: boolean
          id?: string
          incident_count?: number
          last_incident_id?: string | null
          locked_reason?: string | null
          pending_permanent_review?: boolean
          suspended_until?: string | null
          tier?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_protection_suspensions_last_incident_id_fkey"
            columns: ["last_incident_id"]
            isOneToOne: false
            referencedRelation: "content_protection_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          granted_by: string | null
          id: string
          reason: string
          related_grading_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          granted_by?: string | null
          id?: string
          reason: string
          related_grading_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          granted_by?: string | null
          id?: string
          reason?: string
          related_grading_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      d17_admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          granted_credits_override: number | null
          granted_minutes_override: number | null
          id: string
          note: string | null
          order_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          granted_credits_override?: number | null
          granted_minutes_override?: number | null
          id?: string
          note?: string | null
          order_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          granted_credits_override?: number | null
          granted_minutes_override?: number | null
          id?: string
          note?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "d17_admin_actions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "d17_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      d17_alerts: {
        Row: {
          category: string
          created_at: string
          email_sent: boolean
          id: string
          message: string
          metadata: Json
          severity: string
          telegram_sent: boolean
        }
        Insert: {
          category: string
          created_at?: string
          email_sent?: boolean
          id?: string
          message: string
          metadata?: Json
          severity: string
          telegram_sent?: boolean
        }
        Update: {
          category?: string
          created_at?: string
          email_sent?: boolean
          id?: string
          message?: string
          metadata?: Json
          severity?: string
          telegram_sent?: boolean
        }
        Relationships: []
      }
      d17_fraud_suspensions: {
        Row: {
          account_locked: boolean
          confirmed_duplicate_count: number
          created_at: string
          id: string
          last_confirmed_duplicate_attempt_id: string | null
          suspended_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_locked?: boolean
          confirmed_duplicate_count?: number
          created_at?: string
          id?: string
          last_confirmed_duplicate_attempt_id?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_locked?: boolean
          confirmed_duplicate_count?: number
          created_at?: string
          id?: string
          last_confirmed_duplicate_attempt_id?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "d17_fraud_suspensions_last_confirmed_duplicate_attempt_id_fkey"
            columns: ["last_confirmed_duplicate_attempt_id"]
            isOneToOne: false
            referencedRelation: "d17_verification_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      d17_identifier_reservations: {
        Row: {
          normalized_identifier: string
          order_id: string
          reserved_at: string
          user_id: string
        }
        Insert: {
          normalized_identifier: string
          order_id: string
          reserved_at?: string
          user_id: string
        }
        Update: {
          normalized_identifier?: string
          order_id?: string
          reserved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "d17_identifier_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "d17_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      d17_orders: {
        Row: {
          amount_tnd: number
          attempts_used: number
          created_at: string
          currency: string
          destination_account_holder: string | null
          destination_iban: string | null
          destination_number: string | null
          expires_at: string | null
          id: string
          level: Database["public"]["Enums"]["user_level"] | null
          locked_for_admin_only: boolean
          manual_review_deadline: string | null
          plan_code: Database["public"]["Enums"]["plan_code"]
          resolved_at: string | null
          resolved_by: string | null
          session_token: string | null
          session_token_expires_at: string | null
          status: Database["public"]["Enums"]["d17_order_status"]
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_tnd: number
          attempts_used?: number
          created_at?: string
          currency?: string
          destination_account_holder?: string | null
          destination_iban?: string | null
          destination_number?: string | null
          expires_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          locked_for_admin_only?: boolean
          manual_review_deadline?: string | null
          plan_code: Database["public"]["Enums"]["plan_code"]
          resolved_at?: string | null
          resolved_by?: string | null
          session_token?: string | null
          session_token_expires_at?: string | null
          status?: Database["public"]["Enums"]["d17_order_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_tnd?: number
          attempts_used?: number
          created_at?: string
          currency?: string
          destination_account_holder?: string | null
          destination_iban?: string | null
          destination_number?: string | null
          expires_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          locked_for_admin_only?: boolean
          manual_review_deadline?: string | null
          plan_code?: Database["public"]["Enums"]["plan_code"]
          resolved_at?: string | null
          resolved_by?: string | null
          session_token?: string | null
          session_token_expires_at?: string | null
          status?: Database["public"]["Enums"]["d17_order_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "d17_orders_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "d17_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      d17_verification_attempts: {
        Row: {
          ai_confidence: number
          ai_version: string
          attempt_number: number
          browser_fingerprint: string | null
          confidence_amount: number | null
          confidence_authorization_number: number | null
          confidence_currency: number | null
          confidence_destination: number | null
          confidence_payment_datetime: number | null
          created_at: string
          cross_check_consistent: boolean | null
          cross_check_summary: Json | null
          decision: Database["public"]["Enums"]["d17_attempt_decision"]
          decision_reason: string
          device_fingerprint: string | null
          fraud_flags: Json
          fraud_score: number | null
          gemini_token_count: number | null
          id: string
          image_dhash: string
          image_dhash_2: string | null
          image_hash_sha256: string
          image_hash_sha256_2: string | null
          ip_address: string | null
          is_admin_replay: boolean
          normalized_identifier: string | null
          ocr_amount: number | null
          ocr_amount_2: number | null
          ocr_authorization_number: string | null
          ocr_authorization_number_2: string | null
          ocr_confidence: number | null
          ocr_currency: string | null
          ocr_currency_2: string | null
          ocr_destination_2: string | null
          ocr_destination_iban: string | null
          ocr_destination_number: string | null
          ocr_language_detected: string | null
          ocr_notification_source:
            | Database["public"]["Enums"]["d17_notification_source"]
            | null
          ocr_payment_datetime: string | null
          ocr_payment_datetime_2: string | null
          ocr_raw_text: string | null
          ocr_reference: string | null
          ocr_text_hash_sha256: string | null
          ocr_text_hash_sha256_2: string | null
          ocr_transaction_id: string | null
          ocr_version: string
          order_id: string
          reputation_signal_delta: number | null
          risk_score: number
          rule_engine_result: Json
          screenshot_integrity_ok: boolean | null
          screenshot_type: string | null
          screenshot_type_2: string | null
          storage_path: string
          storage_path_2: string | null
          upload_to_creation_delta_ms: number | null
          user_entered_reference: string
          user_id: string
          velocity_signal_points: number | null
          verification_duration_ms: number | null
        }
        Insert: {
          ai_confidence: number
          ai_version: string
          attempt_number: number
          browser_fingerprint?: string | null
          confidence_amount?: number | null
          confidence_authorization_number?: number | null
          confidence_currency?: number | null
          confidence_destination?: number | null
          confidence_payment_datetime?: number | null
          created_at?: string
          cross_check_consistent?: boolean | null
          cross_check_summary?: Json | null
          decision: Database["public"]["Enums"]["d17_attempt_decision"]
          decision_reason: string
          device_fingerprint?: string | null
          fraud_flags?: Json
          fraud_score?: number | null
          gemini_token_count?: number | null
          id?: string
          image_dhash: string
          image_dhash_2?: string | null
          image_hash_sha256: string
          image_hash_sha256_2?: string | null
          ip_address?: string | null
          is_admin_replay?: boolean
          normalized_identifier?: string | null
          ocr_amount?: number | null
          ocr_amount_2?: number | null
          ocr_authorization_number?: string | null
          ocr_authorization_number_2?: string | null
          ocr_confidence?: number | null
          ocr_currency?: string | null
          ocr_currency_2?: string | null
          ocr_destination_2?: string | null
          ocr_destination_iban?: string | null
          ocr_destination_number?: string | null
          ocr_language_detected?: string | null
          ocr_notification_source?:
            | Database["public"]["Enums"]["d17_notification_source"]
            | null
          ocr_payment_datetime?: string | null
          ocr_payment_datetime_2?: string | null
          ocr_raw_text?: string | null
          ocr_reference?: string | null
          ocr_text_hash_sha256?: string | null
          ocr_text_hash_sha256_2?: string | null
          ocr_transaction_id?: string | null
          ocr_version?: string
          order_id: string
          reputation_signal_delta?: number | null
          risk_score: number
          rule_engine_result: Json
          screenshot_integrity_ok?: boolean | null
          screenshot_type?: string | null
          screenshot_type_2?: string | null
          storage_path: string
          storage_path_2?: string | null
          upload_to_creation_delta_ms?: number | null
          user_entered_reference: string
          user_id: string
          velocity_signal_points?: number | null
          verification_duration_ms?: number | null
        }
        Update: {
          ai_confidence?: number
          ai_version?: string
          attempt_number?: number
          browser_fingerprint?: string | null
          confidence_amount?: number | null
          confidence_authorization_number?: number | null
          confidence_currency?: number | null
          confidence_destination?: number | null
          confidence_payment_datetime?: number | null
          created_at?: string
          cross_check_consistent?: boolean | null
          cross_check_summary?: Json | null
          decision?: Database["public"]["Enums"]["d17_attempt_decision"]
          decision_reason?: string
          device_fingerprint?: string | null
          fraud_flags?: Json
          fraud_score?: number | null
          gemini_token_count?: number | null
          id?: string
          image_dhash?: string
          image_dhash_2?: string | null
          image_hash_sha256?: string
          image_hash_sha256_2?: string | null
          ip_address?: string | null
          is_admin_replay?: boolean
          normalized_identifier?: string | null
          ocr_amount?: number | null
          ocr_amount_2?: number | null
          ocr_authorization_number?: string | null
          ocr_authorization_number_2?: string | null
          ocr_confidence?: number | null
          ocr_currency?: string | null
          ocr_currency_2?: string | null
          ocr_destination_2?: string | null
          ocr_destination_iban?: string | null
          ocr_destination_number?: string | null
          ocr_language_detected?: string | null
          ocr_notification_source?:
            | Database["public"]["Enums"]["d17_notification_source"]
            | null
          ocr_payment_datetime?: string | null
          ocr_payment_datetime_2?: string | null
          ocr_raw_text?: string | null
          ocr_reference?: string | null
          ocr_text_hash_sha256?: string | null
          ocr_text_hash_sha256_2?: string | null
          ocr_transaction_id?: string | null
          ocr_version?: string
          order_id?: string
          reputation_signal_delta?: number | null
          risk_score?: number
          rule_engine_result?: Json
          screenshot_integrity_ok?: boolean | null
          screenshot_type?: string | null
          screenshot_type_2?: string | null
          storage_path?: string
          storage_path_2?: string | null
          upload_to_creation_delta_ms?: number | null
          user_entered_reference?: string
          user_id?: string
          velocity_signal_points?: number | null
          verification_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "d17_verification_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "d17_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          device_name: string | null
          id: string
          ip_address: string | null
          is_trusted: boolean
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      essay_gradings: {
        Row: {
          communicative_design_score: number | null
          created_at: string
          essay_text: string
          exam_id: string
          exam_item_id: string
          feedback: Json
          formal_accuracy_score: number | null
          id: string
          model: string
          overall_score: number
          passed: boolean
          task_achievement_score: number | null
          user_id: string
          word_count: number
        }
        Insert: {
          communicative_design_score?: number | null
          created_at?: string
          essay_text: string
          exam_id: string
          exam_item_id: string
          feedback: Json
          formal_accuracy_score?: number | null
          id?: string
          model: string
          overall_score: number
          passed: boolean
          task_achievement_score?: number | null
          user_id: string
          word_count: number
        }
        Update: {
          communicative_design_score?: number | null
          created_at?: string
          essay_text?: string
          exam_id?: string
          exam_item_id?: string
          feedback?: Json
          formal_accuracy_score?: number | null
          id?: string
          model?: string
          overall_score?: number
          passed?: boolean
          task_achievement_score?: number | null
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "essay_gradings_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essay_gradings_exam_item_id_fkey"
            columns: ["exam_item_id"]
            isOneToOne: false
            referencedRelation: "exam_items"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_items: {
        Row: {
          audio_file_id: string | null
          content: Json
          created_at: string
          exam_id: string
          id: string
          kind: Database["public"]["Enums"]["item_kind"]
          points: number
          position: number
          updated_at: string
        }
        Insert: {
          audio_file_id?: string | null
          content: Json
          created_at?: string
          exam_id: string
          id?: string
          kind: Database["public"]["Enums"]["item_kind"]
          points?: number
          position: number
          updated_at?: string
        }
        Update: {
          audio_file_id?: string | null
          content?: Json
          created_at?: string
          exam_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["item_kind"]
          points?: number
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_items_audio_file_id_fkey"
            columns: ["audio_file_id"]
            isOneToOne: false
            referencedRelation: "audio_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_items_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          created_at: string
          ends_at: string
          exercise_ids: string[]
          id: string
          level: Database["public"]["Enums"]["exercise_level"]
          mode: Database["public"]["Enums"]["exam_mode"]
          score_breakdown: Json | null
          score_total: number | null
          started_at: string
          status: Database["public"]["Enums"]["exam_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          exercise_ids?: string[]
          id?: string
          level: Database["public"]["Enums"]["exercise_level"]
          mode: Database["public"]["Enums"]["exam_mode"]
          score_breakdown?: Json | null
          score_total?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["exam_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          exercise_ids?: string[]
          id?: string
          level?: Database["public"]["Enums"]["exercise_level"]
          mode?: Database["public"]["Enums"]["exam_mode"]
          score_breakdown?: Json | null
          score_total?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["exam_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          level: Database["public"]["Enums"]["user_level"]
          metadata: Json
          module: Database["public"]["Enums"]["exam_module"]
          section: Database["public"]["Enums"]["exam_section"] | null
          source_pdf_id: string | null
          status: Database["public"]["Enums"]["exam_pub_status"]
          teil: Database["public"]["Enums"]["exam_teil"] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          exam_type: Database["public"]["Enums"]["exam_type"]
          id?: string
          level: Database["public"]["Enums"]["user_level"]
          metadata?: Json
          module: Database["public"]["Enums"]["exam_module"]
          section?: Database["public"]["Enums"]["exam_section"] | null
          source_pdf_id?: string | null
          status?: Database["public"]["Enums"]["exam_pub_status"]
          teil?: Database["public"]["Enums"]["exam_teil"] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          metadata?: Json
          module?: Database["public"]["Enums"]["exam_module"]
          section?: Database["public"]["Enums"]["exam_section"] | null
          source_pdf_id?: string | null
          status?: Database["public"]["Enums"]["exam_pub_status"]
          teil?: Database["public"]["Enums"]["exam_teil"] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_answer_keys: {
        Row: {
          correct_answer: Json
          created_at: string
          exercise_id: string
          id: string
          item_number: string
          key_version: number
          pdf_import_id: string | null
          reference_answer: string | null
          source: string
          updated_at: string
        }
        Insert: {
          correct_answer: Json
          created_at?: string
          exercise_id: string
          id?: string
          item_number: string
          key_version?: number
          pdf_import_id?: string | null
          reference_answer?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          correct_answer?: Json
          created_at?: string
          exercise_id?: string
          id?: string
          item_number?: string
          key_version?: number
          pdf_import_id?: string | null
          reference_answer?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_collections: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          level: Database["public"]["Enums"]["exercise_level"] | null
          module: Database["public"]["Enums"]["exercise_module"] | null
          notes: string | null
          teil: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          level?: Database["public"]["Enums"]["exercise_level"] | null
          module?: Database["public"]["Enums"]["exercise_module"] | null
          notes?: string | null
          teil?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          level?: Database["public"]["Enums"]["exercise_level"] | null
          module?: Database["public"]["Enums"]["exercise_module"] | null
          notes?: string | null
          teil?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          audio_id: string | null
          collection_id: string | null
          content_type: string | null
          correct: Json
          created_at: string
          created_by: string | null
          explanation: string | null
          id: string
          kind: string
          level: string
          model_variant: string | null
          module: string
          muendlich_part: number | null
          options: Json
          original_numbering: string | null
          passage: string | null
          position: number
          prompt: string
          source_pdf_import_id: string | null
          status: string
          tags: string[]
          teil: number
          title: string
          updated_at: string
          writing_category: string | null
        }
        Insert: {
          audio_id?: string | null
          collection_id?: string | null
          content_type?: string | null
          correct?: Json
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          kind: string
          level: string
          model_variant?: string | null
          module: string
          muendlich_part?: number | null
          options?: Json
          original_numbering?: string | null
          passage?: string | null
          position?: number
          prompt?: string
          source_pdf_import_id?: string | null
          status?: string
          tags?: string[]
          teil: number
          title?: string
          updated_at?: string
          writing_category?: string | null
        }
        Update: {
          audio_id?: string | null
          collection_id?: string | null
          content_type?: string | null
          correct?: Json
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          kind?: string
          level?: string
          model_variant?: string | null
          module?: string
          muendlich_part?: number | null
          options?: Json
          original_numbering?: string | null
          passage?: string | null
          position?: number
          prompt?: string
          source_pdf_import_id?: string | null
          status?: string
          tags?: string[]
          teil?: number
          title?: string
          updated_at?: string
          writing_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audio_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "exercise_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_source_pdf_import_id_fkey"
            columns: ["source_pdf_import_id"]
            isOneToOne: false
            referencedRelation: "pdf_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      hoeren_attempts: {
        Row: {
          answers: Json
          created_at: string
          exercise_id: string
          id: string
          results: Json
          score: number
          teil: number
          total: number
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          exercise_id: string
          id?: string
          results: Json
          score: number
          teil: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          exercise_id?: string
          id?: string
          results?: Json
          score?: number
          teil?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoeren_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "hoeren_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoeren_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hoeren_exercises: {
        Row: {
          audio_path: string | null
          created_at: string
          created_by: string | null
          id: string
          image_path: string | null
          import_notes: string | null
          instructions: string | null
          level: string
          position: number
          source_pdf: string | null
          teil: number
          title: string
          variant_group: string | null
          version_tag: string | null
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          import_notes?: string | null
          instructions?: string | null
          level?: string
          position?: number
          source_pdf?: string | null
          teil: number
          title: string
          variant_group?: string | null
          version_tag?: string | null
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string | null
          import_notes?: string | null
          instructions?: string | null
          level?: string
          position?: number
          source_pdf?: string | null
          teil?: number
          title?: string
          variant_group?: string | null
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoeren_exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hoeren_statements: {
        Row: {
          correct_answer: boolean
          exercise_id: string
          id: string
          statement_number: number
          statement_text: string
        }
        Insert: {
          correct_answer: boolean
          exercise_id: string
          id?: string
          statement_number: number
          statement_text: string
        }
        Update: {
          correct_answer?: boolean
          exercise_id?: string
          id?: string
          statement_number?: number
          statement_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoeren_statements_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "hoeren_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      import_audit_log: {
        Row: {
          batch_id: string | null
          created_at: string
          details: Json
          draft_id: string | null
          draft_idx: number | null
          event: string
          id: string
          reason: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          details?: Json
          draft_id?: string | null
          draft_idx?: number | null
          event: string
          id?: string
          reason?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          details?: Json
          draft_id?: string | null
          draft_idx?: number | null
          event?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_audit_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_audit_log_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "import_draft_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          section: string
          source_pdf: string
          status: string
          teil: number | null
          total_exercises: number | null
          total_pages: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          section: string
          source_pdf: string
          status?: string
          teil?: number | null
          total_exercises?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          section?: string
          source_pdf?: string
          status?: string
          teil?: number | null
          total_exercises?: number | null
          total_pages?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_draft_exercises: {
        Row: {
          article: string | null
          article_source: string | null
          batch_id: string
          coherence: number | null
          created_at: string
          flags: Json
          id: string
          idx: number
          page_images: Json
          payload: Json
          promoted_exercise_id: string | null
          raw_title: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          section: string
          status: string
          structure_ok: boolean
          teil: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          article?: string | null
          article_source?: string | null
          batch_id: string
          coherence?: number | null
          created_at?: string
          flags?: Json
          id?: string
          idx: number
          page_images?: Json
          payload?: Json
          promoted_exercise_id?: string | null
          raw_title?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section: string
          status?: string
          structure_ok?: boolean
          teil?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          article?: string | null
          article_source?: string | null
          batch_id?: string
          coherence?: number | null
          created_at?: string
          flags?: Json
          id?: string
          idx?: number
          page_images?: Json
          payload?: Json
          promoted_exercise_id?: string | null
          raw_title?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string
          status?: string
          structure_ok?: boolean
          teil?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_draft_exercises_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_draft_exercises_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          currency: string
          id: string
          invoice_number: string
          issued_at: string
          payment_id: string | null
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          amount: number
          currency?: string
          id?: string
          invoice_number: string
          issued_at?: string
          payment_id?: string | null
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          payment_id?: string | null
          pdf_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      lemonsqueezy_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          ls_event_id: string
          payload: Json
          processed_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          ls_event_id: string
          payload: Json
          processed_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          ls_event_id?: string
          payload?: Json
          processed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lesen_attempts: {
        Row: {
          answers: Json
          created_at: string
          exercise_id: string
          id: string
          results: Json
          score: number
          teil: number
          total: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          exercise_id: string
          id?: string
          results?: Json
          score: number
          teil: number
          total: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          exercise_id?: string
          id?: string
          results?: Json
          score?: number
          teil?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesen_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesen_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_exercises: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          import_notes: string | null
          level: string
          sort_order: number | null
          source_pdf: string | null
          teil: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          import_notes?: string | null
          level?: string
          sort_order?: number | null
          source_pdf?: string | null
          teil: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          import_notes?: string | null
          level?: string
          sort_order?: number | null
          source_pdf?: string | null
          teil?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesen_exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t1_headlines: {
        Row: {
          exercise_id: string
          id: string
          is_distractor: boolean
          letter: string
          text: string
        }
        Insert: {
          exercise_id: string
          id?: string
          is_distractor?: boolean
          letter: string
          text: string
        }
        Update: {
          exercise_id?: string
          id?: string
          is_distractor?: boolean
          letter?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t1_headlines_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t1_texts: {
        Row: {
          content: string
          correct_headline: string
          exercise_id: string
          id: string
          position: number
          title: string | null
        }
        Insert: {
          content: string
          correct_headline: string
          exercise_id: string
          id?: string
          position: number
          title?: string | null
        }
        Update: {
          content?: string
          correct_headline?: string
          exercise_id?: string
          id?: string
          position?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t1_texts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t2_passages: {
        Row: {
          exercise_id: string
          id: string
          instructions: string | null
          passage: string
          title: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          instructions?: string | null
          passage: string
          title?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          instructions?: string | null
          passage?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t2_passages_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t2_questions: {
        Row: {
          correct: string
          exercise_id: string
          id: string
          number: number
          option_a: string
          option_b: string
          option_c: string
          question: string
        }
        Insert: {
          correct: string
          exercise_id: string
          id?: string
          number: number
          option_a: string
          option_b: string
          option_c: string
          question: string
        }
        Update: {
          correct?: string
          exercise_id?: string
          id?: string
          number?: number
          option_a?: string
          option_b?: string
          option_c?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t2_questions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t3_situations: {
        Row: {
          correct_letter: string | null
          description: string
          exercise_id: string
          id: string
          no_match: boolean
          number: number
        }
        Insert: {
          correct_letter?: string | null
          description: string
          exercise_id: string
          id?: string
          no_match?: boolean
          number: number
        }
        Update: {
          correct_letter?: string | null
          description?: string
          exercise_id?: string
          id?: string
          no_match?: boolean
          number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t3_situations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t3_texts: {
        Row: {
          content: string
          exercise_id: string
          id: string
          letter: string
          title: string | null
        }
        Insert: {
          content: string
          exercise_id: string
          id?: string
          letter: string
          title?: string | null
        }
        Update: {
          content?: string
          exercise_id?: string
          id?: string
          letter?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t3_texts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      listening_models: {
        Row: {
          audio_url: string | null
          content: Json | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["user_level"]
          title: string
        }
        Insert: {
          audio_url?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["user_level"]
          title: string
        }
        Update: {
          audio_url?: string | null
          content?: Json | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          title?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      muendlich_chat: {
        Row: {
          body: string
          created_at: string
          id: string
          room_id: string
          slot: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_id: string
          slot?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          slot?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_chat_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "muendlich_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muendlich_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_credit_transactions: {
        Row: {
          created_at: string
          delta_minutes: number
          granted_by: string | null
          id: string
          reason: string
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta_minutes: number
          granted_by?: string | null
          id?: string
          reason: string
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta_minutes?: number
          granted_by?: string | null
          id?: string
          reason?: string
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_credit_transactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "muendlich_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_credits: {
        Row: {
          is_subscribed: boolean
          minutes_balance: number
          updated_at: string
          user_id: string
          window_days: number
          window_started_at: string | null
        }
        Insert: {
          is_subscribed?: boolean
          minutes_balance?: number
          updated_at?: string
          user_id: string
          window_days?: number
          window_started_at?: string | null
        }
        Update: {
          is_subscribed?: boolean
          minutes_balance?: number
          updated_at?: string
          user_id?: string
          window_days?: number
          window_started_at?: string | null
        }
        Relationships: []
      }
      muendlich_evaluations: {
        Row: {
          cefr_level: string
          created_at: string
          feedback: Json
          id: string
          model: string
          overall_score: number
          passed: boolean
          session_id: string
          teil1_score: number
          teil2_score: number
          teil3_score: number
          user_id: string
        }
        Insert: {
          cefr_level: string
          created_at?: string
          feedback: Json
          id?: string
          model: string
          overall_score: number
          passed: boolean
          session_id: string
          teil1_score: number
          teil2_score: number
          teil3_score: number
          user_id: string
        }
        Update: {
          cefr_level?: string
          created_at?: string
          feedback?: Json
          id?: string
          model?: string
          overall_score?: number
          passed?: boolean
          session_id?: string
          teil1_score?: number
          teil2_score?: number
          teil3_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_evaluations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "muendlich_exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_exam_sessions: {
        Row: {
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          recording_a_path: string | null
          recording_b_path: string | null
          room_id: string
          started_at: string
          transcript: Json
        }
        Insert: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          recording_a_path?: string | null
          recording_b_path?: string | null
          room_id: string
          started_at?: string
          transcript?: Json
        }
        Update: {
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          recording_a_path?: string | null
          recording_b_path?: string | null
          room_id?: string
          started_at?: string
          transcript?: Json
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_exam_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "muendlich_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_incident_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reported_by: string
          room_id: string
          room_state_snapshot: Json
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reported_by: string
          room_id: string
          room_state_snapshot: Json
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reported_by?: string
          room_id?: string
          room_state_snapshot?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_incident_reports_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "muendlich_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_materials: {
        Row: {
          body_text: string | null
          category: string
          created_at: string
          created_by: string | null
          difficulty_level: string | null
          id: string
          key_arguments: string[] | null
          level: string
          position: number | null
          sort_order: number
          source_pdf: string | null
          storage_path: string | null
          teil: number
          theme_category: string | null
          title: string
        }
        Insert: {
          body_text?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: string | null
          id?: string
          key_arguments?: string[] | null
          level?: string
          position?: number | null
          sort_order?: number
          source_pdf?: string | null
          storage_path?: string | null
          teil: number
          theme_category?: string | null
          title: string
        }
        Update: {
          body_text?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          difficulty_level?: string | null
          id?: string
          key_arguments?: string[] | null
          level?: string
          position?: number | null
          sort_order?: number
          source_pdf?: string | null
          storage_path?: string | null
          teil?: number
          theme_category?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_materials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_participants: {
        Row: {
          connected: boolean
          id: string
          joined_at: string
          mic_ok: boolean
          ready: boolean
          room_id: string
          slot: string
          updated_at: string
          user_id: string
          voice_ok: boolean
        }
        Insert: {
          connected?: boolean
          id?: string
          joined_at?: string
          mic_ok?: boolean
          ready?: boolean
          room_id: string
          slot: string
          updated_at?: string
          user_id: string
          voice_ok?: boolean
        }
        Update: {
          connected?: boolean
          id?: string
          joined_at?: string
          mic_ok?: boolean
          ready?: boolean
          room_id?: string
          slot?: string
          updated_at?: string
          user_id?: string
          voice_ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "muendlich_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muendlich_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_rooms: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          exam_stage: number | null
          exam_stage_seconds: number | null
          exam_stage_started_at: string | null
          id: string
          prep_seconds: number
          prep_started_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          exam_stage?: number | null
          exam_stage_seconds?: number | null
          exam_stage_started_at?: string | null
          id?: string
          prep_seconds?: number
          prep_started_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          exam_stage?: number | null
          exam_stage_seconds?: number | null
          exam_stage_started_at?: string | null
          id?: string
          prep_seconds?: number
          prep_started_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_selections: {
        Row: {
          id: string
          locked: boolean
          room_id: string
          slot: string | null
          teil: number
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          locked?: boolean
          room_id: string
          slot?: string | null
          teil: number
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          locked?: boolean
          room_id?: string
          slot?: string | null
          teil?: number
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_selections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "muendlich_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      muendlich_transcript_nodes: {
        Row: {
          created_at: string
          ended_at: string | null
          filler_count: number
          id: string
          session_id: string
          speaker: string
          started_at: string
          teil: number
          text: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          filler_count?: number
          id?: string
          session_id: string
          speaker: string
          started_at: string
          teil: number
          text: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          filler_count?: number
          id?: string
          session_id?: string
          speaker?: string
          started_at?: string
          teil?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "muendlich_transcript_nodes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "muendlich_exam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount_eur: number | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id: string | null
          stripe_payment_intent: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_eur?: number | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_eur?: number | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_extractions: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          import_id: string
          page_count: number | null
          raw_text: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          import_id: string
          page_count?: number | null
          raw_text?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          import_id?: string
          page_count?: number | null
          raw_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pdf_fidelity_reports: {
        Row: {
          added_count: number
          created_at: string
          created_by: string | null
          details: Json
          exam_import_id: string
          id: string
          modified_count: number
          numbering_diff_count: number
          removed_count: number
          section_diff_count: number
          status: string
        }
        Insert: {
          added_count?: number
          created_at?: string
          created_by?: string | null
          details?: Json
          exam_import_id: string
          id?: string
          modified_count?: number
          numbering_diff_count?: number
          removed_count?: number
          section_diff_count?: number
          status: string
        }
        Update: {
          added_count?: number
          created_at?: string
          created_by?: string | null
          details?: Json
          exam_import_id?: string
          id?: string
          modified_count?: number
          numbering_diff_count?: number
          removed_count?: number
          section_diff_count?: number
          status?: string
        }
        Relationships: []
      }
      pdf_files: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["user_level"] | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"] | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      pdf_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          import_id: string
          stage: string
          started_at: string | null
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_id: string
          stage: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_id?: string
          stage?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pdf_import_jobs_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pdf_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_import_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          import_id: string
          level: string
          message: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          import_id: string
          level?: string
          message: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          import_id?: string
          level?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_import_logs_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pdf_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_import_results: {
        Row: {
          created_at: string
          extracted_exams: Json
          extracted_keys: Json
          id: string
          import_id: string
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_exams?: Json
          extracted_keys?: Json
          id?: string
          import_id: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_exams?: Json
          extracted_keys?: Json
          id?: string
          import_id?: string
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_import_results_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "pdf_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_imports: {
        Row: {
          content_hash: string | null
          created_at: string
          detected_level: Database["public"]["Enums"]["user_level"] | null
          detected_module: Database["public"]["Enums"]["exam_module"] | null
          error_message: string | null
          extracted_candidates: Json | null
          extracted_text: string | null
          extraction_started_at: string | null
          file_size: number | null
          filename: string | null
          id: string
          kind: string | null
          level: string | null
          linked_import_id: string | null
          notes: string | null
          ocr_used: boolean
          original_name: string | null
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          detected_level?: Database["public"]["Enums"]["user_level"] | null
          detected_module?: Database["public"]["Enums"]["exam_module"] | null
          error_message?: string | null
          extracted_candidates?: Json | null
          extracted_text?: string | null
          extraction_started_at?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          kind?: string | null
          level?: string | null
          linked_import_id?: string | null
          notes?: string | null
          ocr_used?: boolean
          original_name?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          detected_level?: Database["public"]["Enums"]["user_level"] | null
          detected_module?: Database["public"]["Enums"]["exam_module"] | null
          error_message?: string | null
          extracted_candidates?: Json | null
          extracted_text?: string | null
          extraction_started_at?: string | null
          file_size?: number | null
          filename?: string | null
          id?: string
          kind?: string | null
          level?: string | null
          linked_import_id?: string | null
          notes?: string | null
          ocr_used?: boolean
          original_name?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_imports_linked_import_id_fkey"
            columns: ["linked_import_id"]
            isOneToOne: false
            referencedRelation: "pdf_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          code: Database["public"]["Enums"]["plan_code"]
          description: string | null
          name: string
          price_eur: number
          price_tnd: number
          price_usd: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: Database["public"]["Enums"]["plan_code"]
          description?: string | null
          name: string
          price_eur: number
          price_tnd: number
          price_usd: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: Database["public"]["Enums"]["plan_code"]
          description?: string | null
          name?: string
          price_eur?: number
          price_tnd?: number
          price_usd?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_settings_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          key: string
          new_value: Json
          old_value: Json | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          key: string
          new_value: Json
          old_value?: Json | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          key?: string
          new_value?: Json
          old_value?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string | null
          exam_date: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          is_banned: boolean
          level: Database["public"]["Enums"]["user_level"] | null
          onboarding_completed: boolean
          preferred_language: string
          referral_code: string | null
          role: string
          study_goal: string | null
          suspended: boolean
          target_level: Database["public"]["Enums"]["user_level"] | null
          two_fa_enabled: boolean
          two_fa_secret: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          exam_date?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_banned?: boolean
          level?: Database["public"]["Enums"]["user_level"] | null
          onboarding_completed?: boolean
          preferred_language?: string
          referral_code?: string | null
          role?: string
          study_goal?: string | null
          suspended?: boolean
          target_level?: Database["public"]["Enums"]["user_level"] | null
          two_fa_enabled?: boolean
          two_fa_secret?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          exam_date?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          level?: Database["public"]["Enums"]["user_level"] | null
          onboarding_completed?: boolean
          preferred_language?: string
          referral_code?: string | null
          role?: string
          study_goal?: string | null
          suspended?: boolean
          target_level?: Database["public"]["Enums"]["user_level"] | null
          two_fa_enabled?: boolean
          two_fa_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          stars: number
          target_id: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          stars: number
          target_id?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          stars?: number
          target_id?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_models: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["user_level"]
          title: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["user_level"]
          title: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          title?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          applied_at: string | null
          created_at: string
          days_granted: number
          id: string
          reason: string
          referral_id: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          days_granted: number
          id?: string
          reason: string
          referral_id?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          days_granted?: number
          id?: string
          reason?: string
          referral_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: []
      }
      regrade_audits: {
        Row: {
          attempts_affected: number
          created_at: string
          exercise_id: string
          id: string
          items_changed: number
          key_version: number
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          attempts_affected?: number
          created_at?: string
          exercise_id: string
          id?: string
          items_changed?: number
          key_version: number
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          attempts_affected?: number
          created_at?: string
          exercise_id?: string
          id?: string
          items_changed?: number
          key_version?: number
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      sb_exercises: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          import_notes: string | null
          level: string
          position: number | null
          source_pdf: string | null
          teil: number
          title: string
          variant_group: string | null
          version_tag: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          import_notes?: string | null
          level?: string
          position?: number | null
          source_pdf?: string | null
          teil: number
          title: string
          variant_group?: string | null
          version_tag?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          import_notes?: string | null
          level?: string
          position?: number | null
          source_pdf?: string | null
          teil?: number
          title?: string
          variant_group?: string | null
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t1_gaps: {
        Row: {
          correct: string
          exercise_id: string
          gap_number: number
          id: string
          option_a: string
          option_b: string
          option_c: string
        }
        Insert: {
          correct: string
          exercise_id: string
          gap_number: number
          id?: string
          option_a: string
          option_b: string
          option_c: string
        }
        Update: {
          correct?: string
          exercise_id?: string
          gap_number?: number
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
        }
        Relationships: [
          {
            foreignKeyName: "sb_t1_gaps_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t1_passages: {
        Row: {
          exercise_id: string
          id: string
          instructions: string | null
          passage: string
          title: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          instructions?: string | null
          passage: string
          title?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          instructions?: string | null
          passage?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_t1_passages_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t2_gaps: {
        Row: {
          correct_word: string
          exercise_id: string
          gap_number: number
          id: string
        }
        Insert: {
          correct_word: string
          exercise_id: string
          gap_number: number
          id?: string
        }
        Update: {
          correct_word?: string
          exercise_id?: string
          gap_number?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sb_t2_gaps_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t2_passages: {
        Row: {
          exercise_id: string
          id: string
          instructions: string | null
          passage: string
          title: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          instructions?: string | null
          passage: string
          title?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          instructions?: string | null
          passage?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_t2_passages_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t2_words: {
        Row: {
          exercise_id: string
          id: string
          word: string
          word_number: number
        }
        Insert: {
          exercise_id: string
          id?: string
          word: string
          word_number: number
        }
        Update: {
          exercise_id?: string
          id?: string
          word?: string
          word_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sb_t2_words_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      schreiben_vorlagen: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          level: string
          situation_count: number
          sort_order: number
          storage_path: string
          template_count: number
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          level?: string
          situation_count?: number
          sort_order?: number
          storage_path: string
          template_count?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          level?: string
          situation_count?: number
          sort_order?: number
          storage_path?: string
          template_count?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "schreiben_vorlagen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_attempts: {
        Row: {
          answers: Json
          created_at: string
          current_section: string
          essay_grading_id: string | null
          expires_at: string
          hoeren_t1_id: string | null
          hoeren_t2_id: string | null
          hoeren_t3_id: string | null
          id: string
          lesen_t1_id: string | null
          lesen_t2_id: string | null
          lesen_t3_id: string | null
          level: string
          passed: boolean | null
          sb_t1_id: string | null
          sb_t2_id: string | null
          schreiben_exam_id: string | null
          schreiben_text: string | null
          schreiben_word_count: number | null
          score_hoeren: number | null
          score_lesen: number | null
          score_sb: number | null
          score_schreiben: number | null
          score_total: number | null
          started_at: string
          status: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          current_section?: string
          essay_grading_id?: string | null
          expires_at: string
          hoeren_t1_id?: string | null
          hoeren_t2_id?: string | null
          hoeren_t3_id?: string | null
          id?: string
          lesen_t1_id?: string | null
          lesen_t2_id?: string | null
          lesen_t3_id?: string | null
          level?: string
          passed?: boolean | null
          sb_t1_id?: string | null
          sb_t2_id?: string | null
          schreiben_exam_id?: string | null
          schreiben_text?: string | null
          schreiben_word_count?: number | null
          score_hoeren?: number | null
          score_lesen?: number | null
          score_sb?: number | null
          score_schreiben?: number | null
          score_total?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          current_section?: string
          essay_grading_id?: string | null
          expires_at?: string
          hoeren_t1_id?: string | null
          hoeren_t2_id?: string | null
          hoeren_t3_id?: string | null
          id?: string
          lesen_t1_id?: string | null
          lesen_t2_id?: string | null
          lesen_t3_id?: string | null
          level?: string
          passed?: boolean | null
          sb_t1_id?: string | null
          sb_t2_id?: string | null
          schreiben_exam_id?: string | null
          schreiben_text?: string | null
          schreiben_word_count?: number | null
          score_hoeren?: number | null
          score_lesen?: number | null
          score_sb?: number | null
          score_schreiben?: number | null
          score_total?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_attempts_essay_grading_id_fkey"
            columns: ["essay_grading_id"]
            isOneToOne: false
            referencedRelation: "essay_gradings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_hoeren_t1_id_fkey"
            columns: ["hoeren_t1_id"]
            isOneToOne: false
            referencedRelation: "hoeren_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_hoeren_t2_id_fkey"
            columns: ["hoeren_t2_id"]
            isOneToOne: false
            referencedRelation: "hoeren_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_hoeren_t3_id_fkey"
            columns: ["hoeren_t3_id"]
            isOneToOne: false
            referencedRelation: "hoeren_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_lesen_t1_id_fkey"
            columns: ["lesen_t1_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_lesen_t2_id_fkey"
            columns: ["lesen_t2_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_lesen_t3_id_fkey"
            columns: ["lesen_t3_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_sb_t1_id_fkey"
            columns: ["sb_t1_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_sb_t2_id_fkey"
            columns: ["sb_t2_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_attempts_schreiben_exam_id_fkey"
            columns: ["schreiben_exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      speaking_topics: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["user_level"]
          prompt: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["user_level"]
          prompt?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          prompt?: string | null
          title?: string
        }
        Relationships: []
      }
      student_credits: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          duration_sec: number | null
          ended_at: string | null
          id: string
          mode: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          duration_sec?: number | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string
          id: string
          is_trial: boolean
          lemonsqueezy_customer_id: string | null
          lemonsqueezy_order_id: string | null
          lemonsqueezy_subscription_id: string | null
          lemonsqueezy_variant_id: string | null
          plan_code: Database["public"]["Enums"]["plan_code"]
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          is_trial?: boolean
          lemonsqueezy_customer_id?: string | null
          lemonsqueezy_order_id?: string | null
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_variant_id?: string | null
          plan_code: Database["public"]["Enums"]["plan_code"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          is_trial?: boolean
          lemonsqueezy_customer_id?: string | null
          lemonsqueezy_order_id?: string | null
          lemonsqueezy_subscription_id?: string | null
          lemonsqueezy_variant_id?: string | null
          plan_code?: Database["public"]["Enums"]["plan_code"]
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["code"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          message: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercise_attempts: {
        Row: {
          answer: Json | null
          completed_at: string
          duration_seconds: number | null
          exam_session_id: string | null
          exercise_id: string
          id: string
          is_correct: boolean | null
          key_version: number | null
          needs_review: boolean
          regraded_at: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          answer?: Json | null
          completed_at?: string
          duration_seconds?: number | null
          exam_session_id?: string | null
          exercise_id: string
          id?: string
          is_correct?: boolean | null
          key_version?: number | null
          needs_review?: boolean
          regraded_at?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          answer?: Json | null
          completed_at?: string
          duration_seconds?: number | null
          exam_session_id?: string | null
          exercise_id?: string
          id?: string
          is_correct?: boolean | null
          key_version?: number | null
          needs_review?: boolean
          regraded_at?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_attempts_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_exercise_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          exercises_completed: number
          level: number
          simulations_completed: number
          streak_current: number
          streak_last_active: string | null
          streak_longest: number
          total_study_sec: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          exercises_completed?: number
          level?: number
          simulations_completed?: number
          streak_current?: number
          streak_last_active?: string | null
          streak_longest?: number
          total_study_sec?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          exercises_completed?: number
          level?: number
          simulations_completed?: number
          streak_current?: number
          streak_last_active?: string | null
          streak_longest?: number
          total_study_sec?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_rate_limits: {
        Row: {
          failure_count: number
          id: string
          locked_until: string | null
          scope_key: string
          updated_at: string
        }
        Insert: {
          failure_count?: number
          id?: string
          locked_until?: string | null
          scope_key: string
          updated_at?: string
        }
        Update: {
          failure_count?: number
          id?: string
          locked_until?: string | null
          scope_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          completed: boolean
          created_at: string
          exercises_done: number
          exercises_goal: number
          exercises_target: number
          id: string
          simulations_done: number
          simulations_goal: number
          simulations_target: number
          streak_target: number
          study_hours_done: number
          study_hours_target: number
          study_min_done: number
          study_min_goal: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercises_done?: number
          exercises_goal?: number
          exercises_target?: number
          id?: string
          simulations_done?: number
          simulations_goal?: number
          simulations_target?: number
          streak_target?: number
          study_hours_done?: number
          study_hours_target?: number
          study_min_done?: number
          study_min_goal?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercises_done?: number
          exercises_goal?: number
          exercises_target?: number
          id?: string
          simulations_done?: number
          simulations_goal?: number
          simulations_target?: number
          streak_target?: number
          study_hours_done?: number
          study_hours_target?: number
          study_min_done?: number
          study_min_goal?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      writing_topics: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["user_level"]
          prompt: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["user_level"]
          prompt?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["user_level"]
          prompt?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      hoeren_statements_student: {
        Row: {
          exercise_id: string | null
          id: string | null
          statement_number: number | null
          statement_text: string | null
        }
        Insert: {
          exercise_id?: string | null
          id?: string | null
          statement_number?: number | null
          statement_text?: string | null
        }
        Update: {
          exercise_id?: string | null
          id?: string | null
          statement_number?: number | null
          statement_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoeren_statements_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "hoeren_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t1_texts_student: {
        Row: {
          content: string | null
          exercise_id: string | null
          id: string | null
          position: number | null
          title: string | null
        }
        Insert: {
          content?: string | null
          exercise_id?: string | null
          id?: string | null
          position?: number | null
          title?: string | null
        }
        Update: {
          content?: string | null
          exercise_id?: string | null
          id?: string | null
          position?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t1_texts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t2_questions_student: {
        Row: {
          exercise_id: string | null
          id: string | null
          number: number | null
          option_a: string | null
          option_b: string | null
          option_c: string | null
          question: string | null
        }
        Insert: {
          exercise_id?: string | null
          id?: string | null
          number?: number | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          question?: string | null
        }
        Update: {
          exercise_id?: string | null
          id?: string | null
          number?: number | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          question?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t2_questions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      lesen_t3_situations_student: {
        Row: {
          description: string | null
          exercise_id: string | null
          id: string | null
          no_match: boolean | null
          number: number | null
        }
        Insert: {
          description?: string | null
          exercise_id?: string | null
          id?: string | null
          no_match?: boolean | null
          number?: number | null
        }
        Update: {
          description?: string | null
          exercise_id?: string | null
          id?: string | null
          no_match?: boolean | null
          number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesen_t3_situations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "lesen_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t1_gaps_student: {
        Row: {
          exercise_id: string | null
          gap_number: number | null
          id: string | null
          option_a: string | null
          option_b: string | null
          option_c: string | null
        }
        Insert: {
          exercise_id?: string | null
          gap_number?: number | null
          id?: string | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
        }
        Update: {
          exercise_id?: string | null
          gap_number?: number | null
          id?: string | null
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_t1_gaps_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sb_t2_gaps_student: {
        Row: {
          exercise_id: string | null
          gap_number: number | null
          id: string | null
        }
        Insert: {
          exercise_id?: string | null
          gap_number?: number | null
          id?: string | null
        }
        Update: {
          exercise_id?: string | null
          gap_number?: number | null
          id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sb_t2_gaps_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "sb_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_d17_order: {
        Args: {
          p_amount_tnd: number
          p_currency: string
          p_order_id: string
          p_override_credits?: number
          p_override_minutes?: number
          p_plan_code: string
          p_provider_payment_id?: string
          p_reason: string
          p_resolved_by?: string
          p_status: string
          p_user_id: string
        }
        Returns: string
      }
      activate_lemonsqueezy_subscription: {
        Args: {
          p_expires_at: string
          p_ls_customer_id: string
          p_ls_subscription_id: string
          p_ls_variant_id: string
          p_plan_code: string
          p_reason?: string
          p_should_provision: boolean
          p_status: string
          p_user_id: string
        }
        Returns: string
      }
      admin_create_hoeren_exercise: {
        Args: {
          p_audio_path: string
          p_created_by: string
          p_image_path: string
          p_import_notes: string
          p_instructions: string
          p_level: string
          p_statements: Json
          p_teil: number
          p_title: string
        }
        Returns: Json
      }
      admin_create_lesen_t1_exercise: {
        Args: {
          p_created_by: string
          p_headlines: Json
          p_import_notes: string
          p_level: string
          p_texts: Json
          p_title: string
        }
        Returns: Json
      }
      admin_create_lesen_t2_exercise: {
        Args: {
          p_created_by: string
          p_import_notes: string
          p_level: string
          p_passage: string
          p_questions: Json
          p_title: string
        }
        Returns: Json
      }
      admin_create_lesen_t3_exercise: {
        Args: {
          p_created_by: string
          p_import_notes: string
          p_level: string
          p_situations: Json
          p_texts: Json
          p_title: string
        }
        Returns: Json
      }
      admin_create_sb_t1_exercise: {
        Args: {
          p_created_by: string
          p_gaps: Json
          p_import_notes: string
          p_instructions: string
          p_level: string
          p_passage: string
          p_title: string
        }
        Returns: Json
      }
      admin_create_sb_t2_exercise: {
        Args: {
          p_created_by: string
          p_gaps: Json
          p_import_notes: string
          p_instructions: string
          p_level: string
          p_passage: string
          p_title: string
          p_words: Json
        }
        Returns: Json
      }
      admin_grant_credits: {
        Args: { p_amount: number; p_note?: string; p_student_id: string }
        Returns: number
      }
      admin_grant_muendlich_minutes: {
        Args: { p_minutes: number; p_note?: string; p_user_id: string }
        Returns: number
      }
      award_xp: {
        Args: { _source?: string; _user_id: string; _xp: number }
        Returns: undefined
      }
      check_and_increment_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      deduct_essay_credit: { Args: { p_user_id: string }; Returns: number }
      deduct_muendlich_minutes_dual: {
        Args: {
          p_minutes: number
          p_room_id: string
          p_user_a: string
          p_user_b: string
        }
        Returns: {
          deducted_user_id: string
          new_balance: number
        }[]
      }
      expire_muendlich_window: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      expire_overdue_subscriptions: { Args: never; Returns: undefined }
      finalize_simulation: {
        Args: {
          p_attempt_id: string
          p_essay_grading_id?: string
          p_score_schreiben: number
        }
        Returns: Json
      }
      generate_referral_code: { Args: { _user_id: string }; Returns: string }
      get_exercise_catalog: {
        Args: { p_level: string; p_skill: string; p_teil: number }
        Returns: {
          id: string
          import_notes: string
          ord: number
          title: string
        }[]
      }
      get_lesen_t2_solution: {
        Args: { p_exercise_id: string }
        Returns: {
          correct_answer: string
          number: number
        }[]
      }
      get_my_credit_balance: { Args: never; Returns: number }
      get_my_muendlich_credits: {
        Args: never
        Returns: {
          is_subscribed: boolean
          minutes_balance: number
          window_expires_at: string
        }[]
      }
      get_platform_setting: { Args: { p_key: string }; Returns: Json }
      get_schreiben_catalog: {
        Args: { p_category: string; p_level: string }
        Returns: {
          id: string
          ord: number
          title: string
        }[]
      }
      get_today_api_usage: { Args: never; Returns: number }
      has_active_subscription: {
        Args: {
          _plan?: Database["public"]["Enums"]["plan_code"]
          _user_id: string
        }
        Returns: boolean
      }
      has_plan_access: {
        Args: { p_module?: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_lesen_t1_exercise_admin: {
        Args: {
          p_created_by: string
          p_headlines: Json
          p_source_pdf?: string
          p_texts: Json
          p_title: string
        }
        Returns: Json
      }
      import_lesen_t2_exercise: {
        Args: {
          p_passage: string
          p_questions: Json
          p_source_pdf?: string
          p_title: string
        }
        Returns: Json
      }
      import_lesen_t2_exercise_admin: {
        Args: {
          p_created_by: string
          p_passage: string
          p_questions: Json
          p_source_pdf?: string
          p_title: string
        }
        Returns: Json
      }
      is_admin_or_owner: { Args: { _user_id?: string }; Returns: boolean }
      is_d17_staff: { Args: { p_user_id: string }; Returns: boolean }
      is_owner: { Args: { _user_id?: string }; Returns: boolean }
      is_webhook_locked: { Args: { p_scope_key: string }; Returns: boolean }
      muendlich_is_active: { Args: { p_user_id: string }; Returns: boolean }
      process_referral_conversion: {
        Args: { p_referred_user_id: string }
        Returns: undefined
      }
      promote_lesen_t2_drafts: { Args: { p_batch_id: string }; Returns: Json }
      provision_essay_credits: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: number
      }
      provision_muendlich_subscription: {
        Args: { p_minutes: number; p_reason?: string; p_user_id: string }
        Returns: number
      }
      record_api_usage: { Args: { p_tokens: number }; Returns: undefined }
      record_exercise_completion: {
        Args: {
          _is_perfect?: boolean
          _is_simulation?: boolean
          _user_id: string
        }
        Returns: undefined
      }
      record_webhook_signature_failure: {
        Args: { p_scope_key: string }
        Returns: boolean
      }
      refund_essay_credit: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      register_referral: { Args: { p_code: string }; Returns: undefined }
      reserve_d17_identifier: {
        Args: {
          p_normalized_identifier: string
          p_order_id: string
          p_user_id: string
        }
        Returns: {
          held_by_order_id: string
          held_by_user_id: string
          reserved: boolean
        }[]
      }
      reveal_hoeren: { Args: { p_exercise_id: string }; Returns: Json }
      save_simulation_progress: {
        Args: {
          p_advance_to?: string
          p_attempt_id: string
          p_schreiben_text?: string
          p_section?: string
          p_section_answers?: Json
        }
        Returns: Json
      }
      score_and_save_hoeren: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_and_save_lesen_t1: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_and_save_lesen_t2: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_lesen_t1: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_lesen_t2: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_lesen_t3: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_sb_t1: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_sb_t2: {
        Args: { p_answers: Json; p_exercise_id: string }
        Returns: Json
      }
      score_simulation_sections: {
        Args: { p_attempt_id: string }
        Returns: Json
      }
      server_now: { Args: never; Returns: string }
      set_platform_setting: {
        Args: { p_admin_id: string; p_key: string; p_value: Json }
        Returns: undefined
      }
      start_simulation: { Args: { p_user_id: string }; Returns: Json }
      update_streak: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin" | "owner"
      d17_attempt_decision:
        | "auto_approved"
        | "manual_review"
        | "auto_rejected_duplicate"
        | "auto_rejected_fraud"
        | "needs_retry"
      d17_notification_source:
        | "d17_app"
        | "bank_sms"
        | "bank_app"
        | "screenshot_other"
        | "unclear"
      d17_order_status:
        | "awaiting_payment"
        | "under_review"
        | "auto_approved"
        | "manual_review"
        | "admin_approved"
        | "rejected"
        | "expired"
      exam_mode: "schriftlich" | "muendlich"
      exam_module: "schriftlich" | "muendlich"
      exam_pub_status: "draft" | "published" | "archived"
      exam_section:
        | "lesen"
        | "hoeren"
        | "sprachbausteine"
        | "schreiben"
        | "muendlich"
      exam_status: "in_progress" | "submitted" | "expired"
      exam_teil: "teil_1" | "teil_2" | "teil_3"
      exam_type: "vorbereitung" | "simulation"
      exercise_level: "b1" | "b2"
      exercise_module:
        | "lesen"
        | "sprachbausteine"
        | "hoeren"
        | "schreiben"
        | "muendlich"
      exercise_status: "draft" | "published" | "hidden"
      import_status:
        | "pending"
        | "processing"
        | "needs_review"
        | "approved"
        | "failed"
        | "extracting"
        | "extracted"
        | "extraction_failed"
        | "building"
        | "built"
        | "built_needs_review"
        | "build_failed"
        | "parsed"
      item_kind:
        | "heading_match"
        | "passage_mcq"
        | "situation_match"
        | "gap_fill"
        | "listening_mcq"
        | "writing_prompt"
        | "speaking_prompt"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      plan_code: "schriftlich" | "muendlich" | "premium" | "komplett"
      referral_status: "pending" | "converted" | "rejected"
      subscription_status:
        | "trial"
        | "active"
        | "expired"
        | "cancelled"
        | "suspended"
      user_level: "TELC_B1" | "TELC_B2"
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
      app_role: ["admin", "student", "super_admin", "owner"],
      d17_attempt_decision: [
        "auto_approved",
        "manual_review",
        "auto_rejected_duplicate",
        "auto_rejected_fraud",
        "needs_retry",
      ],
      d17_notification_source: [
        "d17_app",
        "bank_sms",
        "bank_app",
        "screenshot_other",
        "unclear",
      ],
      d17_order_status: [
        "awaiting_payment",
        "under_review",
        "auto_approved",
        "manual_review",
        "admin_approved",
        "rejected",
        "expired",
      ],
      exam_mode: ["schriftlich", "muendlich"],
      exam_module: ["schriftlich", "muendlich"],
      exam_pub_status: ["draft", "published", "archived"],
      exam_section: [
        "lesen",
        "hoeren",
        "sprachbausteine",
        "schreiben",
        "muendlich",
      ],
      exam_status: ["in_progress", "submitted", "expired"],
      exam_teil: ["teil_1", "teil_2", "teil_3"],
      exam_type: ["vorbereitung", "simulation"],
      exercise_level: ["b1", "b2"],
      exercise_module: [
        "lesen",
        "sprachbausteine",
        "hoeren",
        "schreiben",
        "muendlich",
      ],
      exercise_status: ["draft", "published", "hidden"],
      import_status: [
        "pending",
        "processing",
        "needs_review",
        "approved",
        "failed",
        "extracting",
        "extracted",
        "extraction_failed",
        "building",
        "built",
        "built_needs_review",
        "build_failed",
        "parsed",
      ],
      item_kind: [
        "heading_match",
        "passage_mcq",
        "situation_match",
        "gap_fill",
        "listening_mcq",
        "writing_prompt",
        "speaking_prompt",
      ],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      plan_code: ["schriftlich", "muendlich", "premium", "komplett"],
      referral_status: ["pending", "converted", "rejected"],
      subscription_status: [
        "trial",
        "active",
        "expired",
        "cancelled",
        "suspended",
      ],
      user_level: ["TELC_B1", "TELC_B2"],
    },
  },
} as const
