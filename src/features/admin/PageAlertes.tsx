import { useEffect, useState, type FormEvent } from 'react'
import {
  chargerAlertesFraude,
  enregistrerSeuilsFraude,
  lireSeuilsFraude,
  type AlerteFraude,
} from '../../lib/data/admin'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'

export function PageAlertes() {
  const [alertes, setAlertes] = useState<AlerteFraude[]>([])
  const [volumeJour, setVolumeJour] = useState('30')
  const [ecartType, setEcartType] = useState('2.5')
  const [message, setMessage] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    void Promise.all([chargerAlertesFraude(), lireSeuilsFraude()]).then(([a, seuils]) => {
      setAlertes(a)
      setVolumeJour(String(seuils.volumeJour))
      setEcartType(String(seuils.ecartType))
      setChargement(false)
    })
  }, [])

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    setMessage(null)
    try {
      await enregistrerSeuilsFraude(Number(volumeJour), Number(ecartType))
      setAlertes(await chargerAlertesFraude())
      setMessage('Seuils enregistrés.')
    } catch {
      setMessage('Enregistrement impossible.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Alertes anti-fraude</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pics anormaux de coupons déclarés, comparés au volume habituel de chaque agent.
        </p>
      </div>

      <form onSubmit={enregistrer} className="card grid gap-3 sm:grid-cols-3">
        <Saisie
          label="Seuil de volume quotidien"
          type="number"
          min={1}
          value={volumeJour}
          onChange={(e) => setVolumeJour(e.target.value)}
          aide="Alerte au-delà de ce nombre de coupons par agent et par jour."
        />
        <Saisie
          label="Seuil d’écart-type"
          type="number"
          step="0.1"
          min={1}
          value={ecartType}
          onChange={(e) => setEcartType(e.target.value)}
          aide="Alerte quand l’activité du jour dépasse la moyenne de l’agent de N écarts-types."
        />
        <div className="flex items-end">
          <button type="submit" disabled={!isSupabaseConfigured} className="btn-primary w-full">
            Enregistrer les seuils
          </button>
        </div>
      </form>

      {message && <Alerte ton="info">{message}</Alerte>}

      {!isSupabaseConfigured ? (
        <Alerte ton="avertissement">
          La détection s’appuie sur des vues serveur : elle sera active une fois Supabase configuré.
        </Alerte>
      ) : chargement ? (
        <Alerte ton="info">Analyse en cours…</Alerte>
      ) : alertes.length === 0 ? (
        <Alerte ton="succes">Aucun pic anormal détecté avec les seuils actuels.</Alerte>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-3">Agent</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3 text-right">Coupons</th>
                <th className="py-2 pr-3 text-right">Moyenne</th>
                <th className="py-2 pr-3 text-right">Écart</th>
                <th className="py-2">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {alertes.map((a) => (
                <tr key={`${a.agent_id}-${a.date_emission}`}>
                  <td className="py-2 pr-3 font-medium">{a.agent_nom}</td>
                  <td className="py-2 pr-3">{a.date_emission}</td>
                  <td className="py-2 pr-3 text-right font-bold text-red-600 dark:text-red-400">{a.nb_coupons}</td>
                  <td className="py-2 pr-3 text-right">{a.moyenne_agent}</td>
                  <td className="py-2 pr-3 text-right">{a.score_z}σ</td>
                  <td className="py-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {a.motif === 'volume_absolu' ? 'Volume élevé' : 'Pic statistique'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
