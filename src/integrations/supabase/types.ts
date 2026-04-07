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
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_id: string
          id: string
          request_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          donor_id: string
          id?: string
          request_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          donor_id?: string
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accessibility_needs: string | null
          address: string | null
          availability: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          id_doc_url: string | null
          individual_type: Database["public"]["Enums"]["individual_type"] | null
          is_verified: boolean
          organization_name: string | null
          phone: string | null
          preferred_donation_type: string | null
          registration_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          skills: string | null
          updated_at: string
          verification_doc_url: string | null
        }
        Insert: {
          accessibility_needs?: string | null
          address?: string | null
          availability?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          id_doc_url?: string | null
          individual_type?:
            | Database["public"]["Enums"]["individual_type"]
            | null
          is_verified?: boolean
          organization_name?: string | null
          phone?: string | null
          preferred_donation_type?: string | null
          registration_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          skills?: string | null
          updated_at?: string
          verification_doc_url?: string | null
        }
        Update: {
          accessibility_needs?: string | null
          address?: string | null
          availability?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          id_doc_url?: string | null
          individual_type?:
            | Database["public"]["Enums"]["individual_type"]
            | null
          is_verified?: boolean
          organization_name?: string | null
          phone?: string | null
          preferred_donation_type?: string | null
          registration_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          skills?: string | null
          updated_at?: string
          verification_doc_url?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          funding_goal: number | null
          funding_raised: number | null
          id: string
          location: string | null
          skills_needed: string | null
          status: string
          title: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          funding_goal?: number | null
          funding_raised?: number | null
          id?: string
          location?: string | null
          skills_needed?: string | null
          status?: string
          title: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          funding_goal?: number | null
          funding_raised?: number | null
          id?: string
          location?: string | null
          skills_needed?: string | null
          status?: string
          title?: string
          updated_at?: string
          urgency?: string | null
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
      volunteer_assignments: {
        Row: {
          created_at: string
          id: string
          request_id: string
          status: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          status?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          status?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "organization" | "volunteer" | "individual" | "donor"
      individual_type: "normal" | "differently_abled"
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
      app_role: ["organization", "volunteer", "individual", "donor"],
      individual_type: ["normal", "differently_abled"],
    },
  },
} as const
