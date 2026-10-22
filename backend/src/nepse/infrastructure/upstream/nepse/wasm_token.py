"""Pure-Python port of nepalstock.com.np's token de-obfuscation (no headless browser).

GET /api/authenticate/prove returns accessToken/refreshToken with 5 junk characters injected, plus salt1..salt5.
The site's css.wasm exports cdx/rdx/bdx/ndx/mdx, which map salts to the junk-character positions; main.js
slices those characters out. The salt argument orders below are copied verbatim from main.js.
"""
from pathlib import Path

from wasmtime import Engine, Func, Instance, Module, Store

WASM_PATH = Path(__file__).with_name("css.wasm")

_ACCESS_ORDER = (
    ("cdx", (1, 2, 3, 4, 5)),
    ("rdx", (1, 2, 4, 3, 5)),
    ("bdx", (1, 2, 4, 3, 5)),
    ("ndx", (1, 2, 4, 3, 5)),
    ("mdx", (1, 2, 4, 3, 5)),
)
_REFRESH_ORDER = (
    ("cdx", (2, 1, 3, 5, 4)),
    ("rdx", (2, 1, 3, 4, 5)),
    ("bdx", (2, 1, 4, 3, 5)),
    ("ndx", (2, 1, 4, 3, 5)),
    ("mdx", (2, 1, 4, 3, 5)),
)


def strip_positions(token: str, cuts: list[int]) -> str:
    """Mirror of main.js: slice(0,c1) + slice(c1+1,c2) + ... + slice(c5+1)."""
    pieces, start = [], 0
    for cut in cuts:
        pieces.append(token[start:cut])
        start = cut + 1
    pieces.append(token[start:])
    return "".join(pieces)


class TokenSolver:
    """Loads css.wasm once; `solve` is cheap and safe to call per token refresh."""

    def __init__(self, wasm: bytes | None = None) -> None:
        engine = Engine()
        self._store = Store(engine)
        module = Module(engine, wasm if wasm is not None else WASM_PATH.read_bytes())
        # The module imports a console.log shim (imports.imported_func); a no-op satisfies it.
        imports = [Func(self._store, imp.type, lambda *_: None) for imp in module.imports]
        self._exports = Instance(self._store, module, imports).exports(self._store)

    def _cuts(self, order, salts: list[int]) -> list[int]:
        return [self._exports[name](self._store, *(salts[i - 1] for i in args)) for name, args in order]

    def solve(self, prove: dict) -> tuple[str, str]:
        """(access_token, refresh_token) from an authenticate/prove response."""
        salts = salts_of(prove)
        return (
            strip_positions(prove["accessToken"], self._cuts(_ACCESS_ORDER, salts)),
            strip_positions(prove["refreshToken"], self._cuts(_REFRESH_ORDER, salts)),
        )


def salts_of(prove: dict) -> list[int]:
    return [int(prove[f"salt{i}"]) for i in range(1, 6)]
