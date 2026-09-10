# 서우 놀이터 Android Kiosk

이 Android 앱은 기존 `https://pswgames.github.io/`를 WebView로 실행하고, 웹의 부모 비밀번호 화면잠금과 Android의 `startLockTask()` / `stopLockTask()`를 연결한다.

## 두 가지 잠금 수준

### 1. 일반 사용 — 화면 고정(Screen pinning)

기기 설정에서 **화면 고정/App pinning**을 켜고, **고정 해제 전에 기기 PIN/패턴/비밀번호 요구**도 켠다.

그 다음 이 APK에서 서우 놀이터를 열고 웹 화면잠금을 ON 하면 Android 화면 고정이 시작된다. 최초 1회는 Android 시스템 확인창이 나올 수 있다. 웹 화면잠금을 부모 비밀번호로 OFF 하면 앱이 `stopLockTask()`를 호출해 정상 태블릿 모드로 돌아간다.

이 모드는 별도 기기 초기화 없이 쓰기 쉽고, 아이가 시스템의 고정 해제 제스처를 알아도 기기 잠금 비밀번호 없이는 다른 앱으로 나가기 어렵다.

### 2. 전용기기 — 진짜 Lock Task

홈/최근 앱/알림 등 시스템 UI까지 가장 강하게 제한하려면 앱을 **Device Owner**로 프로비저닝한다. 이 경우 앱이 자신을 Lock Task 허용목록에 넣고 `LOCK_TASK_FEATURE_NONE`을 적용한다.

Device Owner 설정은 Android 보안 정책상 이미 개인 설정이 끝난 기기에서는 거부될 수 있으며, 보통 초기화된/관리 가능한 기기가 필요하다.

예시 ADB 절차(기기 상태에 따라 초기화가 필요할 수 있음):

```bash
adb install -r app-debug.apk
adb shell dpm set-device-owner io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver
```

이후 앱 안의 부모 비밀번호 잠금 ON/OFF가 Android Lock Task 시작/종료와 함께 동작한다.

## 빌드

GitHub Actions의 `Build Android Kiosk APK` 워크플로가 debug APK를 빌드하고 artifact로 업로드한다.
