import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../lib/offline/db'
import { useAuth } from '../../context/AuthContext'
import { useReferentiels } from '../../hooks/useReferentiels'
import { Alerte } from '../../components/ui/Alerte'
import { IndicateurSync } from '../../components/layout/IndicateurSync'
import { IconeFleche } from '../../components/ui/Icones'
import { cloreSession } from '../../lib/data/agent'

function dateLisible(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  const mois = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ]
  const aujourdhui = new Date().toISOString().slice(0, 10)
  return iso === aujourdhui ? "aujourd'hui" : `${j} ${mois[m - 1]} ${a}`
}

/**
 * L'agent arrive sur sa séance active : c'est là qu'il passe la journée.
 * Les séances closes ne sont qu'un historique consultable.
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
    setCloture(true)
    try {
      await cloreSession(enCours.id)
    } finally {
      setCloture(false)
    }
  }

  return (
    <div className="space-y-5">
      <IndicateurSync variante="barre" />

      {enCours ? (
        <section className="rounded-2xl bg-brand-700 p-4 text-white shadow-sm dark:bg-brand-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">Session en cours</p>
          {(() => {
            const { zone, thematique } = libelles(enCours.zone_id, enCours.thematique_id)
            return (
              <>
                <h1 className="mt-1 text-2xl font-bold">{thematique?.libelle ?? 'Session'}</h1>
                <p className="mt-0.5 text-sm text-brand-100">
                  {zone ? `${zone.campus} — ${zone.secteur}` : 'Zone'} · {dateLisible(enCours.date_session)}
                </p>
              </>
            )
          })()}

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/10 p-3 text-center">
            <div>
              <p className="text-xl font-bold">{compteurs.personnes[enCours.id] ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-brand-100">sensibilisés</p>
            </div>
            <div>
              <p className="text-xl font-bold">{compteurs.coupons[enCours.id] ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide text-brand-100">coupons</p>
            </div>
            <div>
              <p className={`text-xl font-bold ${aSynchroniser[enCours.id] ? 'text-amber-300' : ''}`}>
                {aSynchroniser[enCours.id] ?? 0}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-brand-100">à synchro.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/agent/session/${enCours.id}`)}
            className="btn mt-4 w-full bg-white text-brand-800 hover:bg-brand-50"
          >
            Saisir une personne
            <IconeFleche />
          </button>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <Link
              to={`/agent/session/${enCours.id}`}
              className="font-semibold text-brand-100 underline-offset-2 hover:underline"
            >
              Coupons émis ({compteurs.coupons[enCours.id] ?? 0})
            </Link>
            <button
              type="button"
              onClick={() => void clore()}
              disabled={cloture}
              className="font-semibold text-brand-100 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {cloture ? 'Clôture…' : 'Clore la session'}
            </button>
          </div>
        </section>
      ) : (
        <section className="card">
          <h1 className="text-lg font-bold">Aucune session ouverte</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Déclarez une séance pour commencer à sensibiliser et remettre des coupons.
          </p>
          <Link to="/agent/nouvelle-session" className="btn-primary mt-3 w-full">
            Nouvelle session
          </Link>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="surtitre">Sessions précédentes</h2>
          <Link to="/agent/nouvelle-session" className="lien-discret text-xs">
            Nouvelle session
          </Link>
        </div>

        {precedentes.length === 0 ? (
          <Alerte ton="info">Aucune séance close sur cet appareil.</Alerte>
        ) : (
          <ul className="space-y-2">
            {precedentes.map((s) => {
              const { zone, thematique } = libelles(s.zone_id, s.thematique_id)
              return (
                <li key={s.id}>
                  <Link
                    to={`/agent/session/${s.id}`}
                    className="card flex items-center gap-3 py-3 hover:border-brand-400"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{thematique?.libelle ?? 'Session'}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {zone ? `${zone.campus} — ${zone.secteur}` : 'Zone'} · {s.date_session}
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-bold">{compteurs.personnes[s.id] ?? 0}</p>
                    {s.syncState !== 'synced' && (
                      <span className="point bg-amber-500" title="Non synchronisée" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="pb-2 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Saisie anonyme : aucun nom ni identité n’est demandé ni conservé.
      </p>
    </div>
  )
}
