import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from 'react'
import { useId } from 'react'

interface ChampProps {
  label: string
  aide?: string
  erreur?: string
  obligatoire?: boolean
  facultatif?: boolean
  children: (id: string) => ReactNode
}

export function Champ({ label, aide, erreur, obligatoire, facultatif, children }: ChampProps) {
  const id = useId()
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
        {obligatoire && <span className="ml-1 text-red-500">*</span>}
        {facultatif && <span className="ml-1 font-normal text-slate-400">(facultatif)</span>}
      </label>
      {children(id)}
      {aide && !erreur && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{aide}</p>}
      {erreur && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{erreur}</p>}
    </div>
  )
}

interface SaisieProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  aide?: string
  erreur?: string
  obligatoire?: boolean
  facultatif?: boolean
}

export function Saisie({ label, aide, erreur, obligatoire, facultatif, className, ...props }: SaisieProps) {
  return (
    <Champ label={label} aide={aide} erreur={erreur} obligatoire={obligatoire} facultatif={facultatif}>
      {/* className complète le style de base du champ au lieu de le remplacer. */}
      {(id) => (
        <input id={id} className={`input ${className ?? ''}`} aria-invalid={Boolean(erreur)} {...props} />
      )}
    </Champ>
  )
}

interface ListeProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  aide?: string
  erreur?: string
  obligatoire?: boolean
  facultatif?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Liste({ label, aide, erreur, obligatoire, facultatif, options, placeholder, ...props }: ListeProps) {
  return (
    <Champ label={label} aide={aide} erreur={erreur} obligatoire={obligatoire} facultatif={facultatif}>
      {(id) => (
        <select id={id} className="input" aria-invalid={Boolean(erreur)} {...props}>
          <option value="">{placeholder ?? 'Sélectionner…'}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Champ>
  )
}

interface BoutonsRadioProps {
  label: string
  options: { value: string; label: string }[]
  valeur: string
  onChange: (valeur: string) => void
  obligatoire?: boolean
}

export function BoutonsRadio({ label, options, valeur, onChange, obligatoire }: BoutonsRadioProps) {
  return (
    <fieldset>
      <legend className="label">
        {label}
        {obligatoire && <span className="ml-1 text-red-500">*</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={valeur === o.value}
            className={
              valeur === o.value
                ? 'min-h-[44px] rounded-xl border-2 border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-100'
                : 'min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
