"""Rule-based news impact evaluator, symbol extractor, and category classifier.

Domain logic only: pure standard library, no external imports.
"""
from datetime import date
import re

from nepse.domain.news.entities import ImpactStance, NewsItem, SentimentLabel, TimeHorizon

# Common NEPSE ticker symbols and company name aliases
KNOWN_SYMBOLS = {
    "NABIL": ("NABIL", "Nabil Bank", "Commercial Banks"),
    "GBIME": ("GBIME", "Global IME Bank", "Commercial Banks"),
    "EBL": ("EBL", "Everest Bank", "Commercial Banks"),
    "NICA": ("NICA", "NIC Asia Bank", "Commercial Banks"),
    "SCB": ("SCB", "Standard Chartered Bank", "Commercial Banks"),
    "SANIMA": ("SANIMA", "Sanima Bank", "Commercial Banks"),
    "PCBL": ("PCBL", "Prime Commercial Bank", "Commercial Banks"),
    "PRVU": ("PRVU", "Prabhu Bank", "Commercial Banks"),
    "KBL": ("KBL", "Kumari Bank", "Commercial Banks"),
    "SBI": ("SBI", "Nepal SBI Bank", "Commercial Banks"),
    "ADBL": ("ADBL", "Agricultural Development Bank", "Commercial Banks"),
    "CZBIL": ("CZBIL", "Citizens Bank International", "Commercial Banks"),
    "NBL": ("NBL", "Nepal Bank", "Commercial Banks"),
    "CIT": ("CIT", "Citizen Investment Trust", "Investment"),
    "NRIC": ("NRIC", "Nepal Reinsurance Company", "Others"),
    "HRL": ("HRL", "Himalayan Reinsurance", "Others"),
    "CHCL": ("CHCL", "Chilime Hydropower", "Hydropower"),
    "SHIVM": ("SHIVM", "Shivam Cements", "Manufacturing & Processing"),
    "HDL": ("HDL", "Himalayan Distillery", "Manufacturing & Processing"),
    "UNL": ("UNL", "Unilever Nepal", "Manufacturing & Processing"),
    "NTC": ("NTC", "Nepal Telecom", "Others"),
    "HIDCL": ("HIDCL", "Hydroelectricity Investment & Development", "Investment"),
    "RADHI": ("RADHI", "Radhi Bidyut", "Hydropower"),
    "AHPC": ("AHPC", "Arun Valley Hydropower", "Hydropower"),
    "UPPER": ("UPPER", "Upper Tamakoshi Hydropower", "Hydropower"),
    "API": ("API", "Api Power", "Hydropower"),
    "MEN": ("MEN", "Mountain Energy Nepal", "Hydropower"),
    "JOSHI": ("JOSHI", "Joshi Hydropower", "Hydropower"),
    "NLIC": ("NLIC", "Nepal Life Insurance", "Life Insurance"),
    "LICN": ("LICN", "Life Insurance Corporation Nepal", "Life Insurance"),
    "NICL": ("NICL", "Nepal Insurance Company", "Non Life Insurance"),
    "IGI": ("IGI", "IGI Prudential Insurance", "Non Life Insurance"),
    "NLG": ("NLG", "NLG Insurance", "Non Life Insurance"),
    "CBBL": ("CBBL", "Chhimek Laghubitta", "Microfinance"),
    "DDBL": ("DDBL", "Deprosc Laghubitta", "Microfinance"),
    "SKBBL": ("SKBBL", "Sana Kisan Bikas Laghubitta", "Microfinance"),
    "MLBSL": ("MLBSL", "Mahila Laghubitta", "Microfinance"),
    "SHINE": ("SHINE", "Shine Resunga Development Bank", "Development Banks"),
    "MNBBL": ("MNBBL", "Muktinath Bikas Bank", "Development Banks"),
    "GBBL": ("GBBL", "Garima Bikas Bank", "Development Banks"),
    "JBBL": ("JBBL", "Jyoti Bikas Bank", "Development Banks"),
    "CFCL": ("CFCL", "Central Finance", "Finance"),
    "GFCL": ("GFCL", "Goodwill Finance", "Finance"),
    "MFIL": ("MFIL", "Manjushree Finance", "Finance"),
    "BBC": ("BBC", "Bishal Bazar Company", "Trading"),
    "STC": ("STC", "Salt Trading Corporation", "Trading"),
}

SECTOR_KEYWORDS = {
    "Commercial Banks": ["commercial bank", "banking", "class a bank", "bfi", "bfis"],
    "Development Banks": ["development bank", "class b bank"],
    "Finance": ["finance company", "class c"],
    "Microfinance": ["microfinance", "laghubitta", "class d"],
    "Hydropower": ["hydropower", "hydro", "power company", "megawatt", "mw", "electricity", "ppa"],
    "Life Insurance": ["life insurance", "beema"],
    "Non Life Insurance": ["non-life insurance", "general insurance"],
    "Manufacturing & Processing": ["cement", "distillery", "manufacturing", "processing"],
    "Investment": ["investment trust", "citizen investment", "hidcl"],
    "Others": ["telecom", "reinsurance", "re-insurance"],
}

