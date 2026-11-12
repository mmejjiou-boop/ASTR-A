// Création du personnage : nom et choix parmi toutes les classes des données,
// avec une fiche (rôle, forces, faiblesses, statistiques, première compétence).
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';
import { STATS } from '../systemes/stats.js';

export function afficherCreation(donnees, { surValider, surRetour }) {
  const classes = [...donnees.classes.values()];
  let choisie = classes[0];

  const champ = el('input', { type: 'text', id: 'nom-heros', maxlength: '16', placeholder: 'Amine', autocomplete: 'off' });
  const erreur = el('div', { class: 'erreur' });
  const fiche = el('div', { class: 'fiche-classe' });
  const grille = el('div', { class: 'grille-classes' });

  const cartes = classes.map((classe) => {
    const carte = el('button', { class: 'carte-classe', type: 'button', onclick: () => choisir(classe) },
      el('span', { class: 'pastille', style: { background: `linear-gradient(135deg, ${classe.couleurs.principale} 50%, ${classe.couleurs.secondaire} 50%)` } }),
      el('span', {},
        el('div', { class: 'nom' }, t(`${classe.texte}.nom`)),
        el('div', { class: 'role' }, t(`${classe.texte}.role`)),
      ),
    );
    carte.dataset.classe = classe.id;
    grille.append(carte);
    return carte;
  });

  function choisir(classe) {
    choisie = classe;
    cartes.forEach((c) => c.classList.toggle('choisie', c.dataset.classe === classe.id));
    const competence = donnees.competences.get(classe.competences.actives[0]);
    const stats = [];
    for (const nom of [...STATS, 'vie', 'mana']) {
      const principale = nom === classe.statPrincipale;
      stats.push(el('span', { class: principale ? 'principale' : '' }, t(`stat.${nom}`) + (principale ? ' ★' : '')));
      stats.push(el('span', { class: principale ? 'principale' : '' }, classe.statsBase[nom]));
    }
    fiche.replaceChildren(
      el('h3', {}, t(`${classe.texte}.nom`)),
      el('div', { class: 'role' }, t(`${classe.texte}.role`)),
      el('dl', {},
        el('dt', {}, t('creation.forces')), el('dd', {}, t(`${classe.texte}.forces`)),
        el('dt', {}, t('creation.faiblesses')), el('dd', {}, t(`${classe.texte}.faiblesses`)),
        competence && el('dt', {}, t('creation.competence')),
        competence && el('dd', {}, el('strong', {}, t(`${competence.texte}.nom`)), ' — ', t(`${competence.texte}.description`)),
      ),
      el('div', { class: 'stats' }, stats),
    );
  }

  function valider() {
    const nom = champ.value.trim();
    if (nom.length < 2 || nom.length > 16) {
      erreur.textContent = t('creation.nomVide');
      champ.focus();
      return;
    }
    ecran.remove();
    surValider(nom, choisie.id);
  }

  champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
  champ.addEventListener('input', () => { erreur.textContent = ''; });

  const ecran = el('div', { class: 'ecran ecran-creation' },
    el('h2', {}, t('creation.titre')),
    el('div', { class: 'creation-corps' },
      el('div', {},
        el('div', { class: 'champ-nom' }, el('label', { for: 'nom-heros' }, t('creation.nom')), champ, erreur),
        el('div', { class: 'champ-nom' }, el('label', {}, t('creation.classe'))),
        grille,
      ),
      fiche,
    ),
    el('div', { class: 'creation-actions' },
      el('button', { class: 'bouton discret', onclick: () => { ecran.remove(); surRetour(); } }, t('creation.retour')),
      el('button', { class: 'bouton principal', id: 'bouton-commencer', onclick: valider }, t('creation.commencer')),
    ),
  );
  ui().append(ecran);
  choisir(choisie);
  champ.focus();
}
