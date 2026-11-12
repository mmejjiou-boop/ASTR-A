// Style visuel d'ASTRÉA : cel-shading inspiré de Breath of the Wild.
// Tous les objets 3D du jeu utilisent ce matériau (jamais MeshStandardMaterial).
//
// Base : MeshToonMaterial avec une rampe à 3 tons (NearestFilter = transitions nettes).
// Ajouts dans le shader :
//   - ombres teintées bleu-violet au lieu de gris ;
//   - liseré lumineux blanc-bleuté sur les bords (effet Fresnel / rim light).
// Les réglages viennent de data/config.json (section « rendu ») et sont partagés
// par tous les matériaux : les changer modifie tout le monde d'un coup.
import * as THREE from 'three';

const uniformesGlobales = {
  uTeinteOmbre: { value: new THREE.Color('#7d78c8') },
  uSeuilOmbre: { value: 0.55 },
  uContourCouleur: { value: new THREE.Color('#e6f2ff') },
  uContourIntensite: { value: 0.55 },
  uContourPuissance: { value: 2.2 },
};

let rampe = creerRampe([0.42, 0.72, 1.0]);

function creerRampe(tons) {
  const donnees = new Uint8Array(tons.map((t) => Math.round(t * 255)));
  const texture = new THREE.DataTexture(donnees, tons.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// Applique les réglages « rendu » de config.json.
export function configurerStyle(rendu) {
  if (!rendu) return;
  if (rendu.tons) rampe = creerRampe(rendu.tons);
  if (rendu.ombre) {
    uniformesGlobales.uTeinteOmbre.value.set(rendu.ombre.teinte);
    uniformesGlobales.uSeuilOmbre.value = rendu.ombre.seuil;
  }
  if (rendu.contour) {
    uniformesGlobales.uContourCouleur.value.set(rendu.contour.couleur);
    uniformesGlobales.uContourIntensite.value = rendu.contour.intensite;
    uniformesGlobales.uContourPuissance.value = rendu.contour.puissance;
  }
}

const DECLARATIONS = /* glsl */ `
uniform vec3 uTeinteOmbre;
uniform float uSeuilOmbre;
uniform vec3 uContourCouleur;
uniform float uContourIntensite;
uniform float uContourPuissance;
uniform float uContourLocal;
`;

const STYLE = /* glsl */ `
  // 1. Ombres teintées : plus la surface est sombre par rapport à sa couleur,
  //    plus on la pousse vers le bleu-violet (au lieu d'un gris terne).
  float lumBase = max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.001);
  float lumEclairee = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
  float eclairage = lumEclairee / lumBase;
  float ombre = 1.0 - smoothstep(uSeuilOmbre - 0.12, uSeuilOmbre + 0.12, eclairage);
  // L'ombre garde la couleur de l'objet, éclairée par une lumière bleu-violet :
  // elle reste lisible et colorée au lieu de virer au noir.
  vec3 teintee = diffuseColor.rgb * uTeinteOmbre * 0.95 + outgoingLight * 0.2;
  outgoingLight = mix(outgoingLight, teintee, ombre);

  // 2. Rim light (Fresnel) : liseré net sur les bords vus de profil.
  vec3 versCamera = normalize(vViewPosition);
  float fresnel = 1.0 - clamp(dot(normal, versCamera), 0.0, 1.0);
  fresnel = smoothstep(0.32, 0.58, pow(fresnel, uContourPuissance));
  outgoingLight += uContourCouleur * fresnel * uContourIntensite * uContourLocal;
`;

// Temps partagé par les matériaux animés (vent dans l'herbe, reflets de l'eau).
const uTemps = { value: 0 };
export function mettreAJourTemps(t) {
  uTemps.value = t;
}

// Vent : les sommets se balancent d'autant plus qu'ils sont hauts (herbe, fleurs, feuillage).
const VENT = /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 baseInstance = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #else
    vec3 baseInstance = vec3(0.0);
  #endif
  float phase = uTemps * 1.7 + baseInstance.x * 0.11 + baseInstance.z * 0.09;
  float rafale = 0.6 + 0.4 * sin(uTemps * 0.35 + baseInstance.x * 0.013);
  float souplesse = max(transformed.y, 0.0) * uVent * rafale;
  transformed.x += sin(phase) * souplesse;
  transformed.z += cos(phase * 0.8) * souplesse * 0.6;
`;

// Eau : reflets scintillants qui bougent avec le temps.
const EAU_VERTEX = /* glsl */ `
  vPosMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const EAU_FRAGMENT = /* glsl */ `
  float onde1 = sin(vPosMonde.x * 0.21 + uTemps * 1.3) * sin(vPosMonde.z * 0.17 - uTemps * 0.9);
  float onde2 = sin((vPosMonde.x + vPosMonde.z) * 0.33 - uTemps * 1.7);
  float reflet = smoothstep(0.82, 0.97, onde1 * 0.6 + onde2 * 0.4);
  outgoingLight = mix(outgoingLight, vec3(0.92, 0.97, 1.0), reflet * 0.7);
  outgoingLight += vec3(0.05, 0.09, 0.12) * (0.5 + 0.5 * onde2);
`;

// Crée un matériau cel-shading.
// options : celles de MeshToonMaterial (color, vertexColors, emissive, transparent…)
//   + contour : intensité locale du liseré (0 à 1 ; 0 pour le sol) ;
//   + vent : amplitude du balancement (herbe, fleurs) ;
//   + eau : reflets animés.
export function materiauToon(options = {}) {
  const { contour = 1, vent = 0, eau = false, ...reste } = options;
  const materiau = new THREE.MeshToonMaterial({ gradientMap: rampe, ...reste });
  materiau.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformesGlobales, { uContourLocal: { value: contour }, uVent: { value: vent }, uTemps });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECLARATIONS}\nuniform float uTemps;\n${eau ? 'varying vec3 vPosMonde;' : ''}`)
      .replace('#include <opaque_fragment>', `${STYLE}\n${eau ? EAU_FRAGMENT : ''}\n#include <opaque_fragment>`);
    if (vent || eau) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTemps;\nuniform float uVent;\n${eau ? 'varying vec3 vPosMonde;' : ''}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${vent ? VENT : ''}\n${eau ? EAU_VERTEX : ''}`);
    }
  };
  // Un programme GPU par variante (normal, avec vent, eau) ; le reste passe par des uniformes.
  materiau.customProgramCacheKey = () => `astrea-toon${vent ? '-vent' : ''}${eau ? '-eau' : ''}`;
  return materiau;
}

// Ciel en dégradé (haut bleu, horizon pastel), qui se fond dans le brouillard.
export function creerCiel(rayon) {
  const materiau = new THREE.ShaderMaterial({
    uniforms: {
      uHaut: { value: new THREE.Color('#5fa8e6') },
      uHorizon: { value: new THREE.Color('#f3e6d4') },
      uSoleil: { value: new THREE.Vector3(0.55, 1, 0.35).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // toujours au fond
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uHaut;
      uniform vec3 uHorizon;
      uniform vec3 uSoleil;
      varying vec3 vDirection;
      void main() {
        float h = clamp(vDirection.y, 0.0, 1.0);
        vec3 couleur = mix(uHorizon, uHaut, pow(smoothstep(0.0, 0.4, h), 0.7));
        // Halo doux autour du soleil.
        float s = max(dot(normalize(vDirection), uSoleil), 0.0);
        couleur += vec3(1.0, 0.92, 0.75) * (pow(s, 64.0) * 0.6 + pow(s, 8.0) * 0.12);
        gl_FragColor = vec4(couleur, 1.0);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(rayon, 32, 16), materiau);
  ciel.renderOrder = -1;
  ciel.frustumCulled = false;
  return ciel;
}
