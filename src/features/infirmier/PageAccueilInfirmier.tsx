import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/offline/db'
import { rapprocherActesLocaux, rechercherCoupon, type CouponTrouve } from '../../lib/data/infirmier'
import { Alerte } from '../../components/ui/Alerte'
import { IconeScan } from '../../components/ui/Icones'
import { ScannerCoupon, scanDisponible } from '../../components/ui/ScannerCoupon'
import { TYPES_ACTE } from '../../lib/domain/types'
import { FormulaireActe } from './FormulaireActe'

const LIBELLE_ACTE = Object.fromEntries(TYPES_ACTE.map((t) => [t.value, t.label]))

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  return `${j} ${MOIS[m - 1]} ${a}`
}

function heure(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface Etat {
  libelle: string
  point: string
  texte: string
}

function etatActe(a: { en_attente_rapprochement?: boolean; syncState: string }): Etat {
  if (a.en_attente_rapprochement)
    return { libelle: 'En attente', point: 'bg-amber-500', texte: 'text-amber-700 dark:text-amber-400' }
  if (a.syncState === 'synced')
    return { libelle: 'Synchronisé', point: 'bg-brand-600', texte: 'text-brand-700 dark:text-brand-300' }
  if (a.syncState === 'error')
    return { libelle: 'Erreur', point: 'bg-red-500', texte: 'text-red-700 dark:text-red-400' }
  return { libelle: 'Rapprochement', point: 'bg-sky-500', texte: 'text-sky-700 dark:text-sky-400' }
}

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

  const barreRecherche = (
    <form onSubmit={chercher}>
      <label htmlFor="numero-coupon" className="surtitre">
        Coupon présenté
      </label>
      <div className="mt-2 flex flex-col gap-2.5 md:flex-row md:items-center">
        <input
          id="numero-coupon"
          value={numero}
          onChange={(e) => setNumero(e.target.value.toUpperCase())}
          placeholder="MAR-CN-UL-N-CITE-20260806-A01-001"
          autoComplete="off"
          className="input !rounded-[14px] border-brand-600 font-mono !text-[16.5px] md:!rounded-[11px] md:!text-[14.5px]"
        />
        <div className="flex gap-2.5 md:shrink-0">
          <button
            type="submit"
            disabled={recherche || !numero.trim()}
            className="btn-primary !min-h-[54px] flex-[2] md:!min-h-[46px] md:!px-6"
          >
            {recherche ? 'Recherche…' : 'Rechercher'}
          </button>
          {scanDisponible() && (
            <button
              type="button"
              onClick={() => setScanne(true)}
              className="btn-secondary !min-h-[54px] flex-1 md:!min-h-[46px]"
            >
              <IconeScan />
              Scanner
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => naviguer('/infirmier/acte?illisible=1')}
        className="lien-discret mt-3 block text-left !text-[13px]"
      >
        Coupon illisible ou perdu
      </button>
    </form>
  )

  const ficheCoupon = resultat && (
    <div>
      <p className="pastille text-brand-700 dark:text-brand-300">
        <span className="point h-2 w-2 bg-brand-600" />
        Coupon reconnu — {resultat.coupon.statut === 'utilise' ? 'déjà converti' : 'valide'}
      </p>
      <p className="mt-2 text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
        Seules la zone et la thématique sont connues. Aucune identité n’est associée à ce coupon.
      </p>
      <dl className="filets mt-4">
        {(
          [
            ['Numéro', <span className="font-mono text-[12px]">{resultat.coupon.numero}</span>],
            ['Zone', resultat.zone_libelle],
            ['Thématique', resultat.thematique_libelle],
            ['Émis le', dateLongue(resultat.coupon.date_emission)],
          ] as const
        ).map(([cle, valeur], i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-[12.5px] text-slate-500 dark:text-slate-400">{cle}</dt>
            <dd className="min-w-0 truncate text-right text-[13px] font-medium">{valeur}</dd>
          </div>
        ))}
      </dl>
    </div>
  )

  const tableauActes = (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="surtitre">Actes du jour</h2>
        <button
          type="button"
          onClick={() => naviguer('/infirmier/historique')}
          className="lien-discret !text-xs"
        >
          Voir l’historique
        </button>
      </div>

      {actesDuJour.length === 0 ? (
        <p className="py-4 text-[13px] text-slate-500 dark:text-slate-400">
          Aucun acte enregistré aujourd’hui sur cet appareil.
        </p>
      ) : (
        <>
          {/* Mobile : lignes filetées. Bureau : tableau, plus dense à lecture égale. */}
          <ul className="filets md:hidden">
            {actesDuJour.map((a) => {
              const etat = etatActe(a)
              return (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{LIBELLE_ACTE[a.type_acte]}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {a.coupon_illisible
                        ? `Coupon illisible${a.zone_approximative ? ` · ${a.zone_approximative}` : ''}`
                        : (a.numero_coupon_saisi ?? '—')}
                    </p>
                  </div>
                  <span className={`pastille shrink-0 ${etat.texte}`}>
                    <span className={`point ${etat.point}`} />
                    {etat.libelle}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="-mx-1 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  {['Heure', 'Acte', 'Coupon', 'État'].map((c, i) => (
                    <th
                      key={c}
                      className={`px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${
                        i === 3 ? 'w-[140px] text-right' : ''
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {actesDuJour.map((a) => {
                  const etat = etatActe(a)
                  return (
                    <tr key={a.id} className="whitespace-nowrap text-[12.5px]">
                      <td className="chiffres px-2.5 py-2.5">{heure(a.updatedLocalAt)}</td>
                      <td className="px-2.5 py-2.5 font-medium">{LIBELLE_ACTE[a.type_acte]}</td>
                      <td className="max-w-[280px] truncate px-2.5 py-2.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">
                        {a.coupon_illisible ? 'Coupon illisible' : (a.numero_coupon_saisi ?? '—')}
                      </td>
                      <td className="px-2.5 py-2.5 text-right">
                        <span className={`pastille ${etat.texte}`}>
                          <span className={`point ${etat.point}`} />
                          {etat.libelle}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-5 md:space-y-[18px]">
      {scanne && <ScannerCoupon onLecture={surLecture} onFermer={() => setScanne(false)} />}

      <div className="md:hidden">
        <h1 className="text-[27px] font-bold leading-tight tracking-tight">Coupon présenté</h1>
        <p className="mt-1.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
          Aucune identité n’est associée au coupon : seules la zone et la thématique sont connues.
        </p>
      </div>

      <section className="md:card">{barreRecherche}</section>

      {introuvable && (
        <div className="md:card">
          <Alerte ton="avertissement" titre="Coupon non trouvé">
            Il n’est peut-être pas encore synchronisé depuis l’appareil de l’agent. L’acte peut être
            enregistré : le rattachement se fera automatiquement à la réception.
          </Alerte>
          <button
            type="button"
            onClick={() => naviguer(`/infirmier/acte?coupon=${encodeURIComponent(numero.trim().toUpperCase())}`)}
            className="btn-primary mt-3 w-full"
          >
            Enregistrer quand même
          </button>
        </div>
      )}

      {/* Bureau : le coupon reconnu et la saisie de l'acte côte à côte, pour
          enregistrer sans quitter la fiche des yeux. Mobile : on navigue. */}
      {resultat && (
        <div className="grid gap-[18px] md:grid-cols-2">
          <section className="md:card">{ficheCoupon}</section>

          <section className="hidden md:card md:block">
            <FormulaireActe
              coupon={resultat}
              surAnnulation={() => {
                setResultat(null)
                setNumero('')
              }}
              surEnregistrement={() => {
                setResultat(null)
                setNumero('')
              }}
            />
          </section>

          <button
            type="button"
            onClick={() => naviguer(`/infirmier/acte?coupon=${encodeURIComponent(resultat.coupon.numero)}`)}
            className="btn-primary !min-h-[54px] w-full md:hidden"
          >
            Enregistrer un acte
          </button>
        </div>
      )}

      <section className="md:card">{tableauActes}</section>

      <p className="pb-2 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400 md:hidden">
        Un acte enregistré sur un coupon non synchronisé est rattaché automatiquement à l’arrivée de la
        session.
      </p>
    </div>
  )
}
