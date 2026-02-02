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
      accounts: {
        Row: {
          acquisition_date: string
          bookmaker_id: string
          created_at: string
          current_balance: number
          current_status: Database["public"]["Enums"]["account_status"]
          id: string
          initial_month_balance: number
          limitation_date: string | null
          login_nick: string
          notes: string | null
          operator_id: string
          pending_balance: number
          purchase_price: number
          total_deposited: number
          total_volume: number
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          acquisition_date?: string
          bookmaker_id: string
          created_at?: string
          current_balance?: number
          current_status?: Database["public"]["Enums"]["account_status"]
          id?: string
          initial_month_balance?: number
          limitation_date?: string | null
          login_nick: string
          notes?: string | null
          operator_id: string
          pending_balance?: number
          purchase_price?: number
          total_deposited?: number
          total_volume?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          acquisition_date?: string
          bookmaker_id?: string
          created_at?: string
          current_balance?: number
          current_status?: Database["public"]["Enums"]["account_status"]
          id?: string
          initial_month_balance?: number
          limitation_date?: string | null
          login_nick?: string
          notes?: string | null
          operator_id?: string
          pending_balance?: number
          purchase_price?: number
          total_deposited?: number
          total_volume?: number
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_bookmaker_id_fkey"
            columns: ["bookmaker_id"]
            isOneToOne: false
            referencedRelation: "bookmakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_balances: {
        Row: {
          bank_name: string
          current_balance: number
          id: string
          updated_at: string
        }
        Insert: {
          bank_name: string
          current_balance?: number
          id?: string
          updated_at?: string
        }
        Update: {
          bank_name?: string
          current_balance?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          account_id: string
          bet_description: string | null
          bookmaker_id: string
          created_at: string
          date: string
          expected_value: number | null
          id: string
          market_time: Database["public"]["Enums"]["market_time"]
          odds: number
          operator_id: string
          profit: number
          result: Database["public"]["Enums"]["bet_result"]
          software_tool: string
          sport: string
          stake: number
          teams: string | null
        }
        Insert: {
          account_id: string
          bet_description?: string | null
          bookmaker_id: string
          created_at?: string
          date?: string
          expected_value?: number | null
          id?: string
          market_time?: Database["public"]["Enums"]["market_time"]
          odds: number
          operator_id: string
          profit: number
          result: Database["public"]["Enums"]["bet_result"]
          software_tool?: string
          sport?: string
          stake: number
          teams?: string | null
        }
        Update: {
          account_id?: string
          bet_description?: string | null
          bookmaker_id?: string
          created_at?: string
          date?: string
          expected_value?: number | null
          id?: string
          market_time?: Database["public"]["Enums"]["market_time"]
          odds?: number
          operator_id?: string
          profit?: number
          result?: Database["public"]["Enums"]["bet_result"]
          software_tool?: string
          sport?: string
          stake?: number
          teams?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_bookmaker_id_fkey"
            columns: ["bookmaker_id"]
            isOneToOne: false
            referencedRelation: "bookmakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmakers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_name: string | null
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          related_account_id: string | null
          related_operator_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          bank_name?: string | null
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          related_account_id?: string | null
          related_operator_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          bank_name?: string | null
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          related_account_id?: string | null
          related_operator_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_related_account_id_fkey"
            columns: ["related_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_operator_id_fkey"
            columns: ["related_operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "em_uso" | "limitada" | "cevando" | "transferida"
      app_role: "admin" | "operator"
      bet_result: "green" | "red" | "void" | "meio_green" | "meio_red"
      market_time: "jogo_todo" | "1_tempo" | "2_tempo"
      transaction_type:
        | "aporte"
        | "retirada"
        | "custo_operacional"
        | "compra_conta"
        | "correcao"
        | "recebido"
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
      account_status: ["em_uso", "limitada", "cevando", "transferida"],
      app_role: ["admin", "operator"],
      bet_result: ["green", "red", "void", "meio_green", "meio_red"],
      market_time: ["jogo_todo", "1_tempo", "2_tempo"],
      transaction_type: [
        "aporte",
        "retirada",
        "custo_operacional",
        "compra_conta",
        "correcao",
        "recebido",
      ],
    },
  },
} as const
