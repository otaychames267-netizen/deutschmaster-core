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
      badges: {
        Row: {
          awarded_at: string
          description: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          awarded_at?: string
          description?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          awarded_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          issued_at: string
          level: Database["public"]["Enums"]["user_level"]
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          level: Database["public"]["Enums"]["user_level"]
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          level?: Database["public"]["Enums"]["user_level"]
          pdf_url?: string | null
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
      devices: {
        Row: {
          device_fingerprint: string
          device_name: string | null
          id: string
          last_seen: string
          trusted: boolean
          user_id: string
        }
        Insert: {
          device_fingerprint: string
          device_name?: string | null
          id?: string
          last_seen?: string
          trusted?: boolean
          user_id: string
        }
        Update: {
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          last_seen?: string
          trusted?: boolean
          user_id?: string
        }
        Relationships: []
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
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          level: Database["public"]["Enums"]["user_level"] | null
          preferred_language: string
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
          level?: Database["public"]["Enums"]["user_level"] | null
          preferred_language?: string
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
          level?: Database["public"]["Enums"]["user_level"] | null
          preferred_language?: string
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
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_email: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_email: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_email?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      plan_code: "schriftlich" | "muendlich" | "premium"
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
      app_role: ["admin", "student"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      plan_code: ["schriftlich", "muendlich", "premium"],
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
