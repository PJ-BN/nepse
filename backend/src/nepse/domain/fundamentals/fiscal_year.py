"""Canonical BS fiscal-year labels: '2081/82'."""
import re

_FY = re.compile(r"(\d{2,4})\s*[-/]\s*(\d{2,4})")


def normalize_fy(text: str) -> str:
    """'082-083', '2082/2083', '82/83' or 'FY 82/83' -> '2082/83'."""
    m = _FY.search(text)
    if not m:
        raise ValueError(f"no fiscal year in {text!r}")
    start = int(m.group(1)[-2:]) + 2000
    return f"{start}/{(start + 1) % 100:02d}"


def fy_start_year(fy_bs: str) -> int:
    return int(fy_bs[:4])
