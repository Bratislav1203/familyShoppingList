#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FamilyShopping - master product catalog builder

Modes:
  1) master:
     Download current public price lists from major Serbian retailers and build
     one distinct product row per EAN/GTIN.

  2) tracked:
     Download the same price lists and export only current prices for EANs that
     FamilyShopping users track.

Examples:
  python familyshopping_catalog_builder.py --mode master
  python familyshopping_catalog_builder.py --mode tracked --tracked-eans tracked_eans.txt

Outputs:
  out/master_products.csv
  out/tracked_prices.csv
  out/import_report.csv
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional, Set, Tuple

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Stable data.gov.rs resource permalinks. They redirect to the current resource.
SOURCES = [
    {
        "retailer": "Delhaize (Maxi/Mega Maxi/Tempo/Shop&Go)",
        "url": "https://data.gov.rs/sr/datasets/r/aa0a4ab4-1dc8-49e2-abef-67612a2abcbb",
    },
    {
        "retailer": "Lidl",
        "url": "https://data.gov.rs/sr/datasets/r/79be27de-a311-489d-86ae-6df3c7a65345",
    },
    {
        "retailer": "IDEA/Roda/Mercator",
        "url": "https://data.gov.rs/sr/datasets/r/1ce4a0a7-1e8e-4691-afc5-a1919a38398f",
    },
    {
        "retailer": "Univerexport",
        "url": "https://data.gov.rs/sr/datasets/r/a6dadf8c-912f-49ae-a03f-989c8dfd71fa",
    },
    {
        "retailer": "Gomex",
        "url": "https://data.gov.rs/sr/datasets/r/20384e27-4671-414d-8bfa-8460559ffd53",
    },
    {
        "retailer": "Aman",
        "url": "https://data.gov.rs/sr/datasets/r/90465a2b-ad9f-4c42-b727-4bbc2bcbd7bb",
    },
    {
        "retailer": "Metro",
        "url": "https://data.gov.rs/sr/datasets/r/7b200705-8393-4dce-a22d-fcbaabd61d9a",
    },
]


def key(s: str) -> str:
    """Normalize a CSV header to a comparison key."""
    s = (s or "").strip().lower()
    s = s.replace("–", "-").replace("—", "-")
    s = "".join(
        c for c in unicodedata.normalize("NFKD", s)
        if not unicodedata.combining(c)
    )
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


FIELD_ALIASES = {
    "category_code": {
        "kategorija",
    },
    "category_name": {
        "nazivkategorije",
    },
    "product_name": {
        "nazivproizvoda",
    },
    "brand": {
        "robnamarka",
        "brend",
    },
    "ean": {
        "barkod",
        "barkodproizvoda",
        "ean",
        "gtin",
    },
    "unit": {
        "jedinicamere",
    },
    "merchant_format": {
        "trgovacformat",
        "nazivtrgovcaformata",
        "nazivtrgovcaformat",
    },
    "price_list_date": {
        "datumcenovnika",
    },
    "regular_price": {
        "redovnacena",
    },
    "unit_price": {
        "cenapojedinicimere",
    },
    "discount_price": {
        "snizenacena",
    },
    "discount_start": {
        "datumpocetkasnizenja",
    },
    "discount_end": {
        "datumkrajasnizenja",
    },
    "vat_rate": {
        "stopapdv",
    },
    "price_list_type": {
        "vrstacenovnika",
    },
}


def resolve_columns(fieldnames: Iterable[str]) -> Dict[str, str]:
    by_key = {key(h): h for h in fieldnames if h is not None}
    result = {}
    for internal, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if alias in by_key:
                result[internal] = by_key[alias]
                break
    return result


