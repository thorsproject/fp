#!/usr/bin/env python3
"""
Update airfields_mil.json from a text-based MIL AIP PDF.

What it does
------------
- Reads a local or remote PDF (single combined PDF or a per-airport extract)
- Searches the PDF for ICAOs already present in the JSON
- Extracts runway/TORA/LDA data with regex patterns tuned for MIL AIP tables
- Updates only RWYs/TORA/LDA for matching airfields
- Preserves all other JSON fields and supports two JSON shapes:
  1) top-level list
  2) {"meta": {...}, "airfields": [...]} 

Notes
-----
- Works best on text-based PDFs. If the PDF is scanned/image-only, OCR is needed first.
- MIL AIP layouts can vary. The extraction logic is intentionally layered and easy to tweak.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pypdf import PdfReader


RWY_RE = re.compile(r"^(0?[1-9]|[12][0-9]|3[0-6])([LCR])?$")


@dataclass
class RwyData:
    rwy: str
    tora: Optional[int] = None
    lda: Optional[int] = None

    def merge(self, other: "RwyData") -> None:
        if other.tora is not None:
            self.tora = other.tora
        if other.lda is not None:
            self.lda = other.lda


def normalize_ws(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def read_pdf_text(pdf_path: Path) -> List[str]:
    reader = PdfReader(str(pdf_path))
    pages: List[str] = []
    for i, page in enumerate(reader.pages):
        try:
            txt = page.extract_text() or ""
        except Exception as exc:
            print(f"WARN page {i+1}: extract_text failed: {exc}", file=sys.stderr)
            txt = ""
        pages.append(normalize_ws(txt))
    return pages


def maybe_download(source: str) -> Path:
    if re.match(r"^https?://", source, flags=re.I):
        fd, tmp_name = tempfile.mkstemp(suffix=".pdf")
        Path(tmp_name).unlink(missing_ok=True)
        print(f"Downloading PDF from {source}", file=sys.stderr)
        urllib.request.urlretrieve(source, tmp_name)
        return Path(tmp_name)
    return Path(source)


def load_json_payload(path: Path) -> Tuple[dict, List[dict], str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return {"_kind": "list"}, data, "list"
    if isinstance(data, dict) and isinstance(data.get("airfields"), list):
        return data, data["airfields"], "object"
    raise ValueError("Unsupported JSON format. Expected list or {'meta': ..., 'airfields': [...]}.")


def save_json_payload(path: Path, wrapper: dict, airfields: List[dict], kind: str) -> None:
    if kind == "list":
        payload = airfields
    else:
        payload = dict(wrapper)
        payload["airfields"] = airfields
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def canonical_rwy(value: str) -> Optional[str]:
    value = str(value or "").strip().upper().replace(" ", "")
    m = RWY_RE.match(value)
    if not m:
        return None
    num = int(m.group(1))
    side = m.group(2) or ""
    return f"{num:02d}{side}"


def merge_maps(*maps: Dict[str, RwyData]) -> Dict[str, RwyData]:
    out: Dict[str, RwyData] = {}
    for mp in maps:
        for rwy, data in mp.items():
            if rwy not in out:
                out[rwy] = RwyData(rwy=rwy, tora=data.tora, lda=data.lda)
            else:
                out[rwy].merge(data)
    return out


# ---------- extraction patterns ----------

def extract_from_table_rows(text: str) -> Dict[str, RwyData]:
    """
    Fallback for simple rows like:
      07 1311 1505 1330 1311
      24L 2940 2940 2940 2940

    Uses first numeric as TORA and last numeric as LDA.
    """
    out: Dict[str, RwyData] = {}
    row_re = re.compile(
        r"(?im)^\s*(?P<rwy>(?:0?[1-9]|[12][0-9]|3[0-6])(?:[LCR])?)\s+"
        r"(?P<n1>\d{3,5})\s+(?P<n2>\d{3,5})\s+(?P<n3>\d{3,5})\s+(?P<n4>\d{3,5})\s*$"
    )
    for m in row_re.finditer(text):
        rwy = canonical_rwy(m.group("rwy"))
        if not rwy:
            continue
        out[rwy] = RwyData(rwy=rwy, tora=int(m.group("n1")), lda=int(m.group("n4")))
    return out


def extract_from_keyword_blocks(text: str) -> Dict[str, RwyData]:
    """
    Fallback for blocks like:
      RWY 25 ... TORA 1311 ... LDA 1210
    """
    out: Dict[str, RwyData] = {}
    block_re = re.compile(
        r"(?is)(?:^|\b)RWY\s*(?P<rwy>(?:0?[1-9]|[12][0-9]|3[0-6])(?:[LCR])?)\b(?P<body>.{0,450})"
    )
    for m in block_re.finditer(text):
        rwy = canonical_rwy(m.group("rwy"))
        if not rwy:
            continue
        body = m.group("body")
        tora_m = re.search(r"\bTORA\b\D{0,40}(\d{3,5})", body, flags=re.I)
        lda_m = re.search(r"\bLDA\b\D{0,40}(\d{3,5})", body, flags=re.I)
        if not tora_m and not lda_m:
            continue
        out[rwy] = RwyData(
            rwy=rwy,
            tora=int(tora_m.group(1)) if tora_m else None,
            lda=int(lda_m.group(1)) if lda_m else None,
        )
    return out


def extract_from_rwy_scans(text: str) -> Dict[str, RwyData]:
    """
    Fallback for PDFs where the table is badly broken and values appear in local RWY chunks:
      RWY 07 ... TORA 1311 ... LDA 1210
    or similar over multiple lines.
    """
    out: Dict[str, RwyData] = {}
    text = text.replace("\r", "\n")

    starts = list(
        re.finditer(
            r"(?im)\bRWY\s*(?P<rwy>(?:0?[1-9]|[12][0-9]|3[0-6])(?:[LCR])?)\b",
            text,
        )
    )

    for idx, m in enumerate(starts):
        rwy = canonical_rwy(m.group("rwy"))
        if not rwy:
            continue

        start = m.start()
        end = starts[idx + 1].start() if idx + 1 < len(starts) else min(len(text), start + 1400)
        chunk = text[start:end]

        tora_m = re.search(r"(?is)\bTORA\b\D{0,60}(\d{3,5})", chunk)
        lda_m = re.search(r"(?is)\bLDA\b\D{0,60}(\d{3,5})", chunk)

        if tora_m or lda_m:
            out[rwy] = RwyData(
                rwy=rwy,
                tora=int(tora_m.group(1)) if tora_m else None,
                lda=int(lda_m.group(1)) if lda_m else None,
            )

    return out


def extract_from_declared_distances_section(text: str) -> Dict[str, RwyData]:
    """
    Main parser for MIL AIP declared distances tables.

    Handles rows like:
      07 1311 1505 1330 1311
      25 1311 1371 1311 1210
      09 2520 (2720*1) 3134 (3334*1) 2824 2520 *1 200 m SWY available

    Ignores intersection take-off rows like:
      TWY B-North*2 439 1053 743 -
    """
    out: Dict[str, RwyData] = {}

    # Search around the real table header instead of cutting between section titles,
    # because some PDFs place the next subsection title right after "Declared Distances".
    m = re.search(
        r"(?is)"
        r"RWY\s*Designator\s*TORA\s*\(m\)\s*TODA\s*\(m\)\s*ASDA\s*\(m\)\s*LDA\s*\(m\)\s*Remarks"
        r".*?"
        r"(?P<body>.*?)(?:RWY\s*Designator\s*APCH\s*LGT|APCH\s*LGT|AIRCRAFT\s+ARRESTING\s+SYSTEMS|OTHER\s+LIGHTING|\Z)",
        text,
    )
    chunk = m.group("body") if m else text

    chunk = chunk.replace("\r", "\n")
    # Join digit sequences broken by spaces: "3 1 3 4" -> "3134"
    chunk = re.sub(r"\b(?:\d\s+){2,}\d\b", lambda m: m.group(0).replace(" ", ""), chunk)
    # Tighten footnote markers: "* 1" -> "*1"
    chunk = re.sub(r"\*\s+(\d+)", r"*\1", chunk)
    chunk = re.sub(r"[ \t]+", " ", chunk)
    chunk = re.sub(r"\n+", "\n", chunk)

    row_re = re.compile(
        r"(?im)^\s*"
        r"(?P<rwy>(?:0?[1-9]|[12][0-9]|3[0-6])(?:[LCR])?)\s+"
        r"(?P<tora>\d{3,5})"
        r"(?:\s*\(\d{3,5}(?:\*\d+)?\))?\s+"
        r"(?P<toda>\d{3,5})"
        r"(?:\s*\(\d{3,5}(?:\*\d+)?\))?\s+"
        r"(?P<asda>\d{3,5})\s+"
        r"(?P<lda>\d{3,5})\b"
        r"(?:\s+.*)?$"
    )

    for raw_line in chunk.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if line.upper().startswith("TWY "):
            continue

        m2 = row_re.match(line)
        if not m2:
            continue

        rwy = canonical_rwy(m2.group("rwy"))
        if not rwy:
            continue

        out[rwy] = RwyData(
            rwy=rwy,
            tora=int(m2.group("tora")),
            lda=int(m2.group("lda")),
        )

    return out


def find_relevant_pages(all_pages: List[str], icao: str, context_pages: int = 2) -> List[int]:
    hits = [i for i, txt in enumerate(all_pages) if re.search(rf"\b{re.escape(icao)}\b", txt)]
    if not hits:
        return []
    pages = set()
    for i in hits:
        for j in range(max(0, i - context_pages), min(len(all_pages), i + context_pages + 1)):
            pages.add(j)
    return sorted(pages)


def extract_airfield_data(all_pages: List[str], icao: str) -> Dict[str, RwyData]:
    rel_pages = find_relevant_pages(all_pages, icao)
    if not rel_pages:
        return {}

    # Do not further trim to an "AD 2 ICAO" subsection.
    # In full MIL AIP PDFs and per-airport extracts, that header often repeats on each page.
    text = "\n\n".join(all_pages[i] for i in rel_pages)

    return merge_maps(
        extract_from_declared_distances_section(text),
        extract_from_table_rows(text),
        extract_from_keyword_blocks(text),
        extract_from_rwy_scans(text),
    )


def update_airfields(airfields: List[dict], all_pages: List[str], overwrite_partial: bool = False) -> Tuple[List[dict], List[str]]:
    logs: List[str] = []
    for ap in airfields:
        icao = str(ap.get("ICAO") or "").strip().upper()
        if not icao:
            continue

        found = extract_airfield_data(all_pages, icao)
        if not found:
            logs.append(f"{icao}: no runway data found in PDF")
            continue

        old_rows = ap.get("RWYs") or []
        old_map: Dict[str, dict] = {}
        for row in old_rows:
            rwy = canonical_rwy(row.get("RWY"))
            if rwy:
                old_map[rwy] = dict(row)

        new_map: Dict[str, dict] = {}
        for rwy, data in found.items():
            prev = old_map.get(rwy, {"RWY": rwy})
            merged = dict(prev)
            merged["RWY"] = rwy
            if data.tora is not None:
                merged["TORA"] = data.tora
            elif overwrite_partial and "TORA" not in merged:
                merged["TORA"] = 0
            if data.lda is not None:
                merged["LDA"] = data.lda
            elif overwrite_partial and "LDA" not in merged:
                merged["LDA"] = 0
            new_map[rwy] = merged

        if new_map:
            ap["RWYs"] = [new_map[k] for k in sorted(new_map.keys())]
            logs.append(f"{icao}: updated {len(new_map)} runway entries")
        else:
            logs.append(f"{icao}: found PDF pages but extracted no usable RWY rows")

    return airfields, logs


def main() -> int:
    p = argparse.ArgumentParser(description="Update MIL airfields JSON from MIL AIP PDF")
    p.add_argument("--pdf", required=True, help="Path or URL to a MIL AIP PDF")
    p.add_argument("--json", required=True, help="Path to airfields_mil.json")
    p.add_argument("--out", help="Optional output path; defaults to in-place update")
    p.add_argument(
        "--overwrite-partial",
        action="store_true",
        help="If set, missing extracted values may be written as 0 in new runway rows",
    )
    args = p.parse_args()

    pdf_path = maybe_download(args.pdf)
    json_path = Path(args.json)
    out_path = Path(args.out) if args.out else json_path

    wrapper, airfields, kind = load_json_payload(json_path)
    all_pages = read_pdf_text(pdf_path)
    airfields, logs = update_airfields(airfields, all_pages, overwrite_partial=args.overwrite_partial)
    save_json_payload(out_path, wrapper, airfields, kind)

    print(f"Written: {out_path}")
    print("\n".join(logs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
