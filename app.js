import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
camera.position.set(0, 2.4, 7.8);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 4.7;
controls.maxDistance = 10;
controls.target.set(0, .15, 0);

scene.add(new THREE.HemisphereLight(0xffddbf, 0x2c1514, 2.8));
const key = new THREE.DirectionalLight(0xffb17d, 3.4); key.position.set(-4, 5, 5); scene.add(key);
const floor = new THREE.Mesh(new THREE.CircleGeometry(4.8, 64), new THREE.MeshStandardMaterial({ color:0x52251e, roughness:1, transparent:true, opacity:.42 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -1.25; scene.add(floor);

const bed = new THREE.Group(); scene.add(bed);
const paper = new THREE.MeshStandardMaterial({ color:0xbf3428, roughness:.8, metalness:0, side:THREE.DoubleSide });
const edge = new THREE.MeshStandardMaterial({ color:0xe1a06d, roughness:.94 });
const ribs = [];
const count = 84;
const ribGeometry = new THREE.BoxGeometry(.038, 1.78, .62, 1, 5, 1);
for (let i=0; i<count; i++) {
  const rib = new THREE.Mesh(ribGeometry, i % 9 === 0 ? edge : paper);
  rib.castShadow = false;
  bed.add(rib); ribs.push(rib);
}

function arrange(progress) {
  const p = Math.pow(progress, .8);
  const a = 2.04 * p + .11;
  const b = 1.62 * p + .18;
  ribs.forEach((rib, i) => {
    const t = (i / count) * Math.PI * 2;
    // Compact state: a short stacked block; expanded state: elliptical ring.
    const compactX = (i - (count - 1) / 2) * .036;
    const compactZ = 0;
    rib.position.set(THREE.MathUtils.lerp(compactX, Math.cos(t) * a, p), 0, THREE.MathUtils.lerp(compactZ, Math.sin(t) * b, p));
    rib.rotation.y = THREE.MathUtils.lerp(0, -t, p);
    rib.scale.set(1, 1, THREE.MathUtils.lerp(.35, 1, p));
  });
  bed.scale.y = THREE.MathUtils.lerp(.95, 1, p);
  document.querySelector('#amount').value = `${Math.round(progress * 100)}%`;
  document.querySelector('#dimension').textContent = progress < .08 ? '25 × 17 × 9 cm' : `Ø ${Math.round(25 + 25 * progress)} × H 17 cm`;
}
arrange(1);

const slider = document.querySelector('#expand');
slider.addEventListener('input', () => arrange(slider.value / 100));
document.querySelector('#reset').addEventListener('click', () => { camera.position.set(0, 2.4, 7.8); controls.target.set(0, .15, 0); controls.update(); });
function resize() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(canvas); resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
