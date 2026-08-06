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

const COULEURS = ['#123631', '#1f6a5a', '#2d8570', '#48a189', '#77bda9', '#a9d7c9', '#d4ebe4']

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
}: {
  titre: string
  valeur: number | string
  suffixe?: string
  legende?: string
}) {
  return (
    <div className="card">
      <p className="surtitre">{titre}</p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight">
        {valeur}
        {suffixe && <span className="ml-0.5 text-lg font-semibold text-slate-400">{suffixe}</span>}
      </p>
      {legende && (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{legende}</p>
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
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true
    setChargement(true)
    void Promise.all([
      chargerSessions(filtres),
      chargerPersonnes(filtres),
      compterActesNonRattaches(filtres),
      chargerAlertesFraude(),
    ]).then(([s, p, nr, al]) => {
      if (!actif) return
      setSessions(s)
      setPersonnes(p)
      setActesNonRattaches(nr)
      setAlertes(al)
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

  function majFiltre(patch: Partial<FiltresDashboard>) {
    setFiltres((f) => ({ ...f, ...patch }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Tableau de bord</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {periodeLisible(filtres.debut, filtres.fin)} ·{' '}
            {universiteChoisie ? universiteChoisie.nom : 'toutes universités'} · toutes thématiques
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Début de période"
            value={filtres.debut ?? ''}
            onChange={(e) => majFiltre({ debut: e.target.value })}
            className="input !w-auto !py-1.5 text-xs"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            aria-label="Fin de période"
            value={filtres.fin ?? ''}
            onChange={(e) => majFiltre({ fin: e.target.value })}
            className="input !w-auto !py-1.5 text-xs"
          />
          <select
            aria-label="Université"
            value={filtres.universiteId ?? ''}
            onChange={(e) => majFiltre({ universiteId: e.target.value || undefined })}
            className="input !w-auto !py-1.5 text-xs"
          >
            <option value="">Toutes universités</option>
            {referentiels.universites.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            {(
              [
                ['CSV', () => exporterCsv(sessions, periode)],
                ['PDF', () => exporterPdf(sessions, indicateurs, periode)],
                ['DHIS2', () => exporterDhis2(sessions, periode)],
              ] as const
            ).map(([label, action]) => (
              <button
                key={label}
                onClick={action}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 dark:border-slate-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {chargement ? (
        <Alerte ton="info">Chargement des indicateurs…</Alerte>
      ) : sessions.length === 0 ? (
        <Alerte ton="info">Aucune donnée sur la période sélectionnée.</Alerte>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicateur
              titre="Taux de conversion"
              valeur={nombreFr(indicateurs.tauxConversion)}
              suffixe="%"
              legende={`${pluriel(indicateurs.actes, 'acte rattaché', 'actes rattachés')} sur ${indicateurs.sensibilises} sensibilisés`}
            />
            <Indicateur
              titre="Taux d’engagement"
              valeur={nombreFr(indicateurs.tauxEngagement)}
              suffixe="%"
              legende={`${indicateurs.sensibilises} sensibilisés sur ${indicateurs.presents} présents déclarés`}
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
                    <Bar dataKey="sensibilises" name="Sensibilisés" fill="#1f6a5a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actes" name="Actes" fill="#77bda9" radius={[4, 4, 0, 0]} />
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

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Sessions de la période</h2>
                {sessionsTriees.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setToutesSessions((v) => !v)}
                    className="lien-discret text-xs"
                  >
                    {toutesSessions ? 'Réduire' : `Voir les ${sessionsTriees.length} sessions`}
                  </button>
                )}
              </div>

              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="surtitre border-b border-slate-200 dark:border-slate-800">
                      <th className="pb-2 pr-3 font-semibold">Date</th>
                      <th className="pb-2 pr-3 font-semibold">Campus / secteur</th>
                      <th className="pb-2 pr-3 font-semibold">Thématique</th>
                      <th className="pb-2 pr-3 text-right font-semibold">Présents</th>
                      <th className="pb-2 pr-3 text-right font-semibold">Sensib.</th>
                      <th className="pb-2 pr-3 text-right font-semibold">Actes</th>
                      <th className="pb-2 text-right font-semibold">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {sessionsAffichees.map((s) => {
                      const conv = s.nb_sensibilises > 0 ? (s.nb_actes / s.nb_sensibilises) * 100 : 0
                      return (
                        <tr key={s.id}>
                          <td className="whitespace-nowrap py-2 pr-3">{jourMois(s.date_session)}</td>
                          <td className="py-2 pr-3">
                            {s.campus}
                            {s.secteur && (
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                                {s.secteur}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-brand-700 dark:text-brand-300">{s.thematique}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{s.nombre_presents ?? '—'}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{s.nb_sensibilises}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{s.nb_actes}</td>
                          <td className="py-2 text-right font-semibold tabular-nums">
                            {conv.toFixed(1).replace('.', ',')} %
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Alertes anti-fraude</h2>
                {alertes.length > 0 && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                    {alertes.length}
                  </span>
                )}
              </div>

              {alertes.length === 0 && indicateurs.actesNonRattaches === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aucun pic anormal détecté avec les seuils actuels.
                </p>
              ) : (
                <ul className="space-y-3">
                  {alertes.slice(0, 4).map((a) => (
                    <li key={`${a.agent_id}-${a.date_emission}`}>
                      <p className="text-xs font-semibold">
                        {a.agent_nom} — {pluriel(a.nb_coupons, 'coupon', 'coupons')} le{' '}
                        {jourMois(a.date_emission)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        Moyenne de l’agent : {nombreFr(a.moyenne_agent)} · score z {nombreFr(a.score_z)}
                      </p>
                    </li>
                  ))}
                  {indicateurs.actesNonRattaches > 0 && (
                    <li>
                      <p className="text-xs font-semibold">
                        {pluriel(indicateurs.actesNonRattaches, 'acte', 'actes')} sans coupon rattaché
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        Coupons illisibles ou perdus, hors taux de conversion
                      </p>
                    </li>
                  )}
                </ul>
              )}

              <Link to="/admin/alertes" className="lien-discret mt-3 block text-xs">
                Régler les seuils
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
