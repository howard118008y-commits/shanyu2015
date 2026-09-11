import * as THREE from 'three';

export const PHOTO_SURFACES = {
  wallYunsidai:{source:'assets/room-yunsidai-3.jpg',rect:[0.72,0.29,0.18,0.24],fallback:0x8f7660},
  woodPine:{source:'assets/cabin-2.jpg',rect:[0.755,0.205,0.13,0.10],fallback:0xc3a36b},
  linenPink:{source:'assets/room-yunsidai-3.jpg',rect:[0.52,0.80,0.22,0.065],fallback:0xdac7b5,fabric:true},
  linenIvory:{source:'assets/room-lihalai.jpg',rect:[0.50,0.70,0.23,0.085],fallback:0xeee7d6,fabric:true},
  blueCurtain:{source:'assets/cabin-1.jpg',rect:[0.10,0.16,0.06,0.15],fallback:0x8c9da7,fabric:true},
  floralLower:{source:'assets/cabin-1.jpg',rect:[0.39,0.39,0.105,0.047],fallback:0xddc44d,fabric:true},
  floralUpper:{source:'assets/cabin-2.jpg',rect:[0.59,0.49,0.20,0.035],fallback:0x526b42,fabric:true},
  upholstered:{source:'assets/room-yunsidai-3.jpg',rect:[0.665,0.62,0.16,0.035],fallback:0xc9bda8,fabric:true},
  calligraphy:{source:'assets/room-yunsidai-3.jpg',rect:[0.578,0.324,0.059,0.19],fallback:0xe7d7bb},
};

export function createPhotoSurfaces({materials,textures,anisotropy}) {
  const sources=new Map(),surfaces={},pending=[];
  const loader=new THREE.TextureLoader();
  for(const [name,spec] of Object.entries(PHOTO_SURFACES)) {
    if(!sources.has(spec.source)) sources.set(spec.source,loader.loadAsync(spec.source));
    const surface=new THREE.MeshPhysicalMaterial({
      color:spec.fallback,roughness:spec.fabric?0.94:0.82,
      sheen:spec.fabric?0.65:0,sheenColor:new THREE.Color(0xfff2e2),sheenRoughness:0.9,
      side:spec.fabric?THREE.DoubleSide:THREE.FrontSide,
    });
    surface.name='photo-surface-'+name;
    surface.userData={sourcePhoto:spec.source,uvRegion:spec.rect};
    materials.add(surface);surfaces[name]=surface;
    pending.push(sources.get(spec.source).then(original=>{
      const texture=original.clone(),[left,top,width,height]=spec.rect;
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
      texture.offset.set(left,1-top-height);texture.repeat.set(width,height);
      texture.anisotropy=anisotropy;texture.needsUpdate=true;textures.add(texture);
      surface.map=texture;surface.color.set(0xffffff);surface.needsUpdate=true;
      return null;
    }).catch(()=>spec.source));
  }
  const ready=Promise.all(pending).then(failures=>[...new Set(failures.filter(Boolean))]);
  return {surfaces,ready};
}
