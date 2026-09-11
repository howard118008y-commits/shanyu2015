from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PhotoReconstructionTests(unittest.TestCase):
    def test_all_entrypoints_show_guest_images_before_optional_rotation(self):
        for filename in ("index.html", "tour.html"):
            source = (ROOT / filename).read_text()
            self.assertIn("tour-loader.js?v=20260911-guest1", source)
            self.assertIn('type="importmap"', source)
            self.assertIn("three@0.169.0", source)
            self.assertNotIn('href="tour-hd.html"', source)
            self.assertNotIn("20260911-original1", source)
            self.assertIn('src="assets/hd-models/estate.png"', source)
            self.assertIn('type="button" hidden>開啟房型切換', source)
            self.assertIn('fetchpriority="high"', source)
        loader = (ROOT / "tour-loader.js").read_text()
        self.assertIn("mountGuest(section, options)", loader)
        self.assertNotIn("mode", loader)
        self.assertNotIn("tour-ui.js", loader)
        self.assertNotIn("tour-hd-ui.js", loader)
        self.assertNotIn("tour-reconstruction-ui.js", loader)
        self.assertIn("['all','ground','upper']", loader)

    def test_rotation_stays_in_the_page_without_downloads(self):
        source = (ROOT / "tour-guest-ui.js").read_text()
        self.assertEqual(source.count("document.createElement('canvas')"), 1)
        self.assertIn("buildScene(canvas", source)
        self.assertIn("await scene.ready", source)
        self.assertIn("await import('./scene3d.js?v=20260911-guest1')", source)
        self.assertNotIn("import { buildScene }", source)
        self.assertIn("scene.orbit", source)
        self.assertIn("scene.zoom", source)
        self.assertIn("scene.setCabinLevel", source)
        self.assertIn("scene?.setPaused(true)", source)
        self.assertIn("photograph.src='assets/hd-models/'", source)
        self.assertIn("旋轉看空間", source)
        self.assertIn("遮擋面推估，非實測", source)
        self.assertNotIn("dialog.showModal", source)
        self.assertNotIn("mode=", source)
        self.assertNotIn("tour-hd.html", source)
        self.assertNotIn("assets/models", source)
        self.assertNotIn("download", source)
        self.assertNotIn(".glb", source)

    def test_existing_model_backups_are_not_deleted(self):
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
