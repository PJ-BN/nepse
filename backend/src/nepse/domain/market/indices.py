MAIN_INDICES = ("NEPSE", "FLOAT", "SENSITIVE", "SENSFLOAT")

# sector code -> (name, sub-index code)
SECTORS = {
    "BANKING": ("Commercial Banks", "BANKING"),
    "DEVBANK": ("Development Banks", "DEVBANK"),
    "FINANCE": ("Finance", "FINANCE"),
    "MICROFIN": ("Microfinance", "MICROFIN"),
    "LIFEINSU": ("Life Insurance", "LIFEINSU"),
    "NONLIFE": ("Non-Life Insurance", "NONLIFE"),
    "HYDRO": ("Hydropower", "HYDRO"),
    "MANUFAC": ("Manufacturing & Processing", "MANUFAC"),
    "HOTEL": ("Hotels & Tourism", "HOTEL"),
    "TRADING": ("Trading", "TRADING"),
    "INVEST": ("Investment", "INVEST"),
    "OTHERS": ("Others", "OTHERS"),
    "MUTUAL": ("Mutual Fund", "MUTUAL"),
}

ALL_INDICES = MAIN_INDICES + tuple(idx for _, idx in SECTORS.values())  # 17
