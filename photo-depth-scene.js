import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {decodePhotoDepth,photoDepthBuffers} from './photo-depth-geometry.js?v=20260911-photo3d1';

const IMAGES=new Set(['estate','yunsidai','lihalai','zhenqing','cabin-ground','cabin-upper']);

export function createPhotoScene(canvas,options={}) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
  renderer.setClearColor(0xe7efeb,0);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0.01,30);
  camera.position.set(0,0,5);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=0.08;controls.rotateSpeed=0.35;
  controls.minAzimuthAngle=-0.18;controls.maxAzimuthAngle=0.18;
  controls.minPolarAngle=Math.PI/2-0.10;controls.maxPolarAngle=Math.PI/2+0.10;
  controls.minZoom=1;controls.maxZoom=3;controls.zoomSpeed=0.65;controls.screenSpacePanning=true;
  const cache=new Map(),loader=new THREE.TextureLoader();
  let current,aspect=1.5,sequence=0,phase=0,previous=0,dirty=true,visible=true,stopped=false;
  let automatic=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){
    if(!canvas.clientWidth||!canvas.clientHeight)return;
    renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
    const viewport=canvas.clientWidth/canvas.clientHeight,halfHeight=Math.max(1,aspect/viewport)*1.02;
    camera.left=-halfHeight*viewport;camera.right=halfHeight*viewport;camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.updateProjectionMatrix();dirty=true;
  }
  function home(){phase=0;camera.zoom=1;controls.target.set(0,0,0);camera.position.set(0,0,5);controls.update();camera.updateProjectionMatrix();dirty=true;}
  function setAutoRotate(value){
    automatic=Boolean(value);if(automatic)home();options.onAutoRotateChange?.(automatic);dirty=true;
  }
  controls.addEventListener('change',()=>{dirty=true;});
  controls.addEventListener('start',()=>setAutoRotate(false));
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
  const visibilityObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;dirty=true;});visibilityObserver.observe(canvas);
  async function load(name){
    let texture;
    try{
      const response=await fetch('assets/photo-depth/'+name+'.bin?v=20260911-photo3d1');
      if(!response.ok)throw new Error('Photo depth unavailable');
      const depth=decodePhotoDepth(await response.arrayBuffer());
      texture=await loader.loadAsync('assets/hd-models/'+name+'.png');
      if(texture.image.width!==depth.imageWidth||texture.image.height!==depth.imageHeight)throw new Error('Photo and depth do not match');
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const buffers=photoDepthBuffers(depth),geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(buffers.positions,3));
      geometry.setAttribute('uv',new THREE.BufferAttribute(buffers.uvs,2));
      geometry.setIndex(new THREE.BufferAttribute(buffers.indices,1));geometry.computeBoundingSphere();
      const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
      const mesh=new THREE.Mesh(geometry,material);mesh.name='hd-photo-depth-'+name;
      mesh.userData={source:'assets/hd-models/'+name+'.png',representation:'relative-depth relief, not a full 360-degree reconstruction'};
      const record={mesh,texture,aspect:buffers.aspect};
      if(stopped){geometry.dispose();material.dispose();texture.dispose();throw new Error('Viewer closed');}
      return record;
    }catch(error){texture?.dispose();cache.delete(name);throw error;}
  }
  async function setImage(name){
    if(!IMAGES.has(name)||stopped)return false;
    const selection=++sequence;
    if(!cache.has(name))cache.set(name,load(name));
    const record=await cache.get(name);
    if(selection!==sequence||stopped)return false;
    if(current)scene.remove(current.mesh);current=record;scene.add(record.mesh);aspect=record.aspect;
    home();resize();renderer.render(scene,camera);return true;
  }
  function orbit(horizontal,vertical=0){
    setAutoRotate(false);
    const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta=THREE.MathUtils.clamp(spherical.theta+horizontal,-0.18,0.18);
    spherical.phi=THREE.MathUtils.clamp(spherical.phi+vertical,controls.minPolarAngle,controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();dirty=true;
  }
  function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,1,3);camera.updateProjectionMatrix();dirty=true;}
  function keyboard(event){
    const directions={ArrowLeft:[-0.035,0],ArrowRight:[0.035,0],ArrowUp:[0,-0.025],ArrowDown:[0,0.025]};
    if(directions[event.key]){event.preventDefault();orbit(...directions[event.key]);}
    if(event.key==='+'||event.key==='='){event.preventDefault();zoom(1.2);}
    if(event.key==='-'){event.preventDefault();zoom(1/1.2);}
    if(event.key==='Home'){event.preventDefault();setAutoRotate(false);home();}
  }
  canvas.addEventListener('keydown',keyboard);
  renderer.setAnimationLoop(time=>{
    const elapsed=Math.min(Math.max(0,(time-previous)/1000),0.05);previous=time;
    if(stopped||!visible||document.hidden||!current)return;
    if(automatic){
      phase+=elapsed*0.5;
      const yaw=Math.sin(phase)*0.12,pitch=Math.sin(phase*0.7)*0.035;
      camera.position.set(5*Math.sin(yaw)*Math.cos(pitch),5*Math.sin(pitch),5*Math.cos(yaw)*Math.cos(pitch));
      dirty=true;
    }
    controls.update();
    if(dirty){renderer.render(scene,camera);dirty=false;}
  });
  resize();options.onAutoRotateChange?.(automatic);
  return {setImage,setAutoRotate,orbit,zoom,reset(){setAutoRotate(false);home();},stop(){
    if(stopped)return;stopped=true;sequence++;renderer.setAnimationLoop(null);
    resizeObserver.disconnect();visibilityObserver.disconnect();controls.dispose();canvas.removeEventListener('keydown',keyboard);
    for(const pending of cache.values())pending.then(record=>{record.mesh.geometry.dispose();record.mesh.material.dispose();record.texture.dispose();}).catch(()=>{});
    renderer.dispose();
  }};
}
