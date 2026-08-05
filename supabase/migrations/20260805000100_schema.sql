-- SensiCom Togo — schéma initial
-- Principe cardinal : aucune donnée d'identité civile n'est stockée.
-- Le téléphone n'existe qu'en empreinte (hash) + 4 derniers chiffres pour l'anti-doublon.

create extension if not exists pgcrypto;

create type role_utilisateur as enum ('agent', 'infirmier', 'admin');
create type genre_personne as enum ('F', 'M', 'autre');
create type tranche_age as enum ('10-14', '15-19', '20-24', '25-29', '30-39', '40-49', '50+');
create type type_acte as enum ('depistage', 'consultation', 'soin', 'orientation');
create type statut_coupon as enum ('emis', 'utilise', 'expire');

create table universites (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  region text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table zones (
  id uuid primary key default gen_random_uuid(),
  universite_id uuid not null references universites(id) on delete cascade,
  campus text not null,
  secteur text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table thematiques (
  id uuid primary key default gen_random_uuid(),
  libelle text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_utilisateur not null,
  nom_affichage text not null,
  zone_id uuid references zones(id) on delete set null,
  universite_id uuid references universites(id) on delete set null,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key,
  agent_id uuid not null references profiles(id) on delete restrict,
  universite_id uuid not null references universites(id) on delete restrict,
  zone_id uuid not null references zones(id) on delete restrict,
  thematique_id uuid not null references thematiques(id) on delete restrict,
  date_session date not null,
  nombre_presents integer check (nombre_presents is null or nombre_presents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table personnes_sensibilisees (
  id uuid primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  genre genre_personne not null,
  tranche_age tranche_age not null,
  telephone_hash text not null,
  telephone_suffixe text not null check (char_length(telephone_suffixe) <= 4),
  created_at timestamptz not null default now()
);

create table coupons (
  id uuid primary key,
  numero text not null unique,
  session_id uuid not null references sessions(id) on delete cascade,
  personne_id uuid references personnes_sensibilisees(id) on delete set null,
  zone_id uuid not null references zones(id) on delete restrict,
  thematique_id uuid not null references thematiques(id) on delete restrict,
  date_emission date not null,
  statut statut_coupon not null default 'emis',
  genere_secours boolean not null default false,
  created_at timestamptz not null default now()
);

create table actes_medicaux (
  id uuid primary key,
  infirmier_id uuid not null references profiles(id) on delete restrict,
  coupon_id uuid references coupons(id) on delete set null,
  numero_coupon_saisi text,
  zone_id uuid not null references zones(id) on delete restrict,
  type_acte type_acte not null,
  date_acte date not null,
  coupon_illisible boolean not null default false,
  zone_approximative text,
  en_attente_rapprochement boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table parametres (
  cle text primary key,
  valeur jsonb not null,
  updated_at timestamptz not null default now()
);

insert into parametres (cle, valeur) values
  ('seuil_fraude_coupons_jour', '30'::jsonb),
  ('seuil_fraude_ecart_type', '2.5'::jsonb)
on conflict (cle) do nothing;

create index idx_sessions_zone on sessions(zone_id, date_session);
create index idx_sessions_agent on sessions(agent_id, date_session);
create index idx_personnes_session on personnes_sensibilisees(session_id);
create index idx_personnes_hash on personnes_sensibilisees(telephone_hash);
create index idx_coupons_zone on coupons(zone_id, date_emission);
create index idx_coupons_numero on coupons(numero);
create index idx_actes_zone on actes_medicaux(zone_id, date_acte);
create index idx_actes_attente on actes_medicaux(en_attente_rapprochement) where en_attente_rapprochement;

-- Rapprochement automatique : un acte enregistré hors ligne sur un numéro de coupon
-- pas encore synchronisé se rattache dès que la session correspondante arrive.
create or replace function rapprocher_actes_en_attente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update actes_medicaux a
  set coupon_id = new.id,
      en_attente_rapprochement = false
  where a.coupon_id is null
    and a.en_attente_rapprochement
    and a.numero_coupon_saisi = new.numero;

  update coupons set statut = 'utilise'
  where id = new.id
    and exists (select 1 from actes_medicaux where coupon_id = new.id);

  return new;
end;
$$;

create trigger trg_rapprocher_actes
after insert on coupons
for each row execute function rapprocher_actes_en_attente();

create or replace function marquer_coupon_utilise()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coupon_id is not null then
    update coupons set statut = 'utilise' where id = new.coupon_id;
  end if;
  return new;
end;
$$;

create trigger trg_marquer_coupon
after insert on actes_medicaux
for each row execute function marquer_coupon_utilise();
