import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'
import { BasculeTheme } from '../../components/layout/BasculeTheme'
import {
  IconeCoche,
  IconeFleche,
  IconePersonnes,
  IconeSoin,
  IconeTableau,
} from '../../components/ui/Icones'
import type { Role } from '../../lib/domain/types'

interface OptionRole {
  role: Role
  titre: string
  detail: string
  icone: ReactNode
  motIdentifiant: string
  action: string
  compteDemo: string
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
    compteDemo: 'agent@demo.tg',
  },
  {
    role: 'infirmier',
    titre: 'Infirmerie',
    detail: 'Recherche de coupon, actes',
    icone: <IconeSoin />,
    motIdentifiant: 'Identifiant infirmerie',
    action: "Se connecter à l'infirmerie",
    compteDemo: 'infirmier@demo.tg',
  },
  {
    role: 'admin',
    titre: 'Administration',
    detail: 'Indicateurs, alertes, référentiels',
    icone: <IconeTableau />,
    motIdentifiant: 'Identifiant administrateur',
    action: 'Se connecter comme administrateur',
    compteDemo: 'admin@demo.tg',
  },
]

/** Ce que la plateforme garantit ; repris en filet rouge sur le panneau de marque. */
const ARGUMENTS = [
  {
    amorce: 'Anonymat',
    texte: 'Aucune donnée d’identité civile n’est collectée, à aucune étape.',
  },
  {
    amorce: 'Hors ligne',
    texte: 'Les saisies terrain partent d’abord sur l’appareil, puis se synchronisent.',
  },
  {
    amorce: 'Cloisonnement',
    texte: 'Chaque rôle ne voit que son périmètre, appliqué côté base par les politiques RLS.',
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

  /** En démonstration, le choix du rôle remplit aussi les identifiants correspondants. */
  function choisirRole(o: OptionRole) {
    setRole(o.role)
    if (modeDemo) {
      setEmail(o.compteDemo)
      setMotDePasse('demo1234')
    }
  }

  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950 lg:flex">
      {/* Panneau de marque : sur mobile il coûterait un écran entier avant le
          formulaire, il n'apparaît donc qu'à partir du poste de travail. */}
      <aside className="hidden bg-brand-800 px-9 py-10 dark:bg-brand-900 lg:flex lg:w-[44%] lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white">
            SC
          </span>
          <p className="text-2xl font-bold tracking-tight text-white">SensiCom Togo</p>
        </div>

        <p className="mt-5 max-w-[32ch] text-sm leading-relaxed text-brand-200">
          Sensibilisation communautaire en milieu universitaire et suivi des orientations vers
          l’infirmerie par coupons.
        </p>

        <div className="mt-10 space-y-6">
          {ARGUMENTS.map((a) => (
            <div key={a.amorce} className="border-l-2 border-accent pl-4">
              <p className="amorce">{a.amorce}</p>
              <p className="mt-1 max-w-[38ch] text-[12.5px] leading-relaxed text-brand-100">{a.texte}</p>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col bg-white dark:bg-slate-950 lg:bg-slate-50 lg:dark:bg-slate-900">
        <div className="flex justify-end p-4">
          <BasculeTheme />
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pb-14 lg:items-center">
          <div className="w-full max-w-[352px]">
            {/* Sur mobile, la marque tient lieu d'en-tête puisque le panneau est masqué. */}
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
                SC
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">SensiCom Togo</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  Sensibilisation et orientation santé
                </p>
              </div>
            </div>

            <h1 className="text-[22px] font-bold tracking-tight">Qui utilise cet appareil ?</h1>
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
                    onClick={() => choisirRole(o)}
                    className={`flex min-h-[76px] w-full items-center gap-3 rounded-[14px] p-3 text-left transition-colors duration-150 ${
                      actif
                        ? 'border-2 border-brand-600 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/30'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        actif
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {o.icone}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{o.titre}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-slate-500 dark:text-slate-400">
                        {o.detail}
                      </span>
                    </span>
                    {actif && (
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={modeDemo ? option.compteDemo : `${role}@exemple.tg`}
              />
              <Saisie
                label="Mot de passe"
                type="password"
                autoComplete="current-password"
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
              />

              {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

              <button type="submit" disabled={envoi} className="btn-primary w-full !min-h-[52px]">
                {envoi ? 'Connexion…' : option.action}
                {!envoi && <IconeFleche />}
              </button>
            </form>

            {modeDemo && (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="surtitre">Mode démonstration</p>
                <p className="mt-2 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
                  Le choix du rôle remplit les identifiants. Mot de passe{' '}
                  <code className="font-mono">demo1234</code>. Les données restent sur cet appareil.
                </p>
              </div>
            )}

            <p className="mt-6 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Aucune donnée d’identité civile n’est collectée ni stockée, à aucune étape.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
