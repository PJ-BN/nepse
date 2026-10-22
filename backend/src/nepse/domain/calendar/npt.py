from datetime import datetime, timedelta, timezone

# Nepal has no DST, so a fixed offset is exact and needs no tz database.
NPT = timezone(timedelta(hours=5, minutes=45), "NPT")


def now_npt() -> datetime:
    return datetime.now(NPT)
