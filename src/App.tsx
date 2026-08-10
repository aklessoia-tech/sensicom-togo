import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { startSyncEngine } from './lib/offline/syncEngine'
import { rejouerFileSms } from './lib/supabase/sms'
import { rapprocherActesLocaux } from './lib/data/infirmier'
import { chargerAlertesFraude } from './lib/data/admin'
import { useReferentiels } from './hooks/useReferentiels'
import { Coquille, type EntreeNav } from './components/layout/Coquille'
import { BandeauMaj } from './components/layout/BandeauMaj'
import { PageConnexion } from './features/auth/PageConnexion'
import { PageSessions } from './features/agent/PageSessions'
import { PageNouvelleSession } from './features/agent/PageNouvelleSession'
import { PageSession } from './features/agent/PageSession'
import { PageAccueilInfirmier } from './features/infirmier/PageAccueilInfirmier'
import { PageActe } from './features/infirmier/PageActe'
import { PageHistorique } from './features/infirmier/PageHistorique'
// Graphiques et génération PDF ne servent qu'à l'administration : les charger à la
// demande évite d'imposer ce poids aux agents et infirmiers sur réseau mobile.
const PageTableauBord = lazy(() =>
  import('./features/admin/PageTableauBord').then((m) => ({ default: m.PageTableauBord })),
)
const PageAlertes = lazy(() =>
  import('./features/admin/PageAlertes').then((m) => ({ default: m.PageAlertes })),
)
const PageReferentiels = lazy(() =>
  import('./features/admin/PageReferentiels').then((m) => ({ default: m.PageReferentiels })),
)
import {
  IconeAlerte,
  IconeCoupon,
  IconeHistorique,
  IconeRecherche,
  IconeReglages,
  IconeSession,
  IconeTableau,
} from './components/ui/Icones'

const NAV_AGENT: EntreeNav[] = [
  { to: '/agent', label: 'Sessions', icone: <IconeSession /> },
  { to: '/agent/nouvelle-session', label: 'Nouvelle', icone: <IconeCoupon /> },
]

const NAV_INFIRMIER: EntreeNav[] = [
  { to: '/infirmier', label: 'Coupon', icone: <IconeRecherche /> },
  { to: '/infirmier/historique', label: 'Actes', icone: <IconeHistorique /> },
]

const NAV_ADMIN: EntreeNav[] = [
  { to: '/admin', label: 'Tableau de bord', icone: <IconeTableau /> },
  { to: '/admin/alertes', label: 'Alertes', icone: <IconeAlerte /> },
  { to: '/admin/referentiels', label: 'Référentiels', icone: <IconeReglages /> },
]

const ACCUEIL_PAR_ROLE = {
  agent: '/agent',
  infirmier: '/infirmier',
  admin: '/admin',
} as const

function Routage() {
  const { profile, chargement } = useAuth()
  const { referentiels } = useReferentiels()
  const [nbAlertes, setNbAlertes] = useState(0)

  // Le compteur d'alertes est porté par la navigation : l'admin doit le voir
  // depuis n'importe quel écran, pas seulement depuis le tableau de bord.
  useEffect(() => {
    if (profile?.role !== 'admin') return
    void chargerAlertesFraude().then((a) => setNbAlertes(a.length))
  }, [profile?.role])

  useEffect(() => {
    if (!profile) return
    const arreter = startSyncEngine()

    // Les données reçues d'autres appareils peuvent débloquer des rattachements locaux.
    const rejouer = () => {
      void rejouerFileSms()
      void rapprocherActesLocaux()
    }
    window.addEventListener('online', rejouer)
    rejouer()

    return () => {
      arreter()
      window.removeEventListener('online', rejouer)
    }
  }, [profile])

  if (chargement) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Chargement…</div>
    )
  }

  if (!profile) return <PageConnexion />

  const accueil = ACCUEIL_PAR_ROLE[profile.role]

  const zone = referentiels.zones.find((z) => z.id === profile.zone_id)
  const perimetre = zone ? `${zone.campus} — ${zone.secteur}` : 'Périmètre national'

  const navAdmin = NAV_ADMIN.map((e) =>
    e.to === '/admin/alertes' ? { ...e, badge: nbAlertes || undefined } : e,
  )

  return (
    <Routes>
      {profile.role === 'agent' && (
        <Route element={<Coquille titre="Espace agent" nav={NAV_AGENT} perimetre={perimetre} />}>
          <Route path="/agent" element={<PageSessions />} />
          <Route path="/agent/nouvelle-session" element={<PageNouvelleSession />} />
          <Route path="/agent/session/:sessionId" element={<PageSession />} />
        </Route>
      )}

      {profile.role === 'infirmier' && (
        <Route element={<Coquille titre="Espace infirmerie" nav={NAV_INFIRMIER} perimetre={perimetre} />}>
          <Route path="/infirmier" element={<PageAccueilInfirmier />} />
          <Route path="/infirmier/acte" element={<PageActe />} />
          <Route path="/infirmier/historique" element={<PageHistorique />} />
        </Route>
      )}

      {profile.role === 'admin' && (
        <Route
          element={
            <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Chargement…</div>}>
              <Coquille titre="Administration" nav={navAdmin} perimetre={perimetre} />
            </Suspense>
          }
        >
          <Route path="/admin" element={<PageTableauBord />} />
          <Route path="/admin/alertes" element={<PageAlertes />} />
          <Route path="/admin/referentiels" element={<PageReferentiels />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={accueil} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routage />
          <BandeauMaj />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
