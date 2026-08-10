// Génère les PNG du manifeste depuis une source SVG unique.
// Android refuse d'installer proprement une PWA dont le manifeste ne propose que
// du SVG : il lui faut du 192 et du 512 en bitmap, plus une version « maskable »
// dont le motif tient dans la zone sûre (les 80 % centraux), sinon le système
// rogne dedans en appliquant la forme d'icône du constructeur.
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const VERT = '#1f6a5a'

/** Croix de santé centrée ; `echelle` réduit le motif pour la variante maskable. */
function svg(taille, echelle = 1, rayon = 0.1875) {
  const c = taille / 2
  const bras = (taille * 0.25) * echelle
  const trait = (taille * 0.11) * echelle
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}">
  <rect width="${taille}" height="${taille}" rx="${taille * rayon}" fill="${VERT}"/>
  <path d="M${c} ${c - bras}V${c + bras}M${c - bras} ${c}H${c + bras}"
        stroke="#fff" stroke-width="${trait}" stroke-linecap="round"/>
</svg>`
}

const cibles = [
  { fichier: 'public/pwa-192.png', taille: 192, echelle: 1 },
  { fichier: 'public/pwa-512.png', taille: 512, echelle: 1 },
  // Zone sûre : le motif est réduit pour survivre au rognage d'Android.
  { fichier: 'public/pwa-maskable-512.png', taille: 512, echelle: 0.7, rayon: 0 },
  { fichier: 'public/apple-touch-icon.png', taille: 180, echelle: 1, rayon: 0 },
]

await mkdir('public', { recursive: true })

for (const { fichier, taille, echelle, rayon } of cibles) {
  const source = Buffer.from(svg(taille, echelle, rayon))
  await sharp(source).png().toFile(fichier)
  console.log(`${fichier} — ${taille}px`)
}

// La source SVG reste servie telle quelle pour les navigateurs qui la préfèrent.
await writeFile('public/favicon.svg', svg(512))
console.log('public/favicon.svg')
