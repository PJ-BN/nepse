from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.screener.filter_ast import OUTPUT_COLUMNS, FilterError
from nepse.application.screener.run_screener import PRESETS, run_screener, to_csv
from nepse.infrastructure.db.repositories.screener import SqlScreenerRepository
from nepse.infrastructure.db.session import SessionLocal
from nepse.presentation.api.schemas.screener import PresetOut, ScreenerRunRequest, ScreenerRunResponse

router = APIRouter(prefix="/api/v1/screener", tags=["screener"])


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


@router.post("/run", response_model=ScreenerRunResponse)
async def run(req: ScreenerRunRequest, session: AsyncSession = Depends(get_session)):
    flt, sort = req.filter, req.sort
    if req.preset is not None:
        if req.preset not in PRESETS:
            raise HTTPException(404, f"unknown preset {req.preset!r}")
        flt, sort = PRESETS[req.preset]["filter"], PRESETS[req.preset]["sort"]
    try:
        rows = await run_screener(SqlScreenerRepository(session), flt, sort, req.limit)
    except FilterError as exc:
        raise HTTPException(422, str(exc)) from exc
    if req.format == "csv":
        return Response(to_csv(rows), media_type="text/csv",
                        headers={"Content-Disposition": 'attachment; filename="screener.csv"'})
    return {"columns": list(OUTPUT_COLUMNS), "count": len(rows), "rows": rows}


@router.get("/presets", response_model=list[PresetOut])
async def presets():
    return [{"id": k, **v} for k, v in PRESETS.items()]
