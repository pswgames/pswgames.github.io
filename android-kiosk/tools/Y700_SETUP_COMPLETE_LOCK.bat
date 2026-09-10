@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
set "PKG=io.github.pswgames.seowoo"
set "ADMIN=io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver"
set "APK=%~dp0seowoo-playground-y700-kiosk-v1.2.0-test.apk"
set "STATE=%~dp0seowoo_child_user_id.txt"

echo.
echo ============================================================
echo  서우 놀이터 Y700 완전잠금 - 무초기화 보조사용자 설치
echo ============================================================
echo.
echo 이 방식은 현재 부모 사용자의 Google/Lenovo 계정,
echo 게임 앱, 결제정보, 게임 데이터를 삭제하거나 초기화하지 않습니다.
echo 새 보조 사용자 "Seowoo" 안에만 서우 놀이터를 설치합니다.
echo.

where adb >nul 2>nul
if errorlevel 1 (
  echo [오류] adb를 찾을 수 없습니다.
  echo Android Platform Tools를 설치한 뒤 이 파일을 다시 실행해 주세요.
  pause
  exit /b 1
)

if not exist "%APK%" (
  echo [오류] 배치파일과 같은 폴더에 아래 APK가 필요합니다.
  echo seowoo-playground-y700-kiosk-v1.2.0-test.apk
  pause
  exit /b 1
)

if exist "%STATE%" (
  echo [중단] 이전에 만든 Seowoo 사용자 기록이 있습니다.
  type "%STATE%"
  echo 먼저 Y700_REMOVE_DEVICE_OWNER.bat를 실행해 이전 테스트 사용자를 정리해 주세요.
  pause
  exit /b 2
)

echo [1/7] Y700 연결 확인
adb devices

echo.
echo 반드시 평소 게임과 Google 계정을 사용하는 부모 사용자 화면에서 실행하세요.
echo Y700 화면에 USB 디버깅 허용 창이 뜨면 허용해 주세요.
pause

set "OWNER_USER="
for /f "delims=" %%A in ('adb shell am get-current-user 2^>nul') do set "OWNER_USER=%%A"
if not defined OWNER_USER (
  echo [오류] 현재 부모 사용자 ID를 읽지 못했습니다.
  pause
  exit /b 3
)
echo 부모 Android 사용자 ID: !OWNER_USER!

set "MAX_USERS="
for /f "tokens=4" %%A in ('adb shell pm get-max-users 2^>nul ^| findstr /i "Maximum supported users"') do set "MAX_USERS=%%A"
if not defined MAX_USERS (
  echo [오류] Y700의 다중 사용자 지원 정보를 읽지 못했습니다.
  pause
  exit /b 3
)
echo 최대 사용자 수: !MAX_USERS!

if !MAX_USERS! LEQ 1 (
  echo.
  echo [중단] 현재 Y700 펌웨어에서 보조 사용자 생성이 비활성화되어 있습니다.
  echo 계정 삭제나 공장초기화는 하지 않았습니다.
  echo 이 경우 이 무초기화 방식은 사용할 수 없습니다.
  pause
  exit /b 4
)

echo.
echo [2/7] Seowoo 보조 사용자 생성
set "CHILD_USER="
for /f "tokens=5" %%A in ('adb shell pm create-user "Seowoo" 2^>nul ^| findstr /c:"Success: created user id"') do set "CHILD_USER=%%A"
if not defined CHILD_USER goto :create_failed

>"%STATE%" echo OWNER_USER=!OWNER_USER!
>>"%STATE%" echo CHILD_USER=!CHILD_USER!
echo 생성된 Seowoo 사용자 ID: !CHILD_USER!

echo [3/7] Seowoo 사용자에만 앱 설치
adb install --user !CHILD_USER! -t -r "%APK%"
if errorlevel 1 goto :rollback

echo [4/7] Seowoo 사용자 Profile Owner 등록
adb shell dpm set-profile-owner --user !CHILD_USER! %ADMIN%
if errorlevel 1 goto :rollback

echo [5/7] Profile Owner 확인
adb shell dpm list-owners

echo [6/7] Seowoo 사용자로 전환
adb shell am switch-user !CHILD_USER!
if errorlevel 1 goto :rollback_after_switch
timeout /t 3 /nobreak >nul

echo [7/7] 서우 놀이터 실행
adb shell am start --user !CHILD_USER! -n %PKG%/.MainActivity

echo.
echo ============================================================
echo  설치 완료
echo ============================================================
echo 서우 사용자에서 앱의 화면잠금 ON을 누르면
 echo Android Lock Task가 홈/최근앱/알림·제어센터를 제한합니다.
echo 잠금 OFF 후에는 사용자 전환/설정 화면이 열리며,
echo 원래 부모 사용자로 돌아가면 기존 게임/Google 계정 환경을 그대로 사용합니다.
echo.
echo 부모 사용자 데이터에는 변경을 가하지 않았습니다.
pause
exit /b 0

:create_failed
echo.
echo [실패] Seowoo 보조 사용자를 만들지 못했습니다.
echo 계정/게임 데이터는 건드리지 않았습니다.
pause
exit /b 5

:rollback_after_switch
adb shell am switch-user !OWNER_USER! >nul 2>nul

:rollback
echo.
echo [롤백] 설정이 완료되지 않아 새 Seowoo 사용자만 제거합니다.
adb shell am switch-user !OWNER_USER! >nul 2>nul
timeout /t 2 /nobreak >nul
if defined CHILD_USER adb shell pm remove-user !CHILD_USER! >nul 2>nul
del "%STATE%" >nul 2>nul
echo 기존 부모 사용자의 Google 계정/게임 데이터는 변경하지 않았습니다.
pause
exit /b 6
