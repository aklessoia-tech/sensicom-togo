import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/offline/db'
import { useAuth } from '../../context/AuthContext'
import { useReferentiels } from '../../hooks/useReferentiels'
import { Alerte } from '../../components/ui/Alerte'

export function PageSessions() {
  const { profile } = useAuth()
  const { referentiels } = useReferentiels()

  const sessions = useLiveQuery(async () => {
    const toutes = await db.sessions.toArray()
    return toutes
      .filter((s) => s.agent_id === profile?.id)
      .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
  }, [profile?.id], [])

  const compteurs = useLiveQuery(
    async () => {
      const personnes = await db.personnes.toArray()
      return personnes.reduce<Record<string, number>>((acc, p) => {
        acc[p.session_id] = (acc[p.session_id] ?? 0) + 1
        return acc
      }, {})
    },
    [],
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Mes sessions</h1>
        <Link to="/agent/nouvelle-session" className="btn-primary !min-h-[40px] !py-2 text-xs">
          Nouvelle session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Alerte ton="info">
          Aucune session enregistrée sur cet appareil. Créez-en une pour commencer la saisie.
        </Alerte>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const zone = referentiels.zones.find((z) => z.id === s.zone_id)
            const thematique = referentiels.thematiques.find((t) => t.id === s.thematique_id)
            return (
              <li key={s.id}>
                <Link to={`/agent/session/${s.id}`} className="card flex items-center gap-3 hover:border-brand-400">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{thematique?.libelle ?? 'Session'}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {zone ? `${zone.campus} — ${zone.secteur}` : 'Zone'} · {s.date_session}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold">{compteurs[s.id] ?? 0}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">sensibilisés</p>
                  </div>
                  {s.syncState !== 'synced' && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Non synchronisée" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
