@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "STATE=%~dp0seowoo_child_user_id.txt"
set "ADB=%~dp0adb.exe"
if not exist "%ADB%" set "ADB=adb"

echo.
echo ============================================================
echo  SEOWOO Y700 ROLLBACK - REMOVE ONLY SEOWOO USER
echo ============================================================
echo This rollback removes only the secondary Android user recorded by setup.
echo It does not factory-reset the tablet or delete the parent account.
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
  pause
  exit /b 1
)

if not exist "%STATE%" (
  echo [ERROR] seowoo_child_user_id.txt was not found.
  echo No automatic user removal will be attempted without the saved IDs.
  echo Use adb shell pm list users to inspect users manually if needed.
  pause
  exit /b 2
)

set "OWNER_USER="
set "CHILD_USER="
for /f "usebackq tokens=1,2 delims==" %%A in ("%STATE%") do (
  if /i "%%A"=="OWNER_USER" set "OWNER_USER=%%B"
  if /i "%%A"=="CHILD_USER" set "CHILD_USER=%%B"
)

if not defined OWNER_USER (
  echo [ERROR] Parent user ID is missing from the state file.
  pause
  exit /b 3
)
if not defined CHILD_USER (
  echo [ERROR] Seowoo user ID is missing from the state file.
  pause
  exit /b 3
)

echo Parent user ID: !OWNER_USER!
echo Seowoo user ID to remove: !CHILD_USER!
echo.
"%ADB%" shell pm list users

echo.
choice /c YN /n /m "Remove ONLY the recorded Seowoo user? [Y/N]: "
if errorlevel 2 (
  echo Cancelled. No changes were made.
  exit /b 0
)

echo [1/3] Switching back to the parent user...
"%ADB%" shell am switch-user !OWNER_USER!
if errorlevel 1 (
  echo [ERROR] Could not switch to the parent user. Nothing was removed.
  pause
  exit /b 4
)
timeout /t 2 /nobreak >nul

echo [2/3] Removing the recorded Seowoo secondary user...
"%ADB%" shell pm remove-user !CHILD_USER!
if errorlevel 1 (
  echo [ERROR] Android did not remove the Seowoo user.
  echo The local state file was kept for recovery.
  pause
  exit /b 5
)

echo [3/3] Removing the local setup state file...
del "%STATE%" >nul 2>nul

echo.
echo ROLLBACK COMPLETE.
echo The parent Android user was not removed by this script.
pause
