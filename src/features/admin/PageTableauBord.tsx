import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  calculerIndicateurs,
  chargerPersonnes,
  chargerSessions,
  repartitionDemographique,
  serieParThematique,
  serieParUniversite,
  type FiltresDashboard,
  type LignePersonne,
  type LigneSession,
} from '../../lib/data/admin'
import { exporterCsv, exporterDhis2, exporterPdf } from '../../lib/data/exports'
import { useReferentiels } from '../../hooks/useReferentiels'
import { GENRES, TRANCHES_AGE, type Genre, type TrancheAge } from '../../lib/domain/types'
import { Liste, Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

const COULEURS = ['#1f6a5a', '#48a189', '#77bda9', '#a9d7c9', '#d4ebe4', '#2d8570', '#123631']

function debutDuMois(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

function Indicateur({ titre, valeur, suffixe }: { titre: string; valeur: number | string; suffixe?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500 dark:text-slate-400">{titre}</p>
      <p className="mt-1 text-2xl font-bold">
        {valeur}
        {suffixe && <span className="ml-0.5 text-base font-semibold text-slate-500">{suffixe}</span>}
      </p>
    </div>
  )
}

export function PageTableauBord() {
  const { referentiels } = useReferentiels()
  const [filtres, setFiltres] = useState<FiltresDashboard>({ debut: debutDuMois(), fin: aujourdhui() })
  const [sessions, setSessions] = useState<LigneSession[]>([])
  const [personnes, setPersonnes] = useState<LignePersonne[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true
    setChargement(true)
    void Promise.all([chargerSessions(filtres), chargerPersonnes(filtres)]).then(([s, p]) => {
      if (!actif) return
      setSessions(s)
      setPersonnes(p)
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [filtres])

  const indicateurs = useMemo(() => calculerIndicateurs(sessions, personnes), [sessions, personnes])
  const parUniversite = useMemo(() => serieParUniversite(sessions), [sessions])
  const parThematique = useMemo(() => serieParThematique(sessions), [sessions])
  const demographie = useMemo(() => repartitionDemographique(personnes), [personnes])

  const periode = `${filtres.debut ?? ''}_${filtres.fin ?? ''}`

  function majFiltre(patch: Partial<FiltresDashboard>) {
    setFiltres((f) => ({ ...f, ...patch }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Tableau de bord</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exporterCsv(sessions, periode)} className="btn-secondary text-xs">
            Export CSV
          </button>
          <button onClick={() => exporterPdf(sessions, indicateurs, periode)} className="btn-secondary text-xs">
            Export PDF
          </button>
          <button onClick={() => exporterDhis2(sessions, periode)} className="btn-secondary text-xs">
            Export DHIS2
          </button>
        </div>
      </div>

      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Saisie label="Du" type="date" value={filtres.debut ?? ''} onChange={(e) => majFiltre({ debut: e.target.value })} />
        <Saisie label="Au" type="date" value={filtres.fin ?? ''} onChange={(e) => majFiltre({ fin: e.target.value })} />
        <Liste
          label="Université"
          placeholder="Toutes"
          value={filtres.universiteId ?? ''}
          onChange={(e) => majFiltre({ universiteId: e.target.value || undefined })}
          options={referentiels.universites.map((u) => ({ value: u.id, label: u.nom }))}
        />
        <Liste
          label="Thématique"
          placeholder="Toutes"
          value={filtres.thematiqueId ?? ''}
          onChange={(e) => majFiltre({ thematiqueId: e.target.value || undefined })}
          options={referentiels.thematiques.map((t) => ({ value: t.id, label: t.libelle }))}
        />
        <Liste
          label="Genre"
          placeholder="Tous"
          value={filtres.genre ?? ''}
          onChange={(e) => majFiltre({ genre: (e.target.value || undefined) as Genre | undefined })}
          options={GENRES.map((g) => ({ value: g.value, label: g.label }))}
        />
        <Liste
          label="Tranche d’âge"
          placeholder="Toutes"
          value={filtres.trancheAge ?? ''}
          onChange={(e) => majFiltre({ trancheAge: (e.target.value || undefined) as TrancheAge | undefined })}
          options={TRANCHES_AGE.map((t) => ({ value: t, label: `${t} ans` }))}
        />
      </div>

      {chargement ? (
        <Alerte ton="info">Chargement des indicateurs…</Alerte>
      ) : sessions.length === 0 ? (
        <Alerte ton="info">Aucune donnée sur la période sélectionnée.</Alerte>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Indicateur titre="Taux de conversion" valeur={indicateurs.tauxConversion} suffixe="%" />
            <Indicateur titre="Taux d’engagement" valeur={indicateurs.tauxEngagement} suffixe="%" />
            <Indicateur titre="Personnes sensibilisées" valeur={indicateurs.sensibilises} />
            <Indicateur titre="Actes réalisés" valeur={indicateurs.actes} />
            <Indicateur titre="Sessions" valeur={indicateurs.sessions} />
            <Indicateur titre="Présents déclarés" valeur={indicateurs.presents} />
            <Indicateur titre="Coupons émis" valeur={indicateurs.coupons} />
            <Indicateur
              titre="Coupons non convertis"
              valeur={Math.max(indicateurs.coupons - indicateurs.actes, 0)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 font-semibold">Sensibilisation et prise en charge par université</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parUniversite}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="cle" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sensibilises" name="Sensibilisés" fill="#1f6a5a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actes" name="Actes" fill="#77bda9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold">Par thématique</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parThematique}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                    <XAxis dataKey="cle" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sensibilises" name="Sensibilisés" fill="#2d8570" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actes" name="Actes" fill="#a9d7c9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h2 className="mb-3 font-semibold">Répartition par tranche d’âge</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={demographie} dataKey="valeur" nameKey="cle" outerRadius="80%" label>
                      {demographie.map((_, i) => (
                        <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
