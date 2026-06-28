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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      lesen_exercises: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          import_notes: string | null
          level: string
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
      muendlich_materials: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          sort_order: number
          storage_path: string
          teil: number
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          storage_path: string
          teil: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          storage_path?: string
          teil?: number
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
      profiles: {
        Row: {
          avatar_url: string | null
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
          source_pdf: string | null
          teil: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          import_notes?: string | null
          level?: string
          source_pdf?: string | null
          teil: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          import_notes?: string | null
          level?: string
          source_pdf?: string | null
          teil?: number
          title?: string
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
      trial_claims: {
        Row: {
          claimed_at: string
          device_fingerprint: string | null
          email: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          device_fingerprint?: string | null
          email: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          device_fingerprint?: string | null
          email?: string
          id?: string
          ip_address?: string | null
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
      award_xp: {
        Args: { _source?: string; _user_id: string; _xp: number }
        Returns: undefined
      }
      expire_overdue_subscriptions: { Args: never; Returns: undefined }
      generate_referral_code: { Args: { _user_id: string }; Returns: string }
      has_active_subscription: {
        Args: {
          _plan?: Database["public"]["Enums"]["plan_code"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: { _user_id?: string }; Returns: boolean }
      is_owner: { Args: { _user_id?: string }; Returns: boolean }
      promote_lesen_t2_drafts: { Args: { p_batch_id: string }; Returns: Json }
      record_exercise_completion: {
        Args: {
          _is_perfect?: boolean
          _is_simulation?: boolean
          _user_id: string
        }
        Returns: undefined
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
      server_now: { Args: never; Returns: string }
      update_streak: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "student" | "super_admin" | "owner"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "student", "super_admin", "owner"],
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
