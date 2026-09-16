@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "PKG=io.github.pswgames.seowoo.kiosk"
set "ADMIN=io.github.pswgames.seowoo.kiosk/io.github.pswgames.seowoo.SeowooDeviceAdminReceiver"
set "MAIN=io.github.pswgames.seowoo.kiosk/io.github.pswgames.seowoo.MainActivity"
set "APK=%~dp0seowoo-playground-y700-kiosk-v1.2.2-test.apk"
set "STATE=%~dp0seowoo_child_user_id.txt"
set "ADB=%~dp0adb.exe"
if not exist "%ADB%" set "ADB=adb"
set "TMPBASE=%TEMP%\seowoo_y700_%RANDOM%_%RANDOM%"

echo.
echo ============================================================
echo  SEOWOO PLAYGROUND Y700 STRICT LOCK - NO RESET SETUP v1.2.2
echo ============================================================
echo This setup creates a separate Android user named Seowoo.
echo It does NOT factory-reset the tablet or remove the parent account.
echo The kiosk app uses a separate package ID and will not replace the parent Seowoo app.
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
  echo seowoo-playground-y700-kiosk-v1.2.2-test.apk
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
for /f "tokens=4" %%A in ('"%ADB%" shell pm get-max-users 2^>nul') do set "MAX_USERS=%%A"
if not defined MAX_USERS (
  echo [ERROR] Could not read multi-user capability.
  echo Run manually: adb shell pm get-max-users
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

"%ADB%" shell dpm list-owners > "%TMPBASE%_owners.txt" 2>nul
findstr /i /c:"%PKG%" "%TMPBASE%_owners.txt" >nul 2>nul
if not errorlevel 1 (
  del "%TMPBASE%_owners.txt" >nul 2>nul
  echo [STOP] This kiosk package is already registered as a device/profile owner.
  echo No automatic removal was attempted.
  pause
  exit /b 5
)
del "%TMPBASE%_owners.txt" >nul 2>nul

"%ADB%" shell pm list packages --user !OWNER_USER! %PKG% > "%TMPBASE%_packages.txt" 2>nul
findstr /i /c:"%PKG%" "%TMPBASE%_packages.txt" >nul 2>nul
if not errorlevel 1 (
  del "%TMPBASE%_packages.txt" >nul 2>nul
  echo [STOP] The isolated kiosk package already exists in the parent user.
  echo It will not be replaced automatically.
  pause
  exit /b 5
)
del "%TMPBASE%_packages.txt" >nul 2>nul

echo.
echo PRE-FLIGHT PASSED.
echo The existing parent Seowoo package is allowed because this kiosk uses:
echo   %PKG%
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
"%ADB%" shell pm create-user "Seowoo" > "%TMPBASE%_create.txt" 2>&1
for /f "tokens=1,2,3,4,5" %%A in (%TMPBASE%_create.txt) do (
  if /i "%%A %%B %%C %%D"=="Success: created user id" set "CHILD_USER=%%E"
)
if not defined CHILD_USER (
  type "%TMPBASE%_create.txt"
  del "%TMPBASE%_create.txt" >nul 2>nul
  goto :create_failed
)
del "%TMPBASE%_create.txt" >nul 2>nul
>"%STATE%" echo OWNER_USER=!OWNER_USER!
>>"%STATE%" echo CHILD_USER=!CHILD_USER!
echo Created Seowoo user ID: !CHILD_USER!

echo [3/8] Starting Seowoo user...
"%ADB%" shell am start-user -w !CHILD_USER!
if errorlevel 1 goto :rollback

echo [4/8] Installing isolated kiosk APK only for Seowoo user...
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
"%ADB%" shell am start --user !CHILD_USER! -n %MAIN%
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
del "%TMPBASE%_create.txt" >nul 2>nul
echo Rollback finished. Parent-user data was not deleted by this script.
pause
exit /b 7
