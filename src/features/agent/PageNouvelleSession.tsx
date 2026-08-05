import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useReferentiels } from '../../hooks/useReferentiels'
import { zonesDeUniversite } from '../../lib/data/referentiels'
import { creerSession } from '../../lib/data/agent'
import { Liste, Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PageNouvelleSession() {
  const { profile } = useAuth()
  const { referentiels } = useReferentiels()
  const naviguer = useNavigate()

  const [universiteId, setUniversiteId] = useState(profile?.universite_id ?? '')
  const [zoneId, setZoneId] = useState(profile?.zone_id ?? '')
  const [thematiqueId, setThematiqueId] = useState('')
  const [date, setDate] = useState(aujourdhui)
  const [presents, setPresents] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const zonesDisponibles = useMemo(
    () => zonesDeUniversite(referentiels.zones, universiteId || null),
    [referentiels.zones, universiteId],
  )

  const universiteChoisie = referentiels.universites.find((u) => u.id === universiteId)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setErreur(null)

    if (!universiteId || !zoneId || !thematiqueId) {
      setErreur('Zone géographique et thématique sont obligatoires.')
      return
    }

    setEnvoi(true)
    try {
      const session = await creerSession({
        agent_id: profile.id,
        universite_id: universiteId,
        zone_id: zoneId,
        thematique_id: thematiqueId,
        date_session: date,
        nombre_presents: presents ? Number(presents) : null,
      })
      naviguer(`/agent/session/${session.id}`)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Nouvelle session</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Déclarez la séance avant de saisir les personnes sensibilisées.
        </p>
      </div>

      <form onSubmit={soumettre} className="card space-y-4">
        <Liste
          label="Université"
          obligatoire
          value={universiteId}
          onChange={(e) => {
            setUniversiteId(e.target.value)
            setZoneId('')
          }}
          options={referentiels.universites.map((u) => ({ value: u.id, label: `${u.nom} (${u.region})` }))}
        />

        <Liste
          label="Campus et secteur"
          obligatoire
          disabled={!universiteId}
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          aide={universiteChoisie ? `Région ${universiteChoisie.region}` : 'Choisissez d’abord une université'}
          options={zonesDisponibles.map((z) => ({ value: z.id, label: `${z.campus} — ${z.secteur}` }))}
        />

        <Liste
          label="Thématique"
          obligatoire
          value={thematiqueId}
          onChange={(e) => setThematiqueId(e.target.value)}
          options={referentiels.thematiques.map((t) => ({ value: t.id, label: t.libelle }))}
        />

        <Saisie
          label="Date de la session"
          type="date"
          obligatoire
          required
          max={aujourdhui()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Saisie
          label="Nombre de personnes présentes"
          facultatif
          type="number"
          inputMode="numeric"
          min={0}
          value={presents}
          onChange={(e) => setPresents(e.target.value)}
          aide="Sert au calcul du taux d'engagement. Laissez vide si non compté."
        />

        {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

        <button type="submit" disabled={envoi} className="btn-primary w-full">
          {envoi ? 'Enregistrement…' : 'Démarrer la session'}
        </button>
      </form>
    </div>
  )
}
