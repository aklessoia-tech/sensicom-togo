import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Saisie } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'
import { BasculeTheme } from '../../components/layout/BasculeTheme'

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

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <div className="flex justify-end p-4">
        <BasculeTheme />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
              SC
            </div>
            <h1 className="text-2xl font-bold">SensiCom Togo</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sensibilisation communautaire et orientation santé
            </p>
          </div>

          <form onSubmit={soumettre} className="card space-y-4">
            <Saisie
              label="Adresse e-mail"
              type="email"
              inputMode="email"
              autoComplete="username"
              obligatoire
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@exemple.tg"
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
              {envoi ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          {modeDemo && (
            <div className="mt-4">
              <Alerte ton="avertissement" titre="Mode démonstration">
                Supabase n'est pas encore configuré. Comptes de test :{' '}
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
