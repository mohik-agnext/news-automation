import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          session_id: string
          ip_address: string
          created_at: string
          last_accessed: string
        }
        Insert: {
          id?: string
          session_id: string
          ip_address: string
          created_at?: string
          last_accessed?: string
        }
        Update: {
          id?: string
          session_id?: string
          ip_address?: string
          created_at?: string
          last_accessed?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          session_id: string
          article_id: string
          article_url: string
          article_title: string
          article_source: string
          article_published_at: string | null
          created_at: string
          summary: string | null
          tags: string | null
          relevance_score: number | null
          webhook_processed: boolean | null
          processing_status: string | null
          enriched_data: string | null
        }
        Insert: {
          id?: string
          session_id: string
          article_id: string
          article_url: string
          article_title: string
          article_source: string
          article_published_at?: string | null
          created_at?: string
          summary?: string | null
          tags?: string | null
          relevance_score?: number | null
          webhook_processed?: boolean | null
          processing_status?: string | null
          enriched_data?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          article_id?: string
          article_url?: string
          article_title?: string
          article_source?: string
          created_at?: string
          summary?: string | null
          tags?: string | null
          relevance_score?: number | null
          webhook_processed?: boolean | null
          processing_status?: string | null
          enriched_data?: string | null
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

// Convenience types
export type SessionRow = Tables<'sessions'>
export type BookmarkRow = Tables<'bookmarks'>
export type SessionInsert = Database['public']['Tables']['sessions']['Insert']
export type BookmarkInsert = Database['public']['Tables']['bookmarks']['Insert']

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
} 