from datetime import date

from pydantic import BaseModel


class MutualFundOut(BaseModel):
    symbol: str
    name: str
    ltp: float | None
    nav: float | None
    nav_date: date | None
    nav_discount_pct: float | None  # negative = trades below NAV
    maturity_date: date | None
    days_to_maturity: int | None
    flagged: bool  # >15% below NAV and maturing within 12 months
