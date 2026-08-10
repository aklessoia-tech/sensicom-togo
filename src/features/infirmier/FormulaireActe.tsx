import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useReferentiels } from '../../hooks/useReferentiels'
import { enregistrerActe, type CouponTrouve } from '../../lib/data/infirmier'
import { TYPES_ACTE, type TypeActe } from '../../lib/domain/types'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Saisie de l'acte, partagée par la page mobile et la colonne de droite du poste
 * de PC : les deux enregistrent exactement la même chose, il n'y a pas lieu d'en
 * tenir deux versions.
 */
export function FormulaireActe({
  coupon,
  numeroSaisi,
  illisible = false,
  surEnregistrement,
  surAnnulation,
}: {
  coupon?: CouponTrouve | null
  /** Numéro tapé alors que le coupon n'est pas encore connu de l'appareil. */
  numeroSaisi?: string | null
  illisible?: boolean
  surEnregistrement: () => void
  surAnnulation?: () => void
}) {
  const { profile } = useAuth()
  const { referentiels } = useReferentiels()

  const [typeActe, setTypeActe] = useState<TypeActe | ''>('')
  const [date, setDate] = useState(aujourdhui)
  const [zoneApproximative, setZoneApproximative] = useState('')
  const [notes, setNotes] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

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
    const zoneId = coupon?.coupon.zone_id ?? profile.zone_id
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
        coupon_id: coupon?.coupon.id ?? null,
        numero_coupon_saisi: illisible ? null : (coupon?.coupon.numero ?? numeroSaisi ?? null),
        coupon_illisible: illisible,
        zone_approximative: illisible ? zoneApproximative || null : null,
        notes: notes || null,
      })
      surEnregistrement()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={soumettre}>
      <h2 className="text-[15px] font-bold">Enregistrer un acte</h2>
      <p className="mt-1 text-[12.5px] leading-snug text-slate-500 dark:text-slate-400">
        {illisible
          ? 'L’acte sera comptabilisé sans rattachement à une session.'
          : 'L’acte sera rattaché au coupon.'}
      </p>

      <fieldset className="mt-4">
        <legend className="surtitre mb-2">Acte réalisé</legend>
        <div className="grid grid-cols-2 gap-2">
          {TYPES_ACTE.map((t) => {
            const actif = typeActe === t.value
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={actif}
                onClick={() => setTypeActe(t.value)}
                className={`min-h-[46px] rounded-[11px] border text-[13px] font-semibold transition-colors duration-150 ${
                  actif
                    ? 'border-2 border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 space-y-4">
        <Saisie
          label="Date de l’acte"
          type="date"
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
            placeholder={
              zoneInfirmier ? `${zoneInfirmier.campus} — ${zoneInfirmier.secteur}` : 'Campus, secteur…'
            }
            aide="Indication libre, utilisée uniquement pour les statistiques."
          />
        )}

        <Saisie
          label="Observations"
          facultatif
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aucune information permettant d’identifier la personne"
        />
      </div>

      {erreur && (
        <div className="mt-3">
          <Alerte ton="erreur">{erreur}</Alerte>
        </div>
      )}

      <div className="mt-4 flex gap-2.5">
        {surAnnulation && (
          <button type="button" onClick={surAnnulation} className="btn-secondary flex-1">
            Annuler
          </button>
        )}
        <button type="submit" disabled={envoi} className="btn-primary flex-[2]">
          {envoi ? 'Enregistrement…' : 'Enregistrer l’acte'}
        </button>
      </div>
    </form>
  )
}
