-- Create table for goals/targets
CREATE TABLE public.gincana_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
    kpi_type TEXT NOT NULL CHECK (kpi_type IN ('ofex', 'apoio', 'soria', 'cadastro', 'total')),
    target_value INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(period_type, kpi_type)
);

-- Enable Row Level Security
ALTER TABLE public.gincana_goals ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read goals
CREATE POLICY "Anyone can view goals" 
ON public.gincana_goals 
FOR SELECT 
USING (true);

-- Allow anyone to insert goals
CREATE POLICY "Anyone can insert goals" 
ON public.gincana_goals 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update goals
CREATE POLICY "Anyone can update goals" 
ON public.gincana_goals 
FOR UPDATE 
USING (true);

-- Trigger for timestamp updates
CREATE TRIGGER update_gincana_goals_updated_at
BEFORE UPDATE ON public.gincana_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gincana_goals;

-- Insert default goals
INSERT INTO public.gincana_goals (period_type, kpi_type, target_value) VALUES
('daily', 'ofex', 50),
('daily', 'apoio', 30),
('daily', 'soria', 20),
('daily', 'cadastro', 40),
('daily', 'total', 140),
('weekly', 'ofex', 300),
('weekly', 'apoio', 180),
('weekly', 'soria', 120),
('weekly', 'cadastro', 240),
('weekly', 'total', 840);