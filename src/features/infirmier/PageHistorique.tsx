import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/offline/db'
import { useAuth } from '../../context/AuthContext'
import { TYPES_ACTE } from '../../lib/domain/types'
import { Alerte } from '../../components/ui/Alerte'

const LIBELLE_ACTE = Object.fromEntries(TYPES_ACTE.map((t) => [t.value, t.label]))

export function PageHistorique() {
  const { profile } = useAuth()

  const actes = useLiveQuery(async () => {
    const tous = await db.actes.toArray()
    return tous
      .filter((a) => a.infirmier_id === profile?.id)
      .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
  }, [profile?.id], [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Actes enregistrés</h1>

      {actes.length === 0 ? (
        <Alerte ton="info">Aucun acte enregistré sur cet appareil.</Alerte>
      ) : (
        <ul className="space-y-2">
          {actes.map((a) => (
            <li key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{LIBELLE_ACTE[a.type_acte]}</p>
                  <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                    {a.coupon_illisible ? 'Coupon illisible' : (a.numero_coupon_saisi ?? '—')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.date_acte}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      a.syncState === 'synced'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        : a.syncState === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                    }`}
                  >
                    {a.syncState === 'synced' ? 'Synchronisé' : a.syncState === 'error' ? 'Erreur' : 'En attente'}
                  </span>
                  {a.en_attente_rapprochement && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                      Rapprochement
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
