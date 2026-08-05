import { useEffect, useState } from 'react'
import { lireReferentielsLocaux, synchroniserReferentiels, type Referentiels } from '../lib/data/referentiels'

const VIDE: Referentiels = { universites: [], zones: [], thematiques: [] }

export function useReferentiels(): { referentiels: Referentiels; chargement: boolean } {
  const [referentiels, setReferentiels] = useState<Referentiels>(VIDE)
  const [chargement, setChargement] = useState(true)

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
  }, [])

  return { referentiels, chargement }
}
