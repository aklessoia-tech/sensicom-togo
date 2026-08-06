import { useEffect, useRef, useState } from 'react'

/**
 * Lecture du code imprimé sur le coupon via l'API BarcodeDetector, disponible sur
 * les Chrome/Android du terrain. Le composant ne s'affiche que si l'appareil sait
 * scanner : ailleurs, la saisie manuelle reste le seul chemin, ce qui suffit.
 */
export function scanDisponible(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

interface Detecteur {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
}

type FabriqueDetecteur = new (options?: { formats?: string[] }) => Detecteur

export function ScannerCoupon({
  onLecture,
  onFermer,
}: {
  onLecture: (valeur: string) => void
  onFermer: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let flux: MediaStream | null = null
    let animation = 0
    let arrete = false

    async function demarrer() {
      try {
        flux = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (arrete) {
          flux.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = flux
        await video.play()

        const Fabrique = (window as unknown as { BarcodeDetector: FabriqueDetecteur }).BarcodeDetector
        const detecteur = new Fabrique({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
        })

        const boucle = async () => {
          if (arrete || !videoRef.current) return
          try {
            const codes = await detecteur.detect(videoRef.current)
            const valeur = codes[0]?.rawValue?.trim()
            if (valeur) {
              onLecture(valeur.toUpperCase())
              return
            }
          } catch {
            // Une image illisible n'est pas une erreur : on retente à la frame suivante.
          }
          animation = requestAnimationFrame(() => void boucle())
        }
        void boucle()
      } catch {
        setErreur("Caméra inaccessible. Saisissez le numéro à la main.")
      }
    }

    void demarrer()

    return () => {
      arrete = true
      cancelAnimationFrame(animation)
      flux?.getTracks().forEach((t) => t.stop())
    }
  }, [onLecture])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm font-semibold text-white">Scanner le coupon</p>
        <button
          type="button"
          onClick={onFermer}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Fermer
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-4/5 max-w-xs rounded-2xl border-2 border-white/80" />
        </div>
      </div>

      <p className="p-4 text-center text-xs text-white/70">
        {erreur ?? 'Cadrez le code imprimé sur le coupon. Aucune image n’est enregistrée.'}
      </p>
    </div>
  )
}
