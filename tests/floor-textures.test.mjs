import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createFloorTextures } from '../floor-textures.js';

globalThis.document = {
  createElement() {
    const canvas = {};
    canvas.getContext = () => ({
      createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData: image => { canvas.pixels = image.data; },
    });
    return canvas;
  },
};
after(() => { delete globalThis.document; });

const options = { kind: 'wood', color: [174, 161, 138], seed: 2017 };
const wood = createFloorTextures(options);
const tile = createFloorTextures({ kind: 'tile', color: [161, 157, 144], seed: 2015 });

test('floor maps have full resolution and opaque, varied surface detail', () => {
  for (const floor of [wood, tile]) {
    for (const map of Object.values(floor)) {
      assert.equal(map.width, 1024);
      assert.equal(map.height, 1024);
      const values = new Set();
      for (let i = 0; i < map.pixels.length; i += 4) {
        assert.equal(map.pixels[i + 3], 255);
        values.add(map.pixels[i]);
      }
      assert.ok(values.size > 20, 'surface must not be a flat color');
    }
  }
});

test('wood and stone are distinct and repeat deterministically', () => {
  const repeat = createFloorTextures(options);
  assert.deepEqual(repeat.color.pixels, wood.color.pixels);
  assert.notDeepEqual(tile.color.pixels, wood.color.pixels);
});

test('grout and board joints are recessed and rougher than the surface', () => {
  for (const floor of [wood, tile]) {
    const heights = floor.height.pixels, roughness = floor.roughness.pixels;
    let seams = 0, surface = 0;
    for (let i = 0; i < heights.length; i += 4) {
      if (heights[i] === 58) {
        seams++;
        assert.equal(roughness[i], 235);
      } else {
        surface++;
        assert.ok(heights[i] > 58);
      }
    }
    assert.ok(seams > 1000);
    assert.ok(surface > seams * 5);
  }
});
