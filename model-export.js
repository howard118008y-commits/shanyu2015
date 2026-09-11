import { Group } from 'three';

export async function exportModel(source, name) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const model = source.clone(true);
  model.name = 'shanyu-' + name;
  model.visible = true;
  model.userData = { description:'Illustrative reconstruction from reference images; not a measured survey.', units:'approximate meters' };
  const root = new Group();
  root.add(model);
  root.updateMatrixWorld(true);
  const data = await new GLTFExporter().parseAsync(root, { binary:true, onlyVisible:true, maxTextureSize:1024 });
  return { data, filename:'shanyu-' + name + '.glb' };
}
