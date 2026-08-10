import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Sans invite explicite, un agent peut travailler des jours sur une version
 * ancienne sans le savoir : le service worker ne reprend la main qu'au prochain
 * rechargement complet. Le bandeau le signale sans rien interrompre — le
 * rechargement reste déclenché par l'agent, jamais au milieu d'une saisie.
 */
export function BandeauMaj() {
  const {
    needRefresh: [aJour, setAJour],
    updateServiceWorker,
  } = useRegisterSW()

  if (!aJour) return null

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-[min(28rem,calc(100%-1.5rem))] md:bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 shadow-lg dark:border-brand-800 dark:bg-brand-950">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
            Nouvelle version disponible
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-brand-800/80 dark:text-brand-200/80">
            Vos saisies en attente sont conservées.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAJour(false)}
          className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100 dark:text-brand-200 dark:hover:bg-brand-900"
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="btn-primary shrink-0 !min-h-[36px] !px-3 !py-1.5 text-xs"
        >
          Recharger
        </button>
      </div>
    </div>
  )
}
