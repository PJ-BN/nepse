from datetime import date, timedelta
from decimal import Decimal as D

import pytest

from nepse.application.auth.ports import EmailTaken, User
from nepse.application.auth.use_cases import InvalidCredentials, InvalidToken, login, register, user_id_from_token
from nepse.application.portfolio.ports import Quote, StoredTxn
from nepse.application.portfolio.use_cases import UnknownSymbol, get_holdings, get_realized_pnl, record_txn
from nepse.domain.portfolio.wacc import Txn, TxnType

SECRET = "x" * 32


class FakeUsers:
    def __init__(self):
        self.rows: dict[str, User] = {}

    async def get_by_email(self, email):
        return self.rows.get(email)

    async def add(self, email, password_hash):
        if email in self.rows:
            raise EmailTaken(email)
        self.rows[email] = User(len(self.rows) + 1, email, password_hash)
        return len(self.rows)


class FakeTxns:
    def __init__(self):
        self.rows: list[tuple[int, StoredTxn]] = []

    async def symbol_exists(self, symbol):
        return symbol in {"NABIL", "HIDCL"}

    async def list_for_user(self, user_id):
        return sorted((t for u, t in self.rows if u == user_id), key=lambda t: (t.txn.on, t.id))

    async def add(self, user_id, symbol, txn, fees):
        self.rows.append((user_id, StoredTxn(len(self.rows) + 1, symbol, txn, fees)))
        return len(self.rows)


class FakePrices:
    async def quotes(self, symbols):
        return {"NABIL": Quote(D(700), D(690))}


async def test_register_login_token_roundtrip():
    users = FakeUsers()
    uid = await register(users, " A@B.com ", "s3cret-pass")
    with pytest.raises(EmailTaken):
        await register(users, "a@b.com", "other-pass")
    token = await login(users, "a@b.COM", "s3cret-pass", SECRET, timedelta(minutes=5))
    assert user_id_from_token(token, SECRET) == uid
    with pytest.raises(InvalidCredentials):
        await login(users, "a@b.com", "wrong", SECRET, timedelta(minutes=5))
    with pytest.raises(InvalidCredentials):
        await login(users, "nobody@b.com", "s3cret-pass", SECRET, timedelta(minutes=5))
    with pytest.raises(InvalidToken):
        user_id_from_token(token, "y" * 32)
    expired = await login(users, "a@b.com", "s3cret-pass", SECRET, timedelta(seconds=-1))
    with pytest.raises(InvalidToken):
        user_id_from_token(expired, SECRET)


async def test_holdings_and_realized():
    repo = FakeTxns()
    await record_txn(repo, 1, "nabil", Txn(TxnType.BUY, 100, D(500), date(2024, 6, 1)))
    await record_txn(repo, 1, "NABIL", Txn(TxnType.BUY, 100, D(600), date(2025, 9, 1)))
    sell = await record_txn(repo, 1, "NABIL", Txn(TxnType.SELL, 150, D(800), date(2025, 10, 1)))
    assert sell.fees["cgt"] == "2205.07"
    await record_txn(repo, 1, "HIDCL", Txn(TxnType.IPO, 10, D(100), date(2025, 1, 1)))
    await record_txn(repo, 2, "NABIL", Txn(TxnType.BUY, 5, D(500), date(2025, 1, 1)))  # other user

    holdings = {h.symbol: h for h in await get_holdings(repo, FakePrices(), 1)}
    nabil = holdings["NABIL"]
    assert (nabil.qty, nabil.wacc, nabil.ltp) == (50, D("552.22"), D(700))
    assert nabil.unrealized_pnl == D("7388.88")  # 35,000 - 27,611.125 total cost
    assert nabil.day_change == D("500.00")
    assert holdings["HIDCL"].ltp is None and holdings["HIDCL"].wacc == D(100)

    [realized] = await get_realized_pnl(repo, 1)
    assert realized.result.realized_pnl == D("37027.43")


async def test_record_rejects_unknown_symbol_and_backdated_oversell():
    repo = FakeTxns()
    with pytest.raises(UnknownSymbol):
        await record_txn(repo, 1, "NOPE", Txn(TxnType.BUY, 1, D(100), date(2025, 1, 1)))
    await record_txn(repo, 1, "NABIL", Txn(TxnType.BUY, 10, D(500), date(2025, 1, 1)))
    await record_txn(repo, 1, "NABIL", Txn(TxnType.SELL, 10, D(500), date(2025, 3, 1)))
    with pytest.raises(ValueError):  # selling before the March sell leaves that sell short
        await record_txn(repo, 1, "NABIL", Txn(TxnType.SELL, 5, D(500), date(2025, 2, 1)))
