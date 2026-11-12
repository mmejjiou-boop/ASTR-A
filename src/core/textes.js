// t("cle", { n: 3 }) → texte français avec remplacement de {n}.
let dictionnaire = {};

export function definirTextes(textes) {
  dictionnaire = textes;
}

export function t(cle, valeurs = {}) {
  let texte = dictionnaire[cle];
  if (texte === undefined) {
    console.warn(`Texte manquant : ${cle}`);
    return cle;
  }
  for (const [nom, valeur] of Object.entries(valeurs)) {
    texte = texte.replaceAll(`{${nom}}`, valeur);
  }
  return texte;
}
