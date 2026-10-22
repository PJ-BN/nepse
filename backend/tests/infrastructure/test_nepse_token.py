import json
from pathlib import Path

from nepse.infrastructure.upstream.nepse.payload_id import DUMMY, PayloadKind, payload_id
from nepse.infrastructure.upstream.nepse.wasm_token import TokenSolver, strip_positions

FIXTURES = Path(__file__).parent / "fixtures" / "nepse"


def test_solver_matches_token_nepse_accepted():
    # Recorded live: this prove response, de-obfuscated by the site's own JS logic, got HTTP 200 from NEPSE.
    recorded = json.loads((FIXTURES / "prove_solved.json").read_text())
    access, refresh = TokenSolver().solve(recorded["prove"])
    assert access == recorded["token"]
    assert len(access) == len(recorded["prove"]["accessToken"]) - 5
    assert len(refresh) == len(recorded["prove"]["refreshToken"]) - 5


def test_strip_positions_mirrors_js_slicing():
    assert strip_positions("aXbcXdeXfXghX", [1, 4, 7, 9, 12]) == "abcdefgh"


def test_payload_ids_nepse_accepted():
    # market_id/day/salts from the same live session; NEPSE answered 200 to both POSTs with these ids.
    salts = [98631, 13318, 19584, 94287, 75318]
    assert payload_id(PayloadKind.TODAY_PRICE, 80, salts, 22) == 194646
    assert payload_id(PayloadKind.FLOORSHEET, 80, salts, 22) == 194646


def test_payload_thresholds_differ_per_endpoint():
    salts = [10, 20, 30, 40, 50]
    market_id = next(i for i in range(100) if (DUMMY[i] + i + 2) % 10 == 4)  # base % 10 == 4 on day 1
    base = DUMMY[market_id] + market_id + 2
    assert payload_id(PayloadKind.FLOORSHEET, market_id, salts, 1) == base + 40 - 30  # 4 >= 4 -> salt[3]
    assert payload_id(PayloadKind.TODAY_PRICE, market_id, salts, 1) == base + 20 - 10  # 4 < 5 -> salt[1]
    assert payload_id(PayloadKind.INDEX_GRAPH, market_id, salts, 1) == base + 40 - 30  # 4 < 5 -> salt[3]