def clean_text(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def normalize_ean(value: Optional[str]) -> Optional[str]:
    """
    Keep EAN/GTIN as text so leading zeroes are preserved.
    Accept common GTIN lengths (8, 12, 13, 14).
    """
    raw = clean_text(value)
    if not raw:
        return None

    # Some spreadsheets may represent it as 1234567890123.0
    raw = re.sub(r"\.0+$", "", raw)
    digits = re.sub(r"\D", "", raw)

    if not digits or set(digits) == {"0"}:
        return None

    if len(digits) not in {8, 12, 13, 14}:
        return None

    return digits


def parse_decimal(value: Optional[str]) -> str:
    """Keep prices as normalized decimal strings for CSV/database import."""
    s = clean_text(value)
    if not s:
        return ""
    s = s.replace(" ", "")
    # handle 1.234,56 and 1234,56
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return f"{float(s):.2f}"
    except ValueError:
        return clean_text(value)


def parse_package(name: str, unit: str) -> Tuple[Optional[float], Optional[str]]:
    """
    Extract a normalized package size from a product name (and unit hint).

    Returns (value, unit) where unit is one of 'kom' | 'kg' | 'l', or
    (None, None) when nothing reliable can be inferred. We deliberately return
    None rather than guessing so downstream code never invents a unit price.
    """
    text = (name or "").lower()

    # ── Count / pieces ──────────────────────────────────────────────────────
    # "30 kom", "30 komada", "60 kapsula", "20/1", "100/1", "2x60"
    # Multipack sa jedinicom: "4x0.33L" -> 1.32 l, "8x500ml" -> 4 l.
    m = re.search(r"(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(ml|l|kg|g)\b", text)
    if m:
        count = int(m.group(1))
        size = float(m.group(2).replace(",", "."))
        u = m.group(3)
        if u == "ml":
            return round(count * size / 1000.0, 4), "l"
        if u == "l":
            return round(count * size, 4), "l"
        if u == "g":
            return round(count * size / 1000.0, 4), "kg"
        return round(count * size, 4), "kg"  # kg

    m = re.search(r"(\d+)\s*[x×]\s*(\d+)\b", text)  # 2x60 -> 120
    if m:
        return float(int(m.group(1)) * int(m.group(2))), "kom"

    m = re.search(r"(\d+)\s*/\s*1\b", text)  # 30/1, 100/1
    if m:
        return float(int(m.group(1))), "kom"

    m = re.search(r"(\d+)\s*(?:kom(?:ada|\.)?|kaps(?:ula|ule|ul)?|pods?)\b", text)
    if m:
        return float(int(m.group(1))), "kom"

    # ── Volume (litres) ─────────────────────────────────────────────────────
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*ml\b", text)
    if m:
        return round(float(m.group(1).replace(",", ".")) / 1000.0, 4), "l"

    m = re.search(r"(\d+(?:[.,]\d+)?)\s*l\b", text)
    if m:
        return float(m.group(1).replace(",", ".")), "l"

    # ── Weight (kilograms) ──────────────────────────────────────────────────
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*kg\b", text)
    if m:
        return float(m.group(1).replace(",", ".")), "kg"

    m = re.search(r"(\d+(?:[.,]\d+)?)\s*g\b", text)
    if m:
        return round(float(m.group(1).replace(",", ".")) / 1000.0, 4), "kg"

    # ── Fall back to the explicit unit column when the name had no size ──────
    u = (unit or "").strip().lower()
    if u in {"kom", "kom.", "komada", "ko"}:
        return None, "kom"  # unit known, quantity unknown
    if u in {"kg"}:
        return None, "kg"
    if u in {"l", "lit"}:
        return None, "l"

    return None, None


def quality_score(name: str, brand: str, category: str, unit: str) -> int:
    score = 0
    lname = name.lower()
    lbrand = brand.lower()

    if name:
        score += 10
        if 4 <= len(name) <= 120:
            score += 3
    if brand and lbrand not in {
        "rm nije definisana", "nije definisana", "n/a", "na", "-", "brend"
    }:
        score += 5
    if category:
        score += 2
    if unit:
        score += 1

    # Penalize names that look like raw codes rather than user-facing names.
    if re.fullmatch(r"[\d\W_]+", name or ""):
        score -= 10
    if "nije defin" in lname:
        score -= 4

    return score


@dataclass
class ProductAggregate:
    ean: str
    canonical_name: str = ""
    canonical_brand: str = ""
    canonical_category: str = ""
    canonical_unit: str = ""
    canonical_source: str = ""
    canonical_score: int = -10_000

    retailers: Set[str] = None
    name_variants: Set[str] = None
    brand_variants: Set[str] = None
    categories: Set[str] = None

    def __post_init__(self):
        self.retailers = set() if self.retailers is None else self.retailers
        self.name_variants = set() if self.name_variants is None else self.name_variants
        self.brand_variants = set() if self.brand_variants is None else self.brand_variants
        self.categories = set() if self.categories is None else self.categories

    def observe(
        self,
        retailer: str,
        name: str,
        brand: str,
        category: str,
        unit: str,
    ) -> None:
        self.retailers.add(retailer)
        if name:
            self.name_variants.add(name)
        if brand:
            self.brand_variants.add(brand)
        if category:
            self.categories.add(category)

        score = quality_score(name, brand, category, unit)
        if score > self.canonical_score:
            self.canonical_score = score
            self.canonical_name = name
            self.canonical_brand = brand
            self.canonical_category = category
            self.canonical_unit = unit
            self.canonical_source = retailer


def make_session() -> requests.Session:
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": "FamilyShopping/0.1 public-price-list-importer"
    })
    return session


