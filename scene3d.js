import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildScene(canvas, opts = {}) {
  const U = 0.85, g = n => n * U, CX = g(7), CZ = g(5);
  const C = {
    shell:0xf3efe4, shellSide:0xeae4d5, slab:0xeee6d3, skirt:0xded5bf,
    // 雲絲帶：暖褐木質
    yFloor:0xd8c4b0, yWall:0xc6ac9c, yWood:0x5e412e, yAccent:0xac8571,
    // 木屋：木牆＋紅磚
    cFloor:0xc2a878, cWall:0x9a7b4e, cBrick:0xa8654a, cBeam:0x5a4326,
    // 里哈籟：萊姆綠
    lFloor:0xd9dcc4, lWall:0x8fae5d, lAccent:0xc8d7a0,
    // 山遇真情：磚紅暖色
    zFloor:0xdccbb4, zWall:0x9f5639, zAccent:0xc98a5e,
    // 共用
    sheet:0xf7f4ec, quilt:0xe6dcc6, pillow:0xf2ece0,
    frame:0x6b4f35, glassWin:0x92c973, winFrame:0x4a4238,
    lampShade:0xf3e2b8, lampMetal:0x4c4438, tv:0x2b2b2b,
    rug:0xcdbd9c, rug2:0xbfc9ab, table:0xb68d5c, seat:0xa8845e, bar:0xa8794e,
    stair:0xc7ab84, plant:0x6f9455, pot:0xb08868, art:0xb9a888,
    mahjong:0x6f9068, cup:0xf0ece0,
    skin:0xe8c49a, host:0x40554a, hostHair:0x35302a, keeper:0x8a6a4c, keeperHair:0x4a3f33,
    hot:0xe8bd77,
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
  controls.minPolarAngle = 0.62; controls.maxPolarAngle = Math.PI / 2.02;
  controls.minDistance = 13; controls.maxDistance = 34;
  controls.enablePan = false;
  camera.position.set(15, 6.6, 17);
  controls.target.set(0, 3.0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xc9c2b0, 0.5));
  const key = new THREE.DirectionalLight(0xfff2df, 0.95);
  key.position.set(14, 19, 13); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left:-17, right:17, top:20, bottom:-12, far:52 });
  key.shadow.bias = -0.0013;
  scene.add(key);
  [[0,1.6,2],[0,4.9,2],[-4,1.6,-1],[-4,4.9,-1]].forEach(p => {
    const l = new THREE.PointLight(0xfff0d8, 0.32, 16, 1.7);
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
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(g(0.32*s), 12, 10), M(C.plant));
    leaf.position.copy(V(gx + 0.25*s, gz + 0.25*s, y + 0.26*s + g(0.24*s)));
    leaf.castShadow = true; layer.add(leaf);
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
    cv.width = 560; cv.height = 170;
    const ctx = cv.getContext('2d');
    function paint(logoImg) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(247,244,236,0.95)';
      ctx.strokeStyle = '#26291f'; ctx.lineWidth = 4;
      const r = 26, w = cv.width - 8, h = cv.height - 8;
      ctx.beginPath(); ctx.moveTo(4 + r, 4);
      ctx.arcTo(4 + w, 4, 4 + w, 4 + h, r); ctx.arcTo(4 + w, 4 + h, 4, 4 + h, r);
      ctx.arcTo(4, 4 + h, 4, 4, r); ctx.arcTo(4, 4, 4 + w, 4, r); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (logoImg) ctx.drawImage(logoImg, 26, 34, 100, 100);
      ctx.fillStyle = '#26291f';
      ctx.font = '600 60px "Noto Serif TC", serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 146, sub ? 88 : 108);
      if (sub) {
        ctx.fillStyle = '#7a7461';
        ctx.font = '300 30px "Noto Sans TC", sans-serif';
        ctx.fillText(sub, 148, 130);
      }
      tex.needsUpdate = true;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
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
  plant(5.4, 8.6, F2, 1.0);
  pendant(3.2, 3.6, F2 + 2.15, 0xdfe8c4);
  pendant(3.2, 7.6, F2 + 2.15, 0xdfe8c4);

  // 山遇真情（右半層）：磚紅暖色
  roomShell(7.7, 0.3, 6.0, 9.4, F2, C.zFloor, C.zWall, 'zhenqing', 2.2);
  bed(8.3, 0.9, 2.0, 2.9, F2, C.frame, C.zAccent);
  bed(11.0, 0.9, 2.0, 2.9, F2, C.frame, C.zAccent);
  nightstand(10.4, 0.9, F2, C.frame);
  windowOn('n', 8.8, 0.3, 2.6, F2, 1.3, 0.9);
  picture('n', 11.9, 0.3, 1.4, F2 + 1.3, 0.55, C.zAccent);
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

  // ── 人物 ──
  function person(gx, gz, y, cloth, hair, facing, label) {
    const grp = new THREE.Group(), S = 0.5;
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(S*0.6, S*0.68, 0.74, 12), M(0x4a4438));
    legs.position.y = 0.37;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(S*0.66, 0.52, 4, 12), M(cloth));
    torso.position.y = 1.12;
    const head = new THREE.Mesh(new THREE.SphereGeometry(S*0.74, 18, 14), M(C.skin));
    head.position.y = 1.78;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(S*0.78, 18, 12, 0, Math.PI*2, 0, Math.PI*0.56), M(hair));
    cap.position.y = 1.81;
    [legs, torso, head, cap].forEach(m => { m.castShadow = true; grp.add(m); });
    [-1, 1].forEach(s => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(S*0.22, 0.44, 4, 10), M(cloth));
      arm.position.set(s * S * 0.8, 1.14, 0); arm.rotation.z = s * 0.17;
      arm.castShadow = true; grp.add(arm);
    });
    grp.position.copy(V(gx, gz, y)); grp.rotation.y = facing;
    layer.add(grp);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(S*1.2, S*1.2, 2.1, 10),
      new THREE.MeshLambertMaterial({ color: cloth, transparent: true, opacity: 0.001 }));
    hit.position.copy(V(gx, gz, y + 1.05));
    hit.userData.room = label; hit.userData.base = cloth;
    hot.push(hit); layer.add(hit);
  }
  layer = L1;
  person(5.4, 9.3, F1, C.host, C.hostHair, 0.2, 'host');        // 程先生・一樓前緣
  layer = L2;
  person(8.6, 9.3, F2, C.keeper, C.keeperHair, -0.2, 'keeper'); // 夏先生・二樓前緣

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
