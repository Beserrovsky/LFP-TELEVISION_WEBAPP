@echo off
setlocal

echo Checking for uv...

where uv >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo uv is already installed.
    goto start_server
)

echo uv not found. Installing...

powershell -ExecutionPolicy Bypass -Command ^
    "irm https://astral.sh/uv/install.ps1 | iex"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to install uv.
    pause
    exit /b 1
)

:: Add uv's default install location for current session
set "PATH=%USERPROFILE%\.local\bin;%PATH%"

where uv >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo uv installation completed but uv is not available in this shell.
    echo Please close and reopen the terminal, then run this script again.
    pause
    exit /b 1
)

:start_server

echo.
echo Ensuring Python is available via uv...
uv python install 3.13

if %ERRORLEVEL% NEQ 0 (
    echo Failed to install Python via uv.
    pause
    exit /b 1
)

echo.
echo Starting HTTP server on port 8000...
echo Open http://localhost:8000
echo.

uv run --python 3.13 python -m http.server 8000

pause