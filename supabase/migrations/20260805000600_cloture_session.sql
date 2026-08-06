-- L'agent clôt sa séance quand il quitte le terrain. Sans cet horodatage,
-- impossible de distinguer la « session en cours » des séances passées :
-- l'accueil agent doit ouvrir directement sur la séance active.
alter table sessions
  add column if not exists cloturee_at timestamptz;

-- Une seule séance ouverte à la fois par agent. Un index unique paraîtrait plus
-- direct, mais il rejetterait la synchronisation d'une séance créée hors ligne
-- alors qu'une autre est restée ouverte sur un second appareil — situation que le
-- client ne peut pas détecter sans réseau, et qui bloquerait l'agent sur le
-- terrain. Le déclencheur clôt les précédentes au lieu de refuser la nouvelle.
create or replace function clore_sessions_precedentes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update sessions
     set cloturee_at = now()
   where agent_id = new.agent_id
     and id <> new.id
     and cloturee_at is null;
  return new;
end;
$$;

drop trigger if exists trg_clore_sessions_precedentes on sessions;

create trigger trg_clore_sessions_precedentes
  after insert or update of cloturee_at on sessions
  for each row
  when (new.cloturee_at is null)
  execute function clore_sessions_precedentes();
