/**
 * Supabase répond en anglais ; l'application est en français et s'adresse à des
 * agents de terrain. « Invalid login credentials » ne leur dit pas non plus que
 * l'adresse compte autant que le mot de passe — beaucoup cherchent la faute du
 * mauvais côté.
 */
const TRADUCTIONS: { motif: RegExp; message: string }[] = [
  {
    motif: /invalid login credentials/i,
    message: 'Adresse ou mot de passe incorrect. Vérifiez aussi l’adresse : c’est elle qui identifie le compte, pas le nom affiché.',
  },
  {
    motif: /email not confirmed/i,
    message: 'Cette adresse n’a pas été confirmée. Contactez l’administration.',
  },
  {
    motif: /user not found/i,
    message: 'Aucun compte ne correspond à cette adresse.',
  },
  {
    motif: /password should be at least/i,
    message: 'Le mot de passe est trop court : 8 caractères au minimum.',
  },
  {
    motif: /rate limit|too many requests/i,
    message: 'Trop de tentatives. Patientez une minute avant de réessayer.',
  },
  {
    motif: /failed to fetch|network/i,
    message: 'Serveur injoignable. Vérifiez votre connexion.',
  },
]

export function traduireErreurAuth(message: string): string {
  return TRADUCTIONS.find((t) => t.motif.test(message))?.message ?? message
}
