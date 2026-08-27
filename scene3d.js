import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildScene(canvas, opts = {}) {
  const U = 0.85, g = n => n * U, CX = g(6.5), CZ = g(4.5);
  const P = {
    slab:0xefe7d4, slab2:0xeae1cd, wall:0xf7f3e9, wallSide:0xefeade, skirt:0xded6c0,
    seat:0xa8845e, table:0xc09a63, bar:0xa87a4e, stair:0xc7ab84,
    bedFrame:0x9a7550, bedSheet:0xf6f2e8, pillow:0xd9c79c,
    roomFloorA:0xecdcc2, roomFloorB:0xdbe4cf, roomFloorC:0xf1dcd2,
    glass:0x93c8da, mahjong:0x6f9068, poster:0xb78f6b,
    plant:0x6f9455, pot:0xb08868, lamp:0xf0d9a0, rug:0xcbbb9a,
    hot:0xe8bd77,
    skin:0xe8c49a, host:0x4a5d52, hostHair:0x3a3129, keeper:0x8d6f52, keeperHair:0x4a3f33,
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefeade);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.65; controls.maxPolarAngle = Math.PI / 1.99;
  controls.minDistance = 12; controls.maxDistance = 32;
  controls.enablePan = false;
  camera.position.set(14, 5.6, 15.5);
  controls.target.set(0, 2.6, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xcac3b0, 0.55));
  const key = new THREE.DirectionalLight(0xfff2df, 1.0);
  key.position.set(13, 17, 11); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -16; key.shadow.camera.right = 16;
  key.shadow.camera.top = 18; key.shadow.camera.bottom = -10;
  key.shadow.camera.far = 48; key.shadow.bias = -0.0013;
  scene.add(key);
  const fill1 = new THREE.PointLight(0xfff0d8, 0.55, 22, 1.6);
  fill1.position.set(0, 1.5, 1.2); scene.add(fill1);
  const fill2 = new THREE.PointLight(0xfff0d8, 0.4, 20, 1.6);
  fill2.position.set(3.2, 1.4, -2.0); scene.add(fill2);

  const hot = [];
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const cache = new Map();
  function rbox(w, h, d, r) {
    const k = [w,h,d,r].map(n => n.toFixed(3)).join('|');
    if (!cache.has(k)) cache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w/2.2, h/2.2, d/2.2)));
    return cache.get(k);
  }
  function put(gx, gz, gw, gd, h, color, y0 = 0, o = {}) {
    const r = o.r === undefined ? 0.06 : o.r;
    const m = new THREE.Mesh(o.flat ? new THREE.BoxGeometry(g(gw), h, g(gd)) : rbox(g(gw), h, g(gd), r), mat(color));
    m.position.set(g(gx + gw/2) - CX, y0 + h/2, g(gz + gd/2) - CZ);
    m.castShadow = !o.flat; m.receiveShadow = true;
    if (o.room) { m.userData.room = o.room; m.userData.base = color; hot.push(m); }
    scene.add(m); return m;
  }
  const slab = (gx, gz, gw, gd, c, y, t = 0.16) => put(gx, gz, gw, gd, t, c, y - t/2, { flat: true });

  const FH = 3.15;            // 樓高（示意用，略高於實際）
  const F1 = 0, F2 = FH;

  function plant(gx, gz, y, s = 1) {
    put(gx, gz, 0.5*s, 0.5*s, 0.26*s, P.pot, y, { r: 0.08 });
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(g(0.33*s), 12, 10), mat(P.plant));
    leaf.position.set(g(gx + 0.25*s) - CX, y + 0.26*s + g(0.24*s), g(gz + 0.25*s) - CZ);
    leaf.castShadow = true; scene.add(leaf);
  }

  // ── 兩面牆（L 形剖面）──
  function shell(y, h) {
    put(0, -0.3, 13, 0.3, h, P.wall, y, { r: 0.03 });        // 北牆
    put(-0.3, -0.3, 0.3, 9.3, h, P.wallSide, y, { r: 0.03 }); // 西牆
    put(-0.3, -0.3, 13.3, 0.3, 0.12, P.skirt, y);             // 踢腳
    put(-0.3, -0.3, 0.3, 9.3, 0.12, P.skirt, y);
  }

  // ── 一樓 ──
  slab(-0.3, -0.3, 13.6, 9.6, P.slab, F1);
  shell(F1, FH);
  slab(2.2, 3.4, 6.6, 4.6, P.rug, F1 + 0.03, 0.06);
  put(2.0, 0.25, 7.4, 0.6, 0.42, P.seat, F1, { r: 0.11 });     // 沿窗長椅
  put(2.8, 4.0, 1.9, 2.8, 0.36, P.table, F1, { r: 0.07 });
  put(5.4, 4.0, 3.0, 1.5, 0.36, P.table, F1, { r: 0.07 });
  put(5.6, 6.2, 2.6, 1.5, 0.36, P.table, F1, { r: 0.07 });
  put(2.4, 7.9, 5.4, 1.1, 0.46, P.seat, F1, { r: 0.14 });      // 沙發（面向庭園）
  put(0.4, 2.2, 0.95, 4.6, 0.66, P.bar, F1, { r: 0.07 });      // 吧台（沿西牆）
  for (let i = 0; i < 12; i++) put(5.0, 0.5 + i*0.22, 1.9, 0.22, 0.26 + i*0.24, P.stair, F1, { r: 0.02 });
  plant(0.5, 0.9, F1); plant(12.1, 0.6, F1, 0.9);

  function room(gx, gz, gw, gd, y, floorCol, key, beds, wallH) {
    slab(gx, gz, gw, gd, floorCol, y + 0.03, 0.08);
    put(gx, gz - 0.18, gw, 0.18, wallH, P.wall, y, { r: 0.03 });
    put(gx - 0.18, gz - 0.18, 0.18, gd + 0.18, wallH, P.wallSide, y, { r: 0.03 });
    beds.forEach(b => {
      put(b[0], b[1], b[2], b[3], 0.34, P.bedFrame, y, { r: 0.06 });
      put(b[0]+0.08, b[1]+0.08, b[2]-0.16, b[3]-0.16, 0.16, P.bedSheet, y+0.34, { r: 0.05 });
      put(b[0]+0.2, b[1]+0.14, b[2]-0.4, 0.5, 0.14, P.pillow, y+0.5, { r: 0.06 });
    });
    const hit = put(gx, gz, gw, gd, wallH, floorCol, y, { r: 0.05, room: key });
    hit.material.transparent = true; hit.material.opacity = 0.001; hit.castShadow = false;
  }
  room(9.2, 6.4, 3.8, 2.6, F1, P.roomFloorA, 'yunsidai',
       [[9.6, 6.8, 1.35, 1.8], [11.3, 6.8, 1.35, 1.8]], 1.5);

  // ── 二樓 ──
  slab(-0.3, -0.3, 13.6, 9.6, P.slab2, F2);
  shell(F2, FH * 0.92);
  slab(0.4, 0.4, 3.9, 3.5, P.glass, F2 + 0.05, 0.09);
  put(4.7, 0.5, 3.6, 3.3, 0.3, P.mahjong, F2, { r: 0.06 });
  put(0.4, 4.5, 5.2, 4.1, 0.26, P.poster, F2, { r: 0.06 });
  for (let i = 0; i < 12; i++) put(5.0, 0.5 + i*0.22, 1.9, 0.22, 3.15 - i*0.24, P.stair, F2 - 3.15 + 0.26, { r: 0.02 });
  room(8.9, 0.4, 3.9, 4.2, F2, P.roomFloorB, 'lihalai',
       [[9.3, 0.8, 1.5, 2.0], [11.0, 0.8, 1.5, 2.0]], 1.45);
  room(8.9, 5.1, 3.9, 3.6, F2, P.roomFloorC, 'zhenqing',
       [[9.3, 5.5, 1.5, 1.9], [11.0, 5.5, 1.5, 1.9]], 1.45);
  plant(4.6, 4.8, F2);

  // ── 人物 ──
  function person(gx, gz, y, cloth, hair, facing, label) {
    const grp = new THREE.Group();
    const S = 0.52;                       // 身體半徑（世界單位）
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(S*0.62, S*0.7, 0.72, 12), mat(0x4a4438));
    legs.position.y = 0.36;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(S*0.68, 0.5, 4, 12), mat(cloth));
    torso.position.y = 1.10;
    const head = new THREE.Mesh(new THREE.SphereGeometry(S*0.78, 18, 14), mat(P.skin));
    head.position.y = 1.78;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(S*0.82, 18, 12, 0, Math.PI*2, 0, Math.PI*0.58), mat(hair));
    cap.position.y = 1.81;
    [legs, torso, head, cap].forEach(m => { m.castShadow = true; grp.add(m); });
    [-1, 1].forEach(s => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(S*0.24, 0.42, 4, 10), mat(cloth));
      arm.position.set(s * S * 0.84, 1.12, 0);
      arm.rotation.z = s * 0.16;
      arm.castShadow = true; grp.add(arm);
    });
    grp.position.set(g(gx) - CX, y, g(gz) - CZ);
    grp.rotation.y = facing;
    scene.add(grp);
    if (label) {
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(S*1.25, S*1.25, 2.1, 10), mat(cloth));
      hit.position.set(g(gx) - CX, y + 1.05, g(gz) - CZ);
      hit.material.transparent = true; hit.material.opacity = 0.001;
      hit.userData.room = label; hit.userData.base = cloth;
      hot.push(hit); scene.add(hit);
    }
    return grp;
  }
  person(3.6, 6.6, F1, P.host,   P.hostHair,   0.35, 'host');     // 主人・客廳
  person(7.9, 7.4, F1, P.keeper, P.keeperHair, -0.4, 'keeper');   // 管家・靠近門口

  // ── 互動 ──
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let hovered = null;
  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((cx - r.left) / r.width) * 2 - 1;
    ptr.y = -((cy - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const h = ray.intersectObjects(hot, false)[0];
    return h ? h.object : null;
  }
  function setHover(o) {
    if (hovered === o) return;
    if (hovered) { hovered.material.opacity = 0.001; hovered.material.color.setHex(hovered.userData.base); }
    if (o) { o.material.opacity = 0.32; o.material.color.setHex(P.hot); }
    hovered = o;
    canvas.style.cursor = o ? 'pointer' : 'grab';
    if (opts.onHover) opts.onHover(o ? o.userData.room : null);
  }
  canvas.addEventListener('pointermove', e => setHover(pick(e.clientX, e.clientY)));
  canvas.addEventListener('pointerleave', () => setHover(null));
  canvas.addEventListener('click', e => {
    const o = pick(e.clientX, e.clientY);
    if (o && opts.onPick) opts.onPick(o.userData.room);
  });

  let idle = true, last = 0;
  controls.addEventListener('start', () => { idle = false; last = performance.now(); });
  controls.addEventListener('end', () => { last = performance.now(); });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = renderer.getPixelRatio();
    if (canvas.width !== Math.round(w*pr) || canvas.height !== Math.round(h*pr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
  }
  let running = true;
  (function loop(){
    if (!running) return;
    requestAnimationFrame(loop);
    resize();
    if (!idle && performance.now() - last > 4000) idle = true;
    controls.autoRotate = idle && opts.autoRotate !== false;
    controls.autoRotateSpeed = 0.4;
    controls.update();
    renderer.render(scene, camera);
  })();
  return { stop(){ running = false; } };
}
