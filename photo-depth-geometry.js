export function decodePhotoDepth(buffer) {
  const header=new DataView(buffer);
  if(buffer.byteLength<16||header.getUint32(0,false)!==0x53594431)throw new Error('Invalid photo depth');
  const columns=header.getUint16(4,true),rows=header.getUint16(6,true);
  const imageWidth=header.getUint16(8,true),imageHeight=header.getUint16(10,true),strength=header.getFloat32(12,true);
  if(columns<2||rows<2||columns>1024||rows>1024||!imageWidth||!imageHeight||!(strength>0&&strength<=2)||buffer.byteLength!==16+columns*rows*2)throw new Error('Invalid depth dimensions');
  const values=new Float32Array(columns*rows);
  for(let index=0;index<values.length;index++)values[index]=header.getUint16(16+index*2,true)/65535;
  return {columns,rows,imageWidth,imageHeight,strength,values};
}

export function photoDepthBuffers(depth) {
  const {columns,rows,imageWidth,imageHeight,strength,values}=depth;
  const positions=new Float32Array(columns*rows*3),uvs=new Float32Array(columns*rows*2);
  const indices=new Uint32Array((columns-1)*(rows-1)*6),aspect=imageWidth/imageHeight;
  let offset=0;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const index=row*columns+column,horizontal=column/(columns-1),vertical=row/(rows-1);
    positions.set([(horizontal-0.5)*2*aspect,(0.5-vertical)*2,(values[index]-0.5)*strength],index*3);
    uvs.set([horizontal,1-vertical],index*2);
    if(row<rows-1&&column<columns-1){
      indices.set([index,index+columns,index+1,index+1,index+columns,index+columns+1],offset);offset+=6;
    }
  }
  return {positions,uvs,indices,aspect};
}
