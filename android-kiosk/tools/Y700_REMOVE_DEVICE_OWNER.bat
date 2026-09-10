@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
set "STATE=%~dp0seowoo_child_user_id.txt"

echo.
echo ============================================================
echo  서우 놀이터 Y700 보조사용자 제거 / 원상복구
echo ============================================================
echo.
echo 이 작업은 Seowoo 보조 사용자만 제거합니다.
echo 부모 사용자의 Google 계정, 게임, 결제정보, 앱 데이터는 건드리지 않습니다.
echo.

where adb >nul 2>nul
if errorlevel 1 (
  echo [오류] adb를 찾을 수 없습니다.
  pause
  exit /b 1
)

if not exist "%STATE%" (
  echo [오류] seowoo_child_user_id.txt 기록을 찾을 수 없습니다.
  echo adb shell pm list users 로 Seowoo 사용자 ID를 확인한 뒤 수동 정리가 필요할 수 있습니다.
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
  echo [오류] 부모 사용자 ID 기록이 없습니다.
  pause
  exit /b 3
)
if not defined CHILD_USER (
  echo [오류] Seowoo 사용자 ID 기록이 없습니다.
  pause
  exit /b 3
)

echo 부모 사용자 ID: !OWNER_USER!
echo 제거할 Seowoo 사용자 ID: !CHILD_USER!
adb devices
pause

echo [1/3] 원래 부모 사용자로 복귀
adb shell am switch-user !OWNER_USER!
if errorlevel 1 (
  echo [오류] 부모 사용자 전환에 실패했습니다.
  pause
  exit /b 4
)
timeout /t 2 /nobreak >nul

echo [2/3] Seowoo 보조 사용자만 제거
adb shell pm remove-user !CHILD_USER!
if errorlevel 1 (
  echo [오류] Seowoo 사용자 제거에 실패했습니다.
  echo 부모 데이터에는 아무 변경도 하지 않았습니다.
  pause
  exit /b 5
)

echo [3/3] 로컬 기록 정리
del "%STATE%" >nul 2>nul

echo.
echo 원상복구 완료.
echo 기존 부모 사용자의 Google 계정/게임/결제 환경은 그대로입니다.
pause
