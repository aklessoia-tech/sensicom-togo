-- Un compte peut exister sans être validé : depuis l'ouverture des demandes de
-- compte, n'importe qui peut en créer un. Les politiques ne vérifiaient que
-- l'identité de l'auteur (« agent_id = auth.uid() »), jamais que son profil
-- était actif — un compte en attente pouvait donc écrire des sessions, des
-- personnes et des coupons en appelant l'API directement, sans passer par
-- l'application. Le refus de connexion côté client n'y changeait rien.
--
-- Toute écriture exige désormais un profil actif. La lecture reste inchangée :
-- elle est déjà vide pour un compte sans zone.

create or replace function est_actif()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select actif from profiles where id = auth.uid()), false) $$;

-- Sessions
drop policy if exists sessions_agent on sessions;
create policy sessions_agent on sessions for all to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid() and auth_role() = 'agent' and est_actif());

-- Personnes sensibilisées
drop policy if exists personnes_agent on personnes_sensibilisees;
create policy personnes_agent on personnes_sensibilisees for all to authenticated
  using (exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid()))
  with check (
    est_actif()
    and exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid())
  );

-- Coupons
drop policy if exists coupons_agent on coupons;
create policy coupons_agent on coupons for all to authenticated
  using (exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid()))
  with check (
    est_actif()
    and exists (select 1 from sessions s where s.id = session_id and s.agent_id = auth.uid())
  );

drop policy if exists coupons_infirmier_maj on coupons;
create policy coupons_infirmier_maj on coupons for update to authenticated
  using (auth_role() = 'infirmier' and zone_id = auth_zone())
  with check (auth_role() = 'infirmier' and zone_id = auth_zone() and est_actif());

-- Actes médicaux
drop policy if exists actes_infirmier on actes_medicaux;
create policy actes_infirmier on actes_medicaux for all to authenticated
  using (infirmier_id = auth.uid())
  with check (
    infirmier_id = auth.uid()
    and auth_role() = 'infirmier'
    and zone_id = auth_zone()
    and est_actif()
  );

-- Un administrateur désactivé ne doit pas conserver ses pouvoirs.
create or replace function est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select role = 'admin' and actif from profiles where id = auth.uid()), false) $$;
