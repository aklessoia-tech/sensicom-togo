import { useEffect, useState } from 'react'
import { lireReferentielsLocaux, synchroniserReferentiels, type Referentiels } from '../lib/data/referentiels'
import { useAuth } from '../context/AuthContext'

const VIDE: Referentiels = { universites: [], zones: [], thematiques: [] }

export function useReferentiels(): { referentiels: Referentiels; chargement: boolean } {
  const { profile } = useAuth()
  const [referentiels, setReferentiels] = useState<Referentiels>(VIDE)
  const [chargement, setChargement] = useState(true)

  // Le rafraîchissement suit la session : monté avant la connexion (c'est le cas
  // de la coquille), le hook n'obtiendrait rien de RLS et ne réessaierait jamais.
  useEffect(() => {
    let actif = true

    // Le cache local s'affiche immédiatement, la mise à jour réseau le remplace ensuite.
    void lireReferentielsLocaux().then((locaux) => {
      if (actif) {
        setReferentiels(locaux)
        setChargement(false)
      }
    })

    void synchroniserReferentiels().then((frais) => {
      if (actif) setReferentiels(frais)
    })

    return () => {
      actif = false
    }
  }, [profile?.id])

  return { referentiels, chargement }
}
