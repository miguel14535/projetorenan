export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          preferred_mode: 'simple' | 'complex';
          whatsapp_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          preferred_mode?: 'simple' | 'complex';
          whatsapp_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          preferred_mode?: 'simple' | 'complex';
          whatsapp_number?: string | null;
          created_at?: string;
        };
      };
      people: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          notes: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
          created_by?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          person_id: string;
          amount: number;
          description: string | null;
          date: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          amount: number;
          description?: string | null;
          date?: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          amount?: number;
          description?: string | null;
          date?: string;
          created_at?: string;
          created_by?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          person_id: string | null;
          title: string;
          description: string | null;
          appointment_date: string;
          appointment_time: string | null;
          notify_whatsapp: boolean;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          person_id?: string | null;
          title: string;
          description?: string | null;
          appointment_date: string;
          appointment_time?: string | null;
          notify_whatsapp?: boolean;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          person_id?: string | null;
          title?: string;
          description?: string | null;
          appointment_date?: string;
          appointment_time?: string | null;
          notify_whatsapp?: boolean;
          created_at?: string;
          created_by?: string;
        };
      };
      debts: {
        Row: {
          id: string;
          person_id: string;
          amount: number;
          description: string | null;
          due_date: string | null;
          is_paid: boolean;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          person_id: string;
          amount: number;
          description?: string | null;
          due_date?: string | null;
          is_paid?: boolean;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          person_id?: string;
          amount?: number;
          description?: string | null;
          due_date?: string | null;
          is_paid?: boolean;
          created_at?: string;
          created_by?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Person = Database['public']['Tables']['people']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type Debt = Database['public']['Tables']['debts']['Row'];

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type PersonInsert = Database['public']['Tables']['people']['Insert'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
export type DebtInsert = Database['public']['Tables']['debts']['Insert'];
