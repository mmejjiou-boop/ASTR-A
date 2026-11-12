// Vérification en ligne de commande : node outils/verifier.mjs
// Code de sortie 1 s'il y a des erreurs (références cassées, doublons…).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { verifier, FICHIERS, MONDES } from './verification.js';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const lire = async (chemin) => JSON.parse(await readFile(join(racine, chemin), 'utf8'));

const [config, textes, classes, competences, monstres, objets, butin] = await Promise.all(FICHIERS.map(lire));
const mondes = await Promise.all(MONDES.map(lire));
const resultat = verifier({ config, textes, classes, competences, monstres, objets, butin, mondes });

console.log('\nASTRÉA — vérification du contenu\n');
for (const t of resultat.totaux) {
  const signe = t.ok ? '✓' : '…';
  console.log(`  ${signe} ${t.libelle.padEnd(36)} ${String(t.actuel).padStart(3)} / ${t.exige}${t.exact ? ' (exactement)' : ' (minimum)'}`);
}
console.log(`\nErreurs : ${resultat.erreurs.length}`);
for (const e of resultat.erreurs) console.log(`  ✗ ${e}`);
console.log(`Avertissements : ${resultat.avertissements.length}`);
for (const a of resultat.avertissements.slice(0, 5)) console.log(`  ! ${a}`);
if (resultat.avertissements.length > 5) console.log(`  … et ${resultat.avertissements.length - 5} autres`);
console.log('');
process.exit(resultat.erreurs.length ? 1 : 0);
