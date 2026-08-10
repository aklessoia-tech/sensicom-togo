import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../lib/offline/db'
import { useAuth } from '../../context/AuthContext'
import { useReferentiels } from '../../hooks/useReferentiels'
import { Alerte } from '../../components/ui/Alerte'
import { IconeFleche } from '../../components/ui/Icones'
import { cloreSession } from '../../lib/data/agent'

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  return `${j} ${MOIS[m - 1]} ${a}`
}

function dateCourte(iso: string): string {
  const [, m, j] = iso.split('-').map(Number)
  return `${j} ${MOIS[m - 1]}`
}

/**
 * L'agent arrive sur sa séance active : c'est là qu'il passe la journée.
 * Fond blanc et filets fins plutôt que cartes empilées — le bleu de marque
 * n'est porté que par l'action principale.
 */
export function PageSessions() {
  const { profile } = useAuth()
  const { referentiels } = useReferentiels()
  const navigate = useNavigate()
  const [cloture, setCloture] = useState(false)

  const sessions = useLiveQuery(
    async () => {
      const toutes = await db.sessions.toArray()
      return toutes
        .filter((s) => s.agent_id === profile?.id)
        .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
    },
    [profile?.id],
    [],
  )

  const compteurs = useLiveQuery(
    async () => {
      const [personnes, coupons] = await Promise.all([db.personnes.toArray(), db.coupons.toArray()])
      const par = (liste: { session_id: string }[]) =>
        liste.reduce<Record<string, number>>((acc, x) => {
          acc[x.session_id] = (acc[x.session_id] ?? 0) + 1
          return acc
        }, {})
      return { personnes: par(personnes), coupons: par(coupons) }
    },
    [],
    { personnes: {}, coupons: {} } as { personnes: Record<string, number>; coupons: Record<string, number> },
  )

  const aSynchroniser = useLiveQuery(
    async () => {
      const [p, c] = await Promise.all([db.personnes.toArray(), db.coupons.toArray()])
      return [...p, ...c].reduce<Record<string, number>>((acc, x) => {
        if (x.syncState !== 'synced') acc[x.session_id] = (acc[x.session_id] ?? 0) + 1
        return acc
      }, {})
    },
    [],
    {} as Record<string, number>,
  )

  const enCours = sessions.find((s) => !s.cloturee_at) ?? null
  const precedentes = sessions.filter((s) => s.cloturee_at)

  const libelles = (zoneId: string, thematiqueId: string) => ({
    zone: referentiels.zones.find((z) => z.id === zoneId),
    thematique: referentiels.thematiques.find((t) => t.id === thematiqueId),
  })

  async function clore() {
    if (!enCours) return
    // La clôture rend la séance non modifiable : elle mérite une confirmation.
    if (!window.confirm('Clore cette séance ? Elle ne pourra plus recevoir de saisie.')) return
    setCloture(true)
    try {
      await cloreSession(enCours.id)
    } finally {
      setCloture(false)
    }
  }

  return (
    <div>
      {enCours ? (
        <section>
          <p className="amorce">Session en cours</p>
          {(() => {
            const { zone, thematique } = libelles(enCours.zone_id, enCours.thematique_id)
            return (
              <>
                <h1 className="mt-1.5 text-[27px] font-bold leading-none tracking-tight">
                  {thematique?.libelle ?? 'Session'}
                </h1>
                <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">
                  {zone ? `${zone.campus} — ${zone.secteur}` : 'Zone'} · {dateLongue(enCours.date_session)}
                </p>
              </>
            )
          })()}

          <div className="mt-5 flex border-y border-slate-100 py-3.5 dark:border-slate-800/70">
            {(
              [
                [compteurs.personnes[enCours.id] ?? 0, 'sensibilisés', ''],
                [compteurs.coupons[enCours.id] ?? 0, 'coupons', ''],
                [aSynchroniser[enCours.id] ?? 0, 'à synchro.', 'text-amber-600 dark:text-amber-500'],
              ] as const
            ).map(([valeur, libelle, ton]) => (
              <div key={libelle} className="flex-1">
                <p className={`chiffres text-2xl font-bold leading-none ${ton}`}>{valeur}</p>
                <p className="surtitre mt-1.5">{libelle}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/agent/session/${enCours.id}`)}
            className="btn-primary mt-5 !min-h-[58px] w-full justify-between !px-5 text-[15px]"
          >
            Saisir une personne
            <IconeFleche />
          </button>

          <div className="mt-2.5 flex gap-2.5">
            <Link
              to={`/agent/session/${enCours.id}`}
              className="btn-secondary !min-h-[46px] flex-1 text-[13px]"
            >
              Coupons émis
            </Link>
            <button
              type="button"
              onClick={() => void clore()}
              disabled={cloture}
              className="btn-secondary !min-h-[46px] flex-1 text-[13px]"
            >
              {cloture ? 'Clôture…' : 'Clore la session'}
            </button>
          </div>
        </section>
      ) : (
        <section>
          <p className="amorce">Aucune séance ouverte</p>
          <h1 className="mt-1.5 text-[27px] font-bold leading-tight tracking-tight">
            Déclarez une séance
          </h1>
          <p className="mt-2 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
            Vous pourrez alors sensibiliser et remettre des coupons.
          </p>
          <Link to="/agent/nouvelle-session" className="btn-primary mt-5 !min-h-[58px] w-full justify-between !px-5 text-[15px]">
            Nouvelle session
            <IconeFleche />
          </Link>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="surtitre">Sessions précédentes</h2>
          <Link to="/agent/nouvelle-session" className="lien-discret !text-xs">
            Nouvelle session
          </Link>
        </div>

        {precedentes.length === 0 ? (
          <p className="py-4 text-[13px] text-slate-500 dark:text-slate-400">
            Aucune séance close sur cet appareil.
          </p>
        ) : (
          <ul className="filets">
            {precedentes.map((s) => {
              const { zone, thematique } = libelles(s.zone_id, s.thematique_id)
              return (
                <li key={s.id}>
                  <Link
                    to={`/agent/session/${s.id}`}
                    className="flex items-center gap-3 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {thematique?.libelle ?? 'Session'}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                        {zone ? `${zone.campus} — ${zone.secteur}` : 'Zone'} · {dateCourte(s.date_session)}
                      </p>
                    </div>
                    {s.syncState !== 'synced' && (
                      <span className="point bg-amber-500" title="Non synchronisée" />
                    )}
                    <p className="chiffres shrink-0 text-[17px] font-bold">
                      {compteurs.personnes[s.id] ?? 0}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {sessions.length === 0 && (
        <div className="mt-6">
          <Alerte ton="info">Aucune session enregistrée sur cet appareil.</Alerte>
        </div>
      )}

      <p className="mt-10 pb-2 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Saisie anonyme : aucun nom ni identité n’est demandé ni conservé.
      </p>
    </div>
  )
}
