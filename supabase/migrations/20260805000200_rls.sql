-- Sécurité au niveau ligne : cloisonnement par rôle et par zone.
-- Un agent ne voit que ses propres saisies ; un infirmier ne voit que sa zone ;
-- l'admin voit tout. Les helpers sont SECURITY DEFINER pour éviter la récursion
-- des politiques lorsqu'elles interrogent profiles.

create or replace function auth_role()
returns role_utilisateur
language sql
stable
security definer
set search_path = public
as $$ select role from profiles where id = auth.uid() $$;

create or replace function auth_zone()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select zone_id from profiles where id = auth.uid() $$;

create or replace function est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select role = 'admin' from profiles where id = auth.uid()), false) $$;

alter table universites enable row level security;
alter table zones enable row level security;
alter table thematiques enable row level security;
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table personnes_sensibilisees enable row level security;
alter table coupons enable row level security;
alter table actes_medicaux enable row level security;
alter table parametres enable row level security;

-- Référentiels : lecture pour tout compte authentifié, écriture réservée à l'admin.
create policy ref_lecture on universites for select to authenticated using (true);
create policy ref_ecriture on universites for all to authenticated using (est_admin()) with check (est_admin());

create policy ref_lecture on zones for select to authenticated using (true);
create policy ref_ecriture on zones for all to authenticated using (est_admin()) with check (est_admin());

create policy ref_lecture on thematiques for select to authenticated using (true);
create policy ref_ecriture on thematiques for all to authenticated using (est_admin()) with check (est_admin());

-- Profils : chacun lit le sien, l'admin gère tout.
create policy profil_propre on profiles for select to authenticated using (id = auth.uid() or est_admin());
create policy profil_admin on profiles for all to authenticated using (est_admin()) with check (est_admin());

-- Sessions : l'agent gère les siennes, l'infirmier lit celles de sa zone.
create policy sessions_agent on sessions for all to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid() and auth_role() = 'agent');

create policy sessions_infirmier on sessions for select to authenticated
  using (auth_role() = 'infirmier' and zone_id = auth_zone());

create policy sessions_admin on sessions for all to authenticated
  using (est_admin()) with check (est_admin());

-- Personnes sensibilisées : accessibles via la session parente uniquement.
create policy personnes_agent on personnes_sensibilisees for all to authenticated
  using (exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid()));

create policy personnes_admin on personnes_sensibilisees for select to authenticated
  using (est_admin());

-- Coupons : l'agent crée pour ses sessions, l'infirmier lit ceux de sa zone.
create policy coupons_agent on coupons for all to authenticated
  using (exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid()))
  with check (exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid()));

create policy coupons_infirmier on coupons for select to authenticated
  using (auth_role() = 'infirmier' and zone_id = auth_zone());

create policy coupons_infirmier_maj on coupons for update to authenticated
  using (auth_role() = 'infirmier' and zone_id = auth_zone())
  with check (auth_role() = 'infirmier' and zone_id = auth_zone());

create policy coupons_admin on coupons for all to authenticated
  using (est_admin()) with check (est_admin());

-- Actes : l'infirmier gère les siens dans sa zone.
create policy actes_infirmier on actes_medicaux for all to authenticated
  using (infirmier_id = auth.uid())
  with check (infirmier_id = auth.uid() and auth_role() = 'infirmier' and zone_id = auth_zone());

create policy actes_admin on actes_medicaux for all to authenticated
  using (est_admin()) with check (est_admin());

-- Paramètres : lecture pour tous, écriture admin.
create policy parametres_lecture on parametres for select to authenticated using (true);
create policy parametres_ecriture on parametres for all to authenticated
  using (est_admin()) with check (est_admin());
