@echo off
chcp 65001 >nul
REM 一鍵啟動 Strategy Board 開發環境:backend(:8000)+ frontend(:5173)
REM   用法:雙擊本檔,或在專案根目錄 cmd 執行 start.bat
REM   backend / frontend 各自開新視窗,關閉視窗即停止該 server

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

REM ── 前置檢查 ──────────────────────────────────────────────
if not exist "%BACKEND%\.venv\" (
  echo [X] 找不到 %BACKEND%\.venv
  echo     先建立: cd backend ^&^& python -m venv .venv ^&^& .venv\Scripts\activate ^&^& pip install -r requirements.txt
  exit /b 1
)
if not exist "%FRONTEND%\node_modules\" (
  echo [X] 找不到 %FRONTEND%\node_modules
  echo     先安裝: cd frontend ^&^& pnpm install
  exit /b 1
)

REM ── port 占用檢查(避免與既有 server 衝突)──────────────────
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul && (
  echo [X] port 8000 已被占用,請先關閉占用的程式
  exit /b 1
)
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul && (
  echo [X] port 5173 已被占用,請先關閉占用的程式
  exit /b 1
)

REM ── 啟動 backend(新視窗,關閉視窗即停止)────────────────────
echo [-] 啟動 backend  http://localhost:8000
start "SB backend" /d "%BACKEND%" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

REM ── 啟動 frontend(新視窗)─────────────────────────────────
echo [-] 啟動 frontend http://localhost:5173
start "SB frontend" /d "%FRONTEND%" cmd /k "pnpm dev"

REM ── 等 frontend ready 後自動開啟瀏覽器(逾時仍開,讓瀏覽器自行重試)──
set "URL=http://localhost:5173"
echo [-] 等待 frontend 啟動後開啟瀏覽器...
for /l %%i in (1,1,40) do (
  timeout /t 1 /nobreak >nul
  curl -s -o nul "%URL%" >nul 2>&1 && goto :open_browser
)
:open_browser
start "" "%URL%"

echo.
echo Strategy Board 已啟動(backend / frontend 各自獨立視窗)
echo   backend  : http://localhost:8000
echo   frontend : http://localhost:5173
echo   停止:關閉對應視窗即可
endlocal
