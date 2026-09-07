import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Photo-based proportions; the shared scene is used by the home page and tour.html.
export function buildScene(canvas, opts = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 180);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = Math.PI / 2.08;
  controls.zoomSpeed = 0.75;
  scene.add(new THREE.HemisphereLight(0xe6f3ff, 0x657747, 2.1));
  const sun = new THREE.DirectionalLight(0xffefda, 3.3);
  sun.position.set(-14, 24, 17); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left:-23, right:23, top:20, bottom:-20, near:0.5, far:80 });
  sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd7eaff, 0.75);
  fill.position.set(12, 12, -8); scene.add(fill);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const groups = new Map(), hitTargets = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 2015;
  function random() { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; }
  function geometry(g) { geometries.add(g); return g; }
  function material(color, options = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness:0.82, ...options });
    materials.add(m); return m;
  }
  function texture(kind) {
    const cv=document.createElement('canvas'); cv.width=cv.height=256;
    const ctx=cv.getContext('2d'); ctx.fillStyle='#b9b9b9'; ctx.fillRect(0,0,256,256);
    for(let i=0;i<14000;i++) {
      const v=Math.floor(140+random()*90); ctx.fillStyle=`rgb(${v},${v},${v})`;
      ctx.fillRect(random()*256,random()*256,kind==='wood'?18+random()*55:1.5,1);
    }
    if(kind==='wood'||kind==='tile') {
      ctx.strokeStyle='#646464'; ctx.lineWidth=1;
      for(let y=0;y<256;y+=kind==='tile'?64:32) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke(); }
      if(kind==='tile') for(let x=0;x<256;x+=64) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}
    }
    const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.repeat.set(kind==='grass'?12:2,kind==='grass'?12:2);t.colorSpace=THREE.SRGBColorSpace;
    t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(t);return t;
  }
  const grain=texture('wood'),stucco=texture('stucco'),tile=texture('tile'),grass=texture('grass');
  const M={
    plaster:material(0xe6dfc9,{map:stucco,bumpMap:stucco,bumpScale:0.035}),
    green:material(0x215b46,{metalness:0.35,roughness:0.45}),
    roof:material(0x37584a,{metalness:0.3,roughness:0.7}),
    wood:material(0xb99052,{map:grain,bumpMap:grain,bumpScale:0.025}),
    darkWood:material(0x60402c,{map:grain,roughness:0.62}),
    frame:material(0x242e2a,{metalness:0.35,roughness:0.44}),
    glass:material(0x91b8bd,{metalness:0.28,roughness:0.19,transparent:true,opacity:0.48,side:THREE.DoubleSide}),
    canopy:material(0x77ae83,{roughness:0.3,transparent:true,opacity:0.6,side:THREE.DoubleSide}),
    stone:material(0xa5a59b,{map:stucco,bumpMap:stucco,bumpScale:0.07}),
    grass:material(0x7b9d4d,{map:grass,roughness:1}),earth:material(0x667057,{map:stucco}),
    floor:material(0xdfdbc8,{map:tile,bumpMap:tile,bumpScale:0.018}),
    linen:material(0xf0e8d6,{map:stucco,bumpMap:stucco,bumpScale:0.008}),
    curtain:material(0xd1cbb9,{side:THREE.DoubleSide,roughness:1}),black:material(0x26282a),
  };
  const gardenPhoto = new THREE.TextureLoader().load('assets/hero.jpg');
  gardenPhoto.colorSpace = THREE.SRGBColorSpace;
  textures.add(gardenPhoto);
  const gardenView = new THREE.MeshBasicMaterial({map:gardenPhoto,side:THREE.DoubleSide,toneMapped:false});
  materials.add(gardenView);
  const unitBox=geometry(new THREE.BoxGeometry(1,1,1));
  const leafShape=new THREE.Shape();
  leafShape.moveTo(0,-0.5);leafShape.bezierCurveTo(-0.55,-0.1,-0.38,0.35,0,0.5);
  leafShape.bezierCurveTo(0.38,0.35,0.55,-0.1,0,-0.5);
  const leafGeo=geometry(new THREE.ShapeGeometry(leafShape));
  const leafMat=material(0xffffff,{side:THREE.DoubleSide,roughness:0.95});
  function mesh(p,geo,mat,x,y,z) {
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;
  }
  function box(p,x,y,z,w,h,d,mat=M.plaster,round=0) {
    const geo=round?geometry(new RoundedBoxGeometry(w,h,d,2,Math.min(round,w/3,h/3,d/3))):unitBox;
    const m=mesh(p,geo,mat,x,y,z);if(!round)m.scale.set(w,h,d);return m;
  }
  function rod(p,a,b,radius,mat=M.darkWood,top=radius) {
    const start=V(...a),end=V(...b),delta=end.clone().sub(start);
    const m=mesh(p,geometry(new THREE.CylinderGeometry(top,radius,delta.length(),7)),mat,0,0,0);
    m.position.copy(start.add(end).multiplyScalar(0.5));m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return m;
  }
  function leaves(p,count,locate,base=0x456d2c) {
    const batch=new THREE.InstancedMesh(leafGeo,leafMat,count),o=new THREE.Object3D(),color=new THREE.Color(base);
    for(let i=0;i<count;i++) {
      const a=locate(i);o.position.set(a.x,a.y,a.z);
      o.rotation.set(a.rx??random()*Math.PI,a.ry??random()*Math.PI,random()*Math.PI*2);
      const s=a.size||0.18;o.scale.set(s,s*1.3,s);o.updateMatrix();batch.setMatrixAt(i,o.matrix);
      batch.setColorAt(i,color.clone().multiplyScalar(0.62+random()*0.75));
    }
    batch.castShadow=true;batch.receiveShadow=true;p.add(batch);return batch;
  }
  function ivy(p,x,y,z,width,height,count=450) {
    leaves(p,count,()=>({x:x+(random()-0.5)*width,y:y+random()*height,z:z+random()*0.18,
      rx:(random()-0.5)*0.8,ry:(random()-0.5)*0.7,size:0.14+random()*0.16}),0x456231);
    for(let i=0;i<5;i++){const xx=x+(random()-0.5)*width;rod(p,[xx,y,z],[xx+0.2,y+height,z],0.015);}
  }
  function tree(p,x,z,height=7) {
    const t=new THREE.Group();t.position.set(x,0,z);p.add(t);
    rod(t,[0,0,0],[0.13,height,0],0.18,M.darkWood,0.045);
    const ends=[];
    for(let i=0;i<15;i++) {
      const a=i*2.4,y=height*(0.27+i*0.041),r=(1-i/20)*height*0.34;
      const e=[Math.cos(a)*r,y+0.5,Math.sin(a)*r];ends.push(e);rod(t,[0,y,0],e,0.055,M.darkWood,0.013);
    }
    leaves(t,1400,i=>{const e=ends[i%ends.length],s=random();return {
      x:e[0]*s+(random()-0.5)*1.2,y:e[1]+(random()-0.5)*0.85,z:e[2]*s+(random()-0.5)*1.2,size:0.18+random()*0.18};},0x658b39);
  }
  function shrub(p,x,y,z,scale=1) {
    leaves(p,230,()=>{const a=random()*Math.PI*2,r=Math.sqrt(random())*scale;
      return{x:x+Math.cos(a)*r,y:y+random()*scale*0.7,z:z+Math.sin(a)*r,size:0.2*scale};},0x507838);
  }
  function windowFrame(p,x,y,z,w,h,options={}) {
    const f=new THREE.Group();f.position.set(x,y,z);f.rotation.y=options.rotation||0;p.add(f);
    const mat=options.dark?M.frame:M.green;
    box(f,0,0,0,w,h,0.025,M.glass).castShadow=false;
    if(options.garden) {
      const backdrop=mesh(f,geometry(new THREE.PlaneGeometry(w,h)),gardenView,0,0,-0.12);
      backdrop.castShadow=false;backdrop.receiveShadow=false;
    }
    [-1,1].forEach(s=>{box(f,s*w/2,0,0.02,0.065,h+0.12,0.12,mat);box(f,0,s*h/2,0.02,w+0.12,0.065,0.12,mat);});
    for(let i=1;i<(options.panes||3);i++)box(f,-w/2+w*i/(options.panes||3),0,0.02,0.05,h,0.09,mat);
    box(f,0,-h*0.28,0.025,w,0.045,0.1,mat);
    if(options.curtains)[-1,1].forEach(s=>{for(let i=0;i<6;i++)box(f,s*(w/2-i*0.07),0,-0.1-(i%2)*0.07,0.09,h-0.08,0.05,M.curtain,0.02);});
    return f;
  }
  function panelWall(p,width,height,openings,mat=M.plaster) {
    const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(width/2,height);shape.lineTo(-width/2,height);shape.closePath();
    for(const[x,y,w,h]of openings){const hole=new THREE.Path();hole.moveTo(x-w/2,y-h/2);hole.lineTo(x-w/2,y+h/2);hole.lineTo(x+w/2,y+h/2);hole.lineTo(x+w/2,y-h/2);hole.closePath();shape.holes.push(hole);}
    return mesh(p,geometry(new THREE.ExtrudeGeometry(shape,{depth:0.16,bevelEnabled:false})),mat,0,0,0);
  }
  function roof(p,x,y,z,w,d,slope=-0.07,mat=M.roof) {
    const r=new THREE.Group();r.position.set(x,y,z);r.rotation.x=slope;p.add(r);box(r,0,0,0,w,0.1,d,mat);
    for(let a=-w/2;a<=w/2;a+=0.2)box(r,a,0.066,0,0.045,0.05,d,mat);return r;
  }
  function seat(p,x,y,z,color=0x82949b,width=1.8) {
    const cushion=material(color,{roughness:0.95,map:stucco});
    box(p,x,y+0.4,z,width,0.14,0.72,M.darkWood);box(p,x,y+0.54,z,width-0.14,0.19,0.64,cushion,0.07);
    box(p,x,y+0.83,z-0.32,width,0.68,0.1,M.darkWood);box(p,x,y+0.86,z-0.22,width-0.16,0.4,0.13,cushion,0.05);
    [-1,1].forEach(s=>[-1,1].forEach(t=>box(p,x+s*(width/2-0.09),y+0.24,z+t*0.26,0.07,0.48,0.07,M.darkWood)));
  }
  const estate=new THREE.Group();groups.set('estate',estate);scene.add(estate);
  box(estate,0,-0.22,0,35,0.4,28,M.earth);box(estate,0,0,0,35,0.07,28,M.grass);
  const main=new THREE.Group();main.position.set(-4.8,0.18,-1);estate.add(main);
  const openings=[[-2.2,1.45,3.1,2.6],[2.05,1.45,3.35,2.6],[-2.1,4.66,3.3,2.2],[2.03,4.66,3.35,2.2]];
  panelWall(main,9.3,6.1,openings).position.z=3.2;
  openings.forEach(([x,y,w,h])=>windowFrame(main,x,y,3.3,w,h,{curtains:y<3}));
  box(main,0,3.15,0,9.3,0.22,6.4);box(main,0,0,0,9.4,0.16,6.7,M.floor);box(main,0,3,-3.2,9.3,6,0.18);
  [-1,1].forEach(s=>{
    const wall=panelWall(main,6.4,6.1,[[0,1.55,3.8,2.55],[0,4.65,3.8,2.2]]);wall.rotation.y=s*Math.PI/2;wall.position.x=s*4.64;
    [1.55,4.65].forEach(y=>windowFrame(main,s*4.75,y,0,3.8,y<3?2.55:2.2,{rotation:s*Math.PI/2}));
  });
  roof(main,0,6.2,0,10.1,7.3,-0.035);box(main,-0.6,6.48,-1.5,3.1,0.48,2.3);roof(main,-0.6,6.81,-1.5,3.4,2.7,-0.05);
  for(let x=-2;x<1.1;x+=0.7)box(main,x,6.98,-0.24,0.08,0.55,0.08,M.darkWood);
  [6.9,7.12].forEach(y=>box(main,-0.5,y,-0.24,3.2,0.08,0.08,M.darkWood));
  // Steel/glass verandah and vines follow assets/garden/facade.jpg.
  box(main,1.3,0.02,4.2,12.4,0.14,2,M.stone);
  const canopy=box(main,1.4,3.05,4.5,12.8,0.06,2.7,M.canopy);canopy.rotation.x=0.025;canopy.castShadow=false;
  [-4.85,-0.2,4.7,7.8].forEach(x=>{box(main,x,1.48,5.8,0.11,3,0.11,M.frame);box(main,x,3.07,4.5,0.1,0.12,2.85,M.green);});
  [3.17,4.5,5.84].forEach(z=>box(main,1.4,3.04,z,12.9,0.13,0.12,M.green));
  for(let x=-4.5;x<7.8;x+=0.75)box(main,x,3.05,4.5,0.04,0.07,2.7,M.green);
  [-4.5,-0.12,4.47].forEach(x=>ivy(main,x,0.2,3.46,0.85,5.9,850));
  [3.03,5.95].forEach(y=>ivy(main,0,y,3.51,9.6,0.36,650));
  ivy(main,-3.8,0,3.5,0.9,4.5,350);
  seat(main,2.7,0.14,4.5,0x8d5d4e,1.6);seat(main,2.1,0.1,2,0x88a2a5,2.5);
  box(main,-1.4,3.9,1.5,2.3,0.12,0.9,M.darkWood);[-2.3,-0.5].forEach(x=>seat(main,x,3.24,1.2,0xa59068,0.5));
  box(main,-5.15,1.28,2.6,1.3,2.6,1.6);box(main,-5.15,1.12,3.43,0.86,2.15,0.09,M.darkWood);roof(main,-5.15,2.72,2.7,1.8,2.3,0.12);
  for(let i=0;i<6;i++)shrub(main,-4.8+i*2.1,0.1,6,0.46);

  const cabin=new THREE.Group();cabin.position.set(8.5,0.4,-3.4);estate.add(cabin);
  box(cabin,0,0,0,5.4,0.18,5.2,M.darkWood);
  panelWall(cabin,5,3.8,[[0,1.7,3.2,2.9]],M.wood).position.z=2.1;
  windowFrame(cabin,0,1.7,2.23,3.2,2.9,{dark:true,curtains:true});
  box(cabin,-2.5,1.85,0,0.15,3.7,4.2,M.wood);box(cabin,0,1.85,-2.1,5,3.7,0.16,M.wood);
  const side=panelWall(cabin,4.2,3.8,[[0.2,1.35,1.25,2.5]],M.wood);side.rotation.y=Math.PI/2;side.position.x=2.5;
  box(cabin,2.6,1.35,-0.2,0.08,2.48,1.22,M.darkWood);roof(cabin,0,4.02,0,5.65,5.15,0.12,M.frame);
  for(let y=0.25;y<3.8;y+=0.21)[-1,1].forEach(s=>box(cabin,s*2.13,y,2.24,0.7,0.022,0.022,M.darkWood));
  for(let x=-2.35;x<=2.4;x+=1.17)box(cabin,x,0.62,2.52,0.04,1.15,0.04,M.frame);
  [0.24,0.68,1.13].forEach(y=>box(cabin,0,y,2.52,4.75,0.035,0.035,M.frame));
  [-2,2].forEach(x=>[-1.7,1.7].forEach(z=>box(cabin,x,-0.25,z,0.18,0.5,0.18,M.frame)));
  const pond=mesh(estate,geometry(new THREE.CircleGeometry(1,72)),material(0x487e70,{metalness:0.35,roughness:0.24}),6.2,0.063,4.2);
  pond.rotation.x=-Math.PI/2;pond.scale.set(5.1,3.25,1);pond.castShadow=false;
  const rockGeo=geometry(new THREE.IcosahedronGeometry(1,1));
  for(let i=0;i<53;i++) {
    const a=i/53*Math.PI*2,r=mesh(estate,rockGeo,M.stone,6.2+Math.cos(a)*5.13,0.09,4.2+Math.sin(a)*3.26);
    r.scale.set(0.3+random()*0.3,0.15+random()*0.25,0.25+random()*0.24);r.rotation.set(random(),random(),random());
  }
  const padMat=material(0x588536);
  for(let i=0;i<19;i++) {
    const a=random()*Math.PI*2,r=Math.sqrt(random())*0.75;
    const pad=mesh(estate,geometry(new THREE.CircleGeometry(0.13+random()*0.16,14,0.12,Math.PI*1.9)),padMat,6.2+Math.cos(a)*4.8*r,0.07+i*0.0002,4.2+Math.sin(a)*3*r);
    pad.rotation.x=-Math.PI/2;pad.castShadow=false;
  }
  for(let i=0;i<20;i++){const stone=box(estate,0.4+Math.sin(i*0.15)*0.8,0.075,7.8-i*0.54,0.72,0.07,0.46,M.stone,0.09);stone.rotation.y=Math.sin(i)*0.18;}
  [[-12,-5,8],[-8,-8,9],[-1,-8,8],[5,-9,8],[13,-7,9],[14,0,7],[-13,5,7]].forEach(([x,z,h])=>tree(estate,x,z,h));
  [[-12,-2],[-11,-7],[-4,-9],[1,-8],[11,-6],[14,-3],[13,3],[10,7],[-10,4]].forEach(([x,z])=>shrub(estate,x,0,z,1));
  function addTarget(p,key){p.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh){o.userData.view=key;hitTargets.push(o);}});}
  addTarget(main,'estate');addTarget(cabin,'cabin');
  function pillow(p,x,y,z,w,mat) {
    const m=box(p,x,y,z,w,0.17,0.45,mat,0.09);m.rotation.x=-0.12;
  }
  function bed(p,x,z,width,accent,upholstered=false) {
    const base=upholstered?material(0xc9bda8,{map:stucco}):M.darkWood;
    box(p,x,0.28,z,width,0.32,2.1,base,0.035);
    box(p,x,0.52,z,width-0.02,0.22,2.08,M.linen,0.09);
    const quilt=box(p,x,0.66,z+0.2,width+0.03,0.12,1.58,M.linen,0.055);
    const a=quilt.geometry.attributes.position;
    for(let i=0;i<a.count;i++)if(a.getY(i)>0)a.setY(i,a.getY(i)+Math.sin(a.getX(i)*18+a.getZ(i)*4)*0.018);
    a.needsUpdate=true;quilt.geometry.computeVertexNormals();
    box(p,x,0.67,z+0.79,width+0.05,0.045,0.35,accent,0.02);
    box(p,x,0.6,z-1.02,width+0.07,1.05,0.13,base,0.045);
    const count=width>1.4?2:1;
    for(let i=0;i<count;i++)pillow(p,x+(i-(count-1)/2)*width*0.44,0.74,z-0.72,width/count-0.15,accent);
    [-1,1].forEach(s=>[-1,1].forEach(t=>box(p,x+s*(width/2-0.1),0.1,z+t*0.9,0.08,0.2,0.08,M.darkWood)));
  }
  function fan(p,x,y,z) {
    rod(p,[x,y,z],[x,y-0.28,z],0.035,M.black);
    const f=new THREE.Group();f.position.set(x,y-0.29,z);p.add(f);
    for(let i=0;i<3;i++) {
      const b=new THREE.Group();b.rotation.y=i*Math.PI*2/3;f.add(b);
      box(b,0.38,0,0,0.78,0.035,0.16,M.wood,0.035);
    }
  }
  function picture(p,x,y,z,width,color) {
    box(p,x,y,z,width,0.74,0.07,M.darkWood);
    box(p,x,y,z+0.045,width-0.1,0.64,0.02,material(color));
    box(p,x,y-0.2,z+0.063,width-0.2,0.045,0.012,M.linen);
  }
  const roomDefs={
    yunsidai:{wall:0x8f7660,accent:0xdac7b5,wooden:false},
    lihalai:{wall:0x98b52e,accent:0x93ba42,wooden:false},
    zhenqing:{wall:0xa63532,accent:0xd7aaa5,wooden:false},
    cabin:{wall:0xceab6b,accent:0xcbd04e,wooden:true},
  };
  for(const[key,def]of Object.entries(roomDefs)) {
    const room=new THREE.Group();groups.set(key,room);scene.add(room);room.visible=false;
    const wallMat=material(def.wall,{map:def.wooden?grain:stucco,bumpMap:def.wooden?grain:stucco,bumpScale:0.015});
    const accent=material(def.accent,{map:stucco});
    box(room,0,-0.09,0,6.5,0.18,5.7,def.wooden?M.wood:M.floor);
    const backOpenings = key==='lihalai'?[[1.28,2.12,2.5,1.65]]:
      key==='zhenqing'?[[2.61,1.94,0.64,2.05]]:key==='cabin'?[[-1.3,2.05,1.4,1.3]]:[];
    panelWall(room,6.5,3.2,backOpenings,wallMat).position.z=-2.8;
    const wall=panelWall(room,5.6,3.2,[[0,1.5,3.95,2.7]],def.wooden?M.wood:M.plaster);
    wall.rotation.y=Math.PI/2;wall.position.x=-3.2;
    windowFrame(room,-3.12,1.5,0,3.95,2.7,{rotation:Math.PI/2,dark:true,curtains:true,garden:true});
    if(key==='lihalai') {
      box(room,0,0.14,-1.3,5.15,0.27,2.8,M.darkWood);
      bed(room,-1.18,-1.12,2.08,accent);bed(room,1.12,-1.12,2.08,accent);
      windowFrame(room,1.28,2.12,-2.61,2.5,1.65,{dark:true,curtains:true,garden:true});
    } else if(key==='yunsidai') {
      bed(room,-1.3,-1.12,1.1,accent);bed(room,0.83,-1.12,1.9,accent,true);
      picture(room,-1.32,1.99,-2.66,0.56,0xe7d7bb);
      for(let i=0;i<3;i++) {
        const x=1.1+i*0.45,y=2.6+(i%2)*0.2;rod(room,[x,3.2,0],[x,y,0],0.012,M.black);
        const shade=mesh(room,geometry(new THREE.SphereGeometry(0.2,18,12)),i===1?M.darkWood:M.wood,x,y,0);shade.scale.y=1.13;
        const bulb=material(0xffe0a0,{emissive:0xffc777,emissiveIntensity:0.6});
        mesh(room,geometry(new THREE.SphereGeometry(0.065,10,8)),bulb,x,y-0.1,0);
      }
    } else if(key==='zhenqing') {
      box(room,0,0.65,-2.65,5.9,1.3,0.09,M.wood);
      bed(room,-1.35,-1.13,1.8,accent);bed(room,0.94,-1.13,1.8,accent);
      picture(room,-0.85,2.02,-2.59,0.72,0x386776);picture(room,0.6,1.91,-2.59,0.92,0x688746);
      windowFrame(room,2.61,1.94,-2.61,0.64,2.05,{dark:true,panes:1,garden:true});
    } else {
      bed(room,0.92,-1.2,1.9,accent);windowFrame(room,-1.3,2.05,-2.61,1.4,1.3,{dark:true,panes:2,garden:true});
      box(room,-1.7,0.76,1.04,1.65,0.1,0.85,M.darkWood);
      [-2.34,-1.06].forEach(x=>[-1,1].forEach(s=>box(room,x,0.37,1.04+s*0.32,0.065,0.74,0.065,M.darkWood)));
      seat(room,-1.72,0,1.96,0x768087,0.6);
      const bricks=[material(0x9c4e32),material(0x804b37),material(0xb6694c),material(0x594c42)];
      box(room,2.95,0.42,0.75,0.14,0.84,2.4,M.stone);
      for(let row=0;row<4;row++)for(let col=0;col<5;col++)[2.85,3.05].forEach(x=>box(room,x,0.12+row*0.176,-0.32+col*0.45+(row%2)*0.2,0.08,0.145,0.4,bricks[(row*3+col)%4]));
    }
    for(let x=-2.5;x<3;x+=1.05)box(room,x,3.17,-1.4,0.11,0.18,2.8,def.wooden?M.frame:M.darkWood);
    fan(room,-0.25,3.18,0.25);
    box(room,2.3,0.42,1.7,1.28,0.72,0.46,M.darkWood);
    box(room,2.3,1.18,1.6,1.06,0.67,0.06,M.black,0.025);box(room,2.3,0.84,1.61,0.2,0.16,0.07,M.black);
    mesh(room,geometry(new THREE.CylinderGeometry(0.2,0.13,0.3,14)),material(0x8b7960),2.62,0.15,2.24);
    shrub(room,2.62,0.3,2.24,0.35);box(room,-0.17,0.34,-2.15,0.38,0.64,0.42,M.darkWood);
    addTarget(room,key);
  }
  const presets={
    estate:{target:[0,0.7,0],offset:[17,15,25],span:40,min:12,max:90,background:0xe7efeb},
    yunsidai:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
    lihalai:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
    zhenqing:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
    cabin:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
  };
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let active='estate',pointerStart=null,hovered=null,transition=null,visible=true,stopped=false;
  function pick(event) {
    const bounds=canvas.getBoundingClientRect();
    pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    ray.setFromCamera(pointer,camera);
    // Invisible ancestors must be filtered explicitly before raycasting.
    const candidates=hitTargets.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});
    return ray.intersectObjects(candidates,false)[0]?.object.userData.view||null;
  }
  function move(e){
    if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>=6)pointerStart.dragged=true;
    if(e.buttons||e.pointerType==='touch')return;
    const k=pick(e);if(k!==hovered){hovered=k;canvas.style.cursor=k?'pointer':'grab';opts.onHover?.(k);}
  }
  function leave(){hovered=null;canvas.style.cursor='grab';opts.onHover?.(null);}
  function down(e){pointerStart=e.isPrimary?{x:e.clientX,y:e.clientY,id:e.pointerId,dragged:false}:null;transition=null;}
  function up(e){if(pointerStart&&!pointerStart.dragged&&pointerStart.id===e.pointerId&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<6){const k=pick(e);if(k)opts.onPick?.(k);}pointerStart=null;}
  function cancel(){pointerStart=null;}
  const events={pointermove:move,pointerleave:leave,pointerdown:down,pointerup:up,pointercancel:cancel};
  for(const[name,fn]of Object.entries(events))canvas.addEventListener(name,fn);
  function fit(animate=false) {
    const p=presets[active],target=V(...p.target),direction=V(...p.offset).normalize();
    const distance=Math.max(V(...p.offset).length(),p.span/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(camera.aspect,0.4)));
    const position=target.clone().addScaledVector(direction,distance);
    controls.minDistance=p.min;controls.maxDistance=Math.max(p.max,distance*1.25);
    if(animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)transition={start:performance.now(),from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target};
    else{transition=null;camera.position.copy(position);controls.target.copy(target);controls.update();}
  }
  function setView(key){if(!presets[key])return;active=key;for(const[name,g]of groups)g.visible=name===key;scene.background=new THREE.Color(presets[key].background);leave();fit();opts.onViewChange?.(key);}
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();fit();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
  const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});visibilityObserver.observe(canvas);
  function zoom(factor){transition=null;const d=camera.position.clone().sub(controls.target);d.setLength(THREE.MathUtils.clamp(d.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(d);controls.update();}
  renderer.setAnimationLoop(time=>{
    if(stopped||!visible||document.hidden)return;
    if(transition){const t=Math.min(1,(time-transition.start)/650),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.target,ease);if(t===1)transition=null;}
    controls.update();renderer.render(scene,camera);
  });
  resize();setView('estate');
  return{setView,reset(){fit(true);},zoom,stop(){
    if(stopped)return;stopped=true;renderer.setAnimationLoop(null);resizeObserver.disconnect();visibilityObserver.disconnect();controls.dispose();
    for(const[name,fn]of Object.entries(events))canvas.removeEventListener(name,fn);
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});renderer.dispose();
  }};
}
