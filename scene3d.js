import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function buildScene(canvas, opts = {}) {
  const U = 0.85, g = n => n * U, CX = g(7), CZ = g(5);
  const C = {
    shell:0xf4f1e8, shellSide:0xece8db, slab:0xe6ddc9, skirt:0xd8d2bf,
    // 雲絲帶：灰褐木質
    yFloor:0xded4bf, yWall:0xb5a894, yWood:0x4a4032, yAccent:0x8d886f,
    // 木屋：暖木＋灰磚
    cFloor:0xd6cab0, cWall:0xa08e72, cBrick:0x96705c, cBeam:0x3f382c,
    // 里哈籟：灰綠（主頁 sage 的亮版）
    lFloor:0xe0dece, lWall:0x7d8a68, lAccent:0xa8b391,
    // 山遇真情：柔和磚紅（往灰褐收）
    zFloor:0xe2d7c3, zWall:0xa07a63, zAccent:0xc0a184,
    // 共用
    sheet:0xf4f1e8, quilt:0xe6e1d1, pillow:0xefeade,
    frame:0x55483a, glassWin:0x8fa07a, winFrame:0x26291f,
    lampShade:0xefe4c6, lampMetal:0x26291f, tv:0x1c1e18,
    rug:0xd8d2bf, rug2:0xc9cdb6, table:0xa08a68, seat:0x8d7f66, bar:0x8f7a5c,
    stair:0xb5a68c, plant:0x6b7a55, pot:0x9a8870, art:0xa09a83,
    mahjong:0x6b7a55, cup:0xf4f1e8,
    hot:0xc9a86a,
    skin:0xdcc3a6, host:0x55584a, hostHair:0x26291f, keeper:0x8d886f, keeperHair:0x3a352c,
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f1e8);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio * 1.5, 3));   // 高 DPI 渲染
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.62; controls.maxPolarAngle = Math.PI / 2.02;
  controls.minDistance = 13; controls.maxDistance = 34;
  controls.enablePan = false;
  camera.position.set(15, 6.6, 17);
  controls.target.set(0, 3.0, 0);

  scene.add(new THREE.AmbientLight(0xfffbf2, 0.54));
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x9a9384, 0.42));
  const key = new THREE.DirectionalLight(0xfff6e6, 1.32);
  key.position.set(14, 19, 13); key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left:-17, right:17, top:20, bottom:-12, far:52 });
  key.shadow.bias = -0.0013;
  scene.add(key);
  [[0,1.6,2],[0,4.9,2],[-4,1.6,-1],[-4,4.9,-1]].forEach(p => {
    const l = new THREE.PointLight(0xffeccd, 0.5, 17, 1.6);
    l.position.set(p[0], p[1], p[2]); scene.add(l);
  });

  const hot = [];
  const L1 = new THREE.Group(), L2 = new THREE.Group();
  L2.position.z = -3.1;                       // 二樓往後推，讓一樓前緣完全露出
  scene.add(L1); scene.add(L2);
  let layer = L1;                             // put/slab 目前掛載的層
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  const geoCache = new Map(), matCache = new Map();
  const M = c => { if (!matCache.has(c)) matCache.set(c, mat(c)); return matCache.get(c); };
  function rbox(w, h, d, r) {
    const k = [w,h,d,r].map(n => n.toFixed(3)).join('|');
    if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w/2.2, h/2.2, d/2.2)));
    return geoCache.get(k);
  }
  // gx,gz = 格座標；h = 世界高度
  function put(gx, gz, gw, gd, h, color, y0 = 0, o = {}) {
    const r = o.r === undefined ? 0.05 : o.r;
    const m = new THREE.Mesh(o.flat ? new THREE.BoxGeometry(g(gw), h, g(gd)) : rbox(g(gw), h, g(gd), r), M(color));
    m.position.set(g(gx + gw/2) - CX, y0 + h/2, g(gz + gd/2) - CZ);
    m.castShadow = !o.flat; m.receiveShadow = true;
    if (o.rot) m.rotation.y = o.rot;
    layer.add(m); return m;
  }
  const slab = (gx, gz, gw, gd, c, y, t = 0.14) => put(gx, gz, gw, gd, t, c, y - t/2, { flat: true });
  const V = (gx, gz, y) => new THREE.Vector3(g(gx) - CX, y, g(gz) - CZ);

  // ── 裝飾元件 ──
  function pendant(gx, gz, ceilY, shade = C.lampShade, drop = 0.62) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, drop, 6), M(C.lampMetal));
    cord.position.copy(V(gx, gz, ceilY - drop/2)); layer.add(cord);
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 14, 1, true), M(shade));
    s.material.side = THREE.DoubleSide;
    s.position.copy(V(gx, gz, ceilY - drop - 0.13)); s.castShadow = true; layer.add(s);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M(0xfff0c4));
    bulb.position.copy(V(gx, gz, ceilY - drop - 0.24)); layer.add(bulb);
  }
  function windowOn(side, gx, gz, gw, y, h = 1.15, sill = 0.85) {
    const t = 0.1, out = side === 'n' ? [gx, gz - 0.02, gw, t] : [gx - 0.02, gz, t, gw];
    put(out[0], out[1], out[2], out[3], h, C.glassWin, y + sill, { r: 0.02 });
    put(out[0] - 0.06, out[1] - 0.06, out[2] + (side === 'n' ? 0.12 : 0.05), out[3] + (side === 'n' ? 0.05 : 0.12), 0.1, C.winFrame, y + sill + h, { r: 0.02 });
    put(out[0] - 0.06, out[1] - 0.06, out[2] + (side === 'n' ? 0.12 : 0.05), out[3] + (side === 'n' ? 0.05 : 0.12), 0.1, C.winFrame, y + sill - 0.1, { r: 0.02 });
  }
  function picture(side, gx, gz, w, y, h = 0.5, col = C.art) {
    const d = side === 'n' ? [gx, gz - 0.01, w, 0.07] : [gx - 0.01, gz, 0.07, w];
    put(d[0], d[1], d[2], d[3], h, C.frame, y, { r: 0.02 });
    put(d[0] + (side === 'n' ? 0.1 : 0.03), d[1] + (side === 'n' ? 0.03 : 0.1),
        side === 'n' ? w - 0.2 : 0.04, side === 'n' ? 0.04 : w - 0.2, h - 0.14, col, y + 0.07, { r: 0.01 });
  }
  function bed(gx, gz, gw, gd, y, frame, quilt) {
    put(gx, gz, gw, gd, 0.34, frame, y, { r: 0.05 });
    put(gx + 0.07, gz + 0.55, gw - 0.14, gd - 0.62, 0.17, C.sheet, y + 0.34, { r: 0.05 });
    put(gx + 0.07, gz + 0.5, gw - 0.14, gd * 0.52, 0.2, quilt, y + 0.34, { r: 0.06 });
    put(gx + 0.18, gz + 0.14, gw - 0.36, 0.42, 0.15, C.pillow, y + 0.5, { r: 0.06 });
    put(gx, gz - 0.12, gw, 0.14, 0.72, frame, y, { r: 0.04 });   // 床頭板
  }
  function nightstand(gx, gz, y, col) {
    put(gx, gz, 0.62, 0.62, 0.42, col, y, { r: 0.05 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 8), M(C.lampMetal));
    base.position.copy(V(gx + 0.31, gz + 0.31, y + 0.52)); layer.add(base);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 12), M(C.lampShade));
    sh.position.copy(V(gx + 0.31, gz + 0.31, y + 0.72)); sh.castShadow = true; layer.add(sh);
  }
  function plant(gx, gz, y, s = 1) {
    put(gx, gz, 0.5*s, 0.5*s, 0.26*s, C.pot, y, { r: 0.08 });
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(g(0.3*s), 10, 8), M(C.plant));
    leaf.position.copy(V(gx + 0.25*s, gz + 0.25*s, y + 0.26*s + g(0.22*s)));
    leaf.castShadow = true; leaf.visible = false; layer.add(leaf);   // 由 glb 盆栽取代
  }
  function tvUnit(gx, gz, y) {
    put(gx, gz, 2.2, 0.55, 0.42, C.yWood, y, { r: 0.04 });
    put(gx + 0.35, gz + 0.16, 1.5, 0.1, 0.7, C.tv, y + 0.42, { r: 0.03 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 10), M(C.cup));
    cup.position.copy(V(gx + 1.9, gz + 0.28, y + 0.49)); cup.castShadow = true; layer.add(cup);
  }
  function brickWall(gx, gz, gw, y, h) {          // 木屋紅磚牆（橫紋）
    put(gx, gz, gw, 0.16, h, C.cBrick, y, { r: 0.02 });
    for (let i = 0; i < 5; i++)
      put(gx + 0.05, gz - 0.02, gw - 0.1, 0.05, 0.05, 0xc07a5c, y + 0.28 + i * 0.34, { r: 0.01 });
  }
  function woodWall(gx, gz, gw, y, h, col) {      // 木屋直紋木牆
    put(gx, gz, gw, 0.16, h, col, y, { r: 0.02 });
    for (let i = 0; i * 0.5 < gw - 0.3; i++)
      put(gx + 0.2 + i * 0.5, gz - 0.03, 0.06, 0.05, h - 0.2, C.cBeam, y + 0.1, { r: 0.01 });
  }


  // ── 名稱標籤 ──
  const labelSprites = [];
  function makeLabel(gx, gz, y, text, sub, logoKey) {
    const cv = document.createElement('canvas');
    cv.width = 1120; cv.height = 340;   // 2x 供高 DPI
    const ctx = cv.getContext('2d');
    function paint(logoImg) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(247,244,236,0.95)';
      ctx.strokeStyle = '#26291f'; ctx.lineWidth = 4;
      ctx.save(); ctx.scale(2, 2);
      const r = 26, w = 560 - 8, h = 170 - 8;
      ctx.beginPath(); ctx.moveTo(4 + r, 4);
      ctx.arcTo(4 + w, 4, 4 + w, 4 + h, r); ctx.arcTo(4 + w, 4 + h, 4, 4 + h, r);
      ctx.arcTo(4, 4 + h, 4, 4, r); ctx.arcTo(4, 4, 4 + w, 4, r); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (logoImg) ctx.drawImage(logoImg, 26, 34, 100, 100);
      ctx.fillStyle = '#26291f';
      ctx.font = '400 66px "Ma Shan Zheng", "Kaiti TC", "BiauKai", "DFKai-SB", "楷體", "Noto Serif TC", serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 146, sub ? 88 : 108);
      if (sub) {
        ctx.fillStyle = '#7a7461';
        ctx.font = '300 29px "Noto Sans TC", sans-serif';
        ctx.fillText(sub, 148, 130);
      }
      ctx.restore();
      tex.needsUpdate = true;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(3.5, 1.06, 1);
    sp.position.copy(V(gx, gz, y));
    sp.renderOrder = 999;
    layer.add(sp); labelSprites.push(sp);
    paint(null);
    if (logoKey) {
      const img = new Image();
      img.onload = () => paint(img);
      img.src = 'assets/logo/' + logoKey + '.svg';
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => paint(null));
    return sp;
  }


  // 獨棟小木屋：牆體 + 斜屋頂 + 門窗
  function cabinHouse(gx, gz, gw, gd, y) {
    const wallH = 1.5;
    woodWall(gx, gz, gw, y, wallH, C.cWall);                       // 正面木牆
    put(gx, gz, 0.16, gd, wallH, C.cWall, y, { r: 0.02 });          // 側牆
    put(gx + gw - 0.16, gz, 0.16, gd, wallH, C.cWall, y, { r: 0.02 });
    put(gx, gz + gd - 0.16, gw, 0.16, wallH, C.cWall, y, { r: 0.02 });
    put(gx + 0.2, gz + 0.2, gw - 0.4, gd - 0.4, 0.06, C.cFloor, y, { flat: true });
    // 斜屋頂：兩片傾斜板
    const rw = g(gw) * 0.62, rl = g(gd) + 0.3, pitch = 0.62;
    [-1, 1].forEach(sgn => {
      const p = new THREE.Mesh(rbox(rw, 0.14, rl, 0.05), M(C.cBeam));
      p.position.set(g(gx + gw/2) - CX + sgn * rw * 0.42, y + wallH + 0.42, g(gz + gd/2) - CZ);
      p.rotation.z = -sgn * pitch;
      p.castShadow = true; layer.add(p);
    });
    put(gx + gw/2 - 0.1, gz, 0.2, gd, 0.12, C.cBeam, y + wallH + 0.86, { r: 0.03 });   // 屋脊
    put(gx + gw/2 - 0.55, gz - 0.04, 1.1, 0.1, 1.05, 0x6b4a2c, y, { r: 0.03 });        // 門
    put(gx + gw/2 + 0.62, gz - 0.04, 0.9, 0.1, 0.75, C.glassWin, y + 0.55, { r: 0.03 }); // 窗
    put(gx + 0.35, gz - 0.04, 0.8, 0.1, 0.7, C.glassWin, y + 0.6, { r: 0.03 });
    put(gx + gw - 1.3, gz + gd * 0.3, 0.5, 0.5, 1.9, C.cBrick, y, { r: 0.04 });         // 煙囪
  }


  // ── 取自實景照片的裝飾 ──
  const DC = { brass:0xb99a52, brassDark:0x8a7440, duck:0xe3c05a, duckBill:0xc98f4e,
               poster:0x5b7f8a, forest:0x6b7a55, mirror:0xe6e1d1, scroll:0xf4f1e8,
               porcelain:0xf4f1e8, porcelainBlue:0x5b6f8a, redLamp:0xa8705a, wood:0x6b5a42 };

  // 留聲機（木屋大廳紅磚牆前那台）
  function gramophone(gx, gz, y) {
    put(gx, gz, 0.95, 0.8, 0.5, DC.wood, y, { r: 0.05 });               // 木箱
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.62, 16, 1, true), M(DC.brass));
    horn.material.side = THREE.DoubleSide;
    horn.position.copy(V(gx + 0.48, gz + 0.4, y + 0.92));
    horn.rotation.set(Math.PI * 0.12, 0, Math.PI * 0.14);
    horn.castShadow = true; layer.add(horn);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8), M(DC.brassDark));
    arm.position.copy(V(gx + 0.48, gz + 0.4, y + 0.62));
    arm.rotation.z = 0.3; layer.add(arm);
  }
  // 小黃鴨（山遇真情床頭那隻）
  function duck(gx, gz, y) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12), M(DC.duck));
    b.position.copy(V(gx, gz, y + 0.17)); b.castShadow = true; layer.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), M(DC.duck));
    h.position.copy(V(gx + 0.02, gz - 0.08, y + 0.36)); h.castShadow = true; layer.add(h);
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 8), M(DC.duckBill));
    bill.position.copy(V(gx + 0.02, gz - 0.2, y + 0.34)); bill.rotation.x = Math.PI / 2; layer.add(bill);
  }
  // 青花瓷茶具（木屋窗邊那組）
  function teaSet(gx, gz, y) {
    put(gx, gz, 1.0, 0.62, 0.1, DC.wood, y, { r: 0.03 });                // 茶盤
    [0, 1].forEach(i => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.11, 12), M(DC.porcelain));
      cup.position.copy(V(gx + 0.28 + i * 0.34, gz + 0.3, y + 0.16)); cup.castShadow = true; layer.add(cup);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.014, 6, 14), M(DC.porcelainBlue));
      rim.position.copy(V(gx + 0.28 + i * 0.34, gz + 0.3, y + 0.21));
      rim.rotation.x = Math.PI / 2; layer.add(rim);
    });
    put(gx + 0.06, gz + 0.12, 0.36, 0.36, 0.3, DC.porcelain, y + 0.1, { r: 0.05 });   // 面紙木盒
  }
  // 圓形掛鏡（紅磚牆上）
  function roundMirror(gx, gz, y, r = 0.3) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 22), M(C.frame));
    ring.position.copy(V(gx, gz, y)); ring.castShadow = true; layer.add(ring);
    const face = new THREE.Mesh(new THREE.CircleGeometry(r - 0.03, 22), M(DC.mirror));
    face.position.copy(V(gx, gz + 0.04, y)); layer.add(face);
  }
  // 書法直幅
  function scroll(gx, gz, y, h = 1.3) {
    put(gx, gz, 0.42, 0.05, h, DC.scroll, y, { r: 0.01 });
    put(gx - 0.03, gz - 0.01, 0.48, 0.07, 0.07, C.frame, y + h, { r: 0.02 });
    put(gx - 0.03, gz - 0.01, 0.48, 0.07, 0.07, C.frame, y - 0.07, { r: 0.02 });
  }


  // ── 外部模型（poly.pizza，CC0 公眾領域）──
  const MODELS = {}, gltf = new GLTFLoader();
  function loadModel(key) {
    return new Promise(res => gltf.load('models/' + key + '.glb',
      g => { MODELS[key] = g.scene; res(); },
      undefined,
      () => res()));                     // 載不到就跳過，場景照常
  }
  // 放置一份模型副本：以「格座標 + 目標高度」定位，並把材質換成場景色盤
  function place(key, gx, gz, y, targetH, tint, rotY = 0) {
    const src = MODELS[key];
    if (!src) return null;
    const o = src.clone(true);
    o.traverse(m => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      if (tint !== undefined) m.material.color.setHex(tint);
      m.castShadow = true; m.receiveShadow = true;
    });
    const bb = new THREE.Box3().setFromObject(o);
    const size = bb.getSize(new THREE.Vector3());
    const sc = targetH / (size.y || 1);
    o.scale.setScalar(sc);
    const bb2 = new THREE.Box3().setFromObject(o);
    const c2 = bb2.getCenter(new THREE.Vector3());
    o.position.set(g(gx) - CX - c2.x, y - bb2.min.y, g(gz) - CZ - c2.z);
    o.rotation.y = rotY;
    layer.add(o);
    return o;
  }

  const FH = 3.3, F1 = 0, F2 = FH;

  // ── 外殼（兩面牆） ──
  function shell(y, h) {
    put(-0.3, -0.3, 14.6, 0.3, h, C.shell, y, { r: 0.02 });
    put(-0.3, -0.3, 0.3, 10.6, h, C.shellSide, y, { r: 0.02 });
    put(-0.3, -0.3, 14.6, 0.3, 0.1, C.skirt, y);
    put(-0.3, -0.3, 0.3, 10.6, 0.1, C.skirt, y);
  }

  // 房間：地板 + 兩道內牆 + 可點熱區
  function roomShell(gx, gz, gw, gd, y, floorCol, wallCol, key, wallH) {
    slab(gx, gz, gw, gd, floorCol, y + 0.02, 0.08);
    put(gx - 0.16, gz - 0.16, gw + 0.32, 0.16, wallH, wallCol, y, { r: 0.02 });
    put(gx - 0.16, gz, 0.16, gd + 0.16, Math.min(wallH, 0.95), wallCol, y, { r: 0.02 });
    const hit = put(gx, gz, gw, gd, wallH, floorCol, y, { r: 0.04 });
    hit.material = new THREE.MeshLambertMaterial({ color: floorCol, transparent: true, opacity: 0.001 });
    hit.castShadow = false;
    hit.userData.room = key; hit.userData.base = floorCol;
    hot.push(hit);
  }

  // ════════ 一樓 ════════
  slab(-0.3, -0.3, 14.6, 10.6, C.slab, F1);
  shell(F1, FH);

  // 雲絲帶（左半層）：暖褐木質、兩單人床、電視櫃
  roomShell(0.3, 0.3, 6.0, 9.4, F1, C.yFloor, C.yWall, 'yunsidai', 2.3);
  bed(0.9, 0.9, 1.6, 2.8, F1, C.yWood, C.quilt);
  bed(3.4, 0.9, 1.6, 2.8, F1, C.yWood, C.quilt);
  nightstand(2.7, 0.9, F1, C.yWood);
  tvUnit(0.9, 5.4, F1);
  slab(1.0, 4.4, 4.4, 1.6, C.rug, F1 + 0.05, 0.05);
  put(3.6, 6.6, 2.2, 1.0, 0.44, C.seat, F1, { r: 0.12 });
  windowOn('w', 0.3, 2.0, 3.0, F1);
  windowOn('w', 0.3, 7.0, 2.2, F1);
  picture('n', 3.6, 0.3, 1.4, F1 + 1.4);
  scroll(1.5, 0.34, F1 + 0.85);
  roundMirror(5.2, 0.36, F1 + 1.55, 0.26);
  plant(5.5, 8.4, F1, 1.0); plant(0.9, 8.6, F1, 0.85);
  pendant(3.2, 3.0, F1 + 2.25);
  pendant(3.2, 7.2, F1 + 2.25);

  // 木屋（右半層）：獨棟小木屋立在庭園地坪上
  roomShell(7.7, 0.3, 6.0, 9.4, F1, C.cFloor, C.cWall, 'cabin', 0.95);
  slab(7.9, 4.6, 5.6, 4.6, C.rug2, F1 + 0.05, 0.05);
  cabinHouse(8.6, 1.2, 4.4, 3.4, F1);
  put(9.0, 6.0, 1.8, 0.8, 0.4, C.table, F1, { r: 0.05 });
  put(9.2, 7.0, 0.6, 0.6, 0.42, C.seat, F1, { r: 0.06 });
  put(11.4, 6.0, 0.6, 0.6, 0.42, C.seat, F1, { r: 0.06 });
  plant(12.6, 5.4, F1, 1.1); plant(8.0, 8.6, F1, 0.95); plant(13.0, 8.4, F1, 1.0);
  windowOn('n', 10.2, 0.3, 2.8, F1, 1.35, 0.9);
  gramophone(12.5, 0.5, F1);
  roundMirror(11.9, 0.36, F1 + 1.7, 0.3);
  scroll(13.2, 0.34, F1 + 1.1, 1.1);
  [0, 1, 2].forEach(i => picture('n', 8.1 + i * 0.75, 0.32, 0.66, F1 + 1.75, 0.5, [DC.forest, C.art, DC.forest][i]));
  teaSet(9.4, 6.2, F1 + 0.4);
  pendant(10.8, 2.6, F1 + 2.25, DC.redLamp, 0.7);

  // 中央走道：吧台、樓梯、程先生
  put(6.45, 3.4, 1.2, 2.6, 0.66, C.bar, F1, { r: 0.06 });
  for (let i = 0; i < 2; i++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.55, 12), M(C.seat));
    st.position.copy(V(6.35, 4.2 + i * 1.2, F1 + 0.28)); st.castShadow = true; layer.add(st);
  }
  for (let i = 0; i < 11; i++) put(6.5, 0.5 + i * 0.22, 1.1, 0.22, 0.3 + i * 0.27, C.stair, F1, { r: 0.02 });

  // ════════ 二樓 loft ════════
  layer = L2;
  slab(-0.3, -0.3, 14.6, 10.6, C.slab, F2);
  shell(F2, FH * 0.94);

  // 里哈籟（左半層）：萊姆綠
  roomShell(0.3, 0.3, 6.0, 9.4, F2, C.lFloor, C.lWall, 'lihalai', 2.2);
  bed(0.9, 0.9, 2.0, 2.9, F2, C.frame, C.lAccent);
  bed(3.6, 0.9, 2.0, 2.9, F2, C.frame, C.lAccent);
  nightstand(3.0, 0.9, F2, C.frame);
  windowOn('n', 1.2, 0.3, 3.2, F2, 1.3, 0.9);
  windowOn('w', 0.3, 4.4, 2.6, F2);
  slab(1.2, 4.6, 4.0, 1.4, C.rug2, F2 + 0.05, 0.05);
  put(1.4, 6.6, 2.6, 1.0, 0.44, C.seat, F2, { r: 0.12 });
  put(4.4, 6.8, 0.7, 0.7, 0.4, C.table, F2, { r: 0.05 });
  picture('w', 0.3, 7.6, 1.2, F2 + 1.35, 0.55, C.lAccent);
  roundMirror(2.6, 0.36, F2 + 1.6, 0.26);
  scroll(5.4, 0.34, F2 + 0.9, 1.2);
  plant(5.4, 8.6, F2, 1.0);
  pendant(3.2, 3.6, F2 + 2.15, 0xdfe8c4);
  pendant(3.2, 7.6, F2 + 2.15, 0xdfe8c4);

  // 山遇真情（右半層）：磚紅暖色
  roomShell(7.7, 0.3, 6.0, 9.4, F2, C.zFloor, C.zWall, 'zhenqing', 2.2);
  bed(8.3, 0.9, 2.0, 2.9, F2, C.frame, C.zAccent);
  bed(11.0, 0.9, 2.0, 2.9, F2, C.frame, C.zAccent);
  nightstand(10.4, 0.9, F2, C.frame);
  windowOn('n', 8.8, 0.3, 2.6, F2, 1.3, 0.9);
  picture('n', 9.2, 0.3, 1.05, F2 + 1.35, 0.78, DC.poster);      // THE BIG BLUE 海報
  picture('n', 11.4, 0.3, 1.15, F2 + 1.3, 0.62, DC.forest);      // 森林畫
  duck(10.55, 0.55, F2 + 1.15);                                  // 床頭小黃鴨
  slab(8.4, 4.6, 4.4, 1.4, C.rug, F2 + 0.05, 0.05);
  put(8.5, 6.6, 3.0, 1.0, 0.44, C.seat, F2, { r: 0.12 });
  put(12.0, 6.6, 0.8, 0.8, 0.4, C.table, F2, { r: 0.05 });
  plant(13.0, 8.6, F2, 1.05);
  pendant(10.4, 3.6, F2 + 2.15, 0xf0cfa8);
  pendant(10.4, 7.6, F2 + 2.15, 0xf0cfa8);

  // 中央 loft 走道：麻將桌、藝術牆、夏先生
  put(6.4, 0.8, 1.3, 1.3, 0.42, C.mahjong, F2, { r: 0.05 });
  [0, 1, 2].forEach(i => picture('w', 6.4, 2.9 + i * 1.35, 1.1, F2 + 0.3, 0.55, [C.art, C.zAccent, C.lAccent][i]));
  put(6.42, 2.6, 1.16, 4.2, 1.15, C.shell, F2, { r: 0.02 });
  for (let i = 0; i < 11; i++) put(6.5, 0.5 + i * 0.22, 1.1, 0.22, 3.3 - i * 0.27, C.stair, F2 - 3.3 + 0.3, { r: 0.02 });

  // ── 名稱標籤 ──
  layer = L1;
  makeLabel(3.3, 6.4, F1 + 2.72, '雲絲帶', '二人房・兩單人床', 'yunsidai');
  makeLabel(10.7, 6.4, F1 + 2.72, '水見曉逐', '獨棟木屋', 'cabin');
  layer = L2;
  makeLabel(3.3, 6.4, F2 + 2.62, '里哈籟', '二至四人房', 'lihalai');
  makeLabel(10.7, 6.4, F2 + 2.62, '山遇真情', '四人房', 'zhenqing');


  // ── 以實體模型取代幾何佔位（載入後才加入，載不到不影響場景）──
  Promise.all(['plant','chair','table'].map(loadModel)).then(() => {
    const P90 = Math.PI / 2;
    // 雲絲帶
    layer = L1;
    place('plant', 5.5, 8.6, F1, 0.72, C.plant);
    place('plant', 0.8, 8.8, F1, 0.62, C.plant);
    place('chair', 3.9, 6.9, F1, 0.9,  C.seat, P90);
    // 木屋庭園
    place('plant', 13.1, 5.2, F1, 0.75, C.plant);
    place('plant', 13.1, 8.6, F1, 0.68, C.plant);
    place('chair', 9.3, 7.0, F1, 0.9, C.seat, -0.4);
    place('chair', 11.5, 6.0, F1, 0.9, C.seat, 2.6);
    place('table', 9.0, 6.0, F1, 0.62, C.table, P90);
    // 中央走道
    place('chair', 6.4, 4.4, F1, 0.9, C.seat, P90);
    place('chair', 6.4, 5.6, F1, 0.9, C.seat, P90);
    // 二樓
    layer = L2;
    place('plant', 5.4, 8.8, F2, 0.68, C.plant);
    place('plant', 13.1, 8.8, F2, 0.72, C.plant);
    place('chair', 4.6, 6.9, F2, 0.9, C.seat, 0.3);
    place('chair', 12.2, 6.7, F2, 0.9, C.seat, -0.3);
    place('table', 1.4, 7.0, F2, 0.6, C.mahjong, P90);
    layer = L1;
  });

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
    if (o) { o.material.opacity = 0.3; o.material.color.setHex(C.hot); }
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
    controls.update();
    renderer.render(scene, camera);
  })();
  return { stop(){ running = false; } };
}
