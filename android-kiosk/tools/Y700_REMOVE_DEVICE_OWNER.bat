@echo off
setlocal
chcp 65001 >nul
set "ADMIN=io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver"

echo.
echo [서우 놀이터 Y700 테스트 Device Owner 해제]
where adb >nul 2>nul
if errorlevel 1 (
  echo [오류] adb를 찾을 수 없습니다.
  pause
  exit /b 1
)

adb devices
echo.
echo Y700가 연결되고 USB 디버깅이 허용되어 있는지 확인하세요.
pause

adb shell dpm remove-active-admin --user 0 %ADMIN%
if errorlevel 1 (
  echo.
  echo 해제에 실패했습니다. 현재 설치된 앱이 testOnly 빌드인지, Device Owner인지 확인해 주세요.
  pause
  exit /b 2
)

echo.
echo Device Owner 해제 완료. 이제 앱 삭제/업데이트 테스트가 가능합니다.
pause
