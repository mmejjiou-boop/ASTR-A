// Scène Three.js au style cel-shading d'ASTRÉA :
// lumière d'hémisphère chaude/froide, soleil avec ombres, ciel en dégradé,
// brouillard exponentiel pastel à l'horizon et léger bloom en post-traitement.
// Réglages : data/config.json, section « rendu ».
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { configurerStyle, creerCiel, mettreAJourTemps } from './materiaux.js';

export function creerRendu(conteneur, reglages) {
  configurerStyle(reglages);
  const rendu = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  rendu.setSize(window.innerWidth, window.innerHeight);
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = THREE.PCFShadowMap;
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  // Tone mapping neutre : garde les couleurs franches et saturées du cel-shading.
  rendu.toneMapping = THREE.NeutralToneMapping;
  rendu.toneMappingExposure = reglages.exposition ?? 1;
  conteneur.appendChild(rendu.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);

  // Hémisphère : ciel chaud au-dessus, sol froid en dessous (les faces tournées
  // vers le bas prennent une teinte bleutée, comme dans BotW).
  const h = reglages.hemisphere;
  const hemisphere = new THREE.HemisphereLight(h.ciel, h.sol, h.intensite);
  scene.add(hemisphere);

  const soleil = new THREE.DirectionalLight(reglages.soleil.couleur, reglages.soleil.intensite);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  const zone = 45; // ombres calculées seulement autour du héros (performance)
  Object.assign(soleil.shadow.camera, { left: -zone, right: zone, top: zone, bottom: -zone, near: 1, far: 220 });
  soleil.shadow.bias = -0.0005;
  soleil.shadow.normalBias = 0.04;
  scene.add(soleil);
  scene.add(soleil.target);
  const directionSoleil = new THREE.Vector3(...reglages.soleil.direction).normalize();

  // Ciel en dégradé qui suit la caméra.
  const ciel = creerCiel(1000);
  ciel.material.uniforms.uSoleil.value.copy(directionSoleil);
  scene.add(ciel);

  // Post-traitement : rendu de la scène → bloom léger → sortie (tone mapping + sRGB).
  const composeur = new EffectComposer(rendu);
  composeur.addPass(new RenderPass(scene, camera));
  const b = reglages.bloom;
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), b.force, b.rayon, b.seuil);
  composeur.addPass(bloom);
  // Étalonnage : couleurs un peu plus vives et chaudes, léger assombrissement des bords (vignette).
  const etalonnage = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSaturation: { value: reglages.etalonnage?.saturation ?? 1.12 }, uVignette: { value: reglages.etalonnage?.vignette ?? 0.28 }, uChaleur: { value: reglages.etalonnage?.chaleur ?? 0.03 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uSaturation;
      uniform float uVignette;
      uniform float uChaleur;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        c.rgb = mix(vec3(l), c.rgb, uSaturation);
        c.rgb += vec3(uChaleur, uChaleur * 0.4, -uChaleur * 0.5) * (1.0 - l);
        float d = distance(vUv, vec2(0.5));
        c.rgb *= 1.0 - uVignette * smoothstep(0.35, 0.85, d);
        gl_FragColor = c;
      }
    `,
  });
  composeur.addPass(etalonnage);
  composeur.addPass(new OutputPass());
  let bloomActif = true;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rendu.setSize(window.innerWidth, window.innerHeight);
    composeur.setSize(window.innerWidth, window.innerHeight);
    bloom.resolution.set(window.innerWidth / 2, window.innerHeight / 2);
  });

  return {
    rendu,
    scene,
    camera,
    // palette.ciel : haut du ciel ; palette.brume : horizon pastel (et couleur du brouillard).
    definirAmbiance(palette, distanceVue) {
      const horizon = new THREE.Color(palette.brume || palette.ciel);
      ciel.material.uniforms.uHaut.value.set(palette.ciel);
      ciel.material.uniforms.uHorizon.value.copy(horizon);
      scene.background = horizon;
      // Brouillard exponentiel : quasi opaque à la distance de vue.
      scene.fog = new THREE.FogExp2(horizon, reglages.brouillard / distanceVue);
      camera.far = Math.max(1200, distanceVue * 1.3);
      camera.updateProjectionMatrix();
    },
    definirBloom(actif) {
      bloomActif = actif;
    },
    // Le soleil suit le héros pour garder des ombres nettes là où on regarde.
    suivre(position) {
      soleil.target.position.copy(position);
      soleil.position.copy(position).addScaledVector(directionSoleil, 100);
    },
    dessiner() {
      mettreAJourTemps(performance.now() / 1000);
      ciel.position.copy(camera.position);
      if (bloomActif) composeur.render();
      else rendu.render(scene, camera);
    },
  };
}
