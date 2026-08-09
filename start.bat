@echo off
setlocal

cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"
set "VENV_DIR=%PROJECT_ROOT%\.venv"
set "API_DIR=%PROJECT_ROOT%\apps\api"
set "WEB_DIR=%PROJECT_ROOT%\apps\web"

if not exist "%VENV_DIR%\Scripts\python.exe" (
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3 -m venv "%VENV_DIR%"
  ) else (
    where python >nul 2>nul
    if errorlevel 1 (
      echo 未找到 Python 3.11 或更高版本，请先安装 Python。
      exit /b 1
    )
    python -m venv "%VENV_DIR%"
  )
)

"%VENV_DIR%\Scripts\python.exe" -m pip install --disable-pip-version-check -e "%API_DIR%"
if errorlevel 1 exit /b 1

echo API:  http://127.0.0.1:8000
echo Web:  http://127.0.0.1:3000

start "玄序 API" cmd /k ""%VENV_DIR%\Scripts\python.exe" -m uvicorn app.main:app --app-dir "%API_DIR%" --host 127.0.0.1 --port 8000"

cd /d "%WEB_DIR%"
set "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1"

where pnpm >nul 2>nul
if not errorlevel 1 (
  if not exist node_modules pnpm install
  pnpm run dev
  exit /b %errorlevel%
)

where npm >nul 2>nul
if not errorlevel 1 (
  if not exist node_modules npm install
  npm run dev
  exit /b %errorlevel%
)

echo 未找到 Node.js 包管理器，请安装 Node.js 22 和 pnpm。
exit /b 1
