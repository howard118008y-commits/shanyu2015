from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
from xml.etree.ElementTree import Element, SubElement


ROOT = Path(__file__).resolve().parents[1]
EXTERIORS = {
    f"assets/cabin-exterior-{name}.jpg"
    for name in ("pond", "green-entrance", "path", "side", "night")
}


class PageParser(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.root = Element("document")
        self.stack = [self.root]
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        element = SubElement(self.stack[-1], tag, dict(attrs))
        if tag == "br":
            element.tail = "\n"
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        SubElement(self.stack[-1], tag, dict(attrs))

    def handle_endtag(self, tag):
        if self.stack[-1].tag == tag:
            self.stack.pop()

    def handle_data(self, data):
        parent = self.stack[-1]
        if len(parent):
            parent[-1].tail = (parent[-1].tail or "") + data
        else:
            parent.text = (parent.text or "") + data


class CabinContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.home = PageParser(ROOT / "index.html").root
        cls.gallery = cls.home.find(".//*[@data-gallery='cabin']")

    def test_five_real_exteriors_are_in_existing_lightbox_group(self):
        buttons = self.gallery.findall(".//button[@data-src]")
        sources = [button.get("data-src") for button in buttons]
        self.assertEqual(len(sources), 11)
        self.assertEqual(len(set(sources)), 11)
        self.assertEqual(set(sources) & EXTERIORS, EXTERIORS)
        for button in buttons:
            photo = button.find("img")
            self.assertEqual(photo.get("src"), button.get("data-src"))
            self.assertTrue((ROOT / photo.get("src")).is_file())
            self.assertTrue(photo.get("alt"))
            self.assertTrue(button.get("aria-label"))
            self.assertEqual(photo.get("loading"), "lazy")
            self.assertGreater(int(photo.get("width")), 0)
            self.assertGreater(int(photo.get("height")), 0)

    def test_daytime_pond_is_main_and_original_gallery_is_preserved(self):
        main = self.gallery.find("./button[@class='ph-main']/img")
        self.assertEqual(main.get("src"), "assets/cabin-exterior-pond.jpg")
        sources = {photo.get("src") for photo in self.gallery.iter("img")}
        originals = {"cabin-2main.jpg", "cabin-main.jpg", "cabin-3.jpg", "cabin-1.jpg", "cabin-2.jpg", "room-cabin.jpg"}
        self.assertEqual(sources - EXTERIORS, {f"assets/{name}" for name in originals})
        bed = self.gallery.find(".//img[@src='assets/cabin-2main.jpg']")
        self.assertIn("雙人床", bed.get("alt"))
        self.assertNotIn("外觀", bed.get("alt"))

    def test_original_poems_keep_exact_glyphs_and_line_breaks(self):
        expected = {
            "shanyu-poem": ["山巒疊翠雲絲帶", "遇雨煙濛潑墨哉", "人生何能盡所愛", "間歇緩步濁酒來", "真心笑談百花開", "情隨意轉方精采", "美景更須友常在", "夢去成空恐不逮"],
            "cabin-poem": ["水流無形隨自在", "見性本心池蓮開", "曉夢蝴蝶情盡釋", "逐放離騷嚮如來"],
        }
        for identifier, lines in expected.items():
            poem = self.home.find(f".//p[@id='{identifier}']")
            text = "".join(poem.itertext())
            self.assertEqual([line.strip() for line in text.splitlines() if line.strip()], lines)
            self.assertEqual(len(poem.findall("br")), len(lines) - 1)
        story = self.home.find(".//*[@class='naming-copy']")
        self.assertEqual(story.find("h3").text, "山遇：山間相遇")
        self.assertEqual([p.text for p in story.findall("p")], ["人與人，人與自然萬物，在充滿靈性的山林中邂逅各種美好可能的相遇。", "謹以詩句再譯之："])
        cabin = self.home.find(".//*[@class='cabin-story']")
        self.assertEqual(cabin.find("h4").text, "水岸小築・水見曉逐")
        self.assertEqual(cabin.find("p[@class='naming-origin']").text, "水岸小築定名～［水見曉逐］")

    def test_first_hero_and_floor_references_are_unchanged(self):
        hero = self.home.find(".//*[@class='hero-img']/img")
        self.assertEqual(hero.get("src"), "assets/hero-house.jpg")
        ui = (ROOT / "tour-ui.js").read_text(encoding="utf-8")
        self.assertRegex(ui, r"ground:\{name:'一樓',photo:'assets/cabin-1.jpg'")
        self.assertRegex(ui, r"upper:\{name:'二樓',photo:'assets/cabin-2.jpg'")
        self.assertRegex(ui, r"all:\{name:'整棟',photo:'assets/cabin-exterior-pond.jpg'")

    def test_stylesheet_and_entry_module_versions_are_uniform(self):
        for filename in ("index.html", "tour.html", "tour-ui.js"):
            source = (ROOT / filename).read_text(encoding="utf-8")
            versions = re.findall(r"(?:tour\.css|tour-ui\.js|scene3d\.js)\?v=([\d-]+)", source)
            self.assertTrue(versions)
            self.assertEqual(set(versions), {"20260908-4"})


if __name__ == "__main__":
    unittest.main()
