import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase/client'
import { amorcerReferentielsDemo, COMPTES_DEMO, MOT_DE_PASSE_DEMO } from '../lib/data/demo'
import { clearLocalData, db } from '../lib/offline/db'
import type { Profile } from '../lib/domain/types'

interface AuthValue {
  profile: Profile | null
  chargement: boolean
  modeDemo: boolean
  /** Motif d'un accès refusé alors que les identifiants étaient bons. */
  refusAcces: string | null
  connecter: (email: string, motDePasse: string) => Promise<void>
  deconnecter: () => Promise<void>
}

const REFUS_INACTIF =
  'Votre compte n’est pas encore validé par l’administration. Réessayez une fois qu’il aura été activé.'

const AuthContext = createContext<AuthValue | null>(null)
const CLE_PROFIL = 'sensicom-profile'

function profilEnCache(): Profile | null {
  const brut = localStorage.getItem(CLE_PROFIL)
  return brut ? (JSON.parse(brut) as Profile) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [chargement, setChargement] = useState(true)
  const [refusAcces, setRefusAcces] = useState<string | null>(null)
  const modeDemo = !isSupabaseConfigured

  // Le contrôle vit ici, et non dans `connecter` : l'écouteur onAuthStateChange
  // charge le profil de son côté dès l'ouverture de session. Une vérification
  // faite après coup laisserait l'application s'afficher un instant, puis
  // remonterait l'écran de connexion en effaçant le message.
  const chargerProfil = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

    // Hors ligne, la requête échoue : le profil mis en cache prend le relais
    // pour que l'agent puisse continuer à travailler sur le terrain.
    if (error || !data) {
      const cache = profilEnCache()
      setProfile(cache)
      return
    }

    const profil = data as Profile

    if (!profil.actif) {
      localStorage.removeItem(CLE_PROFIL)
      setProfile(null)
      setRefusAcces(REFUS_INACTIF)
      await supabase.auth.signOut()
      return
    }

    localStorage.setItem(CLE_PROFIL, JSON.stringify(profil))
    setRefusAcces(null)
    setProfile(profil)
  }, [])

  useEffect(() => {
    if (modeDemo) {
      void amorcerReferentielsDemo()
      setProfile(profilEnCache())
      setChargement(false)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void chargerProfil(data.session.user.id).finally(() => setChargement(false))
      else setChargement(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void chargerProfil(session.user.id)
      else setProfile(null)
    })

    return () => sub.subscription.unsubscribe()
  }, [modeDemo, chargerProfil])

  const connecter = useCallback(
    async (email: string, motDePasse: string) => {
      const identifiant = email.trim().toLowerCase()

      if (modeDemo) {
        const compte = COMPTES_DEMO[identifiant]
        if (!compte || motDePasse !== MOT_DE_PASSE_DEMO) {
          throw new Error('Identifiants de démonstration invalides')
        }
        await amorcerReferentielsDemo()
        localStorage.setItem(CLE_PROFIL, JSON.stringify(compte))
        setProfile(compte)
        return
      }

      setRefusAcces(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifiant,
        password: motDePasse,
      })
      if (error) throw new Error(error.message)

      // chargerProfil écarte lui-même les comptes non validés et renseigne
      // `refusAcces`, que l'écran de connexion affiche.
      await chargerProfil(data.user.id)
    },
    [modeDemo, chargerProfil],
  )

  // Les données locales sont effacées à la déconnexion (appareils souvent partagés),
  // mais jamais tant que des saisies terrain n'ont pas atteint le serveur.
  const deconnecter = useCallback(async () => {
    const enAttente = await db.outbox.count()
    if (enAttente > 0) {
      throw new Error(
        `${enAttente} saisie(s) ne sont pas encore synchronisées. Connectez-vous à Internet avant de quitter.`,
      )
    }

    if (!modeDemo) await supabase.auth.signOut()
    localStorage.removeItem(CLE_PROFIL)
    await clearLocalData()
    setProfile(null)
  }, [modeDemo])

  return (
    <AuthContext.Provider
      value={{ profile, chargement, modeDemo, refusAcces, connecter, deconnecter }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return value
}
