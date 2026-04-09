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
      business_model_canvas: {
        Row: {
          analysis_result: string | null
          analyzed_at: string | null
          canvas_data: Json
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_result?: string | null
          analyzed_at?: string | null
          canvas_data?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_result?: string | null
          analyzed_at?: string | null
          canvas_data?: Json
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          berkus: number
          berkus_answers: Json
          chicago_answers: Json
          id: string
          risk_answers: Json
          risk_factor: number
          scorecard: number
          scorecard_answers: Json
          scorecard_median: number
          updated_at: string
          user_id: string
          vc_answers: Json
        }
        Insert: {
          berkus?: number
          berkus_answers?: Json
          chicago_answers?: Json
          id?: string
          risk_answers?: Json
          risk_factor?: number
          scorecard?: number
          scorecard_answers?: Json
          scorecard_median?: number
          updated_at?: string
          user_id: string
          vc_answers?: Json
        }
        Update: {
          berkus?: number
          berkus_answers?: Json
          chicago_answers?: Json
          id?: string
          risk_answers?: Json
          risk_factor?: number
          scorecard?: number
          scorecard_answers?: Json
          scorecard_median?: number
          updated_at?: string
          user_id?: string
          vc_answers?: Json
        }
        Relationships: []
      }
      financial_snapshots: {
        Row: {
          created_at: string
          data: Json
          date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          date: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pitch_deck_analyses: {
        Row: {
          analysis_result: string | null
          analyzed_at: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          slide_count: number | null
          user_id: string
        }
        Insert: {
          analysis_result?: string | null
          analyzed_at?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          slide_count?: number | null
          user_id: string
        }
        Update: {
          analysis_result?: string | null
          analyzed_at?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          slide_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          startup_description: string | null
          startup_name: string
          surname: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          id: string
          industry?: string | null
          name: string
          startup_description?: string | null
          startup_name: string
          surname: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          startup_description?: string | null
          startup_name?: string
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      readiness_answers: {
        Row: {
          crl_answers: Json
          frl_answers: Json
          id: string
          trl_answers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          crl_answers?: Json
          frl_answers?: Json
          id?: string
          trl_answers?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          crl_answers?: Json
          frl_answers?: Json
          id?: string
          trl_answers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      startup_vacancies: {
        Row: {
          approved: boolean | null
          contact_email: string | null
          country: string
          created_at: string
          id: string
          job_description: string
          job_type: string
          specialization: string
          startup_description: string | null
          startup_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          contact_email?: string | null
          country: string
          created_at?: string
          id?: string
          job_description: string
          job_type: string
          specialization: string
          startup_description?: string | null
          startup_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean | null
          contact_email?: string | null
          country?: string
          created_at?: string
          id?: string
          job_description?: string
          job_type?: string
          specialization?: string
          startup_description?: string | null
          startup_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voucher_redemptions: {
        Row: {
          analysis_type: string
          created_at: string
          id: string
          user_id: string
          voucher_id: string
        }
        Insert: {
          analysis_type: string
          created_at?: string
          id?: string
          user_id: string
          voucher_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          id?: string
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          max_uses: number
          type: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          max_uses?: number
          type: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          max_uses?: number
          type?: string
          used_count?: number
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
      redeem_voucher: {
        Args: {
          _analysis_type: string
          _user_id: string
          _voucher_code: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "investor" | "startup"
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
      app_role: ["admin", "investor", "startup"],
    },
  },
} as const
