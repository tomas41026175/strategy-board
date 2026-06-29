"""Walk-forward 滾動驗證:每段樣本內最佳化單參數 → 樣本外驗證 → 拼接。

設計決策
--------
IS 最佳化指標
  主指標:Sharpe(交易筆數 ≥ MIN_TRADES)
  備援指標:Expectancy(交易過少時,Sharpe 統計失真)

WFE(Walk-Forward Efficiency)
  定義:OOS_CAGR / IS_CAGR_avg
  其中 IS_CAGR_avg = 各視窗以最佳參數跑 IS 回測的 CAGR 算術平均。
  IS_CAGR_avg 接近 0(±1e-6)時 WFE = 0(避免除零)。
  WFE > 1 表示 OOS 優於 IS,< 1 表示衰減,典型健康值約 0.4~0.8。

OOS Decay
  定義:IS_CAGR_avg - OOS_CAGR(正值代表衰減,負值代表 OOS 優於 IS)。

OOS 權益拼接
  各視窗 OOS equity 轉成日報酬序列後 concat 再 cumprod,從 1.0 起。
  推導:run_backtest 產出 equity = (1 + strat_ret).cumprod()
       ⟹ equity.iloc[0] - 1 == strat_ret[0]
       ⟹ equity.pct_change() == strat_ret[1:]
  拼接後各段接合點不跳階。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..config import PERIODS_PER_YEAR
from ..data.loader import load_ohlcv
from ..engine.backtest import run_backtest
from ..engine.metrics import _cagr, _sharpe
from ..engine.split import SplitConfig, make_windows
from ..service import resolve_params
from ..strategies.base import get_registry

# IS 交易筆數低於此值時,Sharpe 統計失真 → 改用 Expectancy 備援
MIN_TRADES = 5


def _is_score(equity: pd.Series, trades: list) -> float:
    """計算 IS 最佳化得分。

    交易 ≥ MIN_TRADES → Sharpe;不足 → Expectancy 備援;無交易 → -999。
    """
    n = len(trades)
    if n == 0:
        return -999.0
    if n < MIN_TRADES:
        return float(np.mean([t.pnl for t in trades]))
    return _sharpe(equity, PERIODS_PER_YEAR)


def _equity_to_daily_rets(equity: pd.Series) -> pd.Series:
    """將 equity 序列轉成日報酬序列,供跨視窗拼接。

    run_backtest 的 equity 為 (1 + strat_ret).cumprod():
      r[0]   = equity.iloc[0] - 1  (= strat_ret[0])
      r[i>0] = equity.pct_change() (= strat_ret[i])
    """
    r = equity.pct_change()
    r.iloc[0] = float(equity.iloc[0]) - 1.0
    return r


def run_walk_forward(
    strategy_id: str,
    base_params: dict,
    symbol: str,
    start: str,
    end: str,
    cost: float,
    cfg: SplitConfig,
    opt_param: str,
    opt_values: list[float],
) -> dict:
    """Walk-forward 滾動驗證。

    Parameters
    ----------
    strategy_id : str
        已在 registry 註冊的策略 class 名稱(如 "MaCross")。
    base_params : dict
        除 opt_param 外的固定參數;未提供的走策略預設值。
    symbol : str
        商品代號(如 "TX")。
    start / end : str
        回測區間(YYYY-MM-DD)。
    cost : float
        單邊成本比率。
    cfg : SplitConfig
        視窗設定;mode 應為 "wf_rolling" 或 "wf_anchored"。
    opt_param : str
        待最佳化的參數名稱(需存在於策略的 params 宣告中)。
    opt_values : list[float]
        opt_param 的候選值列表(逐一嘗試,取 IS 得分最高者)。

    Returns
    -------
    dict 包含:
      equity             [{time, value}]  拼接後的 OOS 權益曲線(起點 1.0)
      trades             [dict]           所有 OOS 段的交易記錄
      win_rate_by_window [float]          各 OOS 視窗勝率
      wfe                float            Walk-Forward Efficiency (OOS/IS CAGR)
      oos_decay          float            IS_CAGR_avg - OOS_CAGR(正值=衰減)
      windows            [dict]           各視窗詳情
      n_windows          int              視窗總數
      data_source        str              資料來源
    """
    registry = get_registry()
    if strategy_id not in registry:
        raise KeyError(f"未知策略:{strategy_id}")
    if not opt_values:
        raise ValueError("opt_values 不可為空列表。")

    strategy = registry[strategy_id]()

    # ── 資料 + 視窗 ────────────────────────────────────────────────────────
    df, source = load_ohlcv(symbol, start, end)
    windows = make_windows(df, cfg)
    if not windows:
        raise ValueError(
            f"make_windows 回傳 0 視窗。"
            f"資料長度={len(df)}, train_bars={cfg.train_bars}, "
            f"test_bars={cfg.test_bars}"
        )

    # ── 逐視窗最佳化 + OOS 驗證 ────────────────────────────────────────────
    oos_rets_list: list[pd.Series] = []
    all_oos_trades: list = []
    win_rate_by_window: list[float] = []
    windows_info: list[dict] = []
    is_cagr_list: list[float] = []

    for train_range, test_range in windows:
        df_train = df.iloc[list(train_range)]
        df_test = df.iloc[list(test_range)]

        # ── IS 最佳化:選 IS 得分最高的候選參數值 ──────────────────────────
        best_score: float = -np.inf
        best_v: float = opt_values[0]
        best_is_result = None

        for v in opt_values:
            params = {**resolve_params(strategy_id, base_params), opt_param: v}
            sigs = strategy.generate(df_train, params)
            result = run_backtest(df_train, sigs, cost_one_way=cost)
            score = _is_score(result.equity, result.trades)
            if score > best_score:
                best_score = score
                best_v = v
                best_is_result = result

        # 記錄 IS CAGR(以最佳參數);用於計算 WFE
        is_cagr_list.append(_cagr(best_is_result.equity, PERIODS_PER_YEAR))

        # ── OOS:以最佳參數跑樣本外 ────────────────────────────────────────
        oos_params = {**resolve_params(strategy_id, base_params), opt_param: best_v}
        oos_sigs = strategy.generate(df_test, oos_params)
        oos_result = run_backtest(df_test, oos_sigs, cost_one_way=cost)

        # 收集日報酬(拼接用)
        oos_rets_list.append(_equity_to_daily_rets(oos_result.equity))
        all_oos_trades.extend(oos_result.trades)

        # 視窗 OOS 勝率
        n_oos_trades = len(oos_result.trades)
        wr = (
            sum(1 for t in oos_result.trades if t.pnl > 0) / n_oos_trades
            if n_oos_trades > 0
            else 0.0
        )
        win_rate_by_window.append(round(wr, 4))

        windows_info.append(
            {
                "start": str(df_test.index[0].date()),
                "end": str(df_test.index[-1].date()),
                "param": opt_param,
                "value": best_v,
                "win_rate": round(wr, 4),
            }
        )

    # ── 拼接 OOS 權益(從 1.0 起,各段接合點不跳階) ─────────────────────────
    all_rets = pd.concat(oos_rets_list)
    oos_equity = (1 + all_rets).cumprod()

    # ── WFE / OOS Decay ───────────────────────────────────────────────────
    oos_cagr = _cagr(oos_equity, PERIODS_PER_YEAR)
    is_cagr_avg = float(np.mean(is_cagr_list))

    # WFE = OOS_CAGR / IS_CAGR_avg;分母接近 0 時回傳 0
    wfe = 0.0 if abs(is_cagr_avg) < 1e-6 else oos_cagr / is_cagr_avg
    # OOS Decay:正值代表衰減,負值代表 OOS 優於 IS
    oos_decay = is_cagr_avg - oos_cagr

    # ── 組回應 ────────────────────────────────────────────────────────────
    equity_points = [
        {"time": str(idx.date()), "value": round(float(v), 6)}
        for idx, v in oos_equity.items()
        if not np.isnan(float(v))
    ]

    return {
        "equity": equity_points,
        "trades": [t.__dict__ for t in all_oos_trades],
        "win_rate_by_window": win_rate_by_window,
        "wfe": round(float(wfe), 4),
        "oos_decay": round(float(oos_decay), 4),
        "windows": windows_info,
        "n_windows": len(windows),
        "data_source": source,
    }
