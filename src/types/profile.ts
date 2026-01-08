export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  team_id: 'dna' | 'elite' | 'alcateia' | null;
  bio: string | null;
  matricula: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: 'streak' | 'kpi' | 'challenge' | 'milestone';
  requirement_type: string | null;
  requirement_value: number | null;
  points: number;
  is_trophy: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achieved_at: string;
  achievement?: Achievement;
}

export interface UserLevel {
  id: string;
  user_id: string;
  level_number: number;
  level_name: string;
  total_points: number;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  profile: Profile | null;
  role: 'root' | 'admin' | 'lider' | 'member' | null;
}
