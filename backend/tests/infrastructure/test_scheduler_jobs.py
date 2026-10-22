import inspect
from datetime import datetime, time

import pytest

from nepse.domain.calendar.npt import NPT
from nepse.infrastructure.scheduler import jobs
from nepse.infrastructure.scheduler.jobs import DailyJob, build_scheduler

SUN_THU = "sun,mon,tue,wed,thu"


def fields(job) -> dict[str, str]:
    return {f.name: str(f) for f in job.trigger.fields if not f.is_default}


async def noop():
    return None


@pytest.fixture
def scheduler():
    daily = [DailyJob("a", time(16, 0), noop), DailyJob("b", time(19, 30), noop)]
    return build_scheduler(None, None, None, noop, daily)


def by_id(s):
    return {j.id: j for j in s.get_jobs()}


def test_all_jobs_registered(scheduler):
    assert set(by_id(scheduler)) == {"live_poll", "eod", "screener", "a", "b", "announcements", "seed_snapshot"}
    assert str(scheduler.timezone) == "Asia/Kathmandu"


def test_trading_hour_jobs_run_sun_thu_npt(scheduler):
    jobs_ = by_id(scheduler)
    live = fields(jobs_["live_poll"])
    assert (live["hour"], live["second"]) == ("10-15", "*/20")
    eod = fields(jobs_["eod"])
    assert (eod["hour"], eod["minute"]) == ("15", "15")
    scr = fields(jobs_["screener"])
    assert (scr["hour"], scr["minute"]) == ("10-15", "*")
    for name in ("live_poll", "eod", "screener"):
        assert fields(jobs_[name])["day_of_week"] == SUN_THU
        assert str(jobs_[name].trigger.timezone) == "Asia/Kathmandu"


def test_daily_jobs_use_their_own_time(scheduler):
    jobs_ = by_id(scheduler)
    for name, (h, m) in {"a": (16, 0), "b": (19, 30)}.items():
        f = fields(jobs_[name])
        assert (f["hour"], f["minute"], f["day_of_week"]) == (str(h), str(m), SUN_THU)


def test_announcements_hourly_all_week(scheduler):
    assert fields(by_id(scheduler)["announcements"]) == {"minute": "7"}  # every day, minute 7 of every hour


def test_worker_daily_schedule_matches_plan():
    from nepse.workers import main

    src = inspect.getsource(main)
    for job_id, at in [("eod_crosscheck", "15, 30"), ("fundamentals_merolagani", "16, 0"),
                       ("fundamentals_nepalipaisa", "17, 0"), ("macro_nrb", "18, 0"), ("macro_sebon", "19, 0")]:
        assert f'DailyJob("{job_id}", time({at})' in src


async def test_guarded_job_swallows_errors():
    async def boom():
        raise RuntimeError("x")

    await jobs._guarded(DailyJob("boom", time(1, 0), boom))()  # must not raise


async def test_poll_skips_outside_session_window(monkeypatch):
    class Source:
        def __getattr__(self, name):
            raise AssertionError("source must not be touched outside the polling window")

    poll = by_id(build_scheduler(Source(), None, None, noop))["live_poll"].func
    for hour, minute in [(9, 0), (15, 6)]:
        monkeypatch.setattr(jobs, "now_npt", lambda h=hour, m=minute: datetime(2025, 1, 5, h, m, tzinfo=NPT))
        await poll()


async def test_poll_runs_inside_window_and_survives_failure(monkeypatch):
    calls = []

    async def failing(source, store, now):
        calls.append(now)
        raise RuntimeError("upstream down")

    monkeypatch.setattr(jobs, "poll_live_market", failing)
    monkeypatch.setattr(jobs, "now_npt", lambda: datetime(2025, 1, 5, 11, 0, tzinfo=NPT))
    await by_id(build_scheduler(None, None, None, noop))["live_poll"].func()
    assert len(calls) == 1


async def test_screener_refresh_only_in_session(monkeypatch):
    refreshed = []

    async def refresh():
        refreshed.append(1)

    fn = by_id(build_scheduler(None, None, None, refresh))["screener"].func
    for hour in (12, 16):
        monkeypatch.setattr(jobs, "now_npt", lambda h=hour: datetime(2025, 1, 5, h, 0, tzinfo=NPT))
        await fn()
    assert refreshed == [1]
