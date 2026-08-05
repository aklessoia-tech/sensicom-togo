-- Vues d'analyse pour le tableau de bord administrateur.
-- security_invoker : les RLS de l'appelant s'appliquent, donc seul l'admin voit l'ensemble.

create or replace view v_sessions_enrichies
with (security_invoker = on) as
select
  s.id,
  s.date_session,
  s.nombre_presents,
  s.agent_id,
  p.nom_affichage as agent_nom,
  u.id as universite_id,
  u.nom as universite_nom,
  u.region,
  z.id as zone_id,
  z.campus,
  z.secteur,
  t.id as thematique_id,
  t.libelle as thematique,
  (select count(*) from personnes_sensibilisees ps where ps.session_id = s.id) as nb_sensibilises,
  (select count(*) from coupons c where c.session_id = s.id) as nb_coupons,
  (select count(*) from coupons c join actes_medicaux a on a.coupon_id = c.id where c.session_id = s.id) as nb_actes
from sessions s
join profiles p on p.id = s.agent_id
join universites u on u.id = s.universite_id
join zones z on z.id = s.zone_id
join thematiques t on t.id = s.thematique_id;

create or replace view v_personnes_demographie
with (security_invoker = on) as
select
  ps.id,
  ps.genre,
  ps.tranche_age,
  ps.created_at,
  s.date_session,
  s.universite_id,
  s.zone_id,
  s.thematique_id,
  exists (
    select 1 from coupons c
    join actes_medicaux a on a.coupon_id = c.id
    where c.personne_id = ps.id
  ) as a_ete_pris_en_charge
from personnes_sensibilisees ps
join sessions s on s.id = ps.session_id;

-- Volume quotidien de coupons par agent, avec écart à sa propre moyenne.
-- Sert de base à la détection de pics anormaux.
create or replace view v_volume_coupons_agent
with (security_invoker = on) as
with quotidien as (
  select
    s.agent_id,
    c.date_emission,
    count(*)::numeric as nb_coupons
  from coupons c
  join sessions s on s.id = c.session_id
  group by s.agent_id, c.date_emission
),
stats as (
  select
    agent_id,
    avg(nb_coupons) as moyenne,
    coalesce(stddev_samp(nb_coupons), 0) as ecart_type
  from quotidien
  group by agent_id
)
select
  q.agent_id,
  p.nom_affichage as agent_nom,
  q.date_emission,
  q.nb_coupons,
  round(st.moyenne, 2) as moyenne_agent,
  round(st.ecart_type, 2) as ecart_type_agent,
  case
    when st.ecart_type = 0 then 0
    else round((q.nb_coupons - st.moyenne) / st.ecart_type, 2)
  end as score_z
from quotidien q
join stats st on st.agent_id = q.agent_id
join profiles p on p.id = q.agent_id;

-- Alertes anti-fraude : seuils lus depuis la table parametres, donc ajustables par l'admin.
create or replace view v_alertes_fraude
with (security_invoker = on) as
select
  v.agent_id,
  v.agent_nom,
  v.date_emission,
  v.nb_coupons,
  v.moyenne_agent,
  v.score_z,
  case
    when v.nb_coupons >= (select (valeur)::text::numeric from parametres where cle = 'seuil_fraude_coupons_jour')
      then 'volume_absolu'
    else 'pic_statistique'
  end as motif
from v_volume_coupons_agent v
where v.nb_coupons >= (select (valeur)::text::numeric from parametres where cle = 'seuil_fraude_coupons_jour')
   or v.score_z >= (select (valeur)::text::numeric from parametres where cle = 'seuil_fraude_ecart_type');

-- Agrégat mensuel, base des exports (CSV, PDF, DHIS2).
create or replace view v_rapport_mensuel
with (security_invoker = on) as
select
  to_char(date_trunc('month', s.date_session), 'YYYY-MM') as periode,
  u.nom as universite,
  u.region,
  z.campus,
  z.secteur,
  t.libelle as thematique,
  count(distinct s.id) as nb_sessions,
  coalesce(sum(s.nombre_presents), 0) as total_presents,
  count(distinct ps.id) as nb_sensibilises,
  count(distinct c.id) as nb_coupons,
  count(distinct a.id) as nb_actes,
  count(distinct a.id) filter (where a.type_acte = 'depistage') as nb_depistages
from sessions s
join universites u on u.id = s.universite_id
join zones z on z.id = s.zone_id
join thematiques t on t.id = s.thematique_id
left join personnes_sensibilisees ps on ps.session_id = s.id
left join coupons c on c.session_id = s.id
left join actes_medicaux a on a.coupon_id = c.id
group by 1, 2, 3, 4, 5, 6;
