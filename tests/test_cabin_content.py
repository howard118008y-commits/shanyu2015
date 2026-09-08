from html.parser import HTMLParser
import json
from math import hypot
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

    def test_cabin_pond_is_larger_separate_and_leaves_entry_route_dry(self):
        source = (ROOT / "scene3d.js").read_text(encoding="utf-8")

        def outline(name, group):
            points = json.loads(re.search(rf"const {name}=(\[.*?\]);", source).group(1))
            x, _, z = map(float, re.search(rf"{group}\.position\.set\(([^)]+)\)", source).group(1).split(","))
            return [(px + x, pz + z) for px, pz in points]

        def area(points):
            return abs(sum(x * nz - z * nx for (x, z), (nx, nz) in zip(points, points[1:] + points[:1]))) / 2

        def distance(point, a, b):
            x, z = point
            ax, az = a
            dx, dz = b[0] - ax, b[1] - az
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
            return hypot(x - ax - t * dx, z - az - t * dz)

        main = outline("pondOutline", "pondGarden")
        cabin = outline("cabinPondOutline", "cabinPond")
        ratio = area(cabin) / area(main)
        self.assertGreater(ratio, 2.5)
        self.assertLess(ratio, 4)
        self.assertAlmostEqual(area(main), 11.6625)
        self.assertGreater(min(x for x, _ in cabin) - max(x for x, _ in main), 2.5)
        self.assertGreater(min(z for _, z in cabin), -0.4)  # Balcony ends at -0.8.
        self.assertLess(min(z for _, z in cabin), 0)
        self.assertTrue(all(abs(x) + 0.4 < 17.5 and abs(z) + 0.4 < 14 for x, z in cabin))
        # Follow the existing six stepping stones, including the spaces between them.
        self.assertIn("3.05-Math.max(0,i-2)*0.2,0.08,2.67+i*0.68", source)
        edges = list(zip(cabin, cabin[1:] + cabin[:1]))
        for step in range(101):
            i = step / 20
            point = (11.55 - max(0, i - 2) * 0.2, -0.73 + i * 0.68)
            self.assertLess(sum((az > point[1]) != (bz > point[1]) and point[0] < ax + (bx - ax) * (point[1] - az) / (bz - az)
                                for (ax, az), (bx, bz) in edges) % 2, 1)
            # Conservative path radius 0.46 + bank/rock allowance 0.4 + dry margin.
            self.assertGreater(min(distance(point, a, b) for a, b in edges) - 0.46 - 0.4, 0.25)

    def test_waterfront_deck_projects_from_glazed_bay_and_belongs_to_ground(self):
        source = (ROOT / "scene3d.js").read_text(encoding="utf-8")
        deck = source.split("const waterfrontDeck=", 1)[1].split("cabin.add(waterfrontDeck);", 1)[0]
        x, y, z = map(float, re.search(r"waterfrontDeck\.position\.set\(([^)]+)\)", deck).group(1).split(","))
        self.assertEqual(x, 0.42)  # Centered on the existing tall glazed bay.
        self.assertIn("3.2,0.07,2.1/11-0.012,M.wood", deck)
        self.assertGreater(z + 1.05 - 2.6, 1.5)  # Beyond the original shallow strip.
        self.assertLess(x + 1.6, 2.5)
        self.assertGreater(3.05 - 0.46 - (x + 1.6), 0.5)  # Side-entry path remains dry.
        self.assertGreater(0.4 + y - 0.16, 0.12)  # Lowest deck beam stays above pond water.
        self.assertIn("box(deckSupports,x,-0.34,z,0.13,0.55,0.13,M.frame)", deck)
        self.assertIn("[0.25,0.62,1].forEach", deck)
        for name in ("cabin-deck-table", "cabin-deck-chair-left", "cabin-deck-chair-right"):
            self.assertIn(name, deck)
        self.assertNotIn("random()", deck)
        self.assertNotIn("seed=", deck)
        self.assertIn("groundWaterfrontDeck=waterfrontDeck.clone(true)", source)
        self.assertIn("groundWaterfrontDeck.position.set(0.64,0,5.34);cabinGround.add(groundWaterfrontDeck)", source)
        self.assertAlmostEqual(5.34 - 1.05, 8.6 / 2 - 0.01)  # Joins the interior floor edge.
        self.assertIn("cabinGround.visible=level!=='upper'", source)
        self.assertNotIn("cabinUpper.add(groundWaterfrontDeck)", source)
        self.assertNotIn("box(cabin,0,y,2.52,4.75", source)  # No old rail across the doorway.

    def test_stylesheet_and_entry_module_versions_match_their_assets(self):
        for filename in ("index.html", "tour.html", "tour-ui.js"):
            source = (ROOT / filename).read_text(encoding="utf-8")
            versions = re.findall(r"(tour\.css|tour-ui\.js|scene3d\.js)\?v=([\d-]+)", source)
            self.assertTrue(versions)
            for asset, version in versions:
                self.assertEqual(version, "20260908-4" if asset == "tour.css" else "20260909-1")


if __name__ == "__main__":
    unittest.main()
