import pytest
from fastapi import HTTPException

from nepse.presentation.api.v1.company import guard_dev


def test_refresh_guard(monkeypatch):
    monkeypatch.delenv("NEPSE_DEV_ENDPOINTS", raising=False)
    monkeypatch.delenv("NEPSE_ADMIN_TOKEN", raising=False)
    with pytest.raises(HTTPException) as e:  # off by default
        guard_dev(None)
    assert e.value.status_code == 404
    monkeypatch.setenv("NEPSE_DEV_ENDPOINTS", "1")
    guard_dev(None)  # enabled, no token configured
    monkeypatch.setenv("NEPSE_ADMIN_TOKEN", "s3cret")
    with pytest.raises(HTTPException) as e:
        guard_dev("wrong")
    assert e.value.status_code == 403
    guard_dev("s3cret")