def download_source(
    session: requests.Session,
    source: dict,
    target: Path,
) -> Tuple[str, int]:
    with session.get(source["url"], timeout=(20, 180), stream=True, allow_redirects=True) as r:
        r.raise_for_status()
        size = 0
        with target.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
                    size += len(chunk)
        return r.url, size


def open_csv(path: Path):
    raw = path.read_bytes()

    # Public files are expected to be UTF-8, but keep a fallback for bad exports.
    text = None
    used_encoding = None
    for encoding in ("utf-8-sig", "utf-8", "cp1250", "latin-1"):
        try:
            text = raw.decode(encoding)
            used_encoding = encoding
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError(f"Cannot decode {path}")

    text = text.replace("\x00", "")

    sample = text[:65536]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=";,\t|")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ";"

    return io.StringIO(text), used_encoding, delimiter


def read_tracked_eans(path: Optional[Path]) -> Set[str]:
    if path is None:
        return set()
    result = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        ean = normalize_ean(line)
        if ean:
            result.add(ean)
    return result


def build(mode: str, tracked_file: Optional[Path], out_dir: Path) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    tracked_eans = read_tracked_eans(tracked_file)

    if mode == "tracked" and not tracked_eans:
        raise SystemExit("--mode tracked requires --tracked-eans with at least one valid EAN")

    session = make_session()
    master: Dict[str, ProductAggregate] = {}
    report_rows = []

    prices_path = out_dir / "tracked_prices.csv"
    price_fp = None
    price_writer = None

    if mode == "tracked":
        price_fp = prices_path.open("w", newline="", encoding="utf-8-sig")
        price_writer = csv.DictWriter(
            price_fp,
            fieldnames=[
                "ean",
                "retailer",
                "merchant_format",
                "price_list_date",
                "regular_price",
                "discount_price",
                "unit_price",
                "unit",
                "vat_rate",
                "discount_start",
                "discount_end",
                "price_list_type",
            ],
        )
        price_writer.writeheader()

    try:
        with tempfile.TemporaryDirectory(prefix="familyshopping_") as tmp:
            tmpdir = Path(tmp)

            for idx, source in enumerate(SOURCES, start=1):
                retailer = source["retailer"]
                local_path = tmpdir / f"{idx:02d}.csv"
                print(f"[{idx}/{len(SOURCES)}] Downloading {retailer}...", flush=True)

                try:
                    final_url, size = download_source(session, source, local_path)
                    text_io, encoding, delimiter = open_csv(local_path)
                    reader = csv.DictReader(text_io, delimiter=delimiter)

                    if not reader.fieldnames:
                        raise ValueError("CSV has no header")

                    cols = resolve_columns(reader.fieldnames)
                    required = {"product_name", "ean"}
                    missing = required - set(cols)
                    if missing:
                        raise ValueError(
                            f"Missing required columns {sorted(missing)}. "
                            f"Headers: {reader.fieldnames}"
                        )

                    rows = 0
                    valid_eans = set()
                    tracked_hits = 0

                    for row in reader:
                        rows += 1
                        ean = normalize_ean(row.get(cols["ean"]))
                        if not ean:
                            continue

                        valid_eans.add(ean)

                        name = clean_text(row.get(cols.get("product_name", ""), ""))
                        brand = clean_text(row.get(cols.get("brand", ""), ""))
                        category = clean_text(row.get(cols.get("category_name", ""), ""))
                        unit = clean_text(row.get(cols.get("unit", ""), ""))

                        if mode in ("master", "master-json"):
                            agg = master.get(ean)
                            if agg is None:
                                agg = ProductAggregate(ean=ean)
                                master[ean] = agg
                            agg.observe(retailer, name, brand, category, unit)

                        elif ean in tracked_eans:
                            tracked_hits += 1
                            price_writer.writerow({
                                "ean": ean,
                                "retailer": retailer,
                                "merchant_format": clean_text(
                                    row.get(cols.get("merchant_format", ""), "")
                                ),
                                "price_list_date": clean_text(
                                    row.get(cols.get("price_list_date", ""), "")
                                ),
                                "regular_price": parse_decimal(
                                    row.get(cols.get("regular_price", ""), "")
                                ),
                                "discount_price": parse_decimal(
                                    row.get(cols.get("discount_price", ""), "")
                                ),
                                "unit_price": parse_decimal(
                                    row.get(cols.get("unit_price", ""), "")
                                ),
                                "unit": unit,
                                "vat_rate": clean_text(
                                    row.get(cols.get("vat_rate", ""), "")
                                ),
                                "discount_start": clean_text(
                                    row.get(cols.get("discount_start", ""), "")
                                ),
                                "discount_end": clean_text(
                                    row.get(cols.get("discount_end", ""), "")
                                ),
                                "price_list_type": clean_text(
                                    row.get(cols.get("price_list_type", ""), "")
                                ),
                            })

                    report_rows.append({
                        "retailer": retailer,
                        "status": "OK",
                        "rows_read": rows,
                        "distinct_valid_eans": len(valid_eans),
                        "tracked_price_rows": tracked_hits if mode == "tracked" else "",
                        "bytes_downloaded": size,
                        "encoding": encoding,
                        "delimiter": delimiter,
                        "final_url": final_url,
                        "source_permalink": source["url"],
                        "error": "",
                    })

                except Exception as exc:
                    report_rows.append({
                        "retailer": retailer,
                        "status": "ERROR",
                        "rows_read": "",
                        "distinct_valid_eans": "",
                        "tracked_price_rows": "",
                        "bytes_downloaded": "",
                        "encoding": "",
                        "delimiter": "",
                        "final_url": "",
                        "source_permalink": source["url"],
                        "error": str(exc),
                    })
                    print(f"  ERROR: {exc}", file=sys.stderr, flush=True)

    finally:
        if price_fp is not None:
            price_fp.close()

    if mode == "master":
        master_path = out_dir / "master_products.csv"
        with master_path.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "ean",
                    "name",
                    "brand",
                    "category",
                    "unit",
                    "retailer_count",
                    "retailers",
                    "name_variant_count",
                    "name_variants",
                    "brand_variants",
                    "category_variants",
                    "canonical_source",
                ],
            )
            writer.writeheader()

            for ean, p in sorted(
                master.items(),
                key=lambda item: (item[1].canonical_name.casefold(), item[0]),
            ):
                writer.writerow({
                    "ean": ean,
                    "name": p.canonical_name,
                    "brand": p.canonical_brand,
                    "category": p.canonical_category,
                    "unit": p.canonical_unit,
                    "retailer_count": len(p.retailers),
                    "retailers": " | ".join(sorted(p.retailers)),
                    "name_variant_count": len(p.name_variants),
                    "name_variants": " | ".join(sorted(p.name_variants)),
                    "brand_variants": " | ".join(sorted(p.brand_variants)),
                    "category_variants": " | ".join(sorted(p.categories)),
                    "canonical_source": p.canonical_source,
                })

        print(f"\nMaster catalog: {master_path}")
        print(f"Distinct valid EANs: {len(master):,}")

    if mode == "master-json":
        # Compact catalog for the web app's client-side search. Only the fields
        # needed to search and to normalize package sizes are kept, so the file
        # stays small enough to ship to the browser.
        catalog = []
        for ean, p in sorted(
            master.items(),
            key=lambda item: (item[1].canonical_name.casefold(), item[0]),
        ):
            name = p.canonical_name
            # Skip rows whose "name" is just a code — no value for search.
            if not name or re.fullmatch(r"[\d\W_]+", name):
                continue

            pkg_value, pkg_unit = parse_package(name, p.canonical_unit)
            catalog.append({
                "ean": ean,
                "name": name,
                "brand": p.canonical_brand or None,
                "category": p.canonical_category or None,
                "packageValue": pkg_value,
                "packageUnit": pkg_unit,
            })

        catalog_path = out_dir / "catalog.json"
        with catalog_path.open("w", encoding="utf-8") as f:
            json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))

        print(f"\nCatalog JSON: {catalog_path}")
        print(f"Products: {len(catalog):,}")

    report_path = out_dir / "import_report.csv"
    with report_path.open("w", newline="", encoding="utf-8-sig") as f:
        fields = [
            "retailer",
            "status",
            "rows_read",
            "distinct_valid_eans",
            "tracked_price_rows",
            "bytes_downloaded",
            "encoding",
            "delimiter",
            "final_url",
            "source_permalink",
            "error",
        ]
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(report_rows)

    print(f"Import report: {report_path}")
    if mode == "tracked":
        print(f"Tracked prices: {prices_path}")

    errors = sum(1 for r in report_rows if r["status"] == "ERROR")
    return 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode",
        choices=("master", "master-json", "tracked"),
        default="master",
        help="master = CSV catalog; master-json = compact catalog.json for the web app; tracked = current prices for selected EANs",
    )
    parser.add_argument(
        "--tracked-eans",
        type=Path,
        help="Text file with one EAN per line; required for --mode tracked",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("out"),
        help="Output directory (default: ./out)",
    )
    args = parser.parse_args()
    return build(args.mode, args.tracked_eans, args.out)


if __name__ == "__main__":
    raise SystemExit(main())
