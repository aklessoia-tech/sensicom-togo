-- Les actes à coupon illisible ou perdu n'apparaissaient nulle part dans le
-- tableau de bord : ils ne sont rattachés à aucune personne sensibilisée, donc
-- absents de v_personnes_demographie. L'activité réelle de l'infirmerie était
-- sous-évaluée, alors que la saisie de la zone approximative vise précisément
-- à préserver ces statistiques.
create or replace view v_actes_non_rattaches
with (security_invoker = on) as
select
  a.id,
  a.type_acte,
  a.date_acte,
  a.zone_id,
  a.zone_approximative,
  a.coupon_illisible,
  a.en_attente_rapprochement,
  z.universite_id
from actes_medicaux a
left join zones z on z.id = a.zone_id
where a.coupon_id is null;
