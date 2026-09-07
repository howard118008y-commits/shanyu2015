// Each texture covers the entire floor so boards and grout retain real-world scale.
export function createFloorTextures({ kind, color, width = 6.5, depth = 5.7, seed = 1 }) {
  const size = 1024;
  const canvases = Array.from({ length: 3 }, () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    return canvas;
  });
  const contexts = canvases.map(canvas => canvas.getContext('2d'));
  const images = contexts.map(context => context.createImageData(size, size));
  const hash = (x, y) => {
    let value = Math.imul(x + seed, 374761393) ^ Math.imul(y + seed, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const sx = x - ix, sy = y - iy;
    const tx = sx * sx * (3 - 2 * sx), ty = sy * sy * (3 - 2 * sy);
    const top = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
    const bottom = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
  const wood = kind === 'wood';
  const columns = width / (wood ? 0.22 : 0.46);
  const rows = depth / (wood ? 1.45 : 0.46);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * columns, column = Math.floor(u), across = u - column;
      const v = y / size * rows + (wood ? hash(column, 93) : 0);
      const row = Math.floor(v), along = v - row;
      const joint = Math.min(across, 1 - across) < (wood ? 0.014 : 0.02) ||
        Math.min(along, 1 - along) < (wood ? 0.002 : 0.02);
      const variation = (hash(column, row) - 0.5) * (wood ? 24 : 13);
      let detail;
      if (wood) {
        const bend = Math.sin(along * 7 + hash(column, row) * 12) * 0.055;
        const grain = across + bend + noise(u * 2, v * 3) * 0.035;
        detail = Math.sin(grain * 175) * 5 + Math.sin(grain * 410) * 2.4;
        detail += (noise(u * 4, v * 1.6) - 0.5) * 21;
        const knotX = 0.25 + hash(column, row + 40) * 0.5;
        const knotY = 0.2 + hash(column, row + 60) * 0.6;
        const radius = Math.hypot((across - knotX) * 1.5, (along - knotY) * 11);
        if (hash(column, row + 20) > 0.72 && radius < 0.6) {
          detail -= (1 - radius / 0.6) * (16 + 10 * Math.sin(radius * 48));
        }
      } else {
        detail = (noise(u * 5, v * 5) - 0.5) * 24 + (noise(u * 21, v * 21) - 0.5) * 9;
        const vein = Math.abs(Math.sin(u * 5 + v * 3 + noise(u * 2, v * 2) * 11));
        if (vein < 0.08) detail -= (1 - vein / 0.08) * 11;
      }
      const fleck = (hash(x, y) - 0.5) * (wood ? 3 : 7);
      const offset = (y * size + x) * 4;
      const height = joint ? 58 : 178 + detail * 1.5;
      const roughness = joint ? 235 : (wood ? 155 : 193) + detail * 0.5;
      for (let c = 0; c < 3; c++) {
        images[0].data[offset + c] = joint ? color[c] * (wood ? 0.67 : 0.76) : color[c] + variation + detail + fleck;
        images[1].data[offset + c] = height;
        images[2].data[offset + c] = roughness;
      }
      images.forEach(image => { image.data[offset + 3] = 255; });
    }
  }
  contexts.forEach((context, index) => context.putImageData(images[index], 0, 0));
  return { color: canvases[0], height: canvases[1], roughness: canvases[2] };
}
