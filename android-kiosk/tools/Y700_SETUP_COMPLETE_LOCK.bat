@echo off
setlocal
chcp 65001 >nul
set "PKG=io.github.pswgames.seowoo"
set "ADMIN=io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver"
set "APK=%~dp0seowoo-playground-y700-kiosk-v1.1.1-test.apk"

echo.
echo [서우 놀이터 Y700 완전잠금 설정]
echo 이 작업은 Y700을 초기화하지 않습니다.
echo 단, Device Owner 등록 전 Y700에서 Google/Lenovo 계정, 보조 사용자, 업무 프로필이 없어야 합니다.
echo.

where adb >nul 2>nul
if errorlevel 1 (
  echo [오류] adb를 찾을 수 없습니다. Android Platform Tools를 설치하고 adb를 PATH에 추가해 주세요.
  pause
  exit /b 1
)

if not exist "%APK%" (
  echo [오류] 배치파일과 같은 폴더에 다음 APK를 넣어 주세요:
  echo seowoo-playground-y700-kiosk-v1.1.1-test.apk
  pause
  exit /b 1
)

echo [1/5] 연결된 기기 확인
adb devices

echo.
echo Y700 화면에 USB 디버깅 허용 창이 뜨면 허용한 뒤 아무 키나 누르세요.
pause >nul

echo [2/5] 이전 테스트 앱 제거
adb uninstall %PKG% >nul 2>nul

echo [3/5] 새 Y700 완전잠금 앱 설치
adb install -t -r "%APK%"
if errorlevel 1 goto :failed

echo [4/5] Device Owner 등록
adb shell dpm set-device-owner %ADMIN%
if errorlevel 1 goto :owner_failed

echo [5/5] 서우 놀이터 실행
adb shell am start -n %PKG%/.MainActivity

echo.
echo 완료. 앱의 화면잠금 버튼에서 부모 비밀번호를 입력해 ON 하면
 echo 홈/최근 앱/알림·제어센터를 제한하는 Android Lock Task가 시작됩니다.
echo.
pause
exit /b 0

:owner_failed
echo.
echo [Device Owner 등록 실패]
echo Y700에 Google/Lenovo 계정, 보조 사용자 또는 업무 프로필이 남아 있거나
 echo 기기가 이미 Device Owner 설정이 불가능한 상태일 수 있습니다.
echo 자동으로 초기화하지 않았습니다. 계정/사용자 제거 후 다시 실행해 보세요.
echo 그래도 실패하면 공장 초기화 후 최초 설정 단계에서 다시 진행해야 할 수 있습니다.
echo.
pause
exit /b 2

:failed
echo.
echo APK 설치에 실패했습니다. USB 디버깅 허용 상태와 APK 파일을 확인해 주세요.
pause
exit /b 3