# Regex patterns for symbols
_TICKER_RE = re.compile(r"\b([A-Z]{3,7})\b")

# Bullish / Positive cues
BULLISH_PATTERNS = [
    (re.compile(r"\b(bonus|dividend|rights?)\s*(\w+\s*){0,4}(declared|proposed|announced|approved)\b", re.I), 60, "BUY BEFORE BOOK CLOSURE / ACCUMULATE"),
    (re.compile(r"\b(declared|proposes?|proposed|announced|approved)\s*(\w+\s*){0,4}(bonus|dividend|cash dividend)\b", re.I), 60, "BUY BEFORE BOOK CLOSURE / ACCUMULATE"),
    (re.compile(r"\b(net\s*profit|earnings?)\s*(\w+\s*){0,3}(surges?|jumps?|up\s*by|rises?|grows?|increases?)\b", re.I), 55, "ACCUMULATE ON WEAKNESS"),
    (re.compile(r"\b(sebon|nrb)\s*(\w+\s*){0,3}(eases?|relaxes?|lifts?|removes?|hikes?)\s*(limit|cap|margin|provision)\b", re.I), 75, "AGGRESSIVE RISK-ON / EXPAND EXPOSURE"),
    (re.compile(r"\b(policy\s*rate|interest\s*rate)\s*(\w+\s*){0,3}(cut|lowered|slashed|decreased)\b", re.I), 65, "EXPAND EQUITY ALLOCATION"),
    (re.compile(r"\b(credit\s*rating|rating)\s*(\w+\s*){0,3}(upgraded?)\b", re.I), 45, "BUY & HOLD / QUALITY COMPOUNDER"),
    (re.compile(r"\b(ppa|power\s*purchase\s*agreement)\s*(\w+\s*){0,3}(opened|resumed|signed)\b", re.I), 50, "ACCUMULATE HYDRO SECTOR"),
    (re.compile(r"\b(allotment|ipo\s*result|approved\s*for\s*issue)\b", re.I), 30, "CHECK ALLOTMENT / MONITOR LISTING GAINS"),
    (re.compile(r"\b(tax\s*(relief|incentive|rebate|exemption))\b", re.I), 55, "BULLISH CATALYST / ACCUMULATE"),
]

# Bearish / Caution cues
BEARISH_PATTERNS = [
    (re.compile(r"\b(net\s*profit|earnings?)\s*(\w+\s*){0,3}(plunges?|drops?|falls?|down\s*by|declines?)\b", re.I), -55, "EXERCISE CAUTION / REDUCE EXPOSURE"),
    (re.compile(r"\b(npl|bad\s*loans?|non-performing)\s*(\w+\s*){0,3}(rises?|spikes?|increases?)\b", re.I), -50, "EXERCISE CAUTION / ROTATE TO QUALITY"),
    (re.compile(r"\b(cgt|capital\s*gains?\s*tax)\s*(\w+\s*){0,3}(hike|increased|raised)\b", re.I), -60, "DEFENSIVE STANCE / PROTECT GAINS"),
    (re.compile(r"\b(sebon|nrb)\s*(\w+\s*){0,3}(probes?|penalizes?|suspends?|action\s*against|restricts?)\b", re.I), -70, "EXIT / SIDELINE VULNERABLE COUNTERS"),
    (re.compile(r"\b(lock-?in\s*(expiry|ending|opens?))\b", re.I), -40, "WAIT FOR POST-LOCKIN SUPPLY ABSORPTION"),
    (re.compile(r"\b(dividend\s*(skipped|zero|passed|omitted))\b", re.I), -45, "PROFIT TAKE / AVOID"),
    (re.compile(r"\b(market\s*halted|circuit\s*breaker\s*down)\b", re.I), -65, "HOLD CASH / WAIT FOR STABILIZATION"),
]


def extract_symbols(text: str) -> list[str]:
    """Extract known NEPSE stock symbols mentioned in text."""
    found: set[str] = set()
    # 1. Match company names
    lower_text = text.lower()
    for sym, (_, name, _) in KNOWN_SYMBOLS.items():
        if name.lower() in lower_text:
            found.add(sym)

    # 2. Match ticker tokens
    tokens = _TICKER_RE.findall(text)
    for tok in tokens:
        if tok in KNOWN_SYMBOLS:
            found.add(tok)

    return sorted(found)


