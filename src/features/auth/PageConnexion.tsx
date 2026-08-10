import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'
import { BasculeTheme } from '../../components/layout/BasculeTheme'
import { IconeFleche } from '../../components/ui/Icones'

const COMPTES_DEMO = ['agent@demo.tg', 'infirmier@demo.tg', 'admin@demo.tg']

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
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

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

  /** En démonstration, la pastille remplit les deux champs : rien à retenir ni à taper. */
  function choisirDemo(compte: string) {
    setEmail(compte)
    setMotDePasse('demo1234')
  }

  const formulaire = (
    <form onSubmit={soumettre} className="space-y-4">
      <Saisie
        label="Adresse e-mail"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vous@exemple.tg"
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
        {envoi ? 'Connexion…' : 'Se connecter'}
        {!envoi && <IconeFleche />}
      </button>
    </form>
  )

  const blocDemo = modeDemo && (
    <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
      <p className="surtitre">Mode démonstration</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {COMPTES_DEMO.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => choisirDemo(c)}
            className={`min-h-[44px] rounded-full border px-3.5 text-xs font-semibold transition-colors ${
              email === c
                ? 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
        Mot de passe <code className="font-mono">demo1234</code>. Les données restent sur cet appareil.
      </p>
    </div>
  )

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
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{a.amorce}</p>
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

            <h1 className="text-[22px] font-bold tracking-tight">Connexion</h1>
            <p className="mb-5 mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
              Espace agent, infirmerie ou administration selon votre compte.
            </p>

            {formulaire}
            {blocDemo}

            <p className="mt-6 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Aucune donnée d’identité civile n’est collectée ni stockée, à aucune étape.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
