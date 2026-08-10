import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  creerCompte,
  enregistrerReferentiel,
  listerReferentiel,
  supprimerReferentiel,
} from '../../lib/data/admin'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import type { Profile, Role, Thematique, Universite, Zone } from '../../lib/domain/types'
import { Liste, Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

type Onglet = 'universites' | 'zones' | 'thematiques' | 'profiles'

const ONGLETS: { cle: Onglet; label: string }[] = [
  { cle: 'universites', label: 'Universités' },
  { cle: 'zones', label: 'Campus & zones' },
  { cle: 'thematiques', label: 'Thématiques' },
  { cle: 'profiles', label: 'Comptes' },
]

const ROLES: { value: Role; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'infirmier', label: 'Infirmier' },
  { value: 'admin', label: 'Administrateur' },
]

export function PageReferentiels() {
  const [onglet, setOnglet] = useState<Onglet>('universites')
  const [universites, setUniversites] = useState<Universite[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [thematiques, setThematiques] = useState<Thematique[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [brouillon, setBrouillon] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ ton: 'succes' | 'erreur'; texte: string } | null>(null)
  const [compte, setCompte] = useState({
    nom_affichage: '',
    email: '',
    mot_de_passe: '',
    role: 'agent' as Role,
    zone_id: '',
    code_agent: '',
  })
  const [creation, setCreation] = useState(false)

  async function ajouterCompte(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    setCreation(true)
    try {
      // L'université est déduite de la zone : la saisir deux fois inviterait à
      // rattacher un compte à une zone d'une autre université.
      const zone = zones.find((z) => z.id === compte.zone_id)
      await creerCompte({
        email: compte.email,
        mot_de_passe: compte.mot_de_passe,
        nom_affichage: compte.nom_affichage,
        role: compte.role,
        zone_id: compte.zone_id || null,
        universite_id: zone?.universite_id ?? null,
        code_agent: compte.code_agent || null,
      })
      setMessage({ ton: 'succes', texte: `Compte créé pour ${compte.email}.` })
      setCompte({ nom_affichage: '', email: '', mot_de_passe: '', role: 'agent', zone_id: '', code_agent: '' })
      await recharger()
    } catch (err) {
      setMessage({ ton: 'erreur', texte: err instanceof Error ? err.message : 'Création impossible' })
    } finally {
      setCreation(false)
    }
  }

  async function recharger() {
    const [u, z, t, p] = await Promise.all([
      listerReferentiel<Universite>('universites'),
      listerReferentiel<Zone>('zones'),
      listerReferentiel<Thematique>('thematiques'),
      listerReferentiel<Profile>('profiles'),
    ])
    setUniversites(u)
    setZones(z)
    setThematiques(t)
    setProfiles(p)
  }

  useEffect(() => {
    void recharger()
  }, [])

  useEffect(() => {
    setBrouillon({})
    setMessage(null)
  }, [onglet])

  const champs = useMemo(() => {
    if (onglet === 'universites') {
      return [
        { cle: 'nom', label: 'Nom' },
        { cle: 'region', label: 'Région' },
        { cle: 'code', label: 'Code' },
      ]
    }
    if (onglet === 'zones') {
      return [
        { cle: 'campus', label: 'Campus' },
        { cle: 'secteur', label: 'Secteur' },
        { cle: 'code', label: 'Code' },
      ]
    }
    if (onglet === 'thematiques') {
      return [
        { cle: 'libelle', label: 'Libellé' },
        { cle: 'code', label: 'Code' },
      ]
    }
    return [{ cle: 'nom_affichage', label: 'Nom affiché' }]
  }, [onglet])

  async function ajouter(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    try {
      const valeur: Record<string, unknown> = { ...brouillon }
      if (onglet === 'zones' && !valeur.universite_id) throw new Error('Sélectionnez une université')
      if (onglet === 'profiles') {
        throw new Error(
          'Les comptes se créent depuis Supabase Auth, puis leur rôle et leur zone se règlent ici.',
        )
      }
      await enregistrerReferentiel(onglet, valeur)
      await recharger()
      setBrouillon({})
      setMessage({ ton: 'succes', texte: 'Enregistré.' })
    } catch (err) {
      setMessage({ ton: 'erreur', texte: err instanceof Error ? err.message : 'Échec' })
    }
  }

  async function supprimer(id: string) {
    setMessage(null)
    try {
      await supprimerReferentiel(onglet, id)
      await recharger()
    } catch (err) {
      setMessage({ ton: 'erreur', texte: err instanceof Error ? err.message : 'Échec' })
    }
  }

  async function majProfil(profil: Profile, patch: Partial<Profile>) {
    setMessage(null)
    try {
      await enregistrerReferentiel('profiles', { ...profil, ...patch })
      await recharger()
    } catch (err) {
      setMessage({ ton: 'erreur', texte: err instanceof Error ? err.message : 'Échec' })
    }
  }

  const lignes: { id: string; cellules: string[] }[] =
    onglet === 'universites'
      ? universites.map((u) => ({ id: u.id, cellules: [u.nom, u.region, u.code] }))
      : onglet === 'zones'
        ? zones.map((z) => ({
            id: z.id,
            cellules: [
              z.campus,
              z.secteur,
              z.code,
              universites.find((u) => u.id === z.universite_id)?.nom ?? '—',
            ],
          }))
        : onglet === 'thematiques'
          ? thematiques.map((t) => ({ id: t.id, cellules: [t.libelle, t.code, t.active ? 'Active' : 'Inactive'] }))
          : []

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Référentiels et comptes</h1>

      <div className="flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            onClick={() => setOnglet(o.cle)}
            className={
              onglet === o.cle
                ? 'rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white'
                : 'rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }
          >
            {o.label}
          </button>
        ))}
      </div>

      {!isSupabaseConfigured && (
        <Alerte ton="avertissement">
          Lecture seule : la gestion des référentiels nécessite une connexion Supabase.
        </Alerte>
      )}

      {message && <Alerte ton={message.ton}>{message.texte}</Alerte>}

      {onglet !== 'profiles' && (
        <form onSubmit={ajouter} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {onglet === 'zones' && (
            <Liste
              label="Université"
              obligatoire
              value={brouillon.universite_id ?? ''}
              onChange={(e) => setBrouillon((b) => ({ ...b, universite_id: e.target.value }))}
              options={universites.map((u) => ({ value: u.id, label: u.nom }))}
            />
          )}
          {champs.map((c) => (
            <Saisie
              key={c.cle}
              label={c.label}
              obligatoire
              required
              value={brouillon[c.cle] ?? ''}
              onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))}
            />
          ))}
          <div className="flex items-end">
            <button type="submit" disabled={!isSupabaseConfigured} className="btn-primary w-full">
              Ajouter
            </button>
          </div>
        </form>
      )}

      {onglet === 'profiles' && (
        <form onSubmit={ajouterCompte} className="card space-y-3">
          <h2 className="text-sm font-semibold">Créer un compte</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Saisie
              label="Nom affiché"
              obligatoire
              required
              value={compte.nom_affichage}
              onChange={(e) => setCompte((c) => ({ ...c, nom_affichage: e.target.value }))}
              placeholder="Kossi A."
            />
            <Saisie
              label="Adresse e-mail"
              type="email"
              obligatoire
              required
              value={compte.email}
              onChange={(e) => setCompte((c) => ({ ...c, email: e.target.value }))}
              placeholder="agent04@sensicom.tg"
            />
            <Saisie
              label="Mot de passe provisoire"
              type="text"
              obligatoire
              required
              minLength={8}
              value={compte.mot_de_passe}
              onChange={(e) => setCompte((c) => ({ ...c, mot_de_passe: e.target.value }))}
              aide="8 caractères minimum, à communiquer à la personne."
            />
            <Liste
              label="Rôle"
              value={compte.role}
              onChange={(e) => setCompte((c) => ({ ...c, role: e.target.value as Role }))}
              options={ROLES}
            />
            <Liste
              label="Zone"
              placeholder="Aucune"
              value={compte.zone_id}
              onChange={(e) => setCompte((c) => ({ ...c, zone_id: e.target.value }))}
              options={zones.map((z) => ({ value: z.id, label: `${z.campus} — ${z.secteur}` }))}
            />
            <Saisie
              label="Code agent"
              facultatif
              value={compte.code_agent}
              onChange={(e) => setCompte((c) => ({ ...c, code_agent: e.target.value.toUpperCase() }))}
              maxLength={4}
              placeholder="A04"
              className="font-mono uppercase"
              aide="Entre dans le numéro de coupon ; laisser vide expose aux doublons."
            />
          </div>
          <button type="submit" disabled={!isSupabaseConfigured || creation} className="btn-primary">
            {creation ? 'Création…' : 'Créer le compte'}
          </button>
        </form>
      )}

      {onglet === 'profiles' ? (
        <div className="card overflow-x-auto">
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucun compte à afficher.</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Rôle</th>
                  <th className="py-2 pr-3">Zone</th>
                  <th className="py-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {profiles.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 font-medium">{p.nom_affichage}</td>
                    <td className="py-2 pr-3">
                      {/* Le code entre dans le numéro de coupon : le laisser vide
                          expose l'agent aux collisions avec ses collègues. */}
                      <input
                        className="input !w-20 !py-1.5 !text-sm font-mono uppercase"
                        defaultValue={p.code_agent ?? ''}
                        maxLength={4}
                        placeholder="A01"
                        aria-label={`Code de ${p.nom_affichage}`}
                        onBlur={(e) => {
                          const code = e.target.value.trim().toUpperCase() || null
                          if (code !== (p.code_agent ?? null)) void majProfil(p, { code_agent: code })
                        }}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        className="input !py-1.5 !text-sm"
                        value={p.role}
                        onChange={(e) => void majProfil(p, { role: e.target.value as Role })}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        className="input !py-1.5 !text-sm"
                        value={p.zone_id ?? ''}
                        onChange={(e) => void majProfil(p, { zone_id: e.target.value || null })}
                      >
                        <option value="">Aucune</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.campus} — {z.secteur}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => void majProfil(p, { actif: !p.actif })}
                        className={
                          p.actif
                            ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }
                      >
                        {p.actif ? 'Actif' : 'Désactivé'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          {lignes.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucune entrée.</p>
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {lignes.map((l) => (
                  <tr key={l.id}>
                    {l.cellules.map((c, i) => (
                      <td key={i} className={i === 0 ? 'py-2 pr-3 font-medium' : 'py-2 pr-3'}>
                        {c}
                      </td>
                    ))}
                    <td className="py-2 text-right">
                      <button
                        onClick={() => void supprimer(l.id)}
                        disabled={!isSupabaseConfigured}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
