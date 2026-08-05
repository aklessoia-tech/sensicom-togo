import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useReferentiels } from '../../hooks/useReferentiels'
import { enregistrerActe, rechercherCoupon, type CouponTrouve } from '../../lib/data/infirmier'
import { TYPES_ACTE, type TypeActe } from '../../lib/domain/types'
import { BoutonsRadio, Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PageActe() {
  const { profile } = useAuth()
  const { referentiels } = useReferentiels()
  const naviguer = useNavigate()
  const [params] = useSearchParams()

  const numeroInitial = params.get('coupon') ?? ''
  const illisible = params.get('illisible') === '1'

  const [couponTrouve, setCouponTrouve] = useState<CouponTrouve | null>(null)
  const [typeActe, setTypeActe] = useState<TypeActe | ''>('')
  const [date, setDate] = useState(aujourdhui)
  const [zoneApproximative, setZoneApproximative] = useState('')
  const [notes, setNotes] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (numeroInitial) void rechercherCoupon(numeroInitial).then(setCouponTrouve)
  }, [numeroInitial])

  const zoneInfirmier = referentiels.zones.find((z) => z.id === profile?.zone_id)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setErreur(null)

    if (!typeActe) {
      setErreur('Sélectionnez le type d’acte réalisé.')
      return
    }

    // Sans coupon rattachable, l'acte reste rattaché à la zone de l'infirmier
    // et n'est jamais raccroché automatiquement à une session.
    const zoneId = couponTrouve?.coupon.zone_id ?? profile.zone_id
    if (!zoneId) {
      setErreur('Aucune zone n’est associée à votre compte. Contactez l’administrateur.')
      return
    }

    setEnvoi(true)
    try {
      await enregistrerActe({
        infirmier_id: profile.id,
        zone_id: zoneId,
        type_acte: typeActe,
        date_acte: date,
        coupon_id: couponTrouve?.coupon.id ?? null,
        numero_coupon_saisi: illisible ? null : numeroInitial || null,
        coupon_illisible: illisible,
        zone_approximative: illisible ? zoneApproximative || null : null,
        notes: notes || null,
      })
      naviguer('/infirmier/historique')
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Enregistrer un acte</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucune donnée d’identité n’est saisie ni conservée.
        </p>
      </div>

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
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Coupon</dt>
              <dd className="font-mono text-xs">{couponTrouve.coupon.numero}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Zone</dt>
              <dd className="font-medium">{couponTrouve.zone_libelle}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Thématique</dt>
              <dd className="font-medium">{couponTrouve.thematique_libelle}</dd>
            </div>
          </dl>
        </div>
      )}

      <form onSubmit={soumettre} className="card space-y-4">
        <BoutonsRadio
          label="Acte réalisé"
          obligatoire
          valeur={typeActe}
          onChange={(v) => setTypeActe(v as TypeActe)}
          options={TYPES_ACTE.map((t) => ({ value: t.value, label: t.label }))}
        />

        <Saisie
          label="Date de l’acte"
          type="date"
          obligatoire
          required
          max={aujourdhui()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {illisible && (
          <Saisie
            label="Zone approximative"
            facultatif
            value={zoneApproximative}
            onChange={(e) => setZoneApproximative(e.target.value)}
            placeholder={zoneInfirmier ? `${zoneInfirmier.campus} — ${zoneInfirmier.secteur}` : 'Campus, secteur…'}
            aide="Indication libre, utilisée uniquement pour les statistiques."
          />
        )}

        <Saisie
          label="Observations"
          facultatif
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aide="Ne renseignez aucune information permettant d’identifier la personne."
        />

        {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

        <div className="flex gap-2">
          <button type="button" onClick={() => naviguer('/infirmier')} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={envoi} className="btn-primary flex-1">
            {envoi ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
