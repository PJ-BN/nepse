import json
from datetime import date
from pathlib import Path

from nepse.infrastructure.upstream.nepsealpha import parse_history

FIX = Path(__file__).parent / "fixtures"


def test_parse_history():
    out = parse_history(json.loads((FIX / "nepsealpha_history_NABIL.json").read_text()))
    assert out == {date(2012, 1, 1): 79.85, date(2012, 1, 2): 81.75, date(2012, 1, 3): 81.03}


def test_parse_no_data():
    assert parse_history(json.loads((FIX / "nepsealpha_history_empty.json").read_text())) == {}
