import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFloorTextures } from './floor-textures.js?v=20260907-1';

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
    const mat=options.frame||(options.dark?M.frame:M.green);
    box(f,0,0,0,w,h,0.025,options.glass||M.glass).castShadow=false;
    if(options.garden) {
      const backdrop=mesh(f,geometry(new THREE.PlaneGeometry(w,h)),gardenView,0,0,-0.12);
      backdrop.castShadow=false;backdrop.receiveShadow=false;
    }
    [-1,1].forEach(s=>{box(f,s*w/2,0,0.02,0.065,h+0.12,0.12,mat);box(f,0,s*h/2,0.02,w+0.12,0.065,0.12,mat);});
    for(let i=1;i<(options.panes||3);i++)box(f,-w/2+w*i/(options.panes||3),0,0.02,0.05,h,0.09,mat);
    if(options.transom)box(f,0,h/2-options.transom,0.025,w,0.065,0.1,mat);
    else if(!options.fullHeight)box(f,0,-h*0.28,0.025,w,0.045,0.1,mat);
    if(options.curtains)[-1,1].forEach(s=>{for(let i=0;i<6;i++)box(f,s*(w/2-i*0.07),0,-0.1-(i%2)*0.07,0.09,h-0.08,0.05,options.curtainMaterial||M.curtain,0.02);});
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
  const main=new THREE.Group();main.name='main';main.position.set(-4.8,0.18,-1);estate.add(main);
  const exterior={
    stucco:material(0xcac5b8,{map:stucco,bumpMap:stucco,bumpScale:0.085,roughness:1}),
    frame:material(0x193e30,{metalness:0.25,roughness:0.48}),
    glass:material(0x547669,{metalness:0.32,roughness:0.18,transparent:true,opacity:0.58,side:THREE.DoubleSide}),
    curtain:material(0xeee6ce,{roughness:1}),post:material(0x4b342b,{map:grain}),
    canopy:material(0xa7d6ad,{roughness:0.24,transparent:true,opacity:0.43,depthWrite:false,side:THREE.DoubleSide}),
    tile:material(0xc88e80,{map:tile,bumpMap:tile,bumpScale:0.025}),
    yellow:material(0xe4b13a,{roughness:0.7}),cloth:material(0xefc8d5,{map:tile,roughness:1}),
  };
  const facade=new THREE.Group();facade.name='main-ground-facade';main.add(facade);
  const openings=[[-2.2,1.56,3.1,2.6],[2.05,1.56,3.35,2.6]];
  panelWall(facade,9.3,3.05,openings,exterior.stucco).position.z=3.2;
  const upper=panelWall(main,9.3,3.05,[[-2.1,1.61,3.3,2.2],[2.03,1.61,3.35,2.2]]);upper.position.set(0,3.05,3.2);
  openings.forEach(([x,y,w,h],i)=>windowFrame(facade,x,y,3.4,w,h,{frame:exterior.frame,glass:exterior.glass,curtains:true,curtainMaterial:exterior.curtain,fullHeight:true,transom:i===0?0.38:0,panes:i===0?4:3}));
  [[-2.1,4.66,3.3,2.2],[2.03,4.66,3.35,2.2]].forEach(([x,y,w,h])=>windowFrame(main,x,y,3.3,w,h));
  box(facade,0,0.13,3.4,9.3,0.26,0.11,exterior.tile);
  box(main,0,3.15,0,9.3,0.22,6.4);box(main,0,0,0,9.4,0.16,6.7,M.floor);box(main,0,3,-3.2,9.3,6,0.18);
  [-1,1].forEach(s=>{
    const wall=panelWall(facade,6.4,3.05,[[0,1.56,3.8,2.6]],exterior.stucco);wall.rotation.y=s*Math.PI/2;wall.position.x=s*4.64;
    const high=panelWall(main,6.4,3.05,[[0,1.6,3.8,2.2]]);high.rotation.y=s*Math.PI/2;high.position.set(s*4.64,3.05,0);
    windowFrame(facade,s*4.85,1.56,0,3.8,2.6,{rotation:s*Math.PI/2,frame:exterior.frame,glass:exterior.glass,curtains:true,curtainMaterial:exterior.curtain,fullHeight:true});
    windowFrame(main,s*4.75,4.65,0,3.8,2.2,{rotation:s*Math.PI/2});
    box(facade,s*4.75,0.13,0,0.11,0.26,6.4,exterior.tile);
  });
  roof(main,0,6.2,0,10.1,7.3,-0.035);box(main,-0.6,6.48,-1.5,3.1,0.48,2.3);roof(main,-0.6,6.81,-1.5,3.4,2.7,-0.05);
  for(let x=-2;x<1.1;x+=0.7)box(main,x,6.98,-0.24,0.08,0.55,0.08,M.darkWood);
  [6.9,7.12].forEach(y=>box(main,-0.5,y,-0.24,3.2,0.08,0.08,M.darkWood));
  // The glass verandah turns from the front around the right wall to the rear.
  const verandah=new THREE.Group();verandah.name='main-verandah';main.add(verandah);
  const porch=new THREE.Group();porch.name='main-porch';verandah.add(porch);
  [[1.3,4.5,12.4,2.6,'front'],[6.075,0,2.85,6.4,'right']].forEach(([x,z,w,d,name])=>{
    const map=tile.clone();map.repeat.set(w/2,d/2);textures.add(map);
    box(porch,x,0.06,z,w,0.4,d,material(0xc88e80,{map,bumpMap:map,bumpScale:0.025})).name=`main-porch-${name}`;
  });
  const steps=new THREE.Group();steps.name='main-porch-steps';porch.add(steps);
  box(steps,-2.2,-0.01,6.01,1.85,0.26,0.42,exterior.tile);
  box(steps,-2.2,-0.075,6.43,1.85,0.13,0.42,exterior.tile);
  const frontGlass=box(verandah,1.4,3.05,4.5,12.8,0.035,2.7,exterior.canopy);frontGlass.name='main-canopy-front';frontGlass.castShadow=false;
  const sideGlass=box(verandah,6.225,3.05,-0.1,3.15,0.035,6.5,exterior.canopy);sideGlass.name='main-canopy-right';sideGlass.castShadow=false;
  const posts=new THREE.Group();posts.name='main-canopy-posts';verandah.add(posts);
  [-4.82,-0.2,4.7,7.42].forEach(x=>{box(posts,x,1.63,5.68,0.1,2.74,0.1,exterior.post);box(verandah,x,2.98,4.5,0.08,0.12,2.7,M.green);});
  box(verandah,1.3,2.93,5.68,12.4,0.18,0.12,exterior.post);
  [3.15,4.5,5.84].forEach(z=>box(verandah,1.4,3.04,z,12.9,0.13,0.12,M.green));
  for(let x=-4.5;x<7.8;x+=0.75)box(verandah,x,3.05,4.5,0.04,0.07,2.7,M.green);
  [-3.1,-0.1,3.15].forEach(z=>box(posts,7.42,1.63,z,0.1,2.74,0.1,exterior.post));
  box(verandah,7.42,2.93,0,0.12,0.18,6.4,exterior.post);
  [-3.35,-0.1].forEach(z=>box(verandah,6.225,3.04,z,3.25,0.13,0.12,M.green));
  [4.65,6.225,7.8].forEach(x=>box(verandah,x,3.04,-0.1,0.1,0.13,6.5,M.green));
  for(let z=-2.6;z<3.15;z+=0.75)box(verandah,6.225,3.05,z,3.15,0.07,0.04,M.green);
  const swings=new THREE.Group();swings.name='main-verandah-swings';verandah.add(swings);
  [1.4,-0.85].forEach((z,i)=>{
    const swing=new THREE.Group();swing.name=`main-verandah-swing-${i+1}`;swing.position.set(6.225,0,z);swings.add(swing);
    box(swing,0,0.76,0,0.52,0.08,0.86,M.wood).name=`${swing.name}-seat`;
    // Both suspension ends meet the underside of the existing right-side longitudinal beam.
    [-1,1].forEach((s,j)=>{
      rod(swing,[0,0.8,s*0.35],[0,2.975,s*0.35],0.018,M.frame).name=`${swing.name}-suspension-${j+1}`;
    });
  });
  [-4.5,-0.12,4.47].forEach(x=>ivy(main,x,3.2,3.46,0.85,2.9,420));
  [3.03,5.95].forEach(y=>ivy(main,0,y,3.51,9.6,0.36,650));
  ivy(main,-4.45,0.26,3.5,0.5,2.7,180);
  const furniture=new THREE.Group();furniture.name='main-porch-furniture';furniture.position.y=0.26;porch.add(furniture);
  [0.1,2.15,4.75].forEach((x,i)=>{
    const chair=new THREE.Group();chair.name=`main-yellow-chair-${i+1}`;chair.position.set(x,0,4.05);chair.rotation.y=[-0.2,0.2,-0.3][i];furniture.add(chair);
    box(chair,0,0.43,0,0.55,0.065,0.52,exterior.yellow,0.025);
    [-1,1].forEach(s=>{rod(chair,[s*0.23,0,0.2],[s*0.23,0.45,0.2],0.025,exterior.yellow);rod(chair,[s*0.23,0,-0.2],[s*0.25,0.99,-0.27],0.025,exterior.yellow);});
    for(let i=-2;i<=2;i++)rod(chair,[i*0.1,0.49,-0.21],[i*0.11,0.96,-0.27],0.015,exterior.yellow);
    box(chair,0,0.98,-0.27,0.57,0.06,0.06,exterior.yellow,0.025);
  });
  const patioTable=new THREE.Group();patioTable.name='main-clothed-table';patioTable.position.set(1.12,0,4.1);furniture.add(patioTable);
  [-1,1].forEach(s=>[-1,1].forEach(t=>rod(patioTable,[s*0.25,0,t*0.25],[s*0.17,0.68,t*0.17],0.022,M.linen)));
  mesh(patioTable,geometry(new THREE.CylinderGeometry(0.44,0.49,0.24,24)),exterior.cloth,0,0.64,0);
  const bbq=new THREE.Group();bbq.name='main-bbq-cart';bbq.position.set(3.43,0,4.02);furniture.add(bbq);
  box(bbq,0,0.67,0,0.75,0.25,0.48,M.black,0.035);box(bbq,0,0.2,0,0.66,0.05,0.43,M.frame);
  [-1,1].forEach(s=>[-1,1].forEach(t=>rod(bbq,[s*0.29,0.08,t*0.18],[s*0.29,0.6,t*0.18],0.025,M.frame)));
  [-1,1].forEach(s=>{const wheel=mesh(bbq,geometry(new THREE.CylinderGeometry(0.09,0.09,0.045,12)),M.black,0.3,0.09,s*0.23);wheel.rotation.x=Math.PI/2;});
  for(let x=-0.3;x<0.35;x+=0.1)box(bbq,x,0.8,0,0.024,0.025,0.4,M.frame);
  seat(main,2.1,0.1,2,0x88a2a5,2.5);
  box(main,-1.4,3.9,1.5,2.3,0.12,0.9,M.darkWood);[-2.3,-0.5].forEach(x=>seat(main,x,3.24,1.2,0xa59068,0.5));
  box(main,-5.15,1.28,2.6,1.3,2.6,1.6);box(main,-5.15,1.12,3.43,0.86,2.15,0.09,M.darkWood);roof(main,-5.15,2.72,2.7,1.8,2.3,0.12);

  const cabin=new THREE.Group();cabin.name='estate-cabin';cabin.position.set(8.5,0.4,-3.4);estate.add(cabin);
  const sidingCanvas=document.createElement('canvas');sidingCanvas.width=sidingCanvas.height=512;
  const sidingCtx=sidingCanvas.getContext('2d');sidingCtx.drawImage(grain.image,0,0,512,512);
  for(let row=0;row<24;row++) {
    const y=row*512/24,joint=(row*173+97)%512;
    sidingCtx.fillStyle=row%3?'#e0d6bd66':'#f4e4bf66';sidingCtx.fillRect(0,y,512,512/24);
    sidingCtx.fillStyle='#796348';sidingCtx.fillRect(0,y,512,1.5);sidingCtx.fillRect(joint,y,1.2,512/24);
    for(let k=0;k<2;k++){sidingCtx.beginPath();sidingCtx.ellipse((joint+79+k*213)%512,y+11,3.6,1.6,0,0,Math.PI*2);sidingCtx.fill();}
  }
  const sidingMap=new THREE.CanvasTexture(sidingCanvas);sidingMap.wrapS=sidingMap.wrapT=THREE.RepeatWrapping;
  sidingMap.repeat.set(0.2,0.2);sidingMap.colorSpace=THREE.SRGBColorSpace;sidingMap.anisotropy=grain.anisotropy;textures.add(sidingMap);
  const timber=material(0xd6ad6d,{map:sidingMap,bumpMap:sidingMap,bumpScale:0.025});
  const cabinGlass=material(0xadc4ba,{transparent:true,opacity:0.32,depthWrite:false,roughness:0.2,side:THREE.DoubleSide});
  const cabinScreen=material(0x384039,{transparent:true,opacity:0.7,depthWrite:false,roughness:1,side:THREE.DoubleSide});
  const cabinTile=material(0x51403a,{roughness:0.84}),tileEdge=material(0x6b5144);
  box(cabin,0,0,0,5.4,0.18,5.2,M.darkWood);
  panelWall(cabin,5,5.5,[[0.42,2.7,2.55,5],[-1.82,4.14,0.95,1.78],[-1.82,1.45,0.95,2.4]],timber).position.z=2.1;
  windowFrame(cabin,0.42,2.7,2.27,2.55,5,{dark:true,glass:cabinGlass,transom:2.05}).name='cabin-tall-glass';
  windowFrame(cabin,-1.82,1.45,2.27,0.95,2.4,{dark:true,panes:2,fullHeight:true});
  windowFrame(cabin,-1.82,4.14,2.27,0.95,1.78,{dark:true,glass:cabinScreen,panes:2,fullHeight:true});
  box(cabin,-1.82,3.15,2.37,1.22,0.12,0.62,M.darkWood);
  for(const x of [-2.39,-1.25])box(cabin,x,3.64,2.65,0.04,0.94,0.04,M.frame);
  for(const y of [3.43,3.76,4.1])box(cabin,-1.82,y,2.65,1.18,0.035,0.035,M.frame);
  for(const x of [-2.39,-1.25])box(cabin,x,4.1,2.46,0.035,0.035,0.38,M.frame);
  [-1.9,-1.74].forEach(x=>rod(cabin,[x,3.91,2.36],[x,4.05,2.36],0.016,M.frame));
  const loftRail=new THREE.Group();loftRail.name='cabin-exterior-loft-rail';cabin.add(loftRail);
  box(loftRail,0.42,3.1,1.2,2.55,0.1,1.7,M.darkWood);
  for(let x=-0.79;x<1.7;x+=0.22)box(loftRail,x,3.65,1.91,0.045,1,0.045,M.wood);
  [3.29,4.15].forEach(y=>box(loftRail,0.42,y,1.91,2.55,0.07,0.075,M.wood));
  const left=panelWall(cabin,4.2,5.5,[],timber);left.rotation.y=-Math.PI/2;left.position.x=-2.5;
  const back=panelWall(cabin,5,5.5,[],timber);back.rotation.y=Math.PI;back.position.z=-2.1;
  const side=panelWall(cabin,4.2,5.5,[[-0.62,1.41,1.06,2.62],[0.55,1.45,0.64,2.7],[0,4.25,1.4,1.35]],timber);side.rotation.y=Math.PI/2;side.position.x=2.5;
  windowFrame(cabin,2.68,4.25,0,1.4,1.35,{rotation:Math.PI/2,dark:true,panes:2});
  const entry=new THREE.Group();entry.name='cabin-side-entry';entry.position.x=2.67;entry.rotation.y=Math.PI/2;cabin.add(entry);
  windowFrame(entry,0.55,1.45,0,0.64,2.7,{dark:true,panes:1,fullHeight:true});
  for(let y=0.75;y<2.8;y+=0.24)box(entry,0.55,y,-0.04,0.59,0.12,0.025,M.curtain);
  const door=new THREE.Group();door.position.set(-0.62,0.1,0);entry.add(door);
  panelWall(door,1.02,2.62,[[0,1.84,0.38,0.35]],M.wood);
  [-0.53,0.53].forEach(x=>box(door,x,1.31,0.08,0.055,2.68,0.18,M.frame));
  box(door,0,2.64,0.08,1.12,0.065,0.18,M.frame);
  windowFrame(door,0,1.84,0.18,0.38,0.35,{dark:true,panes:1,fullHeight:true});
  rod(door,[0.34,1.02,0.18],[0.34,1.02,0.25],0.025,M.frame);rod(door,[0.34,1.02,0.25],[0.18,1.02,0.25],0.018,M.frame);
  const lantern=material(0xffdb9b,{emissive:0xffbc65,emissiveIntensity:0.85});
  box(entry,-0.02,2.61,0.1,0.12,0.32,0.1,M.frame);box(entry,-0.02,2.62,0.22,0.13,0.21,0.13,lantern);
  [2.48,2.76].forEach(y=>box(entry,-0.02,y,0.22,0.21,0.055,0.21,M.frame));
  for(const [x,w,rise] of [[-1.95,1.7,0.19],[0.85,3.9,-0.19]]) {
    const r=roof(cabin,x,5.705,0,Math.hypot(w,rise),4.95,0,cabinTile);r.rotation.z=Math.atan2(rise,w);r.name=x<0?'cabin-roof-left':'cabin-roof-main';
    for(let z=-2.4;z<2.5;z+=0.34)box(r,0,0.072,z,w,0.025,0.025,tileEdge);
    [-2.475,2.475].forEach(z=>box(r,0,-0.045,z,w,0.15,0.065,M.frame));
  }
  const gable=new THREE.Shape();[[-2.5,5.5],[2.5,5.5],[2.5,5.57],[-1.1,5.745],[-2.5,5.588]].forEach(([x,y],i)=>i?gable.lineTo(x,y):gable.moveTo(x,y));gable.closePath();
  const gableGeo=geometry(new THREE.ExtrudeGeometry(gable,{depth:0.16,bevelEnabled:false}));
  mesh(cabin,gableGeo,timber,0,0,2.1);mesh(cabin,gableGeo,timber,0,0,-2.26);
  box(cabin,-2.5,5.544,0,0.16,0.088,4.2,timber);box(cabin,2.5,5.535,0,0.16,0.07,4.2,timber);
  box(cabin,-1.1,5.825,0,0.13,0.09,5.02,cabinTile);
  // Keep the shallow strip's end guards; the glazed bay opens onto the projecting rest deck.
  for(const [x,w] of [[-1.775,1.2],[2.2,0.35]]) {
    [-1,1].forEach(s=>box(cabin,x+s*w/2,0.62,2.52,0.04,1.15,0.04,M.frame));
    [0.24,0.68,1.13].forEach(y=>box(cabin,x,y,2.52,w,0.035,0.035,M.frame));
  }
  const waterfrontDeck=new THREE.Group();waterfrontDeck.name='cabin-waterfront-deck';waterfrontDeck.position.set(0.42,0.13,3.37);
  for(let i=0;i<11;i++)box(waterfrontDeck,0,-0.035,-1.05+(i+0.5)*2.1/11,3.2,0.07,2.1/11-0.012,M.wood);
  [-1.025,1.025].forEach(z=>box(waterfrontDeck,0,-0.105,z,3.2,0.11,0.12,M.frame));
  [-1.54,1.54].forEach(x=>box(waterfrontDeck,x,-0.105,0,0.12,0.11,2.1,M.frame));
  const deckSupports=new THREE.Group();deckSupports.name='cabin-deck-supports';waterfrontDeck.add(deckSupports);
  [-1.42,1.42].forEach(x=>[-0.86,0.86].forEach(z=>box(deckSupports,x,-0.34,z,0.13,0.55,0.13,M.frame)));
  const deckRails=new THREE.Group();deckRails.name='cabin-deck-railings';waterfrontDeck.add(deckRails);
  [-1.55,-0.78,0,0.78,1.55].forEach(x=>box(deckRails,x,0.5,1,0.035,1,0.035,M.frame));
  [-1.55,1.55].forEach(x=>[-0.99,0].forEach(z=>box(deckRails,x,0.5,z,0.035,1,0.035,M.frame)));
  [0.25,0.62,1].forEach(y=>{
    box(deckRails,0,y,1,3.14,0.035,0.035,M.frame);
    [-1.55,1.55].forEach(x=>box(deckRails,x,y,0,0.035,0.035,2.03,M.frame));
  });
  const deckTable=new THREE.Group();deckTable.name='cabin-deck-table';deckTable.position.z=0.34;waterfrontDeck.add(deckTable);
  box(deckTable,0,0.67,0,0.6,0.04,0.58,M.frame);
  [-0.19,0.19].forEach(z=>[-1,1].forEach(s=>rod(deckTable,[s*0.22,0.02,z],[-s*0.22,0.65,z],0.018,M.frame)));
  const deckChairSeat=material(0x626862);
  [-1,1].forEach(s=>{
    const chair=new THREE.Group();chair.name=s<0?'cabin-deck-chair-left':'cabin-deck-chair-right';chair.position.set(s*0.99,0,0.36);chair.rotation.y=-s*Math.PI/2;waterfrontDeck.add(chair);
    box(chair,0,0.43,0,0.47,0.035,0.48,deckChairSeat);box(chair,0,0.76,-0.25,0.47,0.28,0.035,deckChairSeat);
    [-0.215,0.215].forEach(x=>{
      [-1,1].forEach(t=>rod(chair,[x,0.02,t*0.27],[x,0.45,-t*0.19],0.016,M.frame));
      rod(chair,[x,0.43,-0.23],[x,0.93,-0.27],0.016,M.frame);
    });
  });
  cabin.add(waterfrontDeck);
  [-2,2].forEach(x=>[-1.7,1.7].forEach(z=>box(cabin,x,-0.25,z,0.18,0.5,0.18,M.frame)));
  box(cabin,3,0.03,0.18,0.9,0.22,2.4,M.darkWood);
  for(const z of [-1,0.18,1.36])box(cabin,3.43,0.6,z,0.045,1.08,0.045,M.frame);
  [0.3,0.98].forEach(y=>box(cabin,3.43,y,0.18,0.045,0.045,2.4,M.frame));
  rod(cabin,[3.43,0.3,-1],[3.43,0.98,0.18],0.02,M.frame);rod(cabin,[3.43,0.3,0.18],[3.43,0.98,1.36],0.02,M.frame);
  box(cabin,3,0.98,-1,0.9,0.045,0.045,M.frame);
  for(const z of [-0.9,1.25])box(cabin,3.35,-0.23,z,0.12,0.46,0.12,M.frame);
  box(cabin,3.05,-0.05,1.61,0.8,0.22,0.46,M.stone);box(cabin,3.05,-0.22,2.04,0.8,0.28,0.4,M.stone);
  const cabinGarden=new THREE.Group();cabinGarden.name='cabin-entry-garden';cabinGarden.position.set(8.5,0,-3.4);estate.add(cabinGarden);
  for(let i=0;i<6;i++){const stone=mesh(cabinGarden,geometry(new THREE.CylinderGeometry(0.42,0.46,0.08,5)),M.stone,3.05-Math.max(0,i-2)*0.2,0.08,2.67+i*0.68);stone.scale.z=0.6;stone.rotation.y=(i%3-1)*0.12;}
  // Keep new planting from changing the shared random sequence used by the estate and rooms.
  const gardenSeed=seed;
  [[1.8,3.25,0.48],[1.25,4.15,0.55],[4.2,3.5,0.42],[4,4.7,0.4]].forEach(([x,z,s])=>shrub(cabinGarden,x,0.06,z,s));
  seed=gardenSeed;
  // The back bank follows the porch; the front bank leaves dry ground for tree roots.
  const pondGarden=new THREE.Group();pondGarden.name='estate-pond';pondGarden.position.set(-2.4,0,6.1);estate.add(pondGarden);
  const pondOutline=[[-3.2,-0.25],[-2.95,-0.78],[-2.25,-1.02],[-1.1,-1.05],[0.15,-0.98],[1.4,-1.06],[2.6,-0.91],[3.2,-0.58],[3.35,-0.05],[3.05,0.57],[2.25,0.88],[1.25,1.02],[0.1,0.92],[-1.1,1.06],[-2.25,0.84],[-3,0.42]];
  const pondShape=new THREE.Shape();pondOutline.forEach(([x,z],i)=>i?pondShape.lineTo(x,-z):pondShape.moveTo(x,-z));pondShape.closePath();
  const pondBed=mesh(pondGarden,geometry(new THREE.ExtrudeGeometry(pondShape,{depth:0.035,bevelEnabled:false})),material(0x596552,{map:stucco}),0,0.045,0);pondBed.rotation.x=-Math.PI/2;pondBed.name='pond-bed';
  const pond=mesh(pondGarden,geometry(new THREE.ShapeGeometry(pondShape)),material(0x497e71,{metalness:0.32,roughness:0.22,transparent:true,opacity:0.92,depthWrite:false}),0,0.105,0);
  pond.name='pond-water';pond.rotation.x=-Math.PI/2;pond.castShadow=false;
  const bank=new THREE.Group();bank.name='pond-stone-bank';pondGarden.add(bank);
  const rockGeo=geometry(new THREE.IcosahedronGeometry(1,1));
  pondOutline.forEach(([x,z],i)=>{
    const [nx,nz]=pondOutline[(i+1)%pondOutline.length],dx=nx-x,dz=nz-z,count=Math.ceil(Math.hypot(dx,dz)/0.4);
    for(let j=0;j<count;j++){
      const t=(j+0.5)/count,r=mesh(bank,rockGeo,M.stone,x+dx*t,0.16,z+dz*t);
      r.scale.set(0.26+random()*0.08,0.16+random()*0.09,0.2+random()*0.04);r.rotation.y=-Math.atan2(dz,dx);
    }
  });
  const padMat=material(0x588536);
  for(let i=0;i<7;i++) {
    const pad=mesh(pondGarden,geometry(new THREE.CircleGeometry(0.12+random()*0.08,14,0.12,Math.PI*1.9)),padMat,-1.9+i*0.62,0.112+i*0.0002,0.23+Math.sin(i*2.4)*0.32);
    pad.rotation.x=-Math.PI/2;pad.castShadow=false;
  }
  // Photo: cabin-exterior-pond.jpg. Illustrative area; the east bank leaves the side-entry route dry.
  const cabinPond=new THREE.Group();cabinPond.name='cabin-ecological-pond';cabinPond.position.set(7.4,0,3.7);estate.add(cabinPond);
  const cabinPondOutline=[[-2,-3.55],[-1.4,-3.92],[-0.1,-4],[1.1,-3.88],[1.5,-3.6],[1.45,-2.85],[1.7,-2],[2.3,-1.05],[2.6,-0.2],[3.25,0.7],[3.5,1.95],[3,3.1],[2,3.95],[0.65,4.2],[-0.6,3.9],[-1.9,4],[-2.85,3.35],[-3.4,2.35],[-3.3,1.25],[-2.85,0.4],[-3.05,-0.55],[-2.8,-2.05]];
  const cabinPondShape=new THREE.Shape(),cabinBankShape=new THREE.Shape();
  cabinPondOutline.forEach(([x,z],i)=>{
    const spread=1.035+(i%3)*0.01;
    if(i){cabinPondShape.lineTo(x,-z);cabinBankShape.lineTo(x*spread,-z*spread);}
    else{cabinPondShape.moveTo(x,-z);cabinBankShape.moveTo(x*spread,-z*spread);}
  });
  cabinPondShape.closePath();cabinBankShape.closePath();cabinBankShape.holes.push(cabinPondShape);
  const cabinPondBed=mesh(cabinPond,geometry(new THREE.ExtrudeGeometry(cabinPondShape,{depth:0.03,bevelEnabled:false})),M.earth,0,0.05,0);
  cabinPondBed.name='cabin-pond-bed';cabinPondBed.rotation.x=-Math.PI/2;
  // Opaque water above the lawn and bed, below the bank; all horizontal faces point up.
  const cabinWater=mesh(cabinPond,geometry(new THREE.ShapeGeometry(cabinPondShape)),material(0x567c67,{metalness:0.22,roughness:0.29}),0,0.12,0);
  cabinWater.name='cabin-pond-water';cabinWater.rotation.x=-Math.PI/2;cabinWater.castShadow=false;
  const cabinBank=mesh(cabinPond,geometry(new THREE.ExtrudeGeometry(cabinBankShape,{depth:0.12,bevelEnabled:false})),M.earth,0,0.045,0);
  cabinBank.name='cabin-pond-bank';cabinBank.rotation.x=-Math.PI/2;
  const cabinPondSeed=seed;seed=9082015;
  cabinPondOutline.forEach(([x,z],i)=>{
    const [nx,nz]=cabinPondOutline[(i+1)%cabinPondOutline.length],dx=nx-x,dz=nz-z,count=Math.ceil(Math.hypot(dx,dz)/0.48);
    for(let j=0;j<count;j++){
      const t=(j+0.5)/count,r=mesh(cabinPond,rockGeo,i%4?M.stone:M.earth,x+dx*t,0.15,z+dz*t);
      r.scale.set(0.22+random()*0.15,0.11+random()*0.1,0.12+random()*0.08);r.rotation.y=-Math.atan2(dz,dx);
    }
  });
  const reedMat=material(0x658541,{side:THREE.DoubleSide}),irisMats=[material(0x7779bc,{side:THREE.DoubleSide}),material(0x718dc2,{side:THREE.DoubleSide})];
  const cabinReeds=new THREE.Group();cabinReeds.name='cabin-pond-reeds-and-irises';cabinPond.add(cabinReeds);
  [[-1.6,-3.55,0.45,0],[0.6,-2.05,0.4,1],[1.5,-1.45,0.65,1],[2.9,1.6,0.42,0],[1.5,3.55,0.48,0],[-2.55,2.8,0.45,0],[-2.55,-0.55,0.35,0]].forEach(([x,z,r,flowers])=>{
    const blades=new THREE.InstancedMesh(leafGeo,reedMat,64),o=new THREE.Object3D();
    for(let i=0;i<64;i++){
      const a=random()*Math.PI*2,d=Math.sqrt(random())*r,h=0.4+random()*0.5;
      o.position.set(x+Math.cos(a)*d,0.1+h/2,z+Math.sin(a)*d);o.rotation.set(0,a,(random()-0.5)*0.35);o.scale.set(0.045+random()*0.04,h,1);o.updateMatrix();blades.setMatrixAt(i,o.matrix);
    }
    blades.castShadow=true;blades.receiveShadow=true;cabinReeds.add(blades);
    for(let i=0;i<(flowers?5:2);i++){
      const a=random()*Math.PI*2,d=random()*r,xx=x+Math.cos(a)*d,zz=z+Math.sin(a)*d,h=0.8+random()*0.25;
      box(cabinReeds,xx,0.1+h/2,zz,0.015,h,0.015,reedMat);
      if(flowers)for(let k=0;k<3;k++){
        const angle=a+k*Math.PI*2/3,petal=mesh(cabinReeds,leafGeo,irisMats[i%2],xx+Math.cos(angle)*0.06,0.1+h,zz+Math.sin(angle)*0.06);
        petal.rotation.set(-Math.PI/2,0,-angle);petal.scale.set(0.1,0.19,1);
      }
      else box(cabinReeds,xx,0.1+h,zz,0.045,0.13,0.045,M.darkWood);
    }
  });
  seed=cabinPondSeed;
  const approach=new THREE.Group();approach.name='main-porch-approach';estate.add(approach);
  for(let i=0;i<12;i++){
    const t=i/11,stone=box(approach,-7.6+0.6*t,0.0675,11.9-5.95*t,0.92,0.065,0.38,exterior.tile,0.035);
    stone.rotation.y=Math.sin(i)*0.12;
  }
  const hedge=new THREE.Group();hedge.name='main-clipped-hedge';hedge.position.set(1.95,0,6.1);estate.add(hedge);
  [-0.55,0,0.55].forEach(z=>rod(hedge,[0,0,z],[0,0.9,z],0.045,exterior.post,0.02));
  leaves(hedge,580,()=>({x:(random()-0.5),y:0.65+random()*0.8,z:(random()-0.5)*1.6,size:0.16}),0x526f2b);
  const foregroundTree=new THREE.Group();foregroundTree.name='main-pond-tree';foregroundTree.position.set(-4.35,0,8.2);estate.add(foregroundTree);
  const roots=new THREE.Group();roots.name='main-tree-roots';foregroundTree.add(roots);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;rod(roots,[0,0.3,0],[Math.cos(a)*0.62,0.055,Math.sin(a)*0.62],0.095,exterior.post,0.035);}
  rod(foregroundTree,[0,0.08,0],[0.12,7.7,0],0.27,exterior.post,0.07);
  const branchEnds=[];
  for(let i=0;i<10;i++){
    const a=i*2.4,r=1.35+(i%3)*0.3,y=5.8+i*0.21,end=[Math.cos(a)*r,y,Math.sin(a)*r];branchEnds.push(end);
    rod(foregroundTree,[0.1,y-0.85,0],end,0.065,exterior.post,0.012);
  }
  leaves(foregroundTree,620,i=>{const e=branchEnds[i%10],t=0.45+random()*0.6;return{x:e[0]*t+(random()-0.5)*0.55,y:e[1]-random()*0.65,z:e[2]*t+(random()-0.5)*0.55,size:0.2+random()*0.16};},0x65843d).name='main-tree-open-foliage';
  const fern=new THREE.Group();fern.name='main-hanging-fern';fern.position.set(0,2.9,0.28);foregroundTree.add(fern);
  const mount=mesh(fern,rockGeo,exterior.post,0,0,0);mount.scale.set(0.22,0.27,0.13);
  leaves(fern,85,i=>{const a=i*2.4,t=random();return{x:Math.cos(a)*0.43*t,y:0.13-t*0.95,z:0.12+Math.sin(a)*0.18+t*0.2,size:0.18+t*0.2,rx:0.12,ry:a};},0x628952);
  [[-12,-5,8],[-8,-8,9],[-1,-8,8],[5,-9,8],[13,-7,9],[14,0,7],[-13,5,7]].forEach(([x,z,h])=>tree(estate,x,z,h));
  [[-12,-2],[-11,-7],[-4,-9],[1,-8],[11,-6],[14,-3],[13,3],[1.8,11.4],[-10,4]].forEach(([x,z])=>shrub(estate,x,0,z,1));
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
    yunsidai:{wall:0x8f7660,accent:0xdac7b5,wooden:false,floor:'tile',floorColor:[161,157,144]},
    lihalai:{wall:0x98b52e,accent:0x93ba42,wooden:false,floor:'wood',floorColor:[158,151,129]},
    zhenqing:{wall:0xa63532,accent:0xd7aaa5,wooden:false,floor:'wood',floorColor:[174,161,138]},
  };
  function roomFloor(room,def,index,width=6.5,depth=5.7) {
    const maps=createFloorTextures({kind:def.floor,color:def.floorColor,seed:2015+index,width,depth});
    const toTexture=(source,color=false)=>{
      const t=new THREE.CanvasTexture(source);
      if(color)t.colorSpace=THREE.SRGBColorSpace;
      t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.add(t);return t;
    };
    const floorMat=material(0xffffff,{map:toTexture(maps.color,true),bumpMap:toTexture(maps.height),
      bumpScale:def.floor==='tile'?0.025:0.014,roughnessMap:toTexture(maps.roughness),roughness:0.9});
    box(room,0,-0.1,0,width,0.18,depth,def.floor==='wood'?M.darkWood:M.stone);
    const floor=mesh(room,geometry(new THREE.PlaneGeometry(width,depth)),floorMat,0,0,0);
    floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    // Slightly raised edging keeps the cutaway from looking like a paper surface.
    box(room,0,0.015,-depth/2+0.13,width,0.1,0.075,def.floor==='wood'?M.wood:M.stone);
  }
  let floorIndex=0;
  for(const[key,def]of Object.entries(roomDefs)) {
    const room=new THREE.Group();groups.set(key,room);scene.add(room);room.visible=false;
    const wallMat=material(def.wall,{map:def.wooden?grain:stucco,bumpMap:def.wooden?grain:stucco,bumpScale:0.015});
    const accent=material(def.accent,{map:stucco});
    roomFloor(room,def,floorIndex++);
    const backOpenings = key==='lihalai'?[[1.28,2.12,2.5,1.65]]:
      key==='zhenqing'?[[2.61,1.94,0.64,2.05]]:[];
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
    }
    for(let x=-2.5;x<3;x+=1.05)box(room,x,3.17,-1.4,0.11,0.18,2.8,def.wooden?M.frame:M.darkWood);
    fan(room,-0.25,3.18,0.25);
    box(room,2.3,0.42,1.7,1.28,0.72,0.46,M.darkWood);
    box(room,2.3,1.18,1.6,1.06,0.67,0.06,M.black,0.025);box(room,2.3,0.84,1.61,0.2,0.16,0.07,M.black);
    mesh(room,geometry(new THREE.CylinderGeometry(0.2,0.13,0.3,14)),material(0x8b7960),2.62,0.15,2.24);
    shrub(room,2.62,0.3,2.24,0.35);box(room,-0.17,0.34,-2.15,0.38,0.64,0.42,M.darkWood);
    addTarget(room,key);
  }
  // The photos show a ground-floor bedroom and double-height hall below the loft.
  const cabinInside=new THREE.Group(),cabinGround=new THREE.Group(),cabinUpper=new THREE.Group();
  cabinInside.add(cabinGround,cabinUpper);groups.set('cabin',cabinInside);scene.add(cabinInside);cabinInside.visible=false;
  cabinGround.name='cabin-ground';cabinUpper.name='cabin-upper';
  const cabinFloor={floor:'wood',floorColor:[141,111,88]};
  roomFloor(cabinGround,cabinFloor,3,7.6,8.6);
  // Share deck geometry/materials; parenting to the ground floor also handles upper-only visibility.
  const groundWaterfrontDeck=waterfrontDeck.clone(true);groundWaterfrontDeck.name='cabin-ground-waterfront-deck';
  groundWaterfrontDeck.position.set(0.64,0,5.34);cabinGround.add(groundWaterfrontDeck);
  const loftFloor=new THREE.Group();loftFloor.position.set(0,0,-2.4);cabinUpper.add(loftFloor);
  roomFloor(loftFloor,cabinFloor,4,7.6,3.8);
  cabinUpper.position.y=3.15;
  const pine=material(0xc3a36b,{map:grain,bumpMap:grain,bumpScale:0.02});
  const blueCurtain=material(0x8c9da7,{map:stucco,roughness:1});
  const yellow=material(0xddc44d,{map:stucco}),greenLinen=material(0x91b95a,{map:stucco});
  const cherry=material(0x98603c,{map:grain,roughness:0.65});
  function timberWall(parent,width,height,openings) {
    const group=new THREE.Group();parent.add(group);panelWall(group,width,height,openings,pine);
    for(let y=0.22;y<height;y+=0.22) {
      let cursor=-width/2;
      const spans=openings.filter(([,cy,,h])=>y>cy-h/2&&y<cy+h/2).sort((a,b)=>a[0]-b[0]);
      for(const[x,,w]of [...spans,[width/2,0,0,0]]) {
        const end=x-w/2;if(end>cursor)box(group,(cursor+end)/2,y,0.17,end-cursor,0.012,0.014,M.darkWood);
        cursor=x+w/2;
      }
    }
    return group;
  }
  function curtainPair(parent,x,y,z,width,height,rotation=0) {
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotation;parent.add(group);
    for(const side of [-1,1])for(let i=0;i<6;i++)box(group,side*(width/2-i*0.08),0,0.02+(i%2)*0.05,0.1,height,0.065,blueCurtain,0.025);
  }
  function aircon(parent,x,y,z) {
    box(parent,x,y,z,1.5,0.42,0.26,M.linen,0.05);
    box(parent,x,y-0.15,z+0.145,1.24,0.05,0.02,M.frame);
  }
  function table(parent,x,z,width,depth,height=0.85,mat=cherry) {
    box(parent,x,height,z,width,0.09,depth,mat,0.025);
    for(const sx of [-1,1])for(const sz of [-1,1])box(parent,x+sx*(width/2-0.1),height/2,z+sz*(depth/2-0.1),0.075,height,0.075,mat);
  }
  function floral(color) {
    const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
    for(let i=0;i<110;i++) {
      const x=random()*256,y=random()*256;ctx.fillStyle=i%3?'#e5e2c7':'#bcc4a0';
      for(let j=0;j<5;j++){const a=j*Math.PI*0.4;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*3,y+Math.sin(a)*3,1.7,2.6,a,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#a88a40';ctx.fillRect(x-1,y-1,2,2);
    }
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);textures.add(t);
    return material(0xffffff,{map:t,roughness:0.95});
  }
  function cabinBed(parent,x,z,upper=false) {
    const group=new THREE.Group();parent.add(group);group.position.set(x,0,z);bed(group,0,0,1.95,upper?greenLinen:yellow);
    const cover=floral(upper?'#526b42':'#c5b771');
    group.children.forEach(part=>{if(part.position.y===0.66)part.material=cover;});
    box(group,0,0.75,0.05,1.97,0.035,0.48,M.linen,0.015);
    if(upper){pillow(group,-0.45,0.83,-0.45,0.83,yellow);pillow(group,0.45,0.83,-0.45,0.83,yellow);}
    else {
      box(group,0,0.46,1.08,2.05,0.68,0.12,cherry);
      for(let x=-0.83;x<0.9;x+=0.13)box(group,x,0.55,1.15,0.065,0.28,0.025,M.darkWood);
    }
  }
  const lowerBack=timberWall(cabinGround,7.6,3.05,[[-1.5,1.8,1.35,1.7],[2.25,1.7,1.3,1.5]]);lowerBack.position.z=-4.25;
  windowFrame(cabinGround,-1.5,1.8,-4.04,1.35,1.7,{dark:true,panes:2,garden:true});
  windowFrame(cabinGround,2.25,1.7,-4.04,1.3,1.5,{dark:true,panes:2,garden:true});
  const leftLower=panelWall(cabinGround,8.6,3.05,[[2.35,1.53,3.35,2.8],[-2.25,1.53,3.5,2.8]],M.plaster);
  leftLower.rotation.y=Math.PI/2;leftLower.position.x=-3.77;
  [-2.3,2.25].forEach(z=>{
    windowFrame(cabinGround,-3.64,1.53,z,3.3,2.8,{rotation:Math.PI/2,dark:true,panes:3,garden:true});
    curtainPair(cabinGround,-3.48,1.5,z,3.3,2.75,Math.PI/2);
  });
  // The low partition is a cutaway of the ground-floor bedroom, not a low real wall.
  box(cabinGround,-1.28,0.52,-0.45,4.9,1.04,0.14,M.plaster);
  box(cabinGround,0.75,0.52,-2.62,0.12,1.04,3.2,M.plaster);
  cabinBed(cabinGround,-1.25,-2.65);
  picture(cabinGround,-2.7,2.05,-4.02,0.58,0x807a58);aircon(cabinGround,-0.1,2.7,-4.02);
  fan(cabinGround,-1.25,2.94,-2.4);
  mesh(cabinGround,geometry(new THREE.CylinderGeometry(0.38,0.38,0.045,32)),M.stone,-2.75,0.66,-1.08);
  rod(cabinGround,[-2.75,0,-1.08],[-2.75,0.65,-1.08],0.055,M.frame);
  seat(cabinGround,-2.9,0,-1.9,0x91908b,0.5);
  table(cabinGround,1.1,-2.9,2.4,0.65,0.86);
  box(cabinGround,1.9,1.15,-3.15,0.68,0.48,0.055,M.black);
  box(cabinGround,2.04,1.46,-0.48,3.25,2.92,0.16,material(0xb9aea0));
  const brickMat=material(0xffffff,{map:stucco,bumpMap:stucco,bumpScale:0.035});
  const bricks=new THREE.InstancedMesh(unitBox,brickMat,16*9),brickTransform=new THREE.Object3D();
  const brickColors=[0x954d33,0xa16649,0x64473c,0xa75235,0x64594e,0x7b4834];
  for(let row=0;row<16;row++)for(let col=0;col<9;col++) {
    const index=row*9+col;brickTransform.position.set(0.48+col*0.35+(row%2)*0.08,0.1+row*0.18,-0.36);
    brickTransform.scale.set(0.325,0.153,0.05);brickTransform.updateMatrix();bricks.setMatrixAt(index,brickTransform.matrix);
    bricks.setColorAt(index,new THREE.Color(brickColors[(row*7+col*3)%brickColors.length]));
  }
  bricks.castShadow=true;bricks.receiveShadow=true;cabinGround.add(bricks);
  picture(cabinGround,2.1,2.16,-0.28,0.86,0x8c9763);
  // Sideboard, records, and the brass gramophone are visible in the hall photos.
  box(cabinGround,2.05,0.56,0.12,2.28,1.02,0.64,cherry,0.025);
  for(let row=0;row<3;row++)for(let col=0;col<2;col++) {
    box(cabinGround,1.49+col*1.12,0.28+row*0.29,0.46,1.04,0.25,0.045,M.wood);
    mesh(cabinGround,geometry(new THREE.SphereGeometry(0.035,8,6)),M.frame,1.49+col*1.12,0.28+row*0.29,0.5);
  }
  box(cabinGround,1.55,1.13,0.1,0.85,0.13,0.55,M.darkWood);
  mesh(cabinGround,geometry(new THREE.CylinderGeometry(0.22,0.22,0.012,32)),M.black,1.55,1.21,0.1);
  const brass=material(0xba984b,{metalness:0.68,roughness:0.38,side:THREE.DoubleSide});
  rod(cabinGround,[1.82,1.2,-0.07],[1.89,1.52,-0.07],0.045,brass);
  const hornPoints=[[0.045,0],[0.065,0.12],[0.14,0.28],[0.32,0.45],[0.51,0.52]].map(([x,y])=>new THREE.Vector2(x,y));
  const horn=mesh(cabinGround,geometry(new THREE.LatheGeometry(hornPoints,28)),brass,1.89,1.5,-0.07);horn.rotation.z=-0.65;
  box(cabinGround,2.68,1.28,0.05,0.58,0.32,0.32,M.darkWood,0.035);
  box(cabinGround,2.68,1.28,0.22,0.45,0.19,0.02,material(0xbfb294));
  table(cabinGround,-0.5,2.07,2.55,1.14,0.86);
  box(cabinGround,-0.5,0.921,2.07,2.6,0.025,0.95,floral('#8a9393'));
  for(const x of [-1.35,-0.5,0.35]) {
    seat(cabinGround,x,0,1.13,0x847966,0.5);
    const chair=new THREE.Group();chair.position.set(x,0,3.06);chair.rotation.y=Math.PI;cabinGround.add(chair);seat(chair,0,0,0,0x847966,0.5);
  }
  for(let i=0;i<3;i++)mesh(cabinGround,geometry(new THREE.CylinderGeometry(0.09,0.07,0.11,16)),M.linen,-0.94+i*0.4,0.99,2.05);
  const stairs=new THREE.Group();cabinGround.add(stairs);
  for(let i=0;i<14;i++)box(stairs,-3.13,(i+1)*0.225,3.48-i*0.29,0.83,0.12,0.32,M.wood);
  rod(stairs,[-3.55,0.02,3.64],[-3.55,3.11,-0.62],0.065,M.frame);
  rod(stairs,[-2.71,0.94,3.5],[-2.71,4.0,-0.58],0.04,M.wood);
  for(let i=0;i<14;i+=2)box(stairs,-2.71,(i+1)*0.225+0.47,3.48-i*0.29,0.04,0.94,0.04,M.wood);
  const upperBack=timberWall(cabinUpper,7.6,2.97,[[1.55,1.65,2,1.85]]);upperBack.position.z=-4.25;
  windowFrame(cabinUpper,1.55,1.65,-4.04,2,1.85,{dark:true,panes:2,garden:true});
  const loftLeft=timberWall(cabinUpper,3.8,2.7,[[0,1.4,3.15,2.55]]);loftLeft.rotation.y=Math.PI/2;loftLeft.position.set(-3.77,0,-2.4);
  windowFrame(cabinUpper,-3.62,1.4,-2.4,3.15,2.55,{rotation:Math.PI/2,dark:true,panes:3,garden:true});
  curtainPair(cabinUpper,-3.43,1.36,-2.4,3.15,2.55,Math.PI/2);
  cabinBed(cabinUpper,1.9,-2.87,true);aircon(cabinUpper,1.5,2.6,-4.01);
  table(cabinUpper,-0.72,-1.25,2.3,0.79,0.83,M.darkWood);
  box(cabinUpper,-0.72,0.888,-1.25,2.25,0.022,0.75,M.glass).castShadow=false;
  box(cabinUpper,-0.85,0.97,-1.17,0.36,0.17,0.23,M.wood,0.025);
  seat(cabinUpper,-0.68,0,-2.05,0x343a36,0.61);
  for(let x=-2.62;x<=3.7;x+=0.28)box(cabinUpper,x,0.51,-0.5,0.045,1.02,0.045,M.wood);
  box(cabinUpper,0.52,1.05,-0.5,6.4,0.095,0.1,M.wood);box(cabinUpper,0.52,0.2,-0.5,6.4,0.08,0.08,M.wood);
  for(const x of [-3.7,0,3.7])box(cabinUpper,x,1.44,-4.16,0.14,2.88,0.14,M.frame);
  for(let x=-3.4;x<=3.5;x+=1.15){const beam=box(cabinUpper,x,2.85,-2.4,0.11,0.16,4.05,M.frame);beam.rotation.x=-0.045;}
  rod(cabinUpper,[-1.2,2.75,-1.5],[-1.2,2.24,-1.5],0.017,M.frame);
  mesh(cabinUpper,geometry(new THREE.ConeGeometry(0.28,0.22,24,1,true)),material(0x30312f,{side:THREE.DoubleSide}),-1.2,2.17,-1.5);
  mesh(cabinUpper,geometry(new THREE.SphereGeometry(0.07,10,8)),material(0xffdeb2,{emissive:0xffce93,emissiveIntensity:0.65}),-1.2,2.07,-1.5);
  const cabinHallHigh=new THREE.Group();cabinInside.add(cabinHallHigh);
  windowFrame(cabinHallHigh,-3.65,4.4,1.95,4.3,2.5,{rotation:Math.PI/2,dark:true,panes:4});
  box(cabinHallHigh,-3.75,4.45,4.17,0.14,2.9,0.14,M.frame);
  for(const z of [-0.4,1.7,4.15])box(cabinHallHigh,0,5.73-z*0.045,z,7.6,0.13,0.14,M.frame);
  fan(cabinHallHigh,-0.5,5.65,2.07);
  addTarget(cabinInside,'cabin');
  let cabinLevel='all';
  const cabinPresets={
    all:{target:[-0.6,2.1,2.2],offset:[12.4,10.8,16.2],span:16.5,min:7,max:42,background:0xecece6},
    ground:{target:[0,1,2],offset:[4.4,11.9,17.5],span:15.2,min:6,max:38,background:0xecece6},
    upper:{target:[0,1.25,-2.4],offset:[8,5.7,10],span:11.8,min:5,max:34,background:0xecece6},
  };
  const presets={
    estate:{target:[0,0.7,0],offset:[17,15,25],span:40,min:12,max:90,background:0xe7efeb},
    yunsidai:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
    lihalai:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
    zhenqing:{target:[0,1.35,0],offset:[6.8,4.6,8.5],span:10.4,min:5,max:30,background:0xecece6},
    cabin:cabinPresets.all,
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
    const p=active==='cabin'?cabinPresets[cabinLevel]:presets[active],target=V(...p.target),direction=V(...p.offset).normalize();
    const distance=Math.max(V(...p.offset).length(),p.span/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(camera.aspect,0.4)));
    const position=target.clone().addScaledVector(direction,distance);
    controls.minDistance=p.min;controls.maxDistance=Math.max(p.max,distance*1.25);
    if(animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)transition={start:performance.now(),from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target};
    else{transition=null;camera.position.copy(position);controls.target.copy(target);controls.update();}
  }
  function setView(key){if(!presets[key])return;active=key;for(const[name,g]of groups)g.visible=name===key;scene.background=new THREE.Color(presets[key].background);leave();fit();opts.onViewChange?.(key);}
  function setCabinLevel(level){
    if(!cabinPresets[level])return;cabinLevel=level;
    cabinGround.visible=level!=='upper';cabinUpper.visible=level!=='ground';cabinUpper.position.y=level==='upper'?0:3.15;
    cabinHallHigh.visible=level==='all';
    stairs.visible=level==='all';
    if(active==='cabin'){leave();fit();}opts.onCabinLevelChange?.(level);
  }
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
  return{setView,setCabinLevel,reset(){fit(true);},zoom,stop(){
    if(stopped)return;stopped=true;renderer.setAnimationLoop(null);resizeObserver.disconnect();visibilityObserver.disconnect();controls.dispose();
    for(const[name,fn]of Object.entries(events))canvas.removeEventListener(name,fn);
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
    scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});renderer.dispose();
  }};
}
