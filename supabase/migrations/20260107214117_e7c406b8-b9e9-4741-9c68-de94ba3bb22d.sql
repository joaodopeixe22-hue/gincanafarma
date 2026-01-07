
-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    team_id TEXT CHECK (team_id IN ('dna', 'elite', 'alcateia')),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Anyone can view profiles" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert profiles" ON public.profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create achievements table
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'trophy',
    category TEXT NOT NULL CHECK (category IN ('streak', 'kpi', 'challenge', 'milestone')),
    requirement_type TEXT,
    requirement_value INTEGER,
    points INTEGER DEFAULT 10,
    is_trophy BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Achievements RLS policies
CREATE POLICY "Anyone can view achievements" ON public.achievements
FOR SELECT USING (true);

CREATE POLICY "Admins can insert achievements" ON public.achievements
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update achievements" ON public.achievements
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete achievements" ON public.achievements
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create user_achievements table
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    achieved_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, achievement_id)
);

-- Enable RLS on user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- User achievements RLS policies
CREATE POLICY "Anyone can view user achievements" ON public.user_achievements
FOR SELECT USING (true);

CREATE POLICY "Admins can insert user achievements" ON public.user_achievements
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user achievements" ON public.user_achievements
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user creation (create profile + assign member role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial achievements
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value, points, is_trophy) VALUES
-- Streak achievements
('Primeiro Passo', 'Registrou dados pela primeira vez', 'footprints', 'streak', 'days_active', 1, 10, false),
('Semana Completa', '7 dias consecutivos de registros', 'calendar-check', 'streak', 'days_streak', 7, 50, false),
('Mês de Ouro', '30 dias consecutivos de registros', 'calendar-heart', 'streak', 'days_streak', 30, 200, true),

-- KPI achievements
('Estreante', 'Alcançou 100 pontos totais', 'star', 'kpi', 'kpi_total', 100, 25, false),
('Em Ascensão', 'Alcançou 500 pontos totais', 'trending-up', 'kpi', 'kpi_total', 500, 75, false),
('Veterano', 'Alcançou 1000 pontos totais', 'award', 'kpi', 'kpi_total', 1000, 150, true),

-- Challenge achievements
('Campeão do Dia', 'Primeiro lugar no ranking diário', 'medal', 'challenge', 'ranking_position', 1, 30, false),
('Campeão da Semana', 'Primeiro lugar no ranking semanal', 'crown', 'challenge', 'ranking_position', 1, 100, false),
('Campeão do Mês', 'Primeiro lugar no ranking mensal', 'trophy', 'challenge', 'ranking_position', 1, 300, true),

-- Milestone achievements
('Madrugador', 'Primeiro a registrar dados do dia', 'sunrise', 'milestone', 'first_daily', 1, 20, false),
('Perfeccionista', 'Alcançou 100% da meta diária', 'target', 'milestone', 'goal_reached', 100, 40, false),
('Lenda', 'Desbloqueou todas as conquistas', 'sparkles', 'milestone', 'all_achievements', 1, 500, true);
