import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/offline/db'
import { rapprocherActesLocaux, rechercherCoupon, type CouponTrouve } from '../../lib/data/infirmier'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'
import { IconeScan } from '../../components/ui/Icones'
import { ScannerCoupon, scanDisponible } from '../../components/ui/ScannerCoupon'
import { TYPES_ACTE } from '../../lib/domain/types'

const LIBELLE_ACTE = Object.fromEntries(TYPES_ACTE.map((t) => [t.value, t.label]))

export function PageAccueilInfirmier() {
  const naviguer = useNavigate()
  const [numero, setNumero] = useState('')
  const [resultat, setResultat] = useState<CouponTrouve | null>(null)
  const [introuvable, setIntrouvable] = useState(false)
  const [recherche, setRecherche] = useState(false)
  const [scanne, setScanne] = useState(false)

  const actesDuJour = useLiveQuery(
    async () => {
      const jour = new Date().toISOString().slice(0, 10)
      const tous = await db.actes.toArray()
      return tous
        .filter((a) => a.date_acte === jour)
        .sort((a, b) => b.updatedLocalAt - a.updatedLocalAt)
        .slice(0, 8)
    },
    [],
    [],
  )

  // Les coupons arrivent parfois après l'acte : on retente le rattachement à l'ouverture.
  useEffect(() => {
    void rapprocherActesLocaux()
  }, [])

  const lancerRecherche = useCallback(async (valeur: string) => {
    setRecherche(true)
    setIntrouvable(false)
    setResultat(null)
    try {
      const trouve = await rechercherCoupon(valeur)
      if (trouve) setResultat(trouve)
      else setIntrouvable(true)
    } finally {
      setRecherche(false)
    }
  }, [])

  async function chercher(e: FormEvent) {
    e.preventDefault()
    await lancerRecherche(numero)
  }

  const surLecture = useCallback(
    (valeur: string) => {
      setScanne(false)
      setNumero(valeur)
      void lancerRecherche(valeur)
    },
    [lancerRecherche],
  )

  return (
    <div className="space-y-5">
      {scanne && <ScannerCoupon onLecture={surLecture} onFermer={() => setScanne(false)} />}

      <div>
        <h1 className="text-xl font-bold">Coupon présenté</h1>
        <p className="mt-0.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
          Aucune identité n’est associée au coupon : seules la zone et la thématique sont connues.
        </p>
      </div>

      <form onSubmit={chercher} className="space-y-3">
        <Saisie
          label="Numéro"
          obligatoire
          value={numero}
          onChange={(e) => setNumero(e.target.value.toUpperCase())}
          placeholder="MAR-CN-UL-N-CITE-20260805-001"
          autoComplete="off"
          className="font-mono"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={recherche || !numero.trim()} className="btn-primary flex-1">
            {recherche ? 'Recherche…' : 'Rechercher'}
          </button>
          {scanDisponible() && (
            <button type="button" onClick={() => setScanne(true)} className="btn-secondary shrink-0">
              <IconeScan />
              Scanner
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => naviguer('/infirmier/acte?illisible=1')}
          className="lien-discret block text-left"
        >
          Coupon illisible ou perdu
        </button>
      </form>

      {resultat && (
        <div className="card space-y-3">
          <Alerte ton="succes" titre="Coupon reconnu">
            Aucune identité n’est associée à ce coupon : seules la zone et la thématique sont connues.
          </Alerte>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Numéro</dt>
              <dd className="font-mono text-xs">{resultat.coupon.numero}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Zone</dt>
              <dd className="font-medium">{resultat.zone_libelle}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Thématique</dt>
              <dd className="font-medium">{resultat.thematique_libelle}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Émis le</dt>
              <dd className="font-medium">{resultat.coupon.date_emission}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Statut</dt>
              <dd className="font-medium">
                {resultat.coupon.statut === 'utilise' ? 'Déjà utilisé' : 'Valide'}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => naviguer(`/infirmier/acte?coupon=${encodeURIComponent(resultat.coupon.numero)}`)}
            className="btn-primary w-full"
          >
            Enregistrer un acte
          </button>
        </div>
      )}

      {introuvable && (
        <div className="card space-y-3">
          <Alerte ton="avertissement" titre="Coupon non trouvé">
            Il n’est peut-être pas encore synchronisé depuis l’appareil de l’agent. L’acte peut être
            enregistré : le rattachement se fera automatiquement à la réception.
          </Alerte>
          <button
            type="button"
            onClick={() => naviguer(`/infirmier/acte?coupon=${encodeURIComponent(numero.trim().toUpperCase())}`)}
            className="btn-primary w-full"
          >
            Enregistrer quand même
          </button>
        </div>
      )}

      <section>
        <h2 className="surtitre mb-2">Actes du jour</h2>
        {actesDuJour.length === 0 ? (
          <Alerte ton="info">Aucun acte enregistré aujourd’hui sur cet appareil.</Alerte>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {actesDuJour.map((a) => {
              const enAttente = a.en_attente_rapprochement
              const couleur = enAttente
                ? 'bg-amber-500'
                : a.syncState === 'synced'
                  ? 'bg-emerald-500'
                  : a.syncState === 'error'
                    ? 'bg-red-500'
                    : 'bg-sky-500'
              const etat = enAttente
                ? 'En attente'
                : a.syncState === 'synced'
                  ? 'Synchronisé'
                  : a.syncState === 'error'
                    ? 'Erreur'
                    : 'Rapprochement'
              return (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{LIBELLE_ACTE[a.type_acte]}</p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {a.coupon_illisible
                        ? `Coupon illisible${a.zone_approximative ? ` · ${a.zone_approximative}` : ''}`
                        : (a.numero_coupon_saisi ?? '—')}
                    </p>
                  </div>
                  <span className="pastille shrink-0 text-slate-600 dark:text-slate-300">
                    <span className={`point ${couleur}`} />
                    {etat}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="pb-2 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Un acte enregistré sur un coupon non synchronisé est rattaché automatiquement à l’arrivée de la
        session.
      </p>
    </div>
  )
}
