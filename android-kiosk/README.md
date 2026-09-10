# 서우 놀이터 Android Kiosk — Y700 무초기화 설계

## 목표

기존 Y700 Owner 사용자의 Google/Lenovo 계정, 게임, 결제정보, 게임 데이터를 그대로 보존하면서 서우에게 건넬 때만 서우 놀이터 밖으로 나가지 못하게 한다.

- 잠금 ON: 홈 / 최근 앱 / 알림·제어센터 등 System UI를 제한하는 Android Lock Task
- 잠금 OFF: 부모 비밀번호 확인 후 Lock Task 종료, 사용자 전환 화면 표시
- 부모는 Owner 사용자로 돌아가 기존 게임/Google 환경을 그대로 사용

## 핵심 구조

Device Owner 방식은 기존 개인용 Y700에서 계정 제거 또는 공장초기화를 요구할 수 있으므로 기본 경로에서 사용하지 않는다.

대신 새 **Seowoo 보조 사용자(secondary user)** 를 만들고, 그 사용자 안에서만 이 앱을 **Profile Owner** 로 지정한다. Android는 사용자별 계정과 앱 데이터를 분리하므로 Owner 사용자 데이터는 별도로 유지된다.

Android 9 이상에서는 Device Owner가 없는 기기에서 Profile Owner도 `setLockTaskPackages()`와 `setLockTaskFeatures()`를 사용해 자신의 사용자 안에서 Lock Task를 구성할 수 있다.

## 설치 순서

1. `Y700_CHECK_NO_RESET_SUPPORT.bat`
   - 기기 모델/Android/현재 사용자/최대 사용자 수를 조회한다.
   - 설치·삭제·사용자 생성 등 변경 작업은 하지 않는다.
2. 지원 판정이면 `Y700_SETUP_COMPLETE_LOCK.bat`
   - 새 `Seowoo` 보조 사용자 생성
   - 그 사용자에만 APK 설치
   - 그 사용자에서만 앱을 Profile Owner로 등록
   - Seowoo 사용자로 전환 후 앱 실행
3. 앱에서 부모용 4~8자리 PIN을 설정하고 화면잠금 ON

## 잠금 동작

Profile Owner 준비가 완료된 경우 앱은 자신을 Lock Task 허용 목록에 넣고 `LOCK_TASK_FEATURE_NONE`으로 구성한다. 잠금 ON에서 `startLockTask()`를 호출하며, 허용되지 않은 앱으로 이동하거나 홈/최근 앱/알림 UI를 사용하는 것을 시스템 수준에서 제한한다.

잠금 OFF에서 `stopLockTask()`를 호출한 뒤 Android 사용자 설정 화면을 열어 Owner 사용자로 돌아가기 쉽게 한다. 일부 Lenovo CN 펌웨어에서 사용자 UI가 숨겨진 경우 Android 설정 화면만 열릴 수 있으며, 그 경우 잠금이 풀린 뒤 시스템 사용자 전환 UI 또는 ADB를 이용해 Owner로 전환할 수 있다.

## 메인 사용자 데이터 안전성

설치 스크립트는 다음 작업을 하지 않는다.

- Google 계정 삭제
- Lenovo 계정 삭제
- 게임 앱 삭제
- 게임 데이터 초기화
- 결제정보 변경
- 공장초기화
- Device Owner 등록

설정 실패 시 새로 만든 Seowoo 사용자만 제거한다.

## 원상복구

`Y700_REMOVE_DEVICE_OWNER.bat` 파일명은 기존 배포와 호환을 위해 유지했지만, 현재 버전에서는 Device Owner를 제거하지 않는다. 저장된 `Seowoo` 사용자 ID를 읽어 Owner 사용자로 전환한 뒤 **Seowoo 보조 사용자만 삭제**한다.

## Y700 펌웨어 차이

Lenovo Y700은 세대/지역 ROM에 따라 설정 UI에서 다중 사용자 메뉴 노출 여부가 다를 수 있다. 따라서 UI 메뉴 존재 여부가 아니라 `adb shell pm get-max-users`와 실제 `pm create-user` 성공 여부를 기준으로 설치한다.

현재 펌웨어가 최대 사용자 1명으로 제한되어 있거나 `pm create-user`를 거부하면 이 무초기화 방식은 중단하며 기존 Owner 데이터에는 아무 변경도 하지 않는다.

## 빌드

GitHub Actions의 `Build Android Kiosk APK` 워크플로가 테스트용 APK를 빌드한다. 테스트판은 `android:testOnly="true"`로 유지해 보조 사용자 제거/재설정 실험을 쉽게 한다.
