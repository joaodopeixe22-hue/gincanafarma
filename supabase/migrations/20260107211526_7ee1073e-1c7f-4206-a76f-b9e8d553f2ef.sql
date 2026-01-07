-- Create table for daily gincana data
CREATE TABLE public.gincana_daily_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    dna_ofex INTEGER NOT NULL DEFAULT 0,
    dna_apoio INTEGER NOT NULL DEFAULT 0,
    dna_soria INTEGER NOT NULL DEFAULT 0,
    dna_cadastro INTEGER NOT NULL DEFAULT 0,
    elite_ofex INTEGER NOT NULL DEFAULT 0,
    elite_apoio INTEGER NOT NULL DEFAULT 0,
    elite_soria INTEGER NOT NULL DEFAULT 0,
    elite_cadastro INTEGER NOT NULL DEFAULT 0,
    alcateia_ofex INTEGER NOT NULL DEFAULT 0,
    alcateia_apoio INTEGER NOT NULL DEFAULT 0,
    alcateia_soria INTEGER NOT NULL DEFAULT 0,
    alcateia_cadastro INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security but allow public read/write for this shared leaderboard
ALTER TABLE public.gincana_daily_data ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the data (public leaderboard)
CREATE POLICY "Anyone can view gincana data" 
ON public.gincana_daily_data 
FOR SELECT 
USING (true);

-- Allow anyone to insert data (public input)
CREATE POLICY "Anyone can insert gincana data" 
ON public.gincana_daily_data 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update data (public editing)
CREATE POLICY "Anyone can update gincana data" 
ON public.gincana_daily_data 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gincana_daily_data_updated_at
BEFORE UPDATE ON public.gincana_daily_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.gincana_daily_data;