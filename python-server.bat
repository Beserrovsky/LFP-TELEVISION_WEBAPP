@echo off
setlocal

echo Checking Python installation...

python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Python is already installed.
    goto start_server
)

echo Python not found. Downloading installer...

set PYTHON_INSTALLER=%TEMP%\python-installer.exe

powershell -Command ^
    "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.13.5/python-3.13.5-amd64.exe' -OutFile '%PYTHON_INSTALLER%'"

if not exist "%PYTHON_INSTALLER%" (
    echo Failed to download Python installer.
    pause
    exit /b 1
)

echo Installing Python...

"%PYTHON_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_test=0

if %ERRORLEVEL% NEQ 0 (
    echo Python installation failed.
    pause
    exit /b 1
)

echo Waiting for installation to finish...
timeout /t 10 /nobreak >nul

:: Refresh PATH for this session
set "PATH=%LocalAppData%\Programs\Python\Python313;%LocalAppData%\Programs\Python\Python313\Scripts;%PATH%"

:start_server

echo.
echo Starting HTTP server on port 8000...
echo Open http://localhost:8000
echo.

python -m http.server 8000

pause