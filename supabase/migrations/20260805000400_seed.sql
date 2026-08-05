-- Jeu de données de référence minimal.

insert into universites (nom, region, code) values
  ('Université de Lomé', 'Maritime', 'UL'),
  ('Université de Kara', 'Kara', 'UK')
on conflict (code) do nothing;

insert into zones (universite_id, campus, secteur, code)
select u.id, 'Campus Nord', 'Cité universitaire', 'UL-N-CITE' from universites u where u.code = 'UL'
union all
select u.id, 'Campus Nord', 'Amphithéâtres', 'UL-N-AMPHI' from universites u where u.code = 'UL'
union all
select u.id, 'Campus Sud', 'Facultés', 'UL-S-FAC' from universites u where u.code = 'UL'
union all
select u.id, 'Campus principal', 'Cité universitaire', 'UK-P-CITE' from universites u where u.code = 'UK'
on conflict (code) do nothing;

insert into thematiques (libelle, code) values
  ('VIH', 'VIH'),
  ('IST', 'IST'),
  ('MST', 'MST'),
  ('Santé sexuelle et reproductive', 'SSR')
on conflict (code) do nothing;
