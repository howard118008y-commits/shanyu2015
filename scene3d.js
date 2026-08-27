import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildScene(canvas, opts = {}) {
  const U = 0.85, g = n => n * U, CX = g(6.5), CZ = g(4.5);
  const P = {
    ground:0xb9cf9b, pond:0x6fa8bc, stone:0xd8d2c0, deck:0xc9b894,
    slab:0xe4dbc6, slab2:0xded4bf, wall:0xf0ebdd, wallSide:0xe2dbc9,
    seat:0xa88a68, table:0xc09a63, bar:0xb2855a, stair:0xc7ab84,
    bedFrame:0x8b6a45, bedSheet:0xf2ede0, pillow:0xd8c9a0,
    roomFloorA:0xe8d9c0, roomFloorB:0xd9e2cd, roomFloorC:0xefd9d0,
    glass:0x8fc4d6, mahjong:0x6f8f6a, poster:0xb08a6a,
    cabin:0xa8794e, cabinRoof:0x6f6046, plant:0x6f9455, pot:0xb08868,
    hot:0xe8bd77,
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefeade);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.2; controls.maxPolarAngle = Math.PI / 2.15;
  controls.minDistance = 9; controls.maxDistance = 36;
  controls.enablePan = false;
  camera.position.set(15, 9.5, 16);
  controls.target.set(0, 3.0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.66));
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xb9b2a0, 0.45));
  const key = new THREE.DirectionalLight(0xfff2df, 1.05);
  key.position.set(12, 19, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20; key.shadow.camera.right = 20;
  key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
  key.shadow.camera.far = 55; key.shadow.bias = -0.0012;
  scene.add(key);

  const hot = [];
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const cache = new Map();
  function rbox(w, h, d, r) {
    const k = [w,h,d,r].map(n => n.toFixed(3)).join('|');
    if (!cache.has(k)) cache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w/2.2, h/2.2, d/2.2)));
    return cache.get(k);
  }
  function put(gx, gz, gw, gd, h, color, y0 = 0, { r = 0.06, room = null, flat = false } = {}) {
    const m = new THREE.Mesh(flat ? new THREE.BoxGeometry(g(gw), h, g(gd)) : rbox(g(gw), h, g(gd), r), mat(color));
    m.position.set(g(gx + gw/2) - CX, y0 + h/2, g(gz + gd/2) - CZ);
    m.castShadow = !flat; m.receiveShadow = true;
    if (room) { m.userData.room = room; m.userData.base = color; hot.push(m); }
    scene.add(m); return m;
  }
  const slab = (gx, gz, gw, gd, c, y, t = 0.16) => put(gx, gz, gw, gd, t, c, y - t/2, { flat: true });

  // ── 地景 ──
  slab(-4, -9, 21, 9.2, P.ground, -0.06, 0.3);
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(g(3.4), g(3.4), 0.18, 40), mat(P.pond));
  pond.position.set(g(4.6) - CX, 0.02, g(-5.3) - CZ); pond.receiveShadow = true; scene.add(pond);
  for (let i = 0; i < 6; i++) slab(11.7, -1.2 - i*1.05, 0.62, 0.44, P.stone, 0.08, 0.1);

  function plant(gx, gz, s = 1) {
    put(gx, gz, 0.5*s, 0.5*s, 0.28*s, P.pot, 0, { r: 0.08 });
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(g(0.34*s), 12, 10), mat(P.plant));
    leaf.position.set(g(gx + 0.25*s) - CX, 0.28*s + g(0.26*s), g(gz + 0.25*s) - CZ);
    leaf.castShadow = true; scene.add(leaf);
  }

  // ── 一樓 ──
  const F1 = 0;
  slab(0, 0, 13, 9, P.slab, F1);
  slab(-3, 0.6, 3, 7.6, P.deck, F1 - 0.04);
  put(0, -0.28, 13, 0.28, 2.0, P.wall, F1, { r: 0.04 });
  put(-0.28, 0, 0.28, 9, 2.0, P.wallSide, F1, { r: 0.04 });
  put(2.0, 0.35, 7.4, 0.55, 0.4, P.seat, F1, { r: 0.1 });
  put(3.0, 2.0, 1.9, 3.0, 0.36, P.table, F1, { r: 0.07 });
  put(5.6, 2.0, 3.2, 1.5, 0.36, P.table, F1, { r: 0.07 });
  put(6.2, 4.0, 2.3, 1.5, 0.36, P.table, F1, { r: 0.07 });
  put(10.3, 2.0, 1.2, 4.0, 0.44, P.seat, F1, { r: 0.13 });
  put(1.8, 7.3, 5.2, 0.9, 0.62, P.bar, F1, { r: 0.07 });
  for (let i = 0; i < 8; i++) put(7.3 + i*0.22, 7.3, 0.22, 1.7, 0.26 + i*0.24, P.stair, F1, { r: 0.02 });
  plant(0.7, 1.0); plant(12.0, 0.7, 0.9); plant(-2.2, 6.6, 1.1);

  // 房間：地板 + 兩面矮牆 + 床（可點）
  function room(gx, gz, gw, gd, y, floorCol, key, beds) {
    slab(gx, gz, gw, gd, floorCol, y + 0.02, 0.1);
    put(gx, gz - 0.2, gw, 0.2, 1.5, P.wall, y, { r: 0.03 });
    put(gx + gw, gz, 0.2, gd, 1.5, P.wallSide, y, { r: 0.03 });
    beds.forEach(b => {
      put(b[0], b[1], b[2], b[3], 0.36, P.bedFrame, y, { r: 0.06 });
      put(b[0] + 0.08, b[1] + 0.08, b[2] - 0.16, b[3] - 0.16, 0.16, P.bedSheet, y + 0.36, { r: 0.05 });
      put(b[0] + 0.18, b[1] + 0.15, b[2] - 0.36, 0.5, 0.14, P.pillow, y + 0.52, { r: 0.06 });
    });
    const hit = put(gx, gz, gw, gd, 1.5, floorCol, y, { r: 0.05, room: key });
    hit.material.transparent = true; hit.material.opacity = 0.001;
    hit.castShadow = false;
  }
  room(9.3, 6.6, 3.7, 2.4, F1, P.roomFloorA, 'yunsidai',
       [[9.7, 6.95, 1.3, 1.7], [11.4, 6.95, 1.3, 1.7]]);

  // ── 二樓（浮起） ──
  const F2 = 5.6;
  slab(0, 0, 13, 9, P.slab2, F2);
  put(0, -0.28, 13, 0.28, 1.9, P.wall, F2, { r: 0.04 });
  put(-0.28, 0, 0.28, 9, 1.9, P.wallSide, F2, { r: 0.04 });
  slab(0.3, 0.3, 4.0, 3.6, P.glass, F2 + 0.06, 0.08);
  put(4.6, 0.3, 3.8, 3.6, 0.3, P.mahjong, F2, { r: 0.06 });
  put(0.3, 4.4, 5.4, 4.3, 0.26, P.poster, F2, { r: 0.06 });
  for (let i = 0; i < 10; i++) put(6.1 + i*0.22, 7.3, 0.22, 1.7, 2.3 - i*0.22, P.stair, F2 - 2.3 + 0.2, { r: 0.02 });
  room(8.7, 0.3, 4.0, 4.4, F2, P.roomFloorB, 'lihalai',
       [[9.1, 0.7, 1.5, 2.0], [10.9, 0.7, 1.5, 2.0]]);
  room(8.7, 5.0, 4.0, 3.7, F2, P.roomFloorC, 'zhenqing',
       [[9.1, 5.4, 1.5, 2.0], [10.9, 5.4, 1.5, 2.0]]);
  plant(4.4, 4.6);

  // ── 木屋 ──
  put(12.4, -7.6, 4.0, 2.9, 2.0, P.cabin, 0, { r: 0.09, room: 'cabin' });
  put(12.2, -7.8, 4.4, 3.3, 0.22, P.cabinRoof, 2.0, { r: 0.05 });
  plant(11.9, -4.6, 1.2);

  // ── 互動 ──
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((cx - r.left) / r.width) * 2 - 1;
    ptr.y = -((cy - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(hot, false)[0];
    return hit ? hit.object : null;
  }
  function setHover(o) {
    if (hovered === o) return;
    if (hovered) {
      if (hovered.material.opacity < 0.01) hovered.material.opacity = 0.001;
      else hovered.material.color.setHex(hovered.userData.base);
    }
    if (o) {
      if (o.material.transparent && o.material.opacity < 0.5) { o.material.opacity = 0.34; o.material.color.setHex(P.hot); }
      else o.material.color.setHex(P.hot);
    }
    hovered = o;
    canvas.style.cursor = o ? 'pointer' : 'grab';
  }
  canvas.addEventListener('pointermove', e => setHover(pick(e.clientX, e.clientY)));
  canvas.addEventListener('pointerleave', () => setHover(null));
  canvas.addEventListener('click', e => {
    const o = pick(e.clientX, e.clientY);
    if (o && opts.onPick) opts.onPick(o.userData.room);
  });

  let idle = true, lastInput = 0;
  controls.addEventListener('start', () => { idle = false; lastInput = performance.now(); });
  controls.addEventListener('end', () => { lastInput = performance.now(); });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  let running = true;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    resize();
    if (!idle && performance.now() - lastInput > 4000) idle = true;
    if (idle && opts.autoRotate !== false) controls.autoRotate = true, controls.autoRotateSpeed = 0.42;
    else controls.autoRotate = false;
    controls.update();
    renderer.render(scene, camera);
  }
  loop();
  return { scene, camera, renderer, controls, stop(){ running = false; } };
}
