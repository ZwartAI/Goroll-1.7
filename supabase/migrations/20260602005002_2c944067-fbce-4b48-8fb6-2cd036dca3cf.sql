CREATE TABLE public.dice_rolls (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    dice_data JSONB NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Use GRANT to set permissions for different roles
GRANT SELECT, INSERT ON public.dice_rolls TO authenticated;
GRANT ALL ON public.dice_rolls TO service_role;

-- Enable RLS
ALTER TABLE public.dice_rolls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view dice rolls of their campaign" 
ON public.dice_rolls 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.characters
        WHERE characters.campaign_id = dice_rolls.campaign_id
        AND characters.id = (SELECT id FROM public.characters WHERE user_id = auth.uid() LIMIT 1)
    )
);

CREATE POLICY "Users can insert their own dice rolls" 
ON public.dice_rolls 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.characters
        WHERE characters.id = dice_rolls.character_id
        AND characters.user_id = auth.uid()
    )
);
