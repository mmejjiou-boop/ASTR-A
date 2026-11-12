// HUD : vie, mana, endurance, niveau, XP, or, compétence, cible verrouillée.
import { el, ui } from './dom.js';
import { t } from '../core/textes.js';

function barre(classe) {
  const remplissage = el('div', { class: 'remplissage' });
  const texte = el('div', { class: 'texte' });
  const racine = el('div', { class: `barre ${classe}` }, remplissage, texte);
  let dernier = '';
  return {
    racine,
    definir(valeur, max, avecTexte = true) {
      const part = max > 0 ? Math.max(0, Math.min(1, valeur / max)) : 0;
      const cle = `${Math.round(part * 400)}|${Math.round(valeur)}|${max}`;
      if (cle === dernier) return;
      dernier = cle;
      remplissage.style.width = `${part * 100}%`;
      texte.textContent = avecTexte ? `${Math.ceil(valeur)} / ${max}` : '';
    },
  };
}

export function creerHud() {
  const nom = el('span', { class: 'hud-nom' });
  const niveau = el('span', { class: 'hud-niveau' });
  const vie = barre('vie');
  const bouclier = barre('bouclier');
  const mana = barre('mana');
  const endurance = barre('endurance');
  const or = el('div', { class: 'hud-or' });
  const effets = el('div', { class: 'hud-effets' });
  const xp = barre('xp');

  const emplacementBase = el('div', { class: 'emplacement' }, el('span', { class: 'touche' }, 'Clic'), el('div', { class: 'icone' }));
  const iconeCompetence = el('div', { class: 'icone' });
  const voileRecharge = el('div', { class: 'recharge' });
  const chrono = el('div', { class: 'chrono' });
  const emplacementCompetence = el('div', { class: 'emplacement' }, el('span', { class: 'touche' }, '1'), iconeCompetence, voileRecharge, chrono);

  const cibleNom = el('div', { class: 'nom' });
  const cibleVie = barre('vie');
  const cible = el('div', { class: 'hud-cible' }, cibleNom, cibleVie.racine);
  const cliquer = el('div', { class: 'hud-cliquer' }, t('hud.cliquer'));

  const racine = el('div', { class: 'hud' },
    el('div', { class: 'hud-perso' },
      el('div', { class: 'hud-ligne' }, nom, niveau),
      vie.racine, bouclier.racine, mana.racine, endurance.racine, or, effets,
    ),
    cible,
    el('div', { class: 'hud-actions' }, emplacementBase, emplacementCompetence),
    el('div', { class: 'hud-xp' }, xp.racine),
    el('div', { class: 'hud-aide' }, t('hud.aide')),
    el('div', { class: 'hud-viseur' }),
    cliquer,
  );
  ui().append(racine);

  let derniereCompetence = null;
  let derniersEffets = '';

  return {
    racine,
    afficherCliquer(visible) {
      cliquer.hidden = !visible;
    },
    mettreAJour(heros, monde) {
      nom.textContent = heros.nom;
      niveau.textContent = `${t('hud.niveau')} ${heros.niveau} · ${t(`${heros.classe.texte}.nom`)}`;
      vie.definir(heros.vie, heros.stats.vieMax);
      bouclier.racine.hidden = heros.bouclierAbsorbe <= 0;
      if (heros.bouclierAbsorbe > 0) bouclier.definir(heros.bouclierAbsorbe, Math.round(heros.stats.vieMax * 0.3));
      mana.definir(heros.mana, heros.stats.manaMax);
      endurance.definir(heros.endurance, monde.donnees.config.deplacement.enduranceMax, false);
      endurance.racine.classList.toggle('epuise', heros.epuise);
      or.textContent = `${heros.or} ${t('hud.or')}`;
      const max = heros.xpSuivant;
      xp.definir(heros.xp, max || 1, false);
      xp.racine.querySelector('.texte').textContent = max ? `${t('hud.xp')} ${heros.xp} / ${max}` : 'MAX';

      const listeEffets = heros.effets.map((e) => e.id).join(',');
      if (listeEffets !== derniersEffets) {
        derniersEffets = listeEffets;
        effets.replaceChildren(...heros.effets.map((e) => el('span', {}, t(`effet.${e.id}`))));
      }

      emplacementBase.querySelector('.icone').textContent = heros.classe.attaqueBase.forme.type === 'melee' ? '⚔' : '✦';
      const competence = heros.competencePrincipale;
      if (competence !== derniereCompetence) {
        derniereCompetence = competence;
        iconeCompetence.textContent = competence ? t(`${competence.texte}.nom`) : '—';
      }
      if (competence) {
        const reste = heros.recharges.get(competence.id) || 0;
        voileRecharge.style.height = `${Math.min(1, reste / competence.recharge) * 100}%`;
        chrono.textContent = reste > 0 ? Math.ceil(reste) : '';
        emplacementCompetence.classList.toggle('sans-mana', (competence.coutMana || 0) > heros.mana);
      }

      const c = monde.cible;
      cible.hidden = !c;
      if (c) {
        cibleNom.replaceChildren(t(`${c.def.texte}.nom`), ' ', el('em', {}, `${t('hud.niveau')} ${c.niveau}`));
        cibleVie.definir(c.vie, c.stats.vieMax);
      }
    },
    detruire() {
      racine.remove();
    },
  };
}
