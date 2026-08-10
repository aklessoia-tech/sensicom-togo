import { useState, type FormEvent } from 'react'
import { Liste, Saisie, SaisieMotDePasse } from '../../components/ui/Champ'
import { Alerte } from '../../components/ui/Alerte'
import { demanderCompte } from '../../lib/data/comptes'
import type { Role } from '../../lib/domain/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'agent', label: 'Agent de terrain' },
  { value: 'infirmier', label: 'Infirmerie' },
]

export function PageDemandeCompte({ surRetour }: { surRetour: () => void }) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [role, setRole] = useState<Role>('agent')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [envoye, setEnvoye] = useState(false)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    try {
      // Zone et code d'agent sont laissés à l'administration : ce sont eux qui
      // déterminent ce que le compte pourra voir, ils ne se déclarent pas soi-même.
      await demanderCompte({
        email,
        mot_de_passe: motDePasse,
        nom_affichage: nom,
        role,
        zone_id: null,
        code_agent: null,
      })
      setEnvoye(true)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Demande impossible')
    } finally {
      setEnvoi(false)
    }
  }

  if (envoye) {
    return (
      <div className="w-full max-w-[352px]">
        <h1 className="text-[22px] font-bold tracking-tight">Demande enregistrée</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Votre compte a été créé au nom de <span className="font-semibold">{nom}</span>. Il doit
          maintenant être validé par l’administration, qui vous attribuera votre zone. Vous pourrez
          vous connecter dès qu’il sera activé.
        </p>
        <button type="button" onClick={surRetour} className="btn-primary mt-6 w-full !min-h-[52px]">
          Revenir à la connexion
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[352px]">
      <h1 className="text-[22px] font-bold tracking-tight">Demander un compte</h1>
      <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
        Votre compte sera activé par l’administration, qui vous attribuera votre zone.
      </p>

      <form onSubmit={soumettre} className="mt-5 space-y-4">
        <Saisie
          label="Nom affiché"
          obligatoire
          required
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Kossi A."
          aide="Ce nom n’apparaît que pour l’administration."
        />
        <Saisie
          label="Adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="username"
          obligatoire
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.tg"
        />
        <SaisieMotDePasse
          label="Mot de passe"
          autoComplete="new-password"
          obligatoire
          required
          minLength={8}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          aide="8 caractères minimum."
        />
        <Liste
          label="Rôle"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          options={ROLES}
          aide="L’administration attribuera votre zone à la validation."
        />

        {erreur && <Alerte ton="erreur">{erreur}</Alerte>}

        <button type="submit" disabled={envoi} className="btn-primary w-full !min-h-[52px]">
          {envoi ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      <button type="button" onClick={surRetour} className="lien-discret mt-5 block w-full text-center">
        Revenir à la connexion
      </button>

      <p className="mt-6 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Aucune donnée d’identité civile des personnes sensibilisées n’est collectée, à aucune étape.
      </p>
    </div>
  )
}