def detect_category(title: str, content: str) -> str:
    """Classify the article into an investment category."""
    text = f"{title} {content}".lower()

    if any(k in text for k in ["sebon", "nepal rastra bank", "nrb", "circular", "directive", "monetary policy",
                                "margin loan", "risk weight", "circuit breaker", "lock-in period"]):
        return "regulatory"
    if any(k in text for k in ["ministry of finance", "cabinet", "parliament", "tax", "cgt", "budget", "fiscal policy",
                                "government", "tariff"]):
        return "government"
    if any(k in text for k in ["dividend", "bonus share", "right share", "agm", "sgm", "book closure", "quarterly",
                                "financial report", "q1", "q2", "q3", "q4", "net profit", "ceo", "board meeting"]):
        return "company"
    if any(k in text for k in ["inflation", "cpi", "remittance", "forex", "foreign exchange", "liquidity",
                                "interbank", "gdp", "deposit rate"]):
        return "macro"
    if any(k in text for k in ["hydropower", "commercial banks", "insurance", "microfinance", "hotels", "cement"]):
        return "sector"

    return "company" if extract_symbols(title) else "market"


def detect_sector(symbols: list[str], text: str) -> str | None:
    """Determine the primary sector impacted."""
    if symbols:
        first_sym = symbols[0]
        if first_sym in KNOWN_SYMBOLS:
            return KNOWN_SYMBOLS[first_sym][2]

    lower_text = text.lower()
    for sector_name, keywords in SECTOR_KEYWORDS.items():
        if any(kw in lower_text for kw in keywords):
            return sector_name
    return None


def analyze_news(
    title: str,
    summary: str,
    content: str = "",
    source: str = "ShareSansar",
    source_url: str = "",
    published_on: date | None = None,
) -> NewsItem:
    """Evaluates impact, actionable guidance, and symbols for a news story."""
    full_text = f"{title}\n{summary}\n{content}"
    symbols = extract_symbols(full_text)
    category = detect_category(title, summary)
    sector = detect_sector(symbols, full_text)

    score = 0
    recommendation = "HOLD & MONITOR"
    action_detail = "Monitor price action and order book volume before committing new capital."
    time_horizon: TimeHorizon = "SHORT_TERM"

    # Evaluate bullish patterns
    for pattern, pts, rec in BULLISH_PATTERNS:
        if pattern.search(full_text):
            if pts > score:
                score = pts
                recommendation = rec
                time_horizon = "IMMEDIATE" if "BOOK CLOSURE" in rec or "ALLOTMENT" in rec else "SHORT_TERM"

    # Evaluate bearish patterns
    for pattern, pts, rec in BEARISH_PATTERNS:
        if pattern.search(full_text):
            if pts < score:
                score = pts
                recommendation = rec
                time_horizon = "IMMEDIATE" if "CIRCUIT" in rec else "SHORT_TERM"

    # Formulate detail statement based on sector / symbols
    sym_str = ", ".join(symbols) if symbols else (sector or "the market")
    if score >= 50:
        stance: ImpactStance = "BULLISH"
        sentiment: SentimentLabel = "POSITIVE"
        action_detail = (
            f"Strong positive catalyst for {sym_str}. Recommendation: {recommendation}. "
            "Consider phased accumulation on minor intraday pullbacks."
        )
    elif score > 15:
        stance = "BULLISH"
        sentiment = "POSITIVE"
        action_detail = (
            f"Favorable development for {sym_str}. Recommendation: {recommendation}. "
            "Track trading volumes for confirmation."
        )
    elif score <= -50:
        stance = "BEARISH"
        sentiment = "NEGATIVE"
        action_detail = (
            f"Adverse headwind affecting {sym_str}. Recommendation: {recommendation}. "
            "Avoid premature bottom-fishing until selling pressure subsides."
        )
    elif score < -15:
        stance = "BEARISH"
        sentiment = "NEGATIVE"
        action_detail = (
            f"Cautious signal for {sym_str}. Recommendation: {recommendation}. "
            "Keep tight stop-losses on existing positions."
        )
    else:
        stance = "NEUTRAL"
        sentiment = "NEUTRAL"
        action_detail = (
            f"Informational update regarding {sym_str}. Recommendation: HOLD & MONITOR. "
            "Assess secondary impacts on next quarter financial disclosures."
        )

    pub_date = published_on or date.today()

    return NewsItem(
        title=title.strip(),
        summary=summary.strip(),
        content=content.strip(),
        source=source,
        source_url=source_url,
        category=category,
        published_on=pub_date,
        symbols=symbols,
        sector=sector,
        impact_stance=stance,
        impact_score=score,
        action_recommendation=recommendation,
        action_detail=action_detail,
        sentiment_label=sentiment,
        time_horizon=time_horizon,
        confidence=85 if symbols else 75,
    )
