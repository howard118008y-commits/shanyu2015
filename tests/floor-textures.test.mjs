import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { readFileSync } from 'node:fs';
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

test('two separate verandah swings hang from existing beams with dry terrace clearance', () => {
  const source = readFileSync(new URL('../scene3d.js', import.meta.url), 'utf8');
  const sectionStart = source.indexOf('  const frontGlass=');
  const swingStart = source.indexOf('  const swings=');
  const swingEnd = source.indexOf('\n  });', swingStart);
  assert.ok(sectionStart >= 0 && swingStart > sectionStart && swingEnd > swingStart);
  const section = source.slice(sectionStart, swingEnd + '\n  });'.length);
  class Group {
    children = [];
    position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    add(child) { this.children.push(child); }
  }
  const verandah = new Group(), boxes = [];
  const box = (parent, x, y, z, w, h, d, material) => {
    const shape = { x, y, z, w, h, d, material };
    parent.add(shape); boxes.push(shape); return shape;
  };
  const rod = (parent, a, b, radius, material) => {
    const shape = { a, b, radius, material }; parent.add(shape); return shape;
  };
  const M = { green: 'green', wood: 'wood', frame: 'frame' };
  Function('THREE', 'verandah', 'box', 'rod', 'M', 'exterior', section)(
    { Group }, verandah, box, rod, M, { canopy: 'glass', post: 'post' },
  );
  const swings = verandah.children.find(child => child.name === 'main-verandah-swings');
  assert.equal(swings.children.length, 2);
  assert.equal(new Set(swings.children.map(swing => swing.name)).size, 2);
  const seats = [];
  for (const swing of swings.children) {
    const woodenSeats = swing.children.filter(child => child.material === M.wood);
    assert.equal(woodenSeats.length, 1);
    const seat = woodenSeats[0], x = seat.x + swing.position.x, z = seat.z + swing.position.z;
    seats.push({ z, half: seat.d / 2 });
    assert.ok(seat.y + swing.position.y - seat.h / 2 > 0.26 + 0.4, 'seat clears terrace floor');
    assert.ok(x - seat.w / 2 > 4.98 + 0.5, 'seat clears right wall and glazing');
    assert.ok(x + seat.w / 2 < 7.5 - 0.5 && Math.abs(z) + seat.d / 2 < 3.2 - 0.5, 'inside dry side terrace');
    for (const post of boxes.filter(shape => shape.material === 'post' && shape.h > 2)) {
      assert.ok(Math.abs(x - post.x) > (seat.w + post.w) / 2 + 0.3 ||
        Math.abs(z - post.z) > (seat.d + post.d) / 2 + 0.3, 'seat clears canopy posts');
    }
    const suspensions = swing.children.filter(child => child.a);
    assert.equal(suspensions.length, 2);
    assert.equal(swing.children.length, 3, 'only one seat and two suspensions, no added frame');
    assert.ok(suspensions[0].a[2] * suspensions[1].a[2] < 0, 'suspensions attach to opposite seat ends');
    for (const support of suspensions) {
      assert.equal(support.material, M.frame);
      assert.ok(Math.abs(support.a[0] - seat.x) + support.radius < seat.w / 2);
      assert.ok(Math.abs(support.a[2] - seat.z) + support.radius < seat.d / 2);
      assert.ok(Math.abs(support.a[1] - seat.y - seat.h / 2) < 1e-9, 'lower end meets seat');
      const [bx, by, bz] = support.b.map((value, i) => value + [swing.position.x, swing.position.y, swing.position.z][i]);
      assert.ok(boxes.some(beam => beam.material === M.green &&
        Math.abs(bx - beam.x) + support.radius <= beam.w / 2 &&
        Math.abs(bz - beam.z) + support.radius <= beam.d / 2 &&
        Math.abs(by - (beam.y - beam.h / 2)) < 1e-9), 'upper end meets existing beam underside');
    }
  }
  assert.ok(Math.abs(seats[0].z - seats[1].z) - seats[0].half - seats[1].half > 0.5, 'swings stay apart');
});
