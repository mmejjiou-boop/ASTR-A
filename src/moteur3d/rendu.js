// Scène Three.js : rendu, lumières, ombres et brume de distance.
import * as THREE from 'three';

export function creerRendu(conteneur) {
  const rendu = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  rendu.setSize(window.innerWidth, window.innerHeight);
  rendu.shadowMap.enabled = true;
  rendu.shadowMap.type = THREE.PCFShadowMap;
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 1.05;
  conteneur.appendChild(rendu.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);

  // Lumière du ciel (bleutée en haut, chaude en bas) + soleil qui projette les ombres.
  const ciel = new THREE.HemisphereLight(0xcfe8ff, 0x6b5a3a, 1.1);
  scene.add(ciel);

  const soleil = new THREE.DirectionalLight(0xfff1d6, 2.4);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  const zone = 45; // ombres calculées seulement autour du héros (performance)
  Object.assign(soleil.shadow.camera, { left: -zone, right: zone, top: zone, bottom: -zone, near: 1, far: 220 });
  soleil.shadow.bias = -0.0005;
  soleil.shadow.normalBias = 0.04;
  scene.add(soleil);
  scene.add(soleil.target);
  const directionSoleil = new THREE.Vector3(0.55, 1, 0.35).normalize();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    rendu.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    rendu,
    scene,
    camera,
    definirAmbiance(palette, distanceBrume) {
      scene.background = new THREE.Color(palette.ciel);
      scene.fog = new THREE.Fog(palette.brume || palette.ciel, distanceBrume * 0.35, distanceBrume);
    },
    // Le soleil suit le héros pour garder des ombres nettes là où on regarde.
    suivre(position) {
      soleil.target.position.copy(position);
      soleil.position.copy(position).addScaledVector(directionSoleil, 100);
    },
    dessiner() {
      rendu.render(scene, camera);
    },
  };
}
