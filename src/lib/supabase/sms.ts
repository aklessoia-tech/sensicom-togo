import { db } from '../offline/db'
import { supabase, isSupabaseConfigured } from './client'

interface DemandeSms {
  telephone: string
  numero_coupon: string
  zone_libelle: string
}

/**
 * Le SMS part par Edge Function : le numéro en clair transite mais n'est jamais
 * persisté — ni côté client, ni en base. En cas d'échec ou d'absence de réseau,
 * la demande est mise en file et rejouée.
 */
export async function envoyerRappelSms(demande: DemandeSms): Promise<'envoye' | 'differe'> {
  if (!isSupabaseConfigured || !navigator.onLine) {
    await mettreEnFile(demande)
    return 'differe'
  }

  const { error } = await supabase.functions.invoke('send-reminder-sms', { body: demande })
  if (error) {
    await mettreEnFile(demande)
    return 'differe'
  }
  return 'envoye'
}

const CLE_FILE = 'sensicom-sms-file'

async function mettreEnFile(demande: DemandeSms): Promise<void> {
  const file = lireFile()
  file.push(demande)
  localStorage.setItem(CLE_FILE, JSON.stringify(file))
}

function lireFile(): DemandeSms[] {
  const brut = localStorage.getItem(CLE_FILE)
  return brut ? (JSON.parse(brut) as DemandeSms[]) : []
}

export async function rejouerFileSms(): Promise<number> {
  if (!isSupabaseConfigured || !navigator.onLine) return 0

  const file = lireFile()
  if (file.length === 0) return 0

  const echecs: DemandeSms[] = []
  let envoyes = 0

  for (const demande of file) {
    const { error } = await supabase.functions.invoke('send-reminder-sms', { body: demande })
    if (error) echecs.push(demande)
    else envoyes += 1
  }

  localStorage.setItem(CLE_FILE, JSON.stringify(echecs))
  return envoyes
}

export function nombreSmsEnAttente(): number {
  return lireFile().length
}

export async function libelleZone(zoneId: string): Promise<string> {
  const cache = await db.referentiels.get('referentiels')
  const zone = cache?.zones.find((z) => z.id === zoneId)
  return zone ? `${zone.campus} — ${zone.secteur}` : 'votre campus'
}
