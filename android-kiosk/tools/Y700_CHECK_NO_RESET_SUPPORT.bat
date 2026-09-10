@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

echo.
echo ============================================================
echo  Y700 무초기화 서우 전용 사용자 지원 확인
echo ============================================================
echo 이 검사는 기기에 아무것도 설치하거나 삭제하지 않습니다.
echo.

where adb >nul 2>nul
if errorlevel 1 (
  echo [오류] adb를 찾을 수 없습니다.
  pause
  exit /b 1
)

adb devices
echo.
echo Y700에서 USB 디버깅을 허용한 뒤 아무 키나 누르세요.
pause >nul

for /f "delims=" %%A in ('adb shell getprop ro.product.model 2^>nul') do set "MODEL=%%A"
for /f "delims=" %%A in ('adb shell getprop ro.build.version.release 2^>nul') do set "ANDROID=%%A"
for /f "delims=" %%A in ('adb shell getprop ro.build.version.incremental 2^>nul') do set "BUILD=%%A"
for /f "delims=" %%A in ('adb shell am get-current-user 2^>nul') do set "CURRENT_USER=%%A"
for /f "tokens=4" %%A in ('adb shell pm get-max-users 2^>nul ^| findstr /i "Maximum supported users"') do set "MAX_USERS=%%A"

echo 모델: !MODEL!
echo Android: !ANDROID!
echo 빌드: !BUILD!
echo 현재 사용자 ID: !CURRENT_USER!
echo 최대 사용자 수: !MAX_USERS!
echo.
adb shell pm list users

echo.
if not defined MAX_USERS (
  echo [판정 불가] 다중 사용자 정보를 읽지 못했습니다.
  exit /b 2
)
if !MAX_USERS! LEQ 1 (
  echo [미지원] 현재 펌웨어에서는 보조 사용자 방식이 비활성화되어 있습니다.
  echo 아무 변경도 하지 않았습니다.
  pause
  exit /b 3
)

echo [1차 지원] 현재 펌웨어가 보조 사용자를 허용하는 것으로 확인됩니다.
echo 다음 단계에서 Y700_SETUP_COMPLETE_LOCK.bat를 실행하면 새 Seowoo 사용자만 생성합니다.
echo 기존 Google 계정/게임 데이터에는 손대지 않습니다.
pause
