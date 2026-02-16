
-- Fix: Board owner should also be able to view their boards (the trigger adds membership after insert)
DROP POLICY "Members can view boards" ON public.boards;
CREATE POLICY "Members can view boards" ON public.boards FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_board_member(auth.uid(), id));
