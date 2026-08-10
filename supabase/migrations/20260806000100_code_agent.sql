-- Le numéro de coupon était « RÉGION-CAMPUS-ZONE-DATE-NNN », le compteur étant
-- calculé sur l'appareil pour rester utilisable hors ligne. Deux agents de la
-- même zone, le même jour, sans réseau, produisaient donc tous deux le 001 :
-- à la synchronisation, le second était rejeté et la personne repartait avec un
-- coupon que l'infirmerie ne retrouvait jamais.
--
-- Le code d'agent, attribué par l'administration, rend le numéro unique dès sa
-- génération — sans consulter le serveur, ce que le terrain ne permet pas.
alter table profiles
  add column if not exists code_agent text;

-- Deux agents ne peuvent pas porter le même code, sinon la collision revient.
create unique index if not exists profiles_code_agent_unique
  on profiles (code_agent)
  where code_agent is not null;

-- Codes provisoires pour les comptes déjà créés : A01, A02… par ordre de création.
with numerotes as (
  select id, 'A' || lpad(row_number() over (order by created_at)::text, 2, '0') as code
  from profiles
  where code_agent is null and role in ('agent', 'infirmier')
)
update profiles p
   set code_agent = n.code
  from numerotes n
 where p.id = n.id;
