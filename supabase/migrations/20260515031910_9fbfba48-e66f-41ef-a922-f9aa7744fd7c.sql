CREATE TABLE public.character_notes (
  character_id uuid PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.character_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.character_notes FOR ALL USING (true) WITH CHECK (true);