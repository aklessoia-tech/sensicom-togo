import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'
import { BasculeTheme } from '../../components/layout/BasculeTheme'
import { IconeCoche, IconePersonnes, IconeSoin, IconeTableau } from '../../components/ui/Icones'
import type { Role } from '../../lib/domain/types'

interface OptionRole {
  role: Role
  titre: string
  detail: string
  icone: ReactNode
  motIdentifiant: string
  action: string
}

/**
 * Les appareils sont partagés et changent de main à chaque prise de poste : le
 * choix du rôle oriente la saisie et l'écran d'arrivée. Il n'accorde aucun droit —
 * le rôle réel vient du profil et reste imposé par les politiques RLS.
 */
const OPTIONS: OptionRole[] = [
  {
    role: 'agent',
    titre: 'Agent de terrain',
    detail: 'Sessions, saisie anonyme, coupons',
    icone: <IconePersonnes />,
    motIdentifiant: 'Identifiant agent',
    action: 'Se connecter comme agent',
  },
  {
    role: 'infirmier',
    titre: 'Infirmerie',
    detail: 'Recherche de coupon, actes',
    icone: <IconeSoin />,
    motIdentifiant: 'Identifiant infirmerie',
    action: "Se connecter à l'infirmerie",
  },
  {
    role: 'admin',
    titre: 'Administration',
    detail: 'Indicateurs, alertes, référentiels',
    icone: <IconeTableau />,
    motIdentifiant: 'Identifiant administrateur',
    action: 'Se connecter comme administrateur',
  },
]

export function PageConnexion() {
  const { connecter, modeDemo } = useAuth()
  const [role, setRole] = useState<Role>('agent')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const option = OPTIONS.find((o) => o.role === role) as OptionRole

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    try {
      await connecter(email, motDePasse)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex justify-end p-4">
        <BasculeTheme />
      </div>

      <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
              SC
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">SensiCom Togo</h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Sensibilisation et orientation santé
              </p>
            </div>
          </div>

          <h2 className="text-xl font-bold">Qui utilise cet appareil ?</h2>
          <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
            Le rôle détermine ce que vous voyez. Il peut changer à chaque prise de poste.
          </p>

          <div className="mt-4 space-y-2" role="radiogroup" aria-label="Rôle">
            {OPTIONS.map((o) => {
              const actif = o.role === role
              return (
                <button
                  key={o.role}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => setRole(o.role)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    actif
                      ? 'border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      actif
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {o.icone}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{o.titre}</span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{o.detail}</span>
                  </span>
                  {actif && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                      <IconeCoche />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <form onSubmit={soumettre} className="mt-5 space-y-4">
            <Saisie
              label={option.motIdentifiant}
              type="email"
              inputMode="email"
              autoComplete="username"
              obligatoire
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={modeDemo ? `${role}@demo.tg` : `${role}@exemple.tg`}
            />
            <Saisie
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              obligatoire
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />

            {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

            <button type="submit" disabled={envoi} className="btn-primary w-full">
              {envoi ? 'Connexion…' : option.action}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Aucune donnée d’identité civile n’est collectée, à aucune étape.
          </p>

          {modeDemo && (
            <div className="mt-4">
              <Alerte ton="avertissement" titre="Mode démonstration">
                Supabase n’est pas encore configuré. Comptes de test :{' '}
                <code className="font-mono">agent@demo.tg</code>,{' '}
                <code className="font-mono">infirmier@demo.tg</code>,{' '}
                <code className="font-mono">admin@demo.tg</code> — mot de passe{' '}
                <code className="font-mono">demo1234</code>.
              </Alerte>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
