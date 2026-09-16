@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ADB=%~dp0adb.exe"
if not exist "%ADB%" set "ADB=adb"

echo.
echo ============================================================
echo  Y700 NO-RESET SEOWOO USER SUPPORT CHECK
echo ============================================================
echo This check is read-only. It will not install, delete, or create anything.
echo.

"%ADB%" version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] adb.exe was not found.
  echo Put this BAT file in the same folder as adb.exe and run it again.
  pause
  exit /b 1
)

"%ADB%" get-state >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No authorized Android device is connected.
  echo Check USB debugging and run: adb devices
  pause
  exit /b 1
)

echo [OK] ADB device connected.
"%ADB%" devices
echo.

set "MODEL="
set "ANDROID="
set "BUILD="
set "CURRENT_USER="
set "MAX_USERS="

for /f "delims=" %%A in ('"%ADB%" shell getprop ro.product.model 2^>nul') do set "MODEL=%%A"
for /f "delims=" %%A in ('"%ADB%" shell getprop ro.build.version.release 2^>nul') do set "ANDROID=%%A"
for /f "delims=" %%A in ('"%ADB%" shell getprop ro.build.version.incremental 2^>nul') do set "BUILD=%%A"
for /f "delims=" %%A in ('"%ADB%" shell am get-current-user 2^>nul') do set "CURRENT_USER=%%A"
for /f "tokens=4" %%A in ('"%ADB%" shell pm get-max-users 2^>nul') do set "MAX_USERS=%%A"

echo Model: !MODEL!
echo Android: !ANDROID!
echo Build: !BUILD!
echo Current user ID: !CURRENT_USER!
echo Maximum users: !MAX_USERS!
echo.
"%ADB%" shell pm list users

echo.
if not defined MAX_USERS (
  echo [UNKNOWN] Could not read Android multi-user capability.
  echo Run this manually to verify: adb shell pm get-max-users
  pause
  exit /b 2
)

for /f "delims=0123456789" %%A in ("!MAX_USERS!") do set "NONNUM=%%A"
if defined NONNUM (
  echo [UNKNOWN] Unexpected max-user value: !MAX_USERS!
  pause
  exit /b 2
)

if !MAX_USERS! LEQ 1 (
  echo [NOT SUPPORTED] This firmware does not allow a secondary-user setup.
  echo No changes were made to the tablet.
  pause
  exit /b 3
)

echo [PASS] This firmware reports support for secondary users.
echo Next step: Y700_SETUP_COMPLETE_LOCK.bat
pause
