-- Add is_locked column to user_daily_data table
ALTER TABLE public.user_daily_data 
ADD COLUMN is_locked BOOLEAN DEFAULT false;

-- Create index for faster queries on locked status
CREATE INDEX idx_user_daily_data_is_locked ON public.user_daily_data(is_locked);

-- Comment explaining the column
COMMENT ON COLUMN public.user_daily_data.is_locked IS 'When true, the record cannot be edited. Automatically set to true when saving data for a past day.';