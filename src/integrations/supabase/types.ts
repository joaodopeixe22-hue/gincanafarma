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
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean
          is_trophy: boolean | null
          manual_grant: boolean
          name: string
          points: number | null
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_trophy?: boolean | null
          manual_grant?: boolean
          name: string
          points?: number | null
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_trophy?: boolean | null
          manual_grant?: boolean
          name?: string
          points?: number | null
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          points_earned: number | null
          team_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points_earned?: number | null
          team_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points_earned?: number | null
          team_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          circuit_name: string
          entry_window_days: number
          id: boolean
          nss_goal: number
          peer_recognitions_per_week: number
          quiz_pass_pct: number
          recognition_points_leader: number
          recognition_points_peer: number
          recognition_target_per_week: number
          store_code: string | null
          store_name: string
          timezone: string
          updated_at: string
          venda_simples_goal: number
          week_starts_on: number
          weight_campanhas: number
          weight_compromissos: number
          weight_constancia: number
          weight_desenvolvimento: number
          weight_execucao: number
          weight_reconhecimento: number
        }
        Insert: {
          circuit_name?: string
          entry_window_days?: number
          id?: boolean
          nss_goal?: number
          peer_recognitions_per_week?: number
          quiz_pass_pct?: number
          recognition_points_leader?: number
          recognition_points_peer?: number
          recognition_target_per_week?: number
          store_code?: string | null
          store_name?: string
          timezone?: string
          updated_at?: string
          venda_simples_goal?: number
          week_starts_on?: number
          weight_campanhas?: number
          weight_compromissos?: number
          weight_constancia?: number
          weight_desenvolvimento?: number
          weight_execucao?: number
          weight_reconhecimento?: number
        }
        Update: {
          circuit_name?: string
          entry_window_days?: number
          id?: boolean
          nss_goal?: number
          peer_recognitions_per_week?: number
          quiz_pass_pct?: number
          recognition_points_leader?: number
          recognition_points_peer?: number
          recognition_target_per_week?: number
          store_code?: string | null
          store_name?: string
          timezone?: string
          updated_at?: string
          venda_simples_goal?: number
          week_starts_on?: number
          weight_campanhas?: number
          weight_compromissos?: number
          weight_constancia?: number
          weight_desenvolvimento?: number
          weight_execucao?: number
          weight_reconhecimento?: number
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          score: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          bonus_points: number | null
          challenge_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          kpi_type: string
          start_time: string
          target_value: number | null
          team_id: string | null
          title: string
        }
        Insert: {
          bonus_points?: number | null
          challenge_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          kpi_type?: string
          start_time: string
          target_value?: number | null
          team_id?: string | null
          title: string
        }
        Update: {
          bonus_points?: number | null
          challenge_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          kpi_type?: string
          start_time?: string
          target_value?: number | null
          team_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      gincana_daily_data_legacy: {
        Row: {
          alcateia_apoio: number
          alcateia_cadastro: number
          alcateia_ofex: number
          alcateia_soria: number
          created_at: string
          date: string
          dna_apoio: number
          dna_cadastro: number
          dna_ofex: number
          dna_soria: number
          elite_apoio: number
          elite_cadastro: number
          elite_ofex: number
          elite_soria: number
          id: string
          updated_at: string
        }
        Insert: {
          alcateia_apoio?: number
          alcateia_cadastro?: number
          alcateia_ofex?: number
          alcateia_soria?: number
          created_at?: string
          date: string
          dna_apoio?: number
          dna_cadastro?: number
          dna_ofex?: number
          dna_soria?: number
          elite_apoio?: number
          elite_cadastro?: number
          elite_ofex?: number
          elite_soria?: number
          id?: string
          updated_at?: string
        }
        Update: {
          alcateia_apoio?: number
          alcateia_cadastro?: number
          alcateia_ofex?: number
          alcateia_soria?: number
          created_at?: string
          date?: string
          dna_apoio?: number
          dna_cadastro?: number
          dna_ofex?: number
          dna_soria?: number
          elite_apoio?: number
          elite_cadastro?: number
          elite_ofex?: number
          elite_soria?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      gincana_goals: {
        Row: {
          created_at: string
          id: string
          kpi_type: string
          period_type: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_type: string
          period_type: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_type?: string
          period_type?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      kpi_definitions: {
        Row: {
          daily_max: number
          default_daily_goal: number
          description: string | null
          is_active: boolean
          key: string
          label: string
          points_per_unit: number
          sort_order: number
        }
        Insert: {
          daily_max?: number
          default_daily_goal?: number
          description?: string | null
          is_active?: boolean
          key: string
          label: string
          points_per_unit?: number
          sort_order?: number
        }
        Update: {
          daily_max?: number
          default_daily_goal?: number
          description?: string | null
          is_active?: boolean
          key?: string
          label?: string
          points_per_unit?: number
          sort_order?: number
        }
        Relationships: []
      }
      member_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          kpi_type: string
          period_type: string
          target_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          kpi_type: string
          period_type: string
          target_value?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          kpi_type?: string
          period_type?: string
          target_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      period_awards: {
        Row: {
          award: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          team_id: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          award: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          team_id?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          award?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          team_id?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "period_awards_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: number
          points: number
          ref_date: string
          source: string
          source_id: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: never
          points: number
          ref_date: string
          source: string
          source_id?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: never
          points?: number
          ref_date?: string
          source?: string
          source_id?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_periods: {
        Row: {
          award: string
          period_start: string
          processed_at: string
        }
        Insert: {
          award: string
          period_start: string
          processed_at?: string
        }
        Update: {
          award?: string
          period_start?: string
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          has_completed_tour: boolean | null
          id: string
          matricula: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          has_completed_tour?: boolean | null
          id: string
          matricula?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          has_completed_tour?: boolean | null
          id?: string
          matricula?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          correct_answers: number | null
          id: string
          quiz_id: string
          score: number | null
          time_taken_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          quiz_id: string
          score?: number | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          quiz_id?: string
          score?: number | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_option: number
          created_at: string | null
          id: string
          options: NonNullable<Json>
          order_index: number | null
          question: string
          quiz_id: string
        }
        Insert: {
          correct_option: number
          created_at?: string | null
          id?: string
          options: NonNullable<Json>
          order_index?: number | null
          question: string
          quiz_id: string
        }
        Update: {
          correct_option?: number
          created_at?: string | null
          id?: string
          options?: NonNullable<Json>
          order_index?: number | null
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          bonus_points: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          time_limit_seconds: number | null
          title: string
        }
        Insert: {
          bonus_points?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          time_limit_seconds?: number | null
          title: string
        }
        Update: {
          bonus_points?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          time_limit_seconds?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          activity_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_activity_id_fkey"
            columns: ["activity_id"]
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recognitions: {
        Row: {
          created_at: string | null
          from_leader: boolean
          from_user_id: string
          id: string
          is_public: boolean | null
          message: string | null
          recognition_type: string
          to_user_id: string
        }
        Insert: {
          created_at?: string | null
          from_leader?: boolean
          from_user_id: string
          id?: string
          is_public?: boolean | null
          message?: string | null
          recognition_type: string
          to_user_id: string
        }
        Update: {
          created_at?: string | null
          from_leader?: boolean
          from_user_id?: string
          id?: string
          is_public?: boolean | null
          message?: string | null
          recognition_type?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_from_user_id_fkey"
            columns: ["from_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognitions_to_user_id_fkey"
            columns: ["to_user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          kind: string
          note: string | null
          start_time: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          kind?: string
          note?: string | null
          start_time?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          kind?: string
          note?: string | null
          start_time?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_daily_results: {
        Row: {
          clientes: number | null
          created_at: string
          date: string
          meta_clientes: number | null
          meta_vendas: number | null
          nss: number | null
          nss_bom: number
          nss_otimo: number
          nss_pessimo: number
          nss_regular: number
          nss_ruim: number
          nss_total: number | null
          observacao: string | null
          ticket_medio: number | null
          updated_at: string
          updated_by: string | null
          venda_simples_pct: number | null
          vendas: number | null
        }
        Insert: {
          clientes?: number | null
          created_at?: string
          date: string
          meta_clientes?: number | null
          meta_vendas?: number | null
          nss?: never
          nss_bom?: number
          nss_otimo?: number
          nss_pessimo?: number
          nss_regular?: number
          nss_ruim?: number
          nss_total?: never
          observacao?: string | null
          ticket_medio?: never
          updated_at?: string
          updated_by?: string | null
          venda_simples_pct?: number | null
          vendas?: number | null
        }
        Update: {
          clientes?: number | null
          created_at?: string
          date?: string
          meta_clientes?: number | null
          meta_vendas?: number | null
          nss?: never
          nss_bom?: number
          nss_otimo?: number
          nss_pessimo?: number
          nss_regular?: number
          nss_ruim?: number
          nss_total?: never
          observacao?: string | null
          ticket_medio?: never
          updated_at?: string
          updated_by?: string | null
          venda_simples_pct?: number | null
          vendas?: number | null
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          category: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          due_time: string | null
          group_id: string
          id: string
          points: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          task_on_time: boolean | null
        }
        Insert: {
          assigned_to: string
          category?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          due_time?: string | null
          group_id?: string
          id?: string
          points?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          category?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          due_time?: string | null
          group_id?: string
          id?: string
          points?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          short_name: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id: string
          is_active?: boolean
          name: string
          short_name: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achieved_at: string | null
          achievement_id: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          achievement_id: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          achievement_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_data: {
        Row: {
          apoio: number
          cadastro: number
          created_at: string | null
          date: string
          id: string
          ofex: number
          original_values: Json | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          soria: number
          status: string
          submitted_at: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apoio?: number
          cadastro?: number
          created_at?: string | null
          date: string
          id?: string
          ofex?: number
          original_values?: Json | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soria?: number
          status?: string
          submitted_at?: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apoio?: number
          cadastro?: number
          created_at?: string | null
          date?: string
          id?: string
          ofex?: number
          original_values?: Json | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          soria?: number
          status?: string
          submitted_at?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_data_team_id_fkey"
            columns: ["team_id"]
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          created_at: string | null
          id: string
          level_name: string
          level_number: number
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level_name?: string
          level_number?: number
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level_name?: string
          level_number?: number
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_levels_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_active_date: string | null
          longest_streak: number | null
          streak_frozen: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          streak_frozen?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          streak_frozen?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_daily_kpis: {
        Row: {
          apoio: number | null
          cadastro: number | null
          date: string | null
          ofex: number | null
          soria: number | null
          source: string | null
          team_id: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_points: {
        Args: { _points: number; _reason: string; _user: string }
        Returns: undefined
      }
      app_local_date: { Args: { _ts: string }; Returns: string }
      app_today: { Args: Record<PropertyKey, never>; Returns: string }
      award_champions: { Args: Record<PropertyKey, never>; Returns: number }
      can_manage_user: { Args: { _target: string }; Returns: boolean }
      close_day: { Args: { _date: string; _team?: string }; Returns: number }
      complete_task: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      create_tasks: {
        Args: {
          _assignees: string[]
          _category: string
          _dates: string[]
          _description: string
          _due_time?: string
          _points?: number
          _title: string
        }
        Returns: number
      }
      delete_entries: {
        Args: { _team?: string; _user?: string }
        Returns: number
      }
      delete_tasks: { Args: { _group?: string; _id?: string }; Returns: number }
      engagement_index: {
        Args: { _end: string; _start: string }
        Returns: {
          avatar_url: string
          campanhas: number
          compromissos: number
          constancia: number
          desenvolvimento: number
          dias_trabalhados: number
          escala_cadastrada: boolean
          execucao: number
          full_name: string
          indice: number
          pendentes: number
          reconhecimento: number
          team_id: string
          user_id: string
        }[]
      }
      evaluate_achievements: { Args: { _user: string }; Returns: number }
      get_quiz_for_attempt: { Args: { _quiz: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      interjornada_violations: {
        Args: { _end: string; _start: string }
        Returns: {
          date_from: string
          date_to: string
          full_name: string
          rest_hours: number
          user_id: string
        }[]
      }
      is_root: { Args: { _user_id: string }; Returns: boolean }
      kpi_points: {
        Args: {
          _apoio: number
          _cadastro: number
          _ofex: number
          _soria: number
        }
        Returns: number
      }
      kpi_ranking: {
        Args: { _end: string; _start: string }
        Returns: {
          apoio: number
          avatar_url: string
          cadastro: number
          days: number
          full_name: string
          ofex: number
          points: number
          soria: number
          team_id: string
          total: number
          user_id: string
        }[]
      }
      leader_save_entry: {
        Args: {
          _apoio: number
          _cadastro: number
          _date: string
          _note?: string
          _ofex: number
          _soria: number
          _user: string
        }
        Returns: {
          apoio: number
          cadastro: number
          created_at: string | null
          date: string
          id: string
          ofex: number
          original_values: Json | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          soria: number
          status: string
          submitted_at: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_daily_data"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ledger_sync: {
        Args: {
          _date: string
          _description: string
          _source: string
          _source_id: string
          _target: number
          _team: string
          _user: string
        }
        Returns: number
      }
      level_for_points: {
        Args: { _points: number }
        Returns: Record<string, unknown>
      }
      list_my_quizzes: {
        Args: Record<PropertyKey, never>
        Returns: {
          attempts: number
          best_score: number
          bonus_points: number
          created_at: string
          description: string
          id: string
          passed: boolean
          question_count: number
          time_limit_seconds: number
          title: string
        }[]
      }
      member_daily_goal: {
        Args: { _kpi: string; _user: string }
        Returns: number
      }
      my_peer_recognitions_left: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      my_team: { Args: Record<PropertyKey, never>; Returns: string }
      notify_user: {
        Args: {
          _message: string
          _metadata?: Json
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      period_end: { Args: { _period: string; _ref: string }; Returns: string }
      period_start: { Args: { _period: string; _ref: string }; Returns: string }
      points_ranking: {
        Args: { _end?: string; _start?: string }
        Returns: {
          achievements: number
          avatar_url: string
          full_name: string
          level_name: string
          level_number: number
          points: number
          team_id: string
          trophies: number
          user_id: string
        }[]
      }
      post_activity: {
        Args: {
          _description: string
          _metadata?: Json
          _points: number
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
      recognition_label: { Args: { _type: string }; Returns: string }
      refresh_challenge_scores: { Args: { _user: string }; Returns: undefined }
      refresh_streak: { Args: { _user: string }; Returns: undefined }
      refresh_user_level: { Args: { _user: string }; Returns: undefined }
      reopen_task: { Args: { _id: string }; Returns: undefined }
      reset_points: {
        Args: { _reason?: string; _team?: string; _user?: string }
        Returns: number
      }
      review_daily_entry: {
        Args: { _decision: string; _id: string; _note?: string; _values?: Json }
        Returns: {
          apoio: number
          cadastro: number
          created_at: string | null
          date: string
          id: string
          ofex: number
          original_values: Json | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          soria: number
          status: string
          submitted_at: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_daily_data"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_task: {
        Args: { _decision: string; _id: string; _note?: string }
        Returns: undefined
      }
      save_shifts: { Args: { _rows: Json }; Returns: number }
      set_challenge_completion: {
        Args: { _challenge: string; _completed: boolean; _user: string }
        Returns: undefined
      }
      submit_quiz_attempt: {
        Args: { _answers: number[]; _quiz: string; _time_taken?: number }
        Returns: Json
      }
      task_on_time: {
        Args: { _t: Database["public"]["Tables"]["tasks"]["Row"] }
        Returns: boolean
      }
      validate_kpi_values: {
        Args: {
          _apoio: number
          _cadastro: number
          _ofex: number
          _soria: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "lider" | "member" | "root"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "lider", "member", "root"],
    },
  },
} as const

