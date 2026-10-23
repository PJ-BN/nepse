from datetime import date

from nepse.application.charting.get_history import bucket_start


def test_bucket_start():
    assert bucket_start(date(2025, 1, 9), "1W") == date(2025, 1, 5)  # Thursday -> Sunday
    assert bucket_start(date(2025, 1, 4), "1W") == date(2024, 12, 29)  # Saturday -> prior Sunday
    assert bucket_start(date(2025, 1, 9), "1M") == date(2025, 1, 1)
    assert bucket_start(date(2025, 1, 9), "1D") == date(2025, 1, 9)
