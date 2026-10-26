from datetime import date
from nepse.domain.news.analyzer import analyze_news, detect_category, detect_sector, extract_symbols


def test_extract_symbols_from_title_and_text():
    text = "Nabil Bank Limited (NABIL) declared 15% bonus share, while Everest Bank (EBL) announced AGM date."
    symbols = extract_symbols(text)
    assert "NABIL" in symbols
    assert "EBL" in symbols


def test_detect_category():
    assert detect_category("SEBON issues new circular on margin lending", "") == "regulatory"
    assert detect_category("Ministry of Finance clarifies capital gains tax rate", "") == "government"
    assert detect_category("Nabil Bank proposes 10% cash dividend", "") == "company"
    assert detect_category("Inflation moderates to 4.1% as forex reserves hit record high", "") == "macro"


def test_analyze_news_bullish_dividend():
    item = analyze_news(
        title="Nabil Bank proposed 12% bonus dividend for shareholders",
        summary="Board meeting declared 12% bonus and 3% cash dividend.",
        source="ShareSansar",
        source_url="https://example.com/nabil-div",
        published_on=date(2026, 10, 26),
    )
    assert item.impact_stance == "BULLISH"
    assert item.impact_score > 0
    assert "NABIL" in item.symbols
    assert "BUY BEFORE BOOK CLOSURE" in item.action_recommendation
    assert item.category == "company"


def test_analyze_news_bearish_npl():
    item = analyze_news(
        title="Bad loans spike across commercial banks as NPL rises sharply in Q1",
        summary="Stressed assets pressure bottom lines.",
        source="MeroLagani",
        source_url="https://example.com/npl-spike",
        published_on=date(2026, 10, 26),
    )
    assert item.impact_stance == "BEARISH"
    assert item.impact_score < 0
    assert "CAUTION" in item.action_recommendation
