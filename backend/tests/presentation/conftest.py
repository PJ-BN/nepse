import httpx
import pytest

from nepse.main import app


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def override():
    """override(dependency, fake): swap a FastAPI dependency for the test's duration."""
    def _set(dep, fake):
        async def provider():
            yield fake
        app.dependency_overrides[dep] = provider
    yield _set
    app.dependency_overrides.clear()
