from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from nepse.application.portfolio import use_cases
from nepse.domain.calendar.npt import now_npt
from nepse.domain.portfolio.fees_tax import InvestorType, Lot, buy_cost, sell_proceeds
from nepse.domain.portfolio.wacc import Txn
from nepse.infrastructure.cache.redis_client import redis
from nepse.infrastructure.db.models_portfolio import LivePriceSource, SqlTxnRepo
from nepse.presentation.api.schemas.portfolio import (
    CalcIn, HoldingOut, RealizedOut, RealizedSummaryOut, TxnIn, TxnOut,
)
from nepse.presentation.api.v1.auth import current_user_id, get_session

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


def _txn_out(t) -> TxnOut:
    return TxnOut(id=t.id, symbol=t.symbol, txn_type=t.txn.kind, qty=t.txn.qty, rate=t.txn.rate,
                  txn_date=t.txn.on, fees=t.fees)


@router.post("/txns", status_code=201, response_model=TxnOut)
async def add_txn(
    body: TxnIn, user_id: int = Depends(current_user_id), session: AsyncSession = Depends(get_session),
) -> TxnOut:
    txn = Txn(body.txn_type, body.qty, body.rate, body.txn_date)
    try:
        stored = await use_cases.record_txn(SqlTxnRepo(session), user_id, body.symbol, txn, body.investor_type)
    except use_cases.UnknownSymbol as exc:
        raise HTTPException(422, f"unknown symbol {exc}") from None
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    return _txn_out(stored)


@router.get("/txns", response_model=list[TxnOut])
async def list_txns(user_id: int = Depends(current_user_id), session: AsyncSession = Depends(get_session)):
    return [_txn_out(t) for t in await SqlTxnRepo(session).list_for_user(user_id)]


@router.get("/holdings", response_model=list[HoldingOut])
async def holdings(
    investor_type: InvestorType = InvestorType.INDIVIDUAL,
    user_id: int = Depends(current_user_id), session: AsyncSession = Depends(get_session),
):
    rows = await use_cases.get_holdings(SqlTxnRepo(session), LivePriceSource(session, redis), user_id, investor_type)
    return [HoldingOut.model_validate(h, from_attributes=True) for h in rows]


@router.get("/realized", response_model=RealizedSummaryOut)
async def realized(
    investor_type: InvestorType = InvestorType.INDIVIDUAL,
    user_id: int = Depends(current_user_id), session: AsyncSession = Depends(get_session),
) -> RealizedSummaryOut:
    sells = await use_cases.get_realized_pnl(SqlTxnRepo(session), user_id, investor_type)
    out = [RealizedOut(symbol=s.symbol, sell_date=s.on, qty=s.qty, rate=s.rate, amount=s.result.fees.amount,
                       total_fees=s.result.fees.total, cost_basis=s.result.cost_basis, cgt=s.result.cgt,
                       net_receivable=s.result.net_receivable, realized_pnl=s.result.realized_pnl) for s in sells]
    return RealizedSummaryOut(
        total_realized_pnl=sum((r.realized_pnl for r in out), Decimal(0)),
        total_cgt=sum((r.cgt for r in out), Decimal(0)), sells=out,
    )


@router.post("/calc")
async def calc(body: CalcIn) -> dict:
    """Stateless buy/sell calculator; no login."""
    if body.side == "BUY":
        c = buy_cost(body.qty, body.rate)
        return {"amount": c.fees.amount, "brokerage": c.fees.brokerage, "sebon_fee": c.fees.sebon_fee,
                "dp_charge": c.fees.dp_charge, "total_fees": c.fees.total, "total_payable": c.total_payable,
                "cost_per_share": round(c.cost_per_share, 4)}
    bought = buy_cost(body.qty, body.buy_rate, body.buy_date)
    sell_date = body.sell_date or now_npt().date()
    r = sell_proceeds([Lot(body.qty, bought.cost_per_share, body.buy_date)], body.qty, body.rate, sell_date,
                      body.investor_type)
    return {**use_cases.sell_dict(r), "buy_total_payable": bought.total_payable,
            "holding_days": (sell_date - body.buy_date).days, "long_term": r.sales[0].long_term,
            "cgt_rate": r.sales[0].cgt_rate}
