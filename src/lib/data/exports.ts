import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Indicateurs, LigneSession } from './admin'

function telecharger(contenu: Blob, nom: string): void {
  const url = URL.createObjectURL(contenu)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nom
  lien.click()
  URL.revokeObjectURL(url)
}

interface LigneRapport {
  periode: string
  universite: string
  campus: string
  thematique: string
  sessions: number
  presents: number
  sensibilises: number
  coupons: number
  actes: number
  taux_engagement: number
  taux_conversion: number
}

export function construireRapport(sessions: LigneSession[]): LigneRapport[] {
  const agrege = new Map<string, LigneRapport>()

  for (const s of sessions) {
    const periode = s.date_session.slice(0, 7)
    const cle = [periode, s.universite_nom, s.campus, s.thematique].join('|')

    const ligne = agrege.get(cle) ?? {
      periode,
      universite: s.universite_nom,
      campus: s.campus,
      thematique: s.thematique,
      sessions: 0,
      presents: 0,
      sensibilises: 0,
      coupons: 0,
      actes: 0,
      taux_engagement: 0,
      taux_conversion: 0,
    }

    ligne.sessions += 1
    ligne.presents += s.nombre_presents ?? 0
    ligne.sensibilises += s.nb_sensibilises
    ligne.coupons += s.nb_coupons
    ligne.actes += s.nb_actes
    agrege.set(cle, ligne)
  }

  return [...agrege.values()].map((l) => ({
    ...l,
    taux_engagement: l.presents > 0 ? Math.round((l.sensibilises / l.presents) * 1000) / 10 : 0,
    taux_conversion: l.sensibilises > 0 ? Math.round((l.actes / l.sensibilises) * 1000) / 10 : 0,
  }))
}

export function exporterCsv(sessions: LigneSession[], periode: string): void {
  const csv = Papa.unparse(construireRapport(sessions))
  telecharger(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), `sensicom-rapport-${periode}.csv`)
}

export function exporterPdf(sessions: LigneSession[], indicateurs: Indicateurs, periode: string): void {
  const rapport = construireRapport(sessions)
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text('SensiCom Togo — Rapport mensuel', 14, 16)
  doc.setFontSize(10)
  doc.text(`Période : ${periode}`, 14, 23)
  doc.text(
    `Sessions ${indicateurs.sessions} · Sensibilisés ${indicateurs.sensibilises} · Coupons ${indicateurs.coupons} · Actes ${indicateurs.actes}`,
    14,
    29,
  )
  doc.text(
    `Taux d'engagement ${indicateurs.tauxEngagement} % · Taux de conversion ${indicateurs.tauxConversion} %`,
    14,
    35,
  )

  autoTable(doc, {
    startY: 42,
    head: [['Période', 'Université', 'Campus', 'Thématique', 'Sessions', 'Présents', 'Sensib.', 'Coupons', 'Actes', 'Engag. %', 'Conv. %']],
    body: rapport.map((l) => [
      l.periode,
      l.universite,
      l.campus,
      l.thematique,
      l.sessions,
      l.presents,
      l.sensibilises,
      l.coupons,
      l.actes,
      l.taux_engagement,
      l.taux_conversion,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 106, 90] },
  })

  doc.save(`sensicom-rapport-${periode}.pdf`)
}

/**
 * Export au format d'import DHIS2 : une ligne par valeur de données
 * (dataelement, period, orgunit, value), consommable tel quel par l'import CSV DHIS2.
 */
export function exporterDhis2(sessions: LigneSession[], periode: string): void {
  const rapport = construireRapport(sessions)

  const ELEMENTS: { champ: keyof LigneRapport; code: string }[] = [
    { champ: 'sensibilises', code: 'SENSI_PERS_TOTAL' },
    { champ: 'coupons', code: 'SENSI_COUPONS_EMIS' },
    { champ: 'actes', code: 'SENSI_ACTES_REALISES' },
    { champ: 'sessions', code: 'SENSI_SESSIONS' },
  ]

  const lignes = rapport.flatMap((l) =>
    ELEMENTS.map((e) => ({
      dataelement: e.code,
      period: l.periode.replace('-', ''),
      orgunit: `${l.universite} / ${l.campus}`,
      categoryoptioncombo: l.thematique,
      value: l[e.champ],
    })),
  )

  const csv = Papa.unparse(lignes)
  telecharger(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `sensicom-dhis2-${periode}.csv`)
}
