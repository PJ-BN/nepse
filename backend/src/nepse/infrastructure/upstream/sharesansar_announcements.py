"""ShareSansar announcements: the first page of /announcement is server-rendered HTML, newest first."""
from datetime import datetime

import httpx
from bs4 import BeautifulSoup

from nepse.application.calendar.ports import Announcement
from nepse.infrastructure.upstream.sharesansar import BASE_URL, HEADERS

PATH = "announcement"


def parse_announcements(html: str) -> list[Announcement]:
    """An unparseable date raises (layout change): a silently empty feed would hide the breakage."""
    out = []
    for item in BeautifulSoup(html, "html.parser").select("div.featured-news-list"):
        link, day = item.select_one("a[title]"), item.select_one("span.text-org")
        if link is None or day is None:
            continue
        published = datetime.strptime(day.get_text(strip=True), "%A, %B %d, %Y").date()
        out.append(Announcement(title=link["title"].strip(), url=link["href"], published_on=published))
    return out


class ShareSansarAnnouncements:
    async def fetch(self) -> list[Announcement]:
        async with httpx.AsyncClient(base_url=BASE_URL, headers=HEADERS, timeout=60, follow_redirects=True) as http:
            res = await http.get(PATH)
            res.raise_for_status()
            return parse_announcements(res.text)
