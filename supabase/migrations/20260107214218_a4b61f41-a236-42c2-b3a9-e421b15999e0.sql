
-- Drop the permissive insert policy
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;

-- Create a more restrictive insert policy (only the user themselves via trigger, or admin)
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
