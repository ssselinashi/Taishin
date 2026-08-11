import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
camera.position.set(0, 2.65, 7.25);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 4.7; controls.maxDistance = 10;
controls.target.set(0, -.25, 0);

scene.add(new THREE.HemisphereLight(0xffecd8, 0x321612, 2.5));
const key = new THREE.DirectionalLight(0xffc197, 3.1); key.position.set(-4, 6, 5); scene.add(key);
const fill = new THREE.DirectionalLight(0xc74735, 1.2); fill.position.set(5, 1, -4); scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(4.8, 72), new THREE.MeshStandardMaterial({ color: 0x52251e, roughness: 1, transparent: true, opacity: .46 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -1.08; scene.add(floor);

const root = new THREE.Group(); scene.add(root);
const red = new THREE.MeshStandardMaterial({ color: 0xc92d31, roughness: .74, emissive: 0x3a0507, emissiveIntensity: .38, side: THREE.DoubleSide });
const kraft = new THREE.MeshStandardMaterial({ color: 0xd2ab76, roughness: .88, emissive: 0x241407, emissiveIntensity: .22 });

// The radial profile is the sleeping surface: low outer edge, shallow solid concavity at centre.
const radial = [.56, .76, 1.10, 1.48, 1.82, 2.06];
const heights = [-.62, -.42, -.24, -.13, .02, .16];
const slices = 86;
const fanGeometry = new THREE.BufferGeometry();
const fan = new THREE.Mesh(fanGeometry, red);
const honeyLines = new THREE.Group();
root.add(fan, honeyLines);
for (let i = 0; i < slices; i += 2) {
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x821d24, transparent: true, opacity: .72 }));
  honeyLines.add(line);
}

function plateShape() {
  const s = new THREE.Shape();
  // Same silhouette for both end boards: low front, concave rise, tall rounded rear, fastening tab.
  s.moveTo(-2.08, -.68); s.lineTo(-2.08, -.10);
  s.bezierCurveTo(-1.56, -.03, -.95, .12, -.37, .42);
  s.bezierCurveTo(.05, .64, .29, 1.04, .68, 1.10);
  s.bezierCurveTo(1.18, 1.16, 1.72, .90, 1.82, .47);
  s.lineTo(1.82, -.30); s.lineTo(2.03, -.30); s.lineTo(2.03, -.11); s.lineTo(1.82, -.11);
  s.lineTo(1.82, -.68); s.closePath(); return s;
}
const plateGeometry = new THREE.ExtrudeGeometry(plateShape(), { depth: .075, bevelEnabled: true, bevelSize: .018, bevelThickness: .018, bevelSegments: 2 });
const plateA = new THREE.Mesh(plateGeometry, kraft);
const plateB = new THREE.Mesh(plateGeometry, kraft);
root.add(plateA, plateB);
// At the final magnetic closure the full end boards sit behind the paper; only the narrow kraft closure band remains visible.
const closureBand = new THREE.Mesh(new THREE.BoxGeometry(.13, .80, .10), kraft);
closureBand.position.set(0, -.20, -2.08); closureBand.visible = false; root.add(closureBand);

function pointAt(radius, height, angle) { return new THREE.Vector3(radius * Math.cos(angle), height, radius * Math.sin(angle)); }
function updateFan(progress) {
  const angle = THREE.MathUtils.lerp(.025, Math.PI * 2, progress);
  const verts = [], lines = [];
  for (let j = 0; j < slices - 1; j++) {
    const a = -Math.PI / 2 + angle * j / (slices - 1);
    const b = -Math.PI / 2 + angle * (j + 1) / (slices - 1);
    for (let k = 0; k < radial.length - 1; k++) {
      const p1 = pointAt(radial[k], heights[k], a), p2 = pointAt(radial[k + 1], heights[k + 1], a);
      const p3 = pointAt(radial[k + 1], heights[k + 1], b), p4 = pointAt(radial[k], heights[k], b);
      verts.push(...p1.toArray(), ...p2.toArray(), ...p3.toArray(), ...p1.toArray(), ...p3.toArray(), ...p4.toArray());
    }
  }
  fanGeometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  fanGeometry.computeVertexNormals();
  honeyLines.children.forEach((line, i) => {
    const j = i * 2;
    if (j >= slices) return;
    const a = -Math.PI / 2 + angle * j / (slices - 1);
    const pts = radial.map((r, k) => pointAt(r, heights[k] + .012, a));
    line.geometry.setFromPoints(pts); line.visible = progress > .02;
  });
  // Boards are attached to the two ends of the same strip and only meet at 360°.
  const start = -Math.PI / 2, end = start + angle;
  const setBoard = (board, a, flip) => {
    const edge = pointAt(1.3, -.14, a);
    board.position.copy(edge); board.rotation.set(0, -a + (flip ? Math.PI : 0), 0);
  };
  setBoard(plateA, start, false); setBoard(plateB, end, true);
  fan.visible = progress > .015;
}

const compact = new THREE.Group(); root.add(compact);
const compactCore = new THREE.Mesh(new THREE.ExtrudeGeometry(plateShape(), { depth: 1.12, bevelEnabled: false }), red);
compactCore.position.z = -.56; compact.add(compactCore);
for (const z of [-.61, .56]) { const p = new THREE.Mesh(plateGeometry, kraft); p.position.z = z; compact.add(p); }

function setMaterialsOpacity(group, opacity) {
  group.traverse(o => { if (!o.material) return; o.material.transparent = opacity < .995; o.material.opacity = opacity; o.visible = opacity > .01; });
}
function arrange(value) {
  const p = value / 100;
  updateFan(p);
  const compactOpacity = 1 - THREE.MathUtils.smoothstep(p, 0, .12);
  setMaterialsOpacity(root, 1);
  setMaterialsOpacity(compact, compactOpacity);
  fan.visible = p > .012;
  honeyLines.visible = p > .012;
  plateA.visible = plateB.visible = p > .012 && p < .985;
  closureBand.visible = p >= .985;
  document.querySelector('#amount').value = `${Math.round(value)}%`;
  const stage = value < 5 ? '收合狀態' : value < 32 ? '初步展開' : value < 72 ? '半開圓弧' : '完整圓形';
  document.querySelector('#stage').textContent = stage;
  document.querySelector('#dimension').textContent = value < 5 ? '25 × 17 × 9 cm' : value < 98 ? `展開 ${Math.round(value * 3.6)}°` : 'Ø 50 × H 17 cm';
}
const slider = document.querySelector('#expand'); slider.addEventListener('input', () => arrange(Number(slider.value)));
document.querySelector('#reset').addEventListener('click', () => { camera.position.set(0, 2.65, 7.25); controls.target.set(0, -.25, 0); controls.update(); });
function resize() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(canvas); resize(); arrange(100);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
