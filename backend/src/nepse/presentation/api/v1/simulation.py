from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException

from nepse.application.simulation.run_simulation import (
    RuleError, SimulationError, SimulationRequest, UnknownSymbol, run_simulation,
)
from nepse.infrastructure.db.repositories.charting import SqlChartRepository
from nepse.infrastructure.db.session import SessionLocal
from nepse.presentation.api.schemas.simulation import SimulationRunRequest, SimulationRunResponse

router = APIRouter(prefix="/api/v1/simulation", tags=["simulation"])


async def bar_source() -> AsyncIterator[SqlChartRepository]:
    async with SessionLocal() as s:
        yield SqlChartRepository(s)


@router.post("/run", response_model=SimulationRunResponse)
async def run(req: SimulationRunRequest, repo: SqlChartRepository = Depends(bar_source)):
    try:
        return await run_simulation(repo, SimulationRequest(**req.model_dump()))
    except UnknownSymbol as exc:
        raise HTTPException(404, f"unknown symbol {req.symbol!r}") from exc
    except (RuleError, SimulationError) as exc:
        raise HTTPException(422, str(exc)) from exc
