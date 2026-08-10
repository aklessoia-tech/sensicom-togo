import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  creerCompte,
  enregistrerReferentiel,
  listerReferentiel,
  supprimerReferentiel,
} from '../../lib/data/admin'
import { reinitialiserMotDePasse, supprimerCompte } from '../../lib/data/comptes'
import { prochainCodeAgent } from '../../lib/domain/codeAgent'
import { useAuth } from '../../context/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import type { Profile, Role, Thematique, Universite, Zone } from '../../lib/domain/types'
import { Liste, Saisie, SaisieMotDePasse } from '../../components/ui/Champ'
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
  const { profile } = useAuth()
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

  const enAttente = profiles.filter((p) => !p.actif)
  const [occupe, setOccupe] = useState<string | null>(null)
  const profilCourant = profile?.id

  async function reinitialiser(p: Profile) {
    const nouveau = window.prompt(
      `Nouveau mot de passe pour ${p.nom_affichage} (8 caractères minimum).\nIl faudra le lui communiquer.`,
    )
    if (nouveau === null) return

    setMessage(null)
    setOccupe(p.id)
    try {
      await reinitialiserMotDePasse(p.id, nouveau)
      setMessage({ ton: 'succes', texte: `Mot de passe redéfini pour ${p.nom_affichage}.` })
    } catch (err) {
      setMessage({ ton: 'erreur', texte: err instanceof Error ? err.message : 'Échec' })
    } finally {
      setOccupe(null)
    }
  }

  async function supprimerLeCompte(p: Profile) {
    // Suppression définitive du compte d'authentification : une confirmation
    // s'impose, il n'y a pas de corbeille.
    if (!window.confirm(`Supprimer définitivement le compte de ${p.nom_affichage} ?`)) return

    setMessage(null)
    setOccupe(p.id)
    try {
      await supprimerCompte(p.id)
      setMessage({ ton: 'succes', texte: `Compte de ${p.nom_affichage} supprimé.` })
      await recharger()
    } catch (err) {
      setMessage({ ton: 'erreur', texte: err instanceof Error ? err.message : 'Échec' })
    } finally {
      setOccupe(null)
    }
  }

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
      // Vidé avant le rechargement : celui-ci proposera le code suivant.
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

    // Le code est proposé d'après ceux déjà attribués, sans écraser une saisie
    // en cours : l'administrateur reste libre de le remplacer.
    const suggestion = prochainCodeAgent(p.map((x) => x.code_agent))
    setCompte((c) => (c.code_agent ? c : { ...c, code_agent: suggestion }))
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

  // L'université découle de la zone : la laisser incohérente fausserait les
  // agrégats du tableau de bord, qui filtrent par université.
  function zonePatch(zoneId: string): Partial<Profile> {
    const zone = zones.find((z) => z.id === zoneId)
    return { zone_id: zoneId || null, universite_id: zone?.universite_id ?? null }
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

      {/* Les demandes remontent en tête : sans cela, un compte en attente se
          perd au milieu de la liste et l'agent reste bloqué sans savoir pourquoi. */}
      {onglet === 'profiles' && enAttente.length > 0 && (
        <section className="card border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40">
          <div className="mb-3 flex items-center gap-2.5">
            <h2 className="text-sm font-semibold">
              {enAttente.length > 1 ? 'Demandes de compte' : 'Demande de compte'}
            </h2>
            <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[11px] font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-200">
              {enAttente.length}
            </span>
          </div>

          <ul className="space-y-2">
            {enAttente.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-[11px] bg-white p-3 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold">{p.nom_affichage}</p>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {p.role === 'agent' ? 'Agent de terrain' : p.role === 'infirmier' ? 'Infirmerie' : 'Administration'}
                    {' · '}
                    {p.zone_id
                      ? (zones.find((z) => z.id === p.zone_id)?.campus ?? 'zone inconnue')
                      : 'aucune zone attribuée'}
                  </p>
                </div>

                <select
                  aria-label={`Zone de ${p.nom_affichage}`}
                  className="input !w-auto !py-2 !text-[12.5px]"
                  value={p.zone_id ?? ''}
                  onChange={(e) => void majProfil(p, zonePatch(e.target.value))}
                >
                  <option value="">Zone à attribuer…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.campus} — {z.secteur}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void majProfil(p, { actif: true })}
                  disabled={!isSupabaseConfigured || !p.zone_id}
                  title={p.zone_id ? undefined : 'Attribuez d’abord une zone'}
                  className="btn-primary !min-h-[38px] !py-2 text-xs"
                >
                  Activer
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11.5px] leading-snug text-slate-600 dark:text-slate-400">
            Tant qu’un compte n’est pas activé, il ne peut ni consulter ni enregistrer quoi que ce
            soit. Attribuez la zone avant d’activer : c’est elle qui détermine ce que la personne
            verra.
          </p>
        </section>
      )}

      {onglet === 'profiles' && (
        // Un couple e-mail + mot de passe ressemble à une connexion : sans ces
        // attributs, le navigateur y injecte les identifiants enregistrés de
        // l'administrateur, qui croit voir son propre compte se recréer.
        <form onSubmit={ajouterCompte} className="card space-y-3" autoComplete="off">
          <h2 className="text-sm font-semibold">Créer un compte</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Saisie
              label="Nom affiché"
              obligatoire
              required
              autoComplete="off"
              value={compte.nom_affichage}
              onChange={(e) => setCompte((c) => ({ ...c, nom_affichage: e.target.value }))}
              placeholder="Kossi A."
            />
            <Saisie
              label="Adresse e-mail"
              type="email"
              obligatoire
              required
              name="compte-nouvel-email"
              autoComplete="off"
              value={compte.email}
              onChange={(e) => setCompte((c) => ({ ...c, email: e.target.value }))}
              placeholder="agent04@sensicom.tg"
            />
            <SaisieMotDePasse
              label="Mot de passe provisoire"
              obligatoire
              required
              minLength={8}
              name="compte-nouveau-mot-de-passe"
              autoComplete="new-password"
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
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 text-right">Actions</th>
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
                    <td className="py-2 pr-3">
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
                    <td className="whitespace-nowrap py-2 text-right">
                      <button
                        onClick={() => void reinitialiser(p)}
                        disabled={!isSupabaseConfigured || occupe === p.id}
                        className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-40 dark:text-brand-300"
                      >
                        Mot de passe
                      </button>
                      <span className="px-2 text-slate-300 dark:text-slate-700">·</span>
                      <button
                        onClick={() => void supprimerLeCompte(p)}
                        disabled={!isSupabaseConfigured || occupe === p.id || p.id === profilCourant}
                        title={p.id === profilCourant ? 'Vous ne pouvez pas supprimer votre propre compte' : undefined}
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
