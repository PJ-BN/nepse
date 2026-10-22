from datetime import date
from pathlib import Path

from nepse.infrastructure.upstream.sharesansar_announcements import parse_announcements

FIX = Path(__file__).parent / "fixtures" / "sharesansar" / "announcements.html"


def test_parse_announcements():
    rows = parse_announcements(FIX.read_text("utf-8"))
    assert len(rows) == 3
    assert rows[0].title.startswith("NIC Asia Bank Limited has published a notice")
    assert "it's effective" in rows[0].title  # HTML entity decoded
    assert rows[0].url.startswith("https://www.sharesansar.com/announcementdetail/nic-asia")
    assert rows[0].published_on == date(2026, 10, 17)
    assert parse_announcements("<html></html>") == []
