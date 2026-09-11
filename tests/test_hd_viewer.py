from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PhotoReconstructionTests(unittest.TestCase):
    def test_all_entrypoints_use_one_rotatable_renderer(self):
        for filename in ("index.html", "tour.html"):
            source = (ROOT / filename).read_text()
            self.assertIn("tour-loader.js?v=20260911-rebuild1", source)
            self.assertIn('type="importmap"', source)
            self.assertIn("three@0.169.0", source)
            self.assertNotIn('href="tour-hd.html"', source)
            self.assertNotIn("20260911-original1", source)
            self.assertIn("WebGL", source)
        loader = (ROOT / "tour-loader.js").read_text()
        self.assertIn("await mountReconstruction", loader)
        self.assertNotIn("mode", loader)
        self.assertNotIn("tour-ui.js", loader)
        self.assertNotIn("tour-hd-ui.js", loader)
        self.assertIn("['all','ground','upper']", loader)

    def test_single_canvas_has_rotation_zoom_and_floor_controls(self):
        source = (ROOT / "tour-reconstruction-ui.js").read_text()
        self.assertEqual(source.count("document.createElement('canvas')"), 1)
        self.assertIn("buildScene(canvas", source)
        self.assertIn("await api.ready", source)
        self.assertIn("api.setAutoRotate", source)
        self.assertIn("prefers-reduced-motion", source)
        self.assertIn("api.orbit", source)
        self.assertIn("api.zoom", source)
        self.assertIn("api.setCabinLevel", source)
        self.assertIn("遮擋面推估，非實測", source)
        self.assertNotIn("dialog.showModal", source)
        self.assertNotIn("mode=", source)
        self.assertNotIn("tour-hd.html", source)
        self.assertIn("assets/models-v2/shanyu-", source)
        for name in ("estate", "yunsidai", "lihalai", "zhenqing", "cabin-all", "cabin-ground", "cabin-upper"):
            model = ROOT / "assets" / "models-v2" / ("shanyu-" + name + ".glb")
            self.assertTrue(model.is_file(), name)
            self.assertEqual(model.read_bytes()[:4], b"glTF")

    def test_textures_reference_existing_photos_without_replacing_originals(self):
        source = (ROOT / "photo-surfaces.js").read_text()
        references = set(re.findall(r"source:'([^']+)'", source))
        self.assertGreaterEqual(len(references), 4)
        for filename in references:
            self.assertTrue((ROOT / filename).is_file())
        self.assertIn("texture.offset.set", source)
        self.assertIn("surface.map=texture", source)
        for name in ("estate", "yunsidai", "lihalai", "zhenqing", "cabin-ground", "cabin-upper"):
            self.assertTrue((ROOT / "assets" / "hd-models" / (name + ".png")).exists())

    def test_old_gallery_redirects_without_rendering_a_second_gallery(self):
        source = (ROOT / "tour-hd.html").read_text()
        self.assertIn("location.replace(destination.href)", source)
        self.assertIn("['cabin-ground','cabin-upper']", source)
        self.assertNotIn("model-card", source)
        self.assertNotIn("<img", source)


if __name__ == "__main__":
    unittest.main()
