"""全域設定:資料快取路徑、回測預設成本。"""
from __future__ import annotations

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DATA_CACHE_DIR = BACKEND_ROOT / "data_cache"
DATA_CACHE_DIR.mkdir(exist_ok=True)

# 台股一般成本(來回):手續費 0.1425% + 期交稅(此處用保守估)+ 滑價估
# 期貨另計;此處為「比率型」成本,單邊估 0.05%,引擎會乘 2(來回)。
DEFAULT_COST_ONE_WAY = 0.0005

# 年化換算(日 K)
PERIODS_PER_YEAR = 252
