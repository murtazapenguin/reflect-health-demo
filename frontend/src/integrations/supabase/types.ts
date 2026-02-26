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
      automation_scenarios: {
        Row: {
          analysis_id: string | null
          automation_coverage_after: number | null
          automation_coverage_before: number | null
          call_intent: string
          compliance_requirements: Json | null
          confidence_score: number | null
          created_at: string
          decision_tree: Json | null
          escalation_rules: Json | null
          expected_resolution: string | null
          id: string
          name: string
          recording_id: string | null
          required_data_inputs: Json | null
          required_system_integrations: Json | null
          status: string
        }
        Insert: {
          analysis_id?: string | null
          automation_coverage_after?: number | null
          automation_coverage_before?: number | null
          call_intent: string
          compliance_requirements?: Json | null
          confidence_score?: number | null
          created_at?: string
          decision_tree?: Json | null
          escalation_rules?: Json | null
          expected_resolution?: string | null
          id?: string
          name: string
          recording_id?: string | null
          required_data_inputs?: Json | null
          required_system_integrations?: Json | null
          status?: string
        }
        Update: {
          analysis_id?: string | null
          automation_coverage_after?: number | null
          automation_coverage_before?: number | null
          call_intent?: string
          compliance_requirements?: Json | null
          confidence_score?: number | null
          created_at?: string
          decision_tree?: Json | null
          escalation_rules?: Json | null
          expected_resolution?: string | null
          id?: string
          name?: string
          recording_id?: string | null
          required_data_inputs?: Json | null
          required_system_integrations?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_scenarios_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "call_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_scenarios_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "call_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      call_analyses: {
        Row: {
          automation_feasibility_score: number | null
          avg_handle_time_seconds: number | null
          backend_systems_accessed: Json | null
          call_type: string | null
          compliance_flags: Json | null
          cost_per_call_ai: number | null
          cost_per_call_manual: number | null
          created_at: string
          entities: Json | null
          escalation_risk: string | null
          id: string
          intent: string | null
          recording_id: string
          resolution_type: string | null
          sentiment: string | null
          speakers: Json | null
          summary: string | null
          transcript: string | null
        }
        Insert: {
          automation_feasibility_score?: number | null
          avg_handle_time_seconds?: number | null
          backend_systems_accessed?: Json | null
          call_type?: string | null
          compliance_flags?: Json | null
          cost_per_call_ai?: number | null
          cost_per_call_manual?: number | null
          created_at?: string
          entities?: Json | null
          escalation_risk?: string | null
          id?: string
          intent?: string | null
          recording_id: string
          resolution_type?: string | null
          sentiment?: string | null
          speakers?: Json | null
          summary?: string | null
          transcript?: string | null
        }
        Update: {
          automation_feasibility_score?: number | null
          avg_handle_time_seconds?: number | null
          backend_systems_accessed?: Json | null
          call_type?: string | null
          compliance_flags?: Json | null
          cost_per_call_ai?: number | null
          cost_per_call_manual?: number | null
          created_at?: string
          entities?: Json | null
          escalation_risk?: string | null
          id?: string
          intent?: string | null
          recording_id?: string
          resolution_type?: string | null
          sentiment?: string | null
          speakers?: Json | null
          summary?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_analyses_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "call_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recordings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_size_bytes: number | null
          id: string
          status: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          status?: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          status?: string
          storage_path?: string | null
        }
        Relationships: []
      }
      knowledge_base_entries: {
        Row: {
          call_count: number | null
          confidence_score: number | null
          created_at: string
          entity_patterns: Json | null
          id: string
          intent: string
          response_template: string | null
          scenario_id: string | null
          success_rate: number | null
          updated_at: string
        }
        Insert: {
          call_count?: number | null
          confidence_score?: number | null
          created_at?: string
          entity_patterns?: Json | null
          id?: string
          intent: string
          response_template?: string | null
          scenario_id?: string | null
          success_rate?: number | null
          updated_at?: string
        }
        Update: {
          call_count?: number | null
          confidence_score?: number | null
          created_at?: string
          entity_patterns?: Json | null
          id?: string
          intent?: string
          response_template?: string | null
          scenario_id?: string | null
          success_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_entries_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "automation_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
