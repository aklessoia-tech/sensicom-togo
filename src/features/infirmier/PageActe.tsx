import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { rechercherCoupon, type CouponTrouve } from '../../lib/data/infirmier'
import { Alerte } from '../../components/ui/Alerte'
import { FormulaireActe } from './FormulaireActe'

export function PageActe() {
  const naviguer = useNavigate()
  const [params] = useSearchParams()

  const numeroInitial = params.get('coupon') ?? ''
  const illisible = params.get('illisible') === '1'

  const [couponTrouve, setCouponTrouve] = useState<CouponTrouve | null>(null)

  useEffect(() => {
    if (numeroInitial) void rechercherCoupon(numeroInitial).then(setCouponTrouve)
  }, [numeroInitial])

  return (
    <div className="space-y-4">
      {illisible && (
        <Alerte ton="avertissement" titre="Coupon illisible ou perdu">
          L’acte sera comptabilisé sans rattachement à une session. Indiquez la zone approximative
          pour préserver la qualité des statistiques.
        </Alerte>
      )}

      {!illisible && numeroInitial && !couponTrouve && (
        <Alerte ton="info" titre="En attente de rapprochement">
          Le coupon <span className="font-mono text-xs">{numeroInitial}</span> n’est pas encore connu
          de cet appareil. L’acte sera rattaché automatiquement dès réception de la session.
        </Alerte>
      )}

      {couponTrouve && (
        <div className="card">
          <dl className="filets">
            {(
              [
                ['Coupon', <span className="font-mono text-[12px]">{couponTrouve.coupon.numero}</span>],
                ['Zone', couponTrouve.zone_libelle],
                ['Thématique', couponTrouve.thematique_libelle],
              ] as const
            ).map(([cle, valeur], i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[12.5px] text-slate-500 dark:text-slate-400">{cle}</dt>
                <dd className="min-w-0 truncate text-right text-[13px] font-medium">{valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="card">
        <FormulaireActe
          coupon={couponTrouve}
          numeroSaisi={numeroInitial || null}
          illisible={illisible}
          surEnregistrement={() => naviguer('/infirmier/historique')}
          surAnnulation={() => naviguer('/infirmier')}
        />
      </div>
    </div>
  )
}
