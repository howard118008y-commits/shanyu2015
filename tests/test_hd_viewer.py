from pathlib import Path
import hashlib
import struct
import unittest


ROOT = Path(__file__).resolve().parents[1]
IMAGES = {
    "estate": "a656a281cf68482150375b34a20da0b63496ebeb799be6a9fac3e52c83244505",
    "yunsidai": "714e968dd0b5a2a6755fdc6b9adac3db4ae4c5a8c3eb32590fd65cb7d5e1efd9",
    "lihalai": "51d0e3c0bd7777d85e5c4aa3831917bace8ad588ec327132c27439d7524bb54f",
    "zhenqing": "e99405cbafc72c9c3b0d0e7457866f76318596fda095d96781e50f37f294d198",
    "cabin-ground": "6cd436e11df4670aaf3fcfee66a35e38f9336d58dcfe04b8a26f31efe9e142e9",
    "cabin-upper": "2aa18d4e1565bc6d7544448f9b9bd036c816dc7ea83e6e99643bef461c5943eb",
}


class PhotoDepthTourTests(unittest.TestCase):
    def test_all_entrypoints_use_the_same_permanent_photo_tour(self):
        for filename in ("index.html", "tour.html"):
            source = (ROOT / filename).read_text()
            self.assertIn("tour-loader.js?v=20260911-photo3d1", source)
            self.assertIn('src="assets/hd-models/estate.png"', source)
            self.assertIn('fetchpriority="high"', source)
            self.assertNotIn("20260911-guest1", source)
        loader = (ROOT / "tour-loader.js").read_text()
        self.assertIn("mountPhotoTour(section, options)", loader)
        self.assertNotIn("scene3d", loader)
        self.assertNotIn("tour-guest-ui", loader)
        self.assertNotIn("mode", loader)

    def test_all_six_original_images_are_unchanged_and_have_nonflat_depth(self):
        for name, digest in IMAGES.items():
            image = (ROOT / "assets" / "hd-models" / (name + ".png")).read_bytes()
            self.assertEqual(hashlib.sha256(image).hexdigest(), digest)
            data = (ROOT / "assets" / "photo-depth" / (name + ".bin")).read_bytes()
            self.assertEqual(data[:4], b"SYD1")
            columns, rows, width, height, strength = struct.unpack_from("<4Hf", data, 4)
            self.assertEqual(len(data), 16 + columns * rows * 2)
            self.assertGreater(columns * rows, 30000)
            self.assertGreater(width, 1500)
            self.assertGreater(height, 900)
            self.assertGreater(strength, 0)
            depths = struct.unpack_from("<" + str(columns * rows) + "H", data, 16)
            self.assertGreater(len(set(depths)), 1000)
            self.assertGreater(max(depths) - min(depths), 60000)

    def test_autorotation_preserves_the_original_texture_without_old_models(self):
        ui = (ROOT / "photo-tour-ui.js").read_text()
        scene = (ROOT / "photo-depth-scene.js").read_text()
        self.assertEqual(ui.count("document.createElement('canvas')"), 1)
        self.assertIn("displayDepth(image)", ui)
        self.assertIn("暫停迴轉", ui)
        self.assertIn("非 360° 全景", ui)
        self.assertIn("prefers-reduced-motion", scene)
        self.assertIn("if(automatic)", scene)
        self.assertIn("Math.sin(phase)", scene)
        self.assertIn("MeshBasicMaterial", scene)
        self.assertIn("NoToneMapping", scene)
        for source in (ui, scene):
            self.assertNotIn("download", source)
            self.assertNotIn(".glb", source)
            self.assertNotIn("scene3d.js", source)
            self.assertNotIn("transformers", source)

    def test_retired_renderers_and_downloads_are_removed(self):
        for filename in ("tour-ui.js", "tour-reconstruction-ui.js", "tour-hd-ui.js", "tour-guest-ui.js", "tour-hd.css"):
            self.assertFalse((ROOT / filename).exists())
        for directory in ("models", "models-v2"):
            self.assertFalse(any((ROOT / "assets" / directory).glob("*.glb")))

    def test_old_urls_resolve_to_the_permanent_page_without_version_modes(self):
        source = (ROOT / "tour-hd.html").read_text()
        self.assertIn("location.replace(destination.href)", source)
        self.assertIn("['cabin-ground','cabin-upper']", source)
        self.assertNotIn("searchParams.set('v'", source)
        self.assertNotIn("<img", source)
        canonical = (ROOT / "tour.html").read_text()
        self.assertIn("history.replaceState", canonical)
        self.assertIn("address.searchParams.delete('v')", canonical)
        self.assertIn("address.searchParams.delete('mode')", canonical)


if __name__ == "__main__":
    unittest.main()
