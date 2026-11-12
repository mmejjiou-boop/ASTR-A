// Petit utilitaire pour créer des éléments HTML.
// el('button', { class: 'bouton', onclick: f }, 'Texte')
export function el(balise, attributs = {}, ...enfants) {
  const element = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) {
    if (valeur === null || valeur === undefined || valeur === false) continue;
    if (nom.startsWith('on')) element.addEventListener(nom.slice(2), valeur);
    else if (nom === 'class') element.className = valeur;
    else if (nom === 'style' && typeof valeur === 'object') Object.assign(element.style, valeur);
    else if (valeur === true) element.setAttribute(nom, '');
    else element.setAttribute(nom, valeur);
  }
  for (const enfant of enfants.flat()) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    element.append(enfant instanceof Node ? enfant : String(enfant));
  }
  return element;
}

export const ui = () => document.getElementById('ui');
