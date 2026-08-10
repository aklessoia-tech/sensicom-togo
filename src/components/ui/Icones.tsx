const base = 'h-5 w-5'

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={base} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {children}
    </svg>
  )
}

export const IconeSession = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3m8-3v3M3.5 9h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
  </Svg>
)

export const IconePersonnes = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </Svg>
)

export const IconeCoupon = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6ZM10 8v8" />
  </Svg>
)

export const IconeSoin = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />
  </Svg>
)

export const IconeTableau = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h6v8H3v-8Zm12-10h6v18h-6V3ZM3 3h6v6H3V3Z" />
  </Svg>
)

export const IconeReglages = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H2.8a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V2.8a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1.2Z" />
  </Svg>
)

export const IconeAlerte = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </Svg>
)

export const IconeExport = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Svg>
)

export const IconeRecherche = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path strokeLinecap="round" d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconeHistorique = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2" />
  </Svg>
)

export const IconeCoche = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
  </svg>
)

export const IconeFleche = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
  </svg>
)

export const IconeOeil = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconeOeilBarre = () => (
  <Svg>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.3-1M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"
    />
  </Svg>
)

export const IconeScan = () => (
  <Svg>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3m-8 0H5a2 2 0 0 1-2-2v-3M3 12h18" />
  </Svg>
)
