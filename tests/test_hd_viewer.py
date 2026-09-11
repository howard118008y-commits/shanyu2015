from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class HDViewerTests(unittest.TestCase):
    def test_all_entrypoints_use_one_hd_renderer(self):
        for filename in ("index.html", "tour.html"):
            source = (ROOT / filename).read_text()
            self.assertIn("tour-loader.js?v=20260911-original1", source)
            self.assertNotIn("<canvas", source)
            self.assertNotIn('type="importmap"', source)
            self.assertNotIn('href="tour-hd.html"', source)
        loader = (ROOT / "tour-loader.js").read_text()
        self.assertIn("import { mountTour as mountHD }", loader)
        self.assertNotIn("mode", loader)
        self.assertNotIn("tour-ui.js", loader)

    def test_original_png_assets_and_single_panel_controls(self):
        source = (ROOT / "tour-hd-ui.js").read_text()
        for name in ("estate", "yunsidai", "lihalai", "zhenqing", "cabin-ground", "cabin-upper"):
            self.assertIn("image:'" + name + "'", source)
            self.assertTrue((ROOT / "assets" / "hd-models" / (name + ".png")).exists())
        self.assertIn("rendered.src=image", source)
        self.assertIn("view.image+'.png'", source)
        self.assertIn("dialog.showModal()", source)
        self.assertNotIn(".jpg", source)
        self.assertNotIn(".glb", source)
        self.assertNotIn("可旋轉", source)
        self.assertNotIn("全部高清圖", source)
        self.assertNotIn("tour-reference", source)
        self.assertEqual(source.count("viewer.className='tour-hd-viewer'"), 1)

    def test_old_gallery_redirects_without_rendering_a_second_gallery(self):
        source = (ROOT / "tour-hd.html").read_text()
        self.assertIn("location.replace(destination.href)", source)
        self.assertIn("['cabin-ground','cabin-upper']", source)
        self.assertNotIn("model-card", source)
        self.assertNotIn("<img", source)


if __name__ == "__main__":
    unittest.main()
