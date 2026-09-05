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
      analysis_sessions: {
        Row: {
          analysis_plan: Json | null
          completed_at: string | null
          created_at: string
          critique: Json | null
          degradations: Json
          disagreements: Json
          error: string | null
          final_thesis: Json | null
          id: string
          input_bundle: Json
          iteration: number
          methodology_results: Json
          mode: string
          reconciled_valuation: Json | null
          startup_name: string
          startup_profile: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_plan?: Json | null
          completed_at?: string | null
          created_at?: string
          critique?: Json | null
          degradations?: Json
          disagreements?: Json
          error?: string | null
          final_thesis?: Json | null
          id?: string
          input_bundle?: Json
          iteration?: number
          methodology_results?: Json
          mode?: string
          reconciled_valuation?: Json | null
          startup_name?: string
          startup_profile?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_plan?: Json | null
          completed_at?: string | null
          created_at?: string
          critique?: Json | null
          degradations?: Json
          disagreements?: Json
          error?: string | null
          final_thesis?: Json | null
          id?: string
          input_bundle?: Json
          iteration?: number
          methodology_results?: Json
          mode?: string
          reconciled_valuation?: Json | null
          startup_name?: string
          startup_profile?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_agent_runs: {
        Row: {
          agent: string
          confidence: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          iteration: number
          label: string
          methodology_id: string | null
          output: Json | null
          session_id: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          agent: string
          confidence?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          iteration?: number
          label?: string
          methodology_id?: string | null
          output?: Json | null
          session_id: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          agent?: string
          confidence?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          iteration?: number
          label?: string
          methodology_id?: string | null
          output?: Json | null
          session_id?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_evidence: {
        Row: {
          claim: string
          confidence: number
          created_at: string
          evidence: string
          id: string
          methodology: string
          reasoning: string
          session_id: string
          source: string
          source_type: string
          user_id: string
        }
        Insert: {
          claim: string
          confidence?: number
          created_at?: string
          evidence?: string
          id?: string
          methodology?: string
          reasoning?: string
          session_id: string
          source?: string
          source_type?: string
          user_id: string
        }
        Update: {
          claim?: string
          confidence?: number
          created_at?: string
          evidence?: string
          id?: string
          methodology?: string
          reasoning?: string
          session_id?: string
          source?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
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
      funding_interests: {
        Row: {
          amount: number | null
          approved: boolean
          created_at: string
          id: string
          investor_user_id: string
          message: string | null
          role: string
          startup_user_id: string
        }
        Insert: {
          amount?: number | null
          approved?: boolean
          created_at?: string
          id?: string
          investor_user_id: string
          message?: string | null
          role?: string
          startup_user_id: string
        }
        Update: {
          amount?: number | null
          approved?: boolean
          created_at?: string
          id?: string
          investor_user_id?: string
          message?: string | null
          role?: string
          startup_user_id?: string
        }
        Relationships: []
      }
      funding_rounds: {
        Row: {
          amount: number
          created_at: string
          date: string | null
          id: string
          investor_name: string | null
          round_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          date?: string | null
          id?: string
          investor_name?: string | null
          round_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string | null
          id?: string
          investor_name?: string | null
          round_name?: string
          updated_at?: string
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
      community_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          current_company: string
          email: string | null
          id: string
          industry: string | null
          linkedin_url: string
          name: string
          startup_description: string | null
          startup_name: string
          surname: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          current_company?: string
          email?: string | null
          id: string
          industry?: string | null
          linkedin_url?: string
          name: string
          startup_description?: string | null
          startup_name: string
          surname: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          current_company?: string
          email?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string
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
      startup_funding: {
        Row: {
          created_at: string
          funding_goal: number | null
          funding_raised: number | null
          funding_stage: string | null
          id: string
          interest_count: number | null
          last_round_amount: number | null
          last_round_date: string | null
          last_round_investor_type: string | null
          timeline: string | null
          updated_at: string
          use_marketing_pct: number | null
          use_product_pct: number | null
          use_team_pct: number | null
          user_id: string
          valuation: number | null
        }
        Insert: {
          created_at?: string
          funding_goal?: number | null
          funding_raised?: number | null
          funding_stage?: string | null
          id?: string
          interest_count?: number | null
          last_round_amount?: number | null
          last_round_date?: string | null
          last_round_investor_type?: string | null
          timeline?: string | null
          updated_at?: string
          use_marketing_pct?: number | null
          use_product_pct?: number | null
          use_team_pct?: number | null
          user_id: string
          valuation?: number | null
        }
        Update: {
          created_at?: string
          funding_goal?: number | null
          funding_raised?: number | null
          funding_stage?: string | null
          id?: string
          interest_count?: number | null
          last_round_amount?: number | null
          last_round_date?: string | null
          last_round_investor_type?: string | null
          timeline?: string | null
          updated_at?: string
          use_marketing_pct?: number | null
          use_product_pct?: number | null
          use_team_pct?: number | null
          user_id?: string
          valuation?: number | null
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
      validate_voucher: {
        Args: {
          _analysis_type: string
          _user_id: string
          _voucher_code: string
        }
        Returns: Json
      }
      list_investors: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string | null
          surname: string | null
          avatar_url: string | null
          linkedin_url: string | null
          current_company: string | null
          industry: string | null
          country: string | null
          email: string | null
        }[]
      }
      get_trending_topics: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          topic: string
          mentions: number
          posts: number
          last_used: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "investor" | "startup" | "user"
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
