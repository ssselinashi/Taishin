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
const red = new THREE.MeshStandardMaterial({ color:0xb52d2d, roughness:.79, metalness:0 });
const kraft = new THREE.MeshStandardMaterial({ color:0xcba26f, roughness:.93, metalness:0 });
const collapsed = new THREE.Group();
const expanded = new THREE.Group();
bed.add(collapsed, expanded);

// 收合狀態：依參考圖的「柿餅」剖面做成兩片牛皮紙側板與紅色蜂巢紙內芯。
const sideProfile = new THREE.Shape();
sideProfile.moveTo(-1.78, -.78);
sideProfile.lineTo(-1.78, -.13);
sideProfile.bezierCurveTo(-1.25, -.04, -.72, .13, -.28, .40);
sideProfile.bezierCurveTo(.05, .60, .26, 1.12, .74, 1.18);
sideProfile.bezierCurveTo(1.22, 1.22, 1.66, .94, 1.76, .55);
sideProfile.lineTo(1.76, -.78);
sideProfile.lineTo(-1.78, -.78);
const panelGeometry = new THREE.ExtrudeGeometry(sideProfile, { depth:.05, bevelEnabled:true, bevelThickness:.025, bevelSize:.025, bevelSegments:2 });
for (const z of [-.59, .54]) {
  const panel = new THREE.Mesh(panelGeometry, kraft);
  panel.position.z = z;
  collapsed.add(panel);
}
const coreGeometry = new THREE.ExtrudeGeometry(sideProfile, { depth:1.06, bevelEnabled:false });
const core = new THREE.Mesh(coreGeometry, red);
core.position.set(0, 0, -.53);
collapsed.add(core);
// 紅色內芯的細分條紋，模擬收合的蜂巢紙片。
for (let i=0; i<20; i++) {
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(.025, .02, 1.08), new THREE.MeshStandardMaterial({ color:0x8e2228, roughness:.92 }));
  stripe.position.set(-1.57 + i * .165, -.785, 0);
  collapsed.add(stripe);
}

// 展開狀態：中心為實心凹槽，不是穿透的甜甜圈。
const bowlProfile = [
  new THREE.Vector2(0, -.56), new THREE.Vector2(.55, -.55),
  new THREE.Vector2(1.25, -.42), new THREE.Vector2(1.76, -.08),
  new THREE.Vector2(2.06, .24), new THREE.Vector2(2.14, .42)
];
const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile, 96), red);
expanded.add(bowl);
// 同心紙紋讓展開後的碗狀貓床保留蜂巢紙的層次感。
for (let i=1; i<17; i++) {
  const radius = .14 + i * .119;
  const y = -.565 + Math.pow(radius / 2.14, 2.15) * .94;
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(radius, .016, 6, 72), new THREE.MeshStandardMaterial({ color:0x8d2428, roughness:.86 }));
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = y;
  expanded.add(ridge);
}
const rim = new THREE.Mesh(new THREE.TorusGeometry(2.14, .045, 8, 96), kraft);
rim.rotation.x = Math.PI / 2;
rim.position.y = .42;
expanded.add(rim);

function setOpacity(group, opacity) {
  group.traverse((object) => {
    if (!object.isMesh) return;
    object.material.transparent = true;
    object.material.opacity = opacity;
    object.visible = opacity > .015;
  });
}
function arrange(progress) {
  const p = THREE.MathUtils.smoothstep(progress, .08, .92);
  setOpacity(collapsed, 1 - p);
  setOpacity(expanded, p);
  collapsed.scale.setScalar(1 - p * .10);
  expanded.scale.setScalar(.76 + p * .24);
  expanded.position.y = -.03 + (1 - p) * .10;
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
