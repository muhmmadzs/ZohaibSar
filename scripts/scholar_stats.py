#!/usr/bin/env python3
"""Fetch Google Scholar profile stats and write assets/scholar.json.

Stdlib only. Exits non-zero on any failure so a stale-but-valid
scholar.json is never overwritten with garbage.
"""

import json
import re
import sys
import urllib.request
from datetime import date, timezone, datetime
from html import unescape
from pathlib import Path

SCHOLAR_ID = "QbvTuaIAAAAJ"
URL = (
    "https://scholar.google.com/citations"
    f"?user={SCHOLAR_ID}&hl=en&cstart=0&pagesize=100"
)
OUT = Path(__file__).resolve().parent.parent / "assets" / "scholar.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def main() -> int:
    try:
        html = fetch(URL)
    except Exception as exc:  # noqa: BLE001
        print(f"fetch failed: {exc}", file=sys.stderr)
        return 1

    # Stats table: Citations / h-index / i10-index, "All" column first.
    stats = re.findall(r'<td class="gsc_rsb_std">(\d+)</td>', html)
    if len(stats) < 6:
        print("could not parse stats table (blocked or layout change?)", file=sys.stderr)
        return 1
    citations, h_index, i10_index = int(stats[0]), int(stats[2]), int(stats[4])

    # Publication rows.
    rows = re.findall(
        r'<a href="(/citations\?view_op=view_citation[^"]*)"[^>]*class="gsc_a_at">(.*?)</a>'
        r".*?<td class=\"gsc_a_c\">.*?>(\d*)<"
        r".*?<span class=\"gsc_a_h[^\"]*\">(\d*)</span>",
        html,
        re.DOTALL,
    )
    pubs = []
    for href, title, cites, year in rows:
        pubs.append(
            {
                "title": unescape(re.sub(r"<[^>]+>", "", title)).strip(),
                "url": "https://scholar.google.com" + unescape(href),
                "citations": int(cites) if cites else 0,
                "year": int(year) if year else None,
            }
        )
    if not pubs:
        print("could not parse publication rows", file=sys.stderr)
        return 1

    data = {
        "updated": datetime.now(timezone.utc).date().isoformat(),
        "citations": citations,
        "h_index": h_index,
        "i10_index": i10_index,
        "publications_count": len(pubs),
        "top": sorted(pubs, key=lambda p: p["citations"], reverse=True)[:5],
    }

    OUT.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: {citations} citations, h-index {h_index}, {len(pubs)} publications")
    return 0


if __name__ == "__main__":
    sys.exit(main())
