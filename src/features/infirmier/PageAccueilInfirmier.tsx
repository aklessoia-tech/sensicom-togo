import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/offline/db'
import { rapprocherActesLocaux, rechercherCoupon, type CouponTrouve } from '../../lib/data/infirmier'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

export function PageAccueilInfirmier() {
  const naviguer = useNavigate()
  const [numero, setNumero] = useState('')
  const [resultat, setResultat] = useState<CouponTrouve | null>(null)
  const [introuvable, setIntrouvable] = useState(false)
  const [recherche, setRecherche] = useState(false)

  const enAttente = useLiveQuery(
    () => db.actes.filter((a) => a.en_attente_rapprochement).count(),
    [],
    0,
  )

  // Les coupons arrivent parfois après l'acte : on retente le rattachement à l'ouverture.
  useEffect(() => {
    void rapprocherActesLocaux()
  }, [])

  async function chercher(e: FormEvent) {
    e.preventDefault()
    setRecherche(true)
    setIntrouvable(false)
    setResultat(null)
    try {
      const trouve = await rechercherCoupon(numero)
      if (trouve) setResultat(trouve)
      else setIntrouvable(true)
    } finally {
      setRecherche(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Accueil infirmerie</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Recherchez le coupon présenté par la personne.
        </p>
      </div>

      <form onSubmit={chercher} className="card space-y-3">
        <Saisie
          label="Numéro de coupon"
          obligatoire
          value={numero}
          onChange={(e) => setNumero(e.target.value.toUpperCase())}
          placeholder="MAR-CN-UL-N-CITE-20260805-001"
          autoComplete="off"
          aide="Saisissez ou scannez le numéro figurant sur le coupon."
        />
        <button type="submit" disabled={recherche || !numero.trim()} className="btn-primary w-full">
          {recherche ? 'Recherche…' : 'Rechercher le coupon'}
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
          <button
            type="button"
            onClick={() => naviguer('/infirmier/acte?illisible=1')}
            className="btn-secondary w-full"
          >
            Coupon illisible ou perdu
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => naviguer('/infirmier/acte?illisible=1')}
        className="btn-secondary w-full"
      >
        Coupon illisible ou perdu
      </button>

      {enAttente > 0 && (
        <Alerte ton="info">
          {enAttente} acte(s) en attente de rapprochement avec leur coupon.
        </Alerte>
      )}
    </div>
  )
}
