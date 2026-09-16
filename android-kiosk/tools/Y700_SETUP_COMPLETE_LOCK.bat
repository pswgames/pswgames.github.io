@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PKG=io.github.pswgames.seowoo"
set "ADMIN=io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver"
set "APK=%~dp0seowoo-playground-y700-kiosk-v1.2.1-test.apk"
set "STATE=%~dp0seowoo_child_user_id.txt"
set "ADB=%~dp0adb.exe"
if not exist "%ADB%" set "ADB=adb"

echo.
echo ============================================================
echo  SEOWOO PLAYGROUND Y700 STRICT LOCK - NO RESET SETUP
 echo ============================================================
echo This setup creates a separate Android user named Seowoo.
echo It does NOT factory-reset the tablet or remove the parent account.
echo.

"%ADB%" version >nul 2>nul
if errorlevel 1 (
  echo [ERROR] adb.exe was not found.
  echo Put this BAT file in the same folder as adb.exe and run it again.
  pause
  exit /b 1
)

if not exist "%APK%" (
  echo [ERROR] Required APK was not found in this folder:
  echo seowoo-playground-y700-kiosk-v1.2.1-test.apk
  pause
  exit /b 1
)

if exist "%STATE%" (
  echo [STOP] A previous Seowoo user state file already exists:
  type "%STATE%"
  echo Run Y700_REMOVE_SEOWOO_USER.bat before starting a new setup.
  pause
  exit /b 2
)

echo [1/8] Checking authorized ADB connection...
"%ADB%" get-state >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No authorized Android device is connected.
  echo Check USB debugging and run: adb devices
  pause
  exit /b 3
)
"%ADB%" devices

set "OWNER_USER="
for /f "delims=" %%A in ('"%ADB%" shell am get-current-user 2^>nul') do set "OWNER_USER=%%A"
if not defined OWNER_USER (
  echo [ERROR] Could not read the current parent Android user ID.
  pause
  exit /b 3
)
echo Parent Android user ID: !OWNER_USER!

set "MAX_USERS="
for /f "tokens=4" %%A in ('"%ADB%" shell pm get-max-users 2^>nul ^| findstr /i "Maximum supported users"') do set "MAX_USERS=%%A"
if not defined MAX_USERS (
  echo [ERROR] Could not read multi-user capability.
  pause
  exit /b 3
)
echo Maximum supported users: !MAX_USERS!
if !MAX_USERS! LEQ 1 (
  echo [STOP] This firmware does not support the secondary-user method.
  echo No tablet data was changed.
  pause
  exit /b 4
)

"%ADB%" shell dpm list-owners 2>nul | findstr /i "%PKG%" >nul
if not errorlevel 1 (
  echo [STOP] A Seowoo device/profile owner is already registered.
  echo No automatic removal was attempted.
  pause
  exit /b 5
)

"%ADB%" shell pm list packages --user !OWNER_USER! %PKG% 2>nul | findstr /i "%PKG%" >nul
if not errorlevel 1 (
  echo [STOP] The native Seowoo kiosk package already exists in the parent user.
  echo To protect parent-user app data, this script will not uninstall or replace it.
  pause
  exit /b 5
)

echo.
echo PRE-FLIGHT PASSED.
echo The next step will create ONE new Android user named Seowoo.
echo Parent Google/Lenovo accounts, games, purchases, and app data will not be deleted.
choice /c YN /n /m "Continue with Seowoo user creation? [Y/N]: "
if errorlevel 2 (
  echo Cancelled. No changes were made.
  exit /b 0
)

echo.
echo [2/8] Creating Seowoo secondary user...
set "CHILD_USER="
for /f "tokens=5" %%A in ('"%ADB%" shell pm create-user "Seowoo" 2^>nul ^| findstr /c:"Success: created user id"') do set "CHILD_USER=%%A"
if not defined CHILD_USER goto :create_failed
>"%STATE%" echo OWNER_USER=!OWNER_USER!
>>"%STATE%" echo CHILD_USER=!CHILD_USER!
echo Created Seowoo user ID: !CHILD_USER!

echo [3/8] Starting Seowoo user...
"%ADB%" shell am start-user -w !CHILD_USER!
if errorlevel 1 goto :rollback

echo [4/8] Installing kiosk APK only for Seowoo user...
"%ADB%" install --user !CHILD_USER! -t "%APK%"
if errorlevel 1 goto :rollback

echo [5/8] Registering Profile Owner for Seowoo user...
"%ADB%" shell dpm set-profile-owner --user !CHILD_USER! %ADMIN%
if errorlevel 1 goto :rollback

echo Profile/Device owner status:
"%ADB%" shell dpm list-owners

echo [6/8] Switching to Seowoo user...
"%ADB%" shell am switch-user !CHILD_USER!
if errorlevel 1 goto :rollback_after_switch
timeout /t 3 /nobreak >nul

echo [7/8] Launching Seowoo Playground...
"%ADB%" shell am start --user !CHILD_USER! -n %PKG%/.MainActivity
if errorlevel 1 goto :rollback_after_switch

echo [8/8] Setup command sequence completed.
echo.
echo ============================================================
echo  SETUP COMPLETE - DEVICE TEST REQUIRED
 echo ============================================================
echo 1. On the tablet, set a 4-8 digit parent PIN in Seowoo Playground.
echo 2. Turn Screen Lock ON.
echo 3. Test Home, Recents, notification shade, and edge gestures.
echo 4. Turn Screen Lock OFF using the parent PIN.
echo 5. Confirm you can return to the original parent user.
echo.
echo Keep Y700_REMOVE_SEOWOO_USER.bat for rollback.
pause
exit /b 0

:create_failed
echo.
echo [FAILED] Android refused to create the Seowoo secondary user.
echo No parent-user data was changed.
pause
exit /b 6

:rollback_after_switch
"%ADB%" shell am switch-user !OWNER_USER! >nul 2>nul

:rollback
echo.
echo [ROLLBACK] Setup did not complete. Removing only the new Seowoo user...
"%ADB%" shell am switch-user !OWNER_USER! >nul 2>nul
timeout /t 2 /nobreak >nul
if defined CHILD_USER "%ADB%" shell pm remove-user !CHILD_USER! >nul 2>nul
del "%STATE%" >nul 2>nul
echo Rollback finished. Parent-user data was not deleted by this script.
pause
exit /b 7
