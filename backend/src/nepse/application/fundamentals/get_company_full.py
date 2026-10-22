"""Everything the company page needs in one call."""
from dataclasses import asdict
from datetime import date

from nepse.application.fundamentals.ports import FundamentalsRepository, LiveQuotes
from nepse.domain.fundamentals import valuation as v
from nepse.domain.fundamentals.sector_metrics import load_sector_metrics

QUARTERS_SHOWN = 20  # five fiscal years
DEFAULT_RISK_FREE_RATE = 0.06  # NRB 10-year development bond yield; override per request
DEFAULT_DCF_GROWTH = 0.05
DEFAULT_TERMINAL_GROWTH = 0.03


def _r(x: float | None, nd: int = 2) -> float | None:
    return None if x is None else round(x, nd)


async def get_company_full(symbol: str, repo: FundamentalsRepository, today: date, quotes: LiveQuotes | None = None,
                           risk_free_rate: float = DEFAULT_RISK_FREE_RATE,
                           dcf_growth: float = DEFAULT_DCF_GROWTH,
                           terminal_growth: float = DEFAULT_TERMINAL_GROWTH) -> dict | None:
    symbol = symbol.upper()
    company = await repo.company(symbol)
    if company is None:
        return None

    quarters = await repo.quarters(company.id, QUARTERS_SHOWN)
    latest = quarters[0] if quarters else None
    stored = next((q.sector_metrics for q in quarters if q.sector_metrics), None)
    metrics = load_sector_metrics(company.sector_code, stored)

    live = await quotes.quote(symbol) if quotes else None
    eod = await repo.latest_price(company.id)
    if live and live.get("ltp") is not None:
        price = {"ltp": float(live["ltp"]), "source": "live", "as_of": live.get("ts")}
    elif eod:
        price = {"ltp": eod.close, "source": "eod", "as_of": eod.trade_date.isoformat()}
    else:
        price = {"ltp": None, "source": None, "as_of": None}
    price["high_52w"] = eod.high_52w if eod else None
    price["low_52w"] = eod.low_52w if eod else None
    ltp = price["ltp"]

    eps = latest.eps if latest else None
    bvps = latest.bvps if latest else None
    paid_up = (latest.paid_up_capital if latest else None) or company.paid_up_capital
    shares = company.listed_shares
    market_cap = ltp * shares if ltp is not None and shares else None
    ev = v.enterprise_value(market_cap, latest.total_debt if latest else None, latest.cash if latest else None)

    dcf = None
    cash_flow = metrics.get("free_cash_flow") or (eps * shares if eps and shares else None)
    if cash_flow and cash_flow > 0 and shares:
        value = v.dcf_value(cash_flow, dcf_growth, risk_free_rate, terminal_growth=terminal_growth)
        dcf = {"per_share": _r(value / shares), "risk_free_rate": risk_free_rate, "growth": dcf_growth,
               "equity_risk_premium": 0.07, "terminal_growth": terminal_growth, "years": 5}

    nav_row = await repo.latest_nav(company.id) if company.sector_code == "MUTUAL" else None
    nav = (nav_row and (nav_row.weekly_nav or nav_row.monthly_nav)) or metrics.get("weekly_nav") or metrics.get("monthly_nav")
    metrics_for_flags = {**metrics, "weekly_nav": nav} if nav else metrics
    graham = v.graham_number(eps, bvps)

    valuation = {
        "eps": eps, "bvps": bvps,
        "pe": _r(ltp / eps) if ltp and eps and eps > 0 else None,
        "pb": _r(ltp / bvps) if ltp and bvps and bvps > 0 else None,
        "graham_number": _r(graham),
        "graham_upside_pct": _r((graham - ltp) / ltp * 100) if graham and ltp else None,
        "dividend_capacity": _r(v.dividend_capacity(latest.distributable_profit if latest else None, paid_up), 4),
        "market_cap": _r(market_cap),
        "enterprise_value": _r(ev),
        "ev_ebitda": _r(v.ev_to_ebitda(ev, metrics.get("ebitda"))),
        "dcf": dcf,
        "price_to_life_fund": _r(v.price_to_life_fund(market_cap, paid_up, latest.reserves if latest else None,
                                                     metrics.get("life_fund_amount")))
        if company.sector_code in ("LIFEINSU", "NONLIFE") else None,
        "nav": nav,
        "nav_discount_pct": _r(v.nav_discount_pct(ltp, nav)),
    }

    lockin_expiry = company.promoter_lockin_expiry or metrics.get("promoter_lockin_expiry")
    flags = v.health_flags(company.sector_code, metrics_for_flags, paid_up_capital=paid_up, ltp=ltp, today=today)
    promoter_pct = (company.promoter_shares / company.listed_shares * 100
                    if company.promoter_shares and company.listed_shares else None)

    return {
        "profile": {**asdict(company), "promoter_pct": _r(promoter_pct)},
        "price": price,
        "quote": live,
        "financials": [asdict(q) for q in quarters],
        "sector_metrics": stored,
        "flags": [asdict(f) for f in flags],
        "valuation": valuation,
        "dividends": [asdict(d) for d in await repo.dividends(company.id)],
        "lockin": {"expiry": lockin_expiry, "days_left": v.lockin_countdown(lockin_expiry, today)},
    }
