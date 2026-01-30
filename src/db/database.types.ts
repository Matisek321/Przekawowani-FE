export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      coffees: {
        Row: {
          avg_main: number | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          normalized_name: string | null;
          ratings_count: number;
          roastery_id: string;
        };
        Insert: {
          avg_main?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          normalized_name?: string | null;
          ratings_count?: number;
          roastery_id: string;
        };
        Update: {
          avg_main?: number | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          normalized_name?: string | null;
          ratings_count?: number;
          roastery_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coffees_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coffees_roastery_id_fkey";
            columns: ["roastery_id"];
            isOneToOne: false;
            referencedRelation: "roasteries";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          normalized_display_name: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          normalized_display_name?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          normalized_display_name?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          acidity: number;
          aftertaste: number;
          coffee_id: string;
          created_at: string;
          id: string;
          main: number;
          strength: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          acidity: number;
          aftertaste: number;
          coffee_id: string;
          created_at?: string;
          id?: string;
          main: number;
          strength: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          acidity?: number;
          aftertaste?: number;
          coffee_id?: string;
          created_at?: string;
          id?: string;
          main?: number;
          strength?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_coffee_id_fkey";
            columns: ["coffee_id"];
            isOneToOne: false;
            referencedRelation: "coffee_aggregates";
            referencedColumns: ["coffee_id"];
          },
          {
            foreignKeyName: "ratings_coffee_id_fkey";
            columns: ["coffee_id"];
            isOneToOne: false;
            referencedRelation: "coffees";
            referencedColumns: ["id"];
          },
        ];
      };
      roasteries: {
        Row: {
          city: string;
          created_at: string;
          id: string;
          name: string;
          normalized_city: string | null;
          normalized_name: string | null;
        };
        Insert: {
          city: string;
          created_at?: string;
          id?: string;
          name: string;
          normalized_city?: string | null;
          normalized_name?: string | null;
        };
        Update: {
          city?: string;
          created_at?: string;
          id?: string;
          name?: string;
          normalized_city?: string | null;
          normalized_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      coffee_aggregates: {
        Row: {
          avg_main: number | null;
          coffee_id: string | null;
          created_at: string | null;
          name: string | null;
          ratings_count: number | null;
          roastery_id: string | null;
          small_sample: boolean | null;
        };
        Insert: {
          avg_main?: number | null;
          coffee_id?: string | null;
          created_at?: string | null;
          name?: string | null;
          ratings_count?: number | null;
          roastery_id?: string | null;
          small_sample?: never;
        };
        Update: {
          avg_main?: number | null;
          coffee_id?: string | null;
          created_at?: string | null;
          name?: string | null;
          ratings_count?: number | null;
          roastery_id?: string | null;
          small_sample?: never;
        };
        Relationships: [
          {
            foreignKeyName: "coffees_roastery_id_fkey";
            columns: ["roastery_id"];
            isOneToOne: false;
            referencedRelation: "roasteries";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      fn_refresh_coffee_aggregates: {
        Args: { p_coffee_id: string };
        Returns: undefined;
      };
      unaccent: { Args: { "": string }; Returns: string };
      unaccent_pl: { Args: { input: string }; Returns: string };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
