export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: { Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      announcement_comment_archive: {
        Row: {
          body: string;
          comment_id: string;
          deleted_at: string;
          deleted_by: string | null;
        };
        Insert: {
          body: string;
          comment_id: string;
          deleted_at?: string;
          deleted_by?: string | null;
        };
        Update: {
          body?: string;
          comment_id?: string;
          deleted_at?: string;
          deleted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_comment_archive_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: true;
            referencedRelation: "announcement_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_comment_archive_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_comment_archive_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcement_comments: {
        Row: {
          announcement_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          announcement_id: string;
          author_id?: string | null;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          updated_at?: string;
        };
        Update: {
          announcement_id?: string;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          allow_comments: boolean;
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          pinned: boolean;
          published_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          allow_comments?: boolean;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          published_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          allow_comments?: boolean;
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          published_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      app_meta: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      community_settings: {
        Row: {
          accent_color: string | null;
          id: number;
          logo_path: string | null;
          primary_color: string | null;
          updated_at: string;
          welcome_text: string | null;
        };
        Insert: {
          accent_color?: string | null;
          id?: number;
          logo_path?: string | null;
          primary_color?: string | null;
          updated_at?: string;
          welcome_text?: string | null;
        };
        Update: {
          accent_color?: string | null;
          id?: number;
          logo_path?: string | null;
          primary_color?: string | null;
          updated_at?: string;
          welcome_text?: string | null;
        };
        Relationships: [];
      };
      event_attendees: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          member_id: string;
          payment_confirmed_at: string | null;
          payment_confirmed_by: string | null;
          payment_reported_at: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"] | null;
          status: Database["public"]["Enums"]["rsvp_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          member_id: string;
          payment_confirmed_at?: string | null;
          payment_confirmed_by?: string | null;
          payment_reported_at?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"] | null;
          status?: Database["public"]["Enums"]["rsvp_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          member_id?: string;
          payment_confirmed_at?: string | null;
          payment_confirmed_by?: string | null;
          payment_reported_at?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"] | null;
          status?: Database["public"]["Enums"]["rsvp_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendees_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendees_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendees_payment_confirmed_by_fkey";
            columns: ["payment_confirmed_by"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendees_payment_confirmed_by_fkey";
            columns: ["payment_confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          capacity: number | null;
          created_at: string;
          created_by: string | null;
          description: string;
          ends_at: string | null;
          event_number: number;
          fee_amount: number | null;
          fee_currency: string | null;
          id: string;
          location: string | null;
          published: boolean;
          rsvp_deadline: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          ends_at?: string | null;
          event_number?: never;
          fee_amount?: number | null;
          fee_currency?: string | null;
          id?: string;
          location?: string | null;
          published?: boolean;
          rsvp_deadline?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          ends_at?: string | null;
          event_number?: never;
          fee_amount?: number | null;
          fee_currency?: string | null;
          id?: string;
          location?: string | null;
          published?: boolean;
          rsvp_deadline?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      membership_payments: {
        Row: {
          amount: number;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          currency: string;
          id: string;
          member_id: string;
          note: string | null;
          period_key: string;
          reference: string;
          reported_at: string | null;
          status: Database["public"]["Enums"]["payment_status"];
        };
        Insert: {
          amount: number;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          currency: string;
          id?: string;
          member_id: string;
          note?: string | null;
          period_key: string;
          reference: string;
          reported_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          amount?: number;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          member_id?: string;
          note?: string | null;
          period_key?: string;
          reference?: string;
          reported_at?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "membership_payments_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_payments_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_payments_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membership_payments_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_log: {
        Row: {
          id: number;
          kind: string;
          recipient_id: string | null;
          ref_id: string;
          sent_at: string;
        };
        Insert: {
          id?: never;
          kind: string;
          recipient_id?: string | null;
          ref_id: string;
          sent_at?: string;
        };
        Update: {
          id?: never;
          kind?: string;
          recipient_id?: string | null;
          ref_id?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      payment_details: {
        Row: {
          account_holder: string | null;
          account_number: string | null;
          bank_name: string | null;
          bic: string | null;
          iban: string | null;
          id: number;
          instructions: string | null;
          qr_path: string | null;
          swish_number: string | null;
          updated_at: string;
        };
        Insert: {
          account_holder?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          bic?: string | null;
          iban?: string | null;
          id?: number;
          instructions?: string | null;
          qr_path?: string | null;
          swish_number?: string | null;
          updated_at?: string;
        };
        Update: {
          account_holder?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          bic?: string | null;
          iban?: string | null;
          id?: number;
          instructions?: string | null;
          qr_path?: string | null;
          swish_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      privacy_policies: {
        Row: {
          body: string;
          is_default: boolean;
          locale: string;
          published_at: string;
          published_by: string | null;
          version: number;
        };
        Insert: {
          body: string;
          is_default?: boolean;
          locale: string;
          published_at?: string;
          published_by?: string | null;
          version: number;
        };
        Update: {
          body?: string;
          is_default?: boolean;
          locale?: string;
          published_at?: string;
          published_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "privacy_policies_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "privacy_policies_published_by_fkey";
            columns: ["published_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          join_message: string | null;
          locale: string | null;
          member_number: number | null;
          notify_announcements: boolean;
          notify_events: boolean;
          privacy_accepted_at: string | null;
          privacy_accepted_version: number | null;
          role: Database["public"]["Enums"]["member_role"];
          status: Database["public"]["Enums"]["member_status"];
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          display_name?: string;
          email: string;
          id: string;
          join_message?: string | null;
          locale?: string | null;
          member_number?: number | null;
          notify_announcements?: boolean;
          notify_events?: boolean;
          privacy_accepted_at?: string | null;
          privacy_accepted_version?: number | null;
          role?: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          join_message?: string | null;
          locale?: string | null;
          member_number?: number | null;
          notify_announcements?: boolean;
          notify_events?: boolean;
          privacy_accepted_at?: string | null;
          privacy_accepted_version?: number | null;
          role?: Database["public"]["Enums"]["member_role"];
          status?: Database["public"]["Enums"]["member_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "member_names";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          hits: number;
          key: string;
          window_start: string;
        };
        Insert: {
          hits?: number;
          key: string;
          window_start: string;
        };
        Update: {
          hits?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      member_names: {
        Row: {
          display_name: string | null;
          id: string | null;
        };
        Insert: {
          display_name?: string | null;
          id?: string | null;
        };
        Update: {
          display_name?: string | null;
          id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      event_attendee_names: {
        Args: { p_event_id: string };
        Returns: {
          display_name: string;
        }[];
      };
      event_going_counts: {
        Args: { p_event_ids: string[] };
        Returns: {
          event_id: string;
          going: number;
        }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_trusted_context: { Args: Record<PropertyKey, never>; Returns: boolean };
      rate_limit_cleanup: { Args: Record<PropertyKey, never>; Returns: undefined };
      rate_limit_hit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      report_event_payment: { Args: { p_event_id: string }; Returns: undefined };
      report_membership_payment: { Args: { p_payment_id: string }; Returns: undefined };
      rsvp_event: { Args: { p_event_id: string; p_going: boolean }; Returns: string };
    };
    Enums: {
      member_role: "member" | "admin";
      member_status: "pending" | "approved" | "rejected" | "suspended";
      payment_status: "unpaid" | "reported" | "confirmed" | "waived";
      rsvp_status: "going" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      member_role: ["member", "admin"],
      member_status: ["pending", "approved", "rejected", "suspended"],
      payment_status: ["unpaid", "reported", "confirmed", "waived"],
      rsvp_status: ["going", "cancelled"],
    },
  },
} as const;
