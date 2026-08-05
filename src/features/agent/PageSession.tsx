import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/offline/db'
import { useReferentiels } from '../../hooks/useReferentiels'
import {
  enregistrerCoupon,
  enregistrerPersonne,
  prochainNumeroCoupon,
  verifierDoublon,
} from '../../lib/data/agent'
import { genererCouponSecours, numeroCouponValide } from '../../lib/domain/coupons'
import { telephoneValide } from '../../lib/domain/telephone'
import { envoyerRappelSms } from '../../lib/supabase/sms'
import { GENRES, TRANCHES_AGE, type Genre, type TrancheAge } from '../../lib/domain/types'
import { BoutonsRadio, Liste, Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

export function PageSession() {
  const { sessionId = '' } = useParams()
  const { referentiels } = useReferentiels()

  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const personnes = useLiveQuery(
    () => db.personnes.where('session_id').equals(sessionId).toArray(),
    [sessionId],
    [],
  )
  const coupons = useLiveQuery(
    () => db.coupons.where('session_id').equals(sessionId).toArray(),
    [sessionId],
    [],
  )

  const universite = referentiels.universites.find((u) => u.id === session?.universite_id)
  const zone = referentiels.zones.find((z) => z.id === session?.zone_id)
  const thematique = referentiels.thematiques.find((t) => t.id === session?.thematique_id)

  const [genre, setGenre] = useState<Genre | ''>('')
  const [trancheAge, setTrancheAge] = useState<TrancheAge | ''>('')
  const [telephone, setTelephone] = useState('')
  const [numeroCoupon, setNumeroCoupon] = useState('')
  const [couponSecours, setCouponSecours] = useState(false)
  const [avertissementDoublon, setAvertissementDoublon] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const proposerNumero = useCallback(async () => {
    if (!universite || !zone || !session) return
    setNumeroCoupon(await prochainNumeroCoupon(universite, zone, session.date_session))
    setCouponSecours(false)
  }, [universite, zone, session])

  useEffect(() => {
    if (!numeroCoupon) void proposerNumero()
  }, [numeroCoupon, proposerNumero])

  // L'avertissement est indicatif : une personne peut légitimement revenir.
  async function surTelephone(valeur: string) {
    setTelephone(valeur)
    setAvertissementDoublon(null)
    if (!telephoneValide(valeur)) return

    const { doublon, joursDepuis } = await verifierDoublon(valeur)
    if (doublon) {
      setAvertissementDoublon(
        joursDepuis === 0
          ? 'Ce numéro a déjà été enregistré aujourd’hui.'
          : `Ce numéro a déjà été enregistré il y a ${joursDepuis} jour(s).`,
      )
    }
  }

  function genererSecours() {
    if (!universite || !zone || !session) return
    setNumeroCoupon(genererCouponSecours(universite, zone, session.date_session))
    setCouponSecours(true)
  }

  function reinitialiser() {
    setGenre('')
    setTrancheAge('')
    setTelephone('')
    setNumeroCoupon('')
    setCouponSecours(false)
    setAvertissementDoublon(null)
  }

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!session || !zone) return
    setErreur(null)
    setConfirmation(null)

    if (!genre || !trancheAge) {
      setErreur('Genre et tranche d’âge sont obligatoires.')
      return
    }
    if (!telephoneValide(telephone)) {
      setErreur('Le numéro de téléphone doit comporter 8 chiffres.')
      return
    }
    if (!numeroCoupon.trim() || (!couponSecours && !numeroCouponValide(numeroCoupon))) {
      setErreur('Numéro de coupon invalide. Format attendu : RÉGION-CAMPUS-ZONE-AAAAMMJJ-NNN.')
      return
    }

    setEnvoi(true)
    try {
      const personne = await enregistrerPersonne({
        session_id: session.id,
        genre,
        tranche_age: trancheAge,
        telephone,
      })

      await enregistrerCoupon({
        numero: numeroCoupon,
        session_id: session.id,
        personne_id: personne.id,
        zone_id: session.zone_id,
        thematique_id: session.thematique_id,
        date_emission: session.date_session,
        genere_secours: couponSecours,
      })

      const etatSms = await envoyerRappelSms({
        telephone,
        numero_coupon: numeroCoupon.trim().toUpperCase(),
        zone_libelle: `${zone.campus} — ${zone.secteur}`,
      })

      setConfirmation(
        etatSms === 'envoye'
          ? 'Personne enregistrée, coupon attribué et SMS de rappel envoyé.'
          : 'Personne enregistrée et coupon attribué. Le SMS partira au retour du réseau.',
      )
      reinitialiser()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setEnvoi(false)
    }
  }

  const enAttente = useMemo(
    () => personnes.filter((p) => p.syncState === 'pending').length,
    [personnes],
  )

  if (!session) {
    return (
      <Alerte ton="avertissement">
        Session introuvable. <Link className="underline" to="/agent">Retour aux sessions</Link>
      </Alerte>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{thematique?.libelle ?? 'Session'}</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {zone ? `${zone.campus} — ${zone.secteur}` : 'Zone'} · {session.date_session}
            </p>
          </div>
          <Link to="/agent" className="btn-secondary shrink-0 !min-h-[36px] !py-1.5 text-xs">
            Sessions
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Sensibilisés</dt>
            <dd className="text-xl font-bold">{personnes.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Coupons</dt>
            <dd className="text-xl font-bold">{coupons.length}</dd>
          </div>
          <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
            <dt className="text-xs text-slate-500 dark:text-slate-400">À synchroniser</dt>
            <dd className="text-xl font-bold">{enAttente}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={soumettre} className="card space-y-4">
        <div>
          <h2 className="font-semibold">Personne sensibilisée</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Saisie anonyme : aucun nom ni identité n’est demandé ni conservé.
          </p>
        </div>

        <BoutonsRadio
          label="Genre"
          obligatoire
          valeur={genre}
          onChange={(v) => setGenre(v as Genre)}
          options={GENRES.map((g) => ({ value: g.value, label: g.label }))}
        />

        <Liste
          label="Tranche d’âge"
          obligatoire
          value={trancheAge}
          onChange={(e) => setTrancheAge(e.target.value as TrancheAge)}
          options={TRANCHES_AGE.map((t) => ({ value: t, label: `${t} ans` }))}
        />

        <Saisie
          label="Téléphone"
          type="tel"
          inputMode="numeric"
          obligatoire
          value={telephone}
          onChange={(e) => void surTelephone(e.target.value)}
          placeholder="90 12 34 56"
          aide="Utilisé pour le SMS de rappel puis converti en empreinte : le numéro n’est jamais stocké en clair."
        />

        {avertissementDoublon && (
          <Alerte ton="avertissement" titre="Doublon possible">
            {avertissementDoublon} Vous pouvez tout de même poursuivre l’enregistrement.
          </Alerte>
        )}

        <div className="space-y-2">
          <Saisie
            label="Numéro de coupon"
            obligatoire
            value={numeroCoupon}
            onChange={(e) => setNumeroCoupon(e.target.value.toUpperCase())}
            aide={couponSecours ? 'Coupon numérique de secours généré.' : 'Proposé automatiquement, modifiable.'}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => void proposerNumero()} className="btn-secondary flex-1 text-xs">
              Numéro suivant
            </button>
            <button type="button" onClick={genererSecours} className="btn-secondary flex-1 text-xs">
              Coupon de secours
            </button>
          </div>
        </div>

        {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
        {confirmation && <Alerte ton="succes">{confirmation}</Alerte>}

        <button type="submit" disabled={envoi} className="btn-primary w-full">
          {envoi ? 'Enregistrement…' : 'Enregistrer et remettre le coupon'}
        </button>
      </form>

      {coupons.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Coupons émis</h2>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {coupons
              .slice()
              .reverse()
              .map((c) => (
                <li key={c.id} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-xs">{c.numero}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.syncState === 'synced'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : c.syncState === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                      }`}
                    >
                      {c.syncState === 'synced' ? 'Synchronisé' : c.syncState === 'error' ? 'Erreur' : 'En attente'}
                    </span>
                  </div>
                  {c.syncState === 'error' && c.syncError && (
                    <p className="mt-1 text-[11px] leading-snug text-red-700 dark:text-red-300">{c.syncError}</p>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
