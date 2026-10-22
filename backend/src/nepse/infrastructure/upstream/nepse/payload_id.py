"""POST-body `id` that nepalstock.com.np requires on some endpoints, ported from its main.js bundle.

The site computes: base = DUMMY[market_id] + market_id + 2*day, then adds salt[k]*day - salt[k-1], where k (1 or 3)
depends on base % 10 with a threshold that differs per endpoint. `day` is the day of month in NPT and
`market_id` is the `id` from GET nots/nepse-data/market-open. Salts are the 5 integers from authenticate/prove.
"""
from enum import Enum

# Static 100-integer array from main.js (`this.dummyData=[...]`). check_upstream.py fails if it changes.
DUMMY = (
    147, 117, 239, 143, 157, 312, 161, 612, 512, 804, 411, 527, 170, 511, 421, 667, 764, 621, 301,
    106, 133, 793, 411, 511, 312, 423, 344, 346, 653, 758, 342, 222, 236, 811, 711, 611, 122, 447,
    128, 199, 183, 135, 489, 703, 800, 745, 152, 863, 134, 211, 142, 564, 375, 793, 212, 153, 138,
    153, 648, 611, 151, 649, 318, 143, 117, 756, 119, 141, 717, 113, 112, 146, 162, 660, 693, 261,
    362, 354, 251, 641, 157, 178, 631, 192, 734, 445, 192, 883, 187, 122, 591, 731, 852, 384, 565,
    596, 451, 772, 624, 691
)


class PayloadKind(Enum):
    # (threshold, salt index when base % 10 < threshold, salt index otherwise)
    FLOORSHEET = (4, 1, 3)
    TODAY_PRICE = (5, 1, 3)
    INDEX_GRAPH = (5, 3, 1)


def payload_id(kind: PayloadKind, market_id: int, salts: list[int], day: int) -> int:
    threshold, below, above = kind.value
    base = DUMMY[market_id] + market_id + 2 * day
    k = below if base % 10 < threshold else above
    return base + salts[k] * day - salts[k - 1]
