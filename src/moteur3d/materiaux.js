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

// Crée un matériau cel-shading.
// options : celles de MeshToonMaterial (color, vertexColors, emissive, transparent…)
//           + contour (0 à 1, intensité locale du liseré ; 0 pour le sol).
export function materiauToon(options = {}) {
  const { contour = 1, ...reste } = options;
  const materiau = new THREE.MeshToonMaterial({ gradientMap: rampe, ...reste });
  materiau.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformesGlobales, { uContourLocal: { value: contour } });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECLARATIONS}`)
      .replace('#include <opaque_fragment>', `${STYLE}\n#include <opaque_fragment>`);
  };
  // Même programme GPU pour tous les matériaux toon (le contour local est une uniforme).
  materiau.customProgramCacheKey = () => 'astrea-toon';
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
