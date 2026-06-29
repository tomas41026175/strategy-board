"""自動匯入本套件下所有策略模組,觸發 @register_strategy 註冊。

新增策略 = 在此目錄放一個 .py 檔並用 @register_strategy 標註,核心不動。
"""
from importlib import import_module
from pkgutil import iter_modules
from pathlib import Path

_pkg_path = Path(__file__).parent

for _mod in iter_modules([str(_pkg_path)]):
    if _mod.name != "base":
        import_module(f"{__name__}.{_mod.name}")
