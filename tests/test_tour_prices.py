from html.parser import HTMLParser
from pathlib import Path
import unittest


class RatesParser(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.rates = {}
        self.listings = {}
        self.rate_order = []
        self.rate_text = {}
        self.rate_buttons = {}
        self.rate_groups = {}
        self.group = 0
        self.listing_order = []
        self.listing_text = {}
        self.band_depth = 0
        self.band_inside_room = False
        self.scope = False
        self.scope_text = ""
        self.obsolete_bundles = 0
        self.row = None
        self.room = None
        self.cell = None
        self.field = None
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        if tag == "tbody":
            self.group += 1
        if tag == "div" and "tour-whole-house" in classes:
            self.obsolete_bundles += 1
        if tag == "tr" and ("data-rate" in attrs or "tour-whole-house" in classes):
            self.row = attrs.get("data-rate", "main")
            self.rates[self.row] = []
            self.rate_order.append(self.row)
            self.rate_text[self.row] = ""
            self.rate_groups[self.row] = self.group
        if tag == "tr" and "tour-bundle-scope" in classes:
            self.scope = True
        if tag == "button" and self.row:
            self.rate_buttons[self.row] = (attrs.get("data-room"), "disabled" in attrs)
        if tag == "td" and self.row:
            self.cell = ""
        if tag == "div" and self.band_depth:
            self.band_depth += 1
        elif tag == "div" and "whole-house" in classes:
            self.band_inside_room = self.room is not None
            self.band_depth = 1
            self.room = "main"
            self.listings[self.room] = []
            self.listing_text[self.room] = ""
            self.listing_order.append(self.room)
        if "data-gallery" in attrs:
            self.room = attrs["data-gallery"]
            self.listings[self.room] = []
            self.listing_text[self.room] = ""
            self.listing_order.append(self.room)
        if tag == "span" and self.room and attrs.get("class") in ("wk", "cny"):
            self.field = ""

    def handle_data(self, data):
        if self.row:
            self.rate_text[self.row] += data
        if self.scope:
            self.scope_text += data
        if self.room:
            self.listing_text[self.room] += data
        if self.cell is not None:
            self.cell += data
        if self.field is not None:
            self.field += data

    def handle_endtag(self, tag):
        if tag == "td" and self.cell is not None:
            self.rates[self.row].append(int(self.cell.replace(",", "")))
            self.cell = None
        if tag == "tr":
            self.row = None
            self.scope = False
        if tag == "span" and self.field is not None:
            self.listings[self.room].append(int(self.field.replace("NT$", "").replace(",", "")))
            self.field = None
        if tag == "article":
            self.room = None
        if tag == "div" and self.band_depth:
            self.band_depth -= 1
            if not self.band_depth:
                self.room = None


class TourPricesTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[1]
        self.home = RatesParser(root / "index.html")
        self.tour = RatesParser(root / "tour.html")
        self.order = ["yunsidai", "lihalai", "zhenqing", "main", "cabin"]
        self.scope = "主棟包棟含雲絲帶、里哈籟、山遇真情，不含獨立小木屋"

    def test_static_tour_prices_match_both_pages_and_existing_room_listings(self):
        expected = {
            "yunsidai": [2500, 3500],
            "lihalai": [3000, 4000],
            "zhenqing": [4500, 5500],
            "main": [10000, 13000],
            "cabin": [5500, 6500],
        }
        self.assertEqual(self.home.rates, expected)
        self.assertEqual(self.tour.rates, expected)
        self.assertEqual(self.home.listings, expected)

    def test_bundle_follows_three_main_rooms_and_cabin_is_separate(self):
        for page in (self.home, self.tour):
            with self.subTest(page=page):
                self.assertEqual(page.rate_order, self.order)
                self.assertEqual(len({page.rate_groups[room] for room in self.order[:4]}), 1)
                self.assertNotEqual(page.rate_groups["main"], page.rate_groups["cabin"])

    def test_bundle_scope_and_independent_cabin_are_explicit(self):
        for page in (self.home, self.tour):
            with self.subTest(page=page):
                self.assertIn("主棟包棟", page.rate_text.get("main", ""))
                self.assertIn("11 人", page.rate_text.get("main", ""))
                self.assertEqual(page.scope_text.strip(), self.scope)
                self.assertIn("小包棟／獨棟木屋", page.rate_text["cabin"])
                self.assertEqual(page.obsolete_bundles, 0)

    def test_original_room_listing_band_is_between_third_room_and_cabin(self):
        self.assertEqual(self.home.listing_order, self.order)
        self.assertFalse(self.home.band_inside_room)
        self.assertIn(self.scope, self.home.listing_text["main"])
        self.assertIn("11 人", self.home.listing_text["main"])
        self.assertIn("獨棟木屋，擁溫馨起居室、廚房及兩間雙人套房", self.home.listing_text["cabin"])
        self.assertIn("可遠眺中央山脈豐田玉石產出段的山高雲繞，近賞山遇莊園裡，生態池畔的美麗畫境。", self.home.listing_text["cabin"])

    def test_room_model_selectors_are_preserved(self):
        expected = {room: (room, True) for room in self.order if room != "main"}
        self.assertEqual(self.home.rate_buttons, expected)
        self.assertEqual(self.tour.rate_buttons, expected)


if __name__ == "__main__":
    unittest.main()
