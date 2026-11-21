-- The individual brief: one row per member per round.
--
-- Run this once in the Supabase SQL editor of the project the site points to.
-- Nothing in the browser reaches this table directly: `/api/brief` writes with
-- the service-role key, which bypasses row level security and never leaves the
-- server. The key is the only way in, so no policy is declared on purpose.

create table if not exists public.brief_responses (
  id uuid primary key default gen_random_uuid(),
  -- A second edition of the brief must land in a new round, or the synthesis
  -- mixes two generations of the collective.
  round text not null default 'fundamentos',
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  fecha date not null,
  -- One answer per question. Empty is valid: the brief allows saying that
  -- something is still open.
  q1 text not null default '',
  q2 text not null default '',
  q3 text not null default '',
  q4 text not null default '',
  q5 text not null default '',
  q6 text not null default '',
  q7 text not null default '',
  q8 text not null default '',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Mirrors MAX_ANSWER in src/brief/questions.ts, one character of slack for the
  -- trailing newline a textarea can leave.
  constraint brief_answers_fit check (
    char_length(q1) <= 5001 and char_length(q2) <= 5001 and char_length(q3) <= 5001 and
    char_length(q4) <= 5001 and char_length(q5) <= 5001 and char_length(q6) <= 5001 and
    char_length(q7) <= 5001 and char_length(q8) <= 5001
  )
);

comment on table public.brief_responses is
  'Respuestas del brief individual del colectivo MIDI. Escritura solo por /api/brief con la service-role key.';

create index if not exists brief_responses_round_idx
  on public.brief_responses (round, fecha desc, nombre);

alter table public.brief_responses enable row level security;

-- No policies: anon and authenticated get nothing, by design.
revoke all on table public.brief_responses from anon, authenticated;

create or replace function public.brief_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brief_responses_touch on public.brief_responses;
create trigger brief_responses_touch
  before update on public.brief_responses
  for each row execute function public.brief_touch_updated_at();

-- The synthesis query, one round at a time:
--   select nombre, fecha, q1, q2, q3, q4, q5, q6, q7, q8
--     from public.brief_responses
--    where round = 'fundamentos'
--    order by nombre;
