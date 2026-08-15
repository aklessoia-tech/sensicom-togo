import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  calculerIndicateurs,
  chargerAlertesFraude,
  chargerPersonnes,
  chargerSessions,
  compterActesNonRattaches,
  compterDemandesEnAttente,
  repartitionDemographique,
  serieParUniversite,
  type AlerteFraude,
  type FiltresDashboard,
  type LignePersonne,
  type LigneSession,
} from '../../lib/data/admin'
import { exporterCsv, exporterDhis2, exporterPdf } from '../../lib/data/exports'
import { useReferentiels } from '../../hooks/useReferentiels'
import { Alerte } from '../../components/ui/Alerte'

// Sept tranches d'âge : dégradé du primaire foncé vers le bleu clair.
const COULEURS = ['#0b3c5d', '#10598a', '#1b7fbf', '#5cb3e4', '#8fcbee', '#b9e0f7', '#dcf0fc']

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function debutDuMois(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

/** « 05/08 » : jour puis mois, l'ordre lu au Togo. */
function jourMois(iso: string): string {
  const [, m, j] = iso.split('-')
  return `${j}/${m}`
}

function pluriel(n: number, singulier: string, pluriel_: string): string {
  return `${n} ${n > 1 ? pluriel_ : singulier}`
}

/** Séparateur décimal français, comme dans le reste des chiffres affichés. */
function nombreFr(n: number): string {
  return String(n).replace('.', ',')
}

/** « 1 – 5 août 2026 » : le mois n'est répété que s'il change. */
function periodeLisible(debut?: string, fin?: string): string {
  if (!debut || !fin) return 'toute la période'
  const [a1, m1, j1] = debut.split('-').map(Number)
  const [a2, m2, j2] = fin.split('-').map(Number)
  if (a1 === a2 && m1 === m2) return `${j1} – ${j2} ${MOIS[m1 - 1]} ${a1}`
  if (a1 === a2) return `${j1} ${MOIS[m1 - 1]} – ${j2} ${MOIS[m2 - 1]} ${a1}`
  return `${j1} ${MOIS[m1 - 1]} ${a1} – ${j2} ${MOIS[m2 - 1]} ${a2}`
}

function Indicateur({
  titre,
  valeur,
  suffixe,
  legende,
  primaire = false,
}: {
  titre: string
  valeur: number | string
  suffixe?: string
  legende?: string
  /** Le premier indicateur porte le bleu de marque : c'est celui qu'on lit d'abord. */
  primaire?: boolean
}) {
  return (
    <div className="card">
      <p className="surtitre !text-[10.5px] !tracking-[.08em]">{titre}</p>
      <p
        className={`chiffres mt-2 text-[32px] font-bold leading-none tracking-[-.02em] ${
          primaire ? 'text-brand-700 dark:text-brand-300' : ''
        }`}
      >
        {valeur}
        {suffixe && <span className="ml-0.5 text-[18px] font-semibold">{suffixe}</span>}
      </p>
      {legende && (
        <p className="mt-2 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">{legende}</p>
      )}
    </div>
  )
}

export function PageTableauBord() {
  const { referentiels } = useReferentiels()
  const [filtres, setFiltres] = useState<FiltresDashboard>({ debut: debutDuMois(), fin: aujourdhui() })
  const [sessions, setSessions] = useState<LigneSession[]>([])
  const [personnes, setPersonnes] = useState<LignePersonne[]>([])
  const [actesNonRattaches, setActesNonRattaches] = useState(0)
  const [alertes, setAlertes] = useState<AlerteFraude[]>([])
  const [nbDemandes, setNbDemandes] = useState(0)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true
    setChargement(true)
    void Promise.all([
      chargerSessions(filtres),
      chargerPersonnes(filtres),
      compterActesNonRattaches(filtres),
      chargerAlertesFraude(),
      compterDemandesEnAttente(),
    ]).then(([s, p, nr, al, dem]) => {
      if (!actif) return
      setSessions(s)
      setPersonnes(p)
      setActesNonRattaches(nr)
      setAlertes(al)
      setNbDemandes(dem)
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [filtres])

  const indicateurs = useMemo(
    () => calculerIndicateurs(sessions, personnes, actesNonRattaches),
    [sessions, personnes, actesNonRattaches],
  )
  const parUniversite = useMemo(() => serieParUniversite(sessions), [sessions])
  const demographie = useMemo(() => repartitionDemographique(personnes), [personnes])

  const periode = `${filtres.debut ?? ''}_${filtres.fin ?? ''}`
  const universiteChoisie = referentiels.universites.find((u) => u.id === filtres.universiteId)

  const sessionsTriees = useMemo(
    () => [...sessions].sort((a, b) => b.date_session.localeCompare(a.date_session)),
    [sessions],
  )
  const [toutesSessions, setToutesSessions] = useState(false)
  const sessionsAffichees = toutesSessions ? sessionsTriees : sessionsTriees.slice(0, 5)

  // Les actes sans coupon comptent comme un signalement au même titre qu'un pic.
  const nbAlertes = alertes.length + (indicateurs.actesNonRattaches > 0 ? 1 : 0)

  function majFiltre(patch: Partial<FiltresDashboard>) {
    setFiltres((f) => ({ ...f, ...patch }))
  }

  return (
    <div className="space-y-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[19px] font-bold tracking-tight">Tableau de bord</h1>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
            {periodeLisible(filtres.debut, filtres.fin)} ·{' '}
            {universiteChoisie ? universiteChoisie.nom : 'toutes universités'} · toutes thématiques
          </p>
        </div>

        {/* Sur téléphone les contrôles occupent toute la largeur plutôt que de
            se disloquer en fin de ligne ; ils ne se rangent côte à côte qu'au
            format bureau, où l'en-tête tient sur une seule ligne. */}
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
            <input
              type="date"
              aria-label="Début de période"
              value={filtres.debut ?? ''}
              onChange={(e) => majFiltre({ debut: e.target.value })}
              className="input !w-full !rounded-[9px] !py-2 !text-[12.5px] md:!w-[130px]"
            />
            <span className="shrink-0 text-slate-400">→</span>
            <input
              type="date"
              aria-label="Fin de période"
              value={filtres.fin ?? ''}
              onChange={(e) => majFiltre({ fin: e.target.value })}
              className="input !w-full !rounded-[9px] !py-2 !text-[12.5px] md:!w-[130px]"
            />
          </div>

          <select
            aria-label="Université"
            value={filtres.universiteId ?? ''}
            onChange={(e) => majFiltre({ universiteId: e.target.value || undefined })}
            className="input !w-full !rounded-[9px] !py-2 !text-[12.5px] md:!w-[170px]"
          >
            <option value="">Toutes universités</option>
            {referentiels.universites.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
          </select>

          {/* Boutons d'export soudés : trois formats d'un même geste, séparés
              par un simple filet plutôt que par des boutons distincts. */}
          <div className="flex w-full overflow-hidden rounded-[9px] border border-slate-300 dark:border-slate-700 md:w-auto">
            {(
              [
                ['CSV', () => exporterCsv(sessions, periode)],
                ['PDF', () => exporterPdf(sessions, indicateurs, periode)],
                ['DHIS2', () => exporterDhis2(sessions, periode)],
              ] as const
            ).map(([label, action], i) => (
              <button
                key={label}
                onClick={action}
                className={`flex-1 py-2 text-[12px] font-semibold text-brand-700 transition-colors duration-150 hover:bg-slate-100 dark:text-brand-300 dark:hover:bg-slate-800 md:flex-none md:px-3 ${
                  i > 0 ? 'border-l border-slate-300 dark:border-slate-700' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* L'admin arrive ici : une demande en attente doit se voir sans avoir à
          ouvrir les référentiels. */}
      {nbDemandes > 0 && (
        <Alerte ton="info" titre={nbDemandes > 1 ? 'Demandes de compte' : 'Demande de compte'}>
          {nbDemandes > 1
            ? `${nbDemandes} personnes attendent la validation de leur compte.`
            : 'Une personne attend la validation de son compte.'}{' '}
          <Link to="/admin/referentiels" className="font-semibold underline underline-offset-2">
            Ouvrir les référentiels
          </Link>
        </Alerte>
      )}

      {chargement ? (
        <Alerte ton="info">Chargement des indicateurs…</Alerte>
      ) : sessions.length === 0 ? (
        <Alerte ton="info">Aucune donnée sur la période sélectionnée.</Alerte>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicateur
              primaire
              titre="Taux de conversion"
              valeur={nombreFr(indicateurs.tauxConversion)}
              suffixe="%"
              legende={`${pluriel(indicateurs.actes, 'acte rattaché', 'actes rattachés')} sur ${pluriel(indicateurs.sensibilises, 'sensibilisé', 'sensibilisés')}`}
            />
            <Indicateur
              titre="Taux d’engagement"
              valeur={nombreFr(indicateurs.tauxEngagement)}
              suffixe="%"
              legende={`${pluriel(indicateurs.sensibilises, 'sensibilisé', 'sensibilisés')} sur ${pluriel(indicateurs.presents, 'présent déclaré', 'présents déclarés')}`}
            />
            <Indicateur
              titre="Personnes sensibilisées"
              valeur={indicateurs.sensibilises}
              legende={`${pluriel(indicateurs.sessions, 'session', 'sessions')} · ${pluriel(indicateurs.coupons, 'coupon émis', 'coupons émis')}`}
            />
            <Indicateur
              titre="Actes rattachés"
              valeur={indicateurs.actes}
              legende={
                indicateurs.actesNonRattaches > 0
                  ? `dont ${pluriel(indicateurs.actesNonRattaches, 'acte', 'actes')} sans coupon, hors conversion`
                  : 'tous les actes sont rattachés à un coupon'
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold">Sensibilisation et prise en charge par université</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parUniversite}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="cle" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                    <Tooltip />
                    <Bar dataKey="sensibilises" name="Sensibilisés" fill="#1b7fbf" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actes" name="Actes" fill="#8fcbee" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-end gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="pastille">
                  <span className="point bg-brand-600" />
                  Sensibilisés
                </span>
                <span className="pastille">
                  <span className="point bg-brand-300" />
                  Actes
                </span>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-3 text-sm font-semibold">Répartition par tranche d’âge</h2>
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={demographie}
                      dataKey="valeur"
                      nameKey="cle"
                      innerRadius="62%"
                      outerRadius="92%"
                      paddingAngle={2}
                      stroke="none"
                    >
                      {demographie.map((_, i) => (
                        <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-bold">{indicateurs.sensibilises}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">personnes</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {demographie.map((d, i) => (
                  <li key={d.cle} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: COULEURS[i % COULEURS.length] }}
                    />
                    <span className="flex-1 text-slate-600 dark:text-slate-300">{d.cle} ans</span>
                    <span className="font-semibold">{d.valeur}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Sessions de la période</h2>
              {sessionsTriees.length > 5 && (
                <button
                  type="button"
                  onClick={() => setToutesSessions((v) => !v)}
                  className="lien-discret !text-xs"
                >
                  {toutesSessions ? 'Réduire' : `Voir les ${sessionsTriees.length} sessions`}
                </button>
              )}
            </div>

            {/* Sept colonnes ne tiennent pas sur un téléphone : les faire défiler
                latéralement rendrait le tableau illisible. Chaque séance devient
                une ligne autonome, le tableau ne reparaît qu'à partir du bureau. */}
            <ul className="filets md:hidden">
              {sessionsAffichees.map((s) => {
                const conv = s.nb_sensibilises > 0 ? (s.nb_actes / s.nb_sensibilises) * 100 : 0
                return (
                  <li key={s.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-[13.5px] font-semibold">
                        <span className="chiffres text-slate-500 dark:text-slate-400">
                          {jourMois(s.date_session)}
                        </span>{' '}
                        · {s.thematique}
                      </p>
                      <p className="chiffres shrink-0 text-[13.5px] font-bold text-brand-700 dark:text-brand-300">
                        {conv.toFixed(1).replace('.', ',')}&nbsp;%
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                      {s.secteur ? `${s.campus} — ${s.secteur}` : s.campus}
                    </p>
                    <p className="chiffres mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                      {s.nombre_presents ?? '—'} présents · {s.nb_sensibilises} sensib. ·{' '}
                      {s.nb_actes} actes
                    </p>
                  </li>
                )
              })}
            </ul>

            <div className="-mx-[18px] hidden overflow-x-auto md:block">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                    {(
                      [
                        ['Date', ''],
                        ['Campus / secteur', ''],
                        ['Thématique', ''],
                        ['Présents', 'text-right'],
                        ['Sensib.', 'text-right'],
                        ['Actes', 'text-right'],
                        ['Conv.', 'text-right w-[86px]'],
                      ] as const
                    ).map(([c, align], i) => (
                      <th
                        key={c}
                        className={`py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${align} ${
                          i === 0 ? 'pl-[18px] pr-3' : 'pr-3'
                        } ${i === 6 ? 'pr-[18px]' : ''}`}
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {sessionsAffichees.map((s) => {
                    const conv = s.nb_sensibilises > 0 ? (s.nb_actes / s.nb_sensibilises) * 100 : 0
                    return (
                      <tr key={s.id} className="chiffres text-[12.5px]">
                        <td className="whitespace-nowrap py-2.5 pl-[18px] pr-3">
                          {jourMois(s.date_session)}
                        </td>
                        <td className="max-w-[280px] truncate whitespace-nowrap py-2.5 pr-3">
                          {s.secteur ? `${s.campus} — ${s.secteur}` : s.campus}
                        </td>
                        <td className="max-w-[280px] truncate whitespace-nowrap py-2.5 pr-3">
                          {s.thematique}
                        </td>
                        <td className="py-2.5 pr-3 text-right">{s.nombre_presents ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-right">{s.nb_sensibilises}</td>
                        <td className="py-2.5 pr-3 text-right">{s.nb_actes}</td>
                        {/* Espace insécable : le pourcentage ne doit jamais passer à la ligne. */}
                        <td className="whitespace-nowrap py-2.5 pr-[18px] text-right font-semibold text-brand-700 dark:text-brand-300">
                          {conv.toFixed(1).replace('.', ',')}&nbsp;%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="mb-3.5 flex items-center gap-2.5">
              <h2 className="text-sm font-semibold">Alertes anti-fraude</h2>
              {nbAlertes > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
                  {nbAlertes}
                </span>
              )}
              <Link to="/admin/alertes" className="lien-discret ml-auto !text-xs">
                Ouvrir les alertes
              </Link>
            </div>

            {nbAlertes === 0 ? (
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400">
                Aucun pic anormal détecté avec les seuils actuels.
              </p>
            ) : (
              <ul className="grid gap-[18px] md:grid-cols-3">
                {alertes.slice(0, 3).map((a) => (
                  // Filet rouge : dépassement de volume. Ambre : simple signalement.
                  <li key={`${a.agent_id}-${a.date_emission}`} className="border-l-2 border-red-600 pl-3">
                    <p className="text-[12.5px] font-semibold">
                      {a.agent_nom} — {pluriel(a.nb_coupons, 'coupon', 'coupons')} le{' '}
                      {jourMois(a.date_emission)}
                    </p>
                    <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                      Moyenne de l’agent : {nombreFr(a.moyenne_agent)} · score z {nombreFr(a.score_z)}
                    </p>
                  </li>
                ))}
                {indicateurs.actesNonRattaches > 0 && (
                  <li className="border-l-2 border-amber-500 pl-3">
                    <p className="text-[12.5px] font-semibold">
                      {pluriel(indicateurs.actesNonRattaches, 'acte', 'actes')} sans coupon rattaché
                    </p>
                    <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                      Coupons illisibles ou perdus, hors taux de conversion
                    </p>
                  </li>
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
