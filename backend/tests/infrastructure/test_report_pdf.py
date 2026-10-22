import pytest

from nepse.application.fundamentals.ingest_report import ingest_report_pdf
from nepse.infrastructure.upstream.report_pdf import parse_report_pdf, parse_report_text
from tests.application.test_fundamentals_use_cases import SNAP, FakeRepo

LINES = [
    "Nabil Bank Limited Unaudited Financial Results 2082/83 Third Quarter",
    "Earnings per share 27.01", "Net worth per share 240.27", "Net profit after tax 1,234,567",
    "Non performing loan ratio 1.85", "Capital adequacy ratio 13.2", "Credit to deposit ratio 85.4",
    "Total assets (5,000)",
]


def _pdf(lines: list[str]) -> bytes:
    """Smallest valid one-page PDF with Helvetica text lines."""
    stream = "BT /F1 10 Tf 12 TL 40 780 Td " + " T* ".join(f"({t}) Tj" for t in lines) + " ET"
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
        "/Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out, offsets = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{o}\nendobj\n".encode()
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    out += "".join(f"{off:010d} 00000 n \n" for off in offsets).encode()
    return out + f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()


def test_parse_text():
    r = parse_report_text("\n".join(LINES))
    assert (r.fy_bs, r.quarter) == ("2082/83", 3)
    assert r.common["eps"] == 27.01 and r.common["bvps"] == 240.27 and r.common["total_assets"] == -5000
    assert r.sector_metrics == {"npl_pct": 1.85, "car_pct": 13.2, "cd_ratio_pct": 85.4}


async def test_ingest_from_pdf_stores_quarter_with_sector_metrics():
    repo = FakeRepo()
    company = await repo.create_company("NABIL", SNAP.name, "BANKING")
    row = await ingest_report_pdf("nabil", repo, _pdf(LINES), parse_report_pdf)
    assert row.quarter == 3 and row.eps == 27.01 and row.sector_metrics == {
        "npl_pct": 1.85, "car_pct": 13.2, "cd_ratio_pct": 85.4}
    assert repo.quarter_rows[company.id] == [row]


async def test_ingest_needs_period_and_known_company():
    repo = FakeRepo()
    with pytest.raises(ValueError):
        await ingest_report_pdf("NABIL", repo, _pdf(["Earnings per share 1.0"]), parse_report_pdf)
    with pytest.raises(LookupError):
        await ingest_report_pdf("NABIL", repo, _pdf(LINES), parse_report_pdf)
