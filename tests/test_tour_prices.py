from html.parser import HTMLParser
from pathlib import Path
import unittest


class RatesParser(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.rates = {}
        self.listings = {}
        self.row = None
        self.room = None
        self.cell = None
        self.field = None
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr" and "data-rate" in attrs:
            self.row = attrs["data-rate"]
            self.rates[self.row] = []
        if tag == "td" and self.row:
            self.cell = ""
        if "data-gallery" in attrs:
            self.room = attrs["data-gallery"]
            self.listings[self.room] = []
        if tag == "span" and self.room and attrs.get("class") in ("wk", "cny"):
            self.field = ""

    def handle_data(self, data):
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
        if tag == "span" and self.field is not None:
            self.listings[self.room].append(int(self.field.replace("NT$", "").replace(",", "")))
            self.field = None
        if tag == "article":
            self.room = None


class TourPricesTests(unittest.TestCase):
    def test_static_tour_prices_match_both_pages_and_existing_room_listings(self):
        root = Path(__file__).resolve().parents[1]
        home = RatesParser(root / "index.html")
        tour = RatesParser(root / "tour.html")
        self.assertEqual(set(home.rates), {"yunsidai", "lihalai", "zhenqing", "cabin"})
        self.assertEqual(home.rates, tour.rates)
        for room, rates in home.rates.items():
            self.assertEqual(len(rates), 2)
            self.assertEqual(rates, home.listings[room][:2])


if __name__ == "__main__":
    unittest.main()
