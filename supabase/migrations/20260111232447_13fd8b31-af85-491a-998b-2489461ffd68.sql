-- Create suggestions table
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Users can create their own suggestions
CREATE POLICY "Users can create suggestions"
  ON public.suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own suggestions
CREATE POLICY "Users can view own suggestions"
  ON public.suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Leaders, admins, and root can view all suggestions
CREATE POLICY "Leaders can view all suggestions"
  ON public.suggestions
  FOR SELECT
  USING (has_role(auth.uid(), 'lider'::app_role));

-- Leaders, admins, and root can update suggestions (respond)
CREATE POLICY "Leaders can update suggestions"
  ON public.suggestions
  FOR UPDATE
  USING (has_role(auth.uid(), 'lider'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for suggestions
ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;