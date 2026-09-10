# 서우 놀이터 Android Kiosk — Y700 완전잠금

이 Android 앱은 `https://pswgames.github.io/`를 WebView로 실행하고, 웹의 부모 PIN 화면잠금과 Android Device Owner + Lock Task를 연결한다.

## 목표 동작

Y700이 Device Owner 준비 상태일 때 앱에서 화면잠금을 ON 하면 다음 정책을 함께 적용한다.

- 이 앱만 Lock Task 허용
- `LOCK_TASK_FEATURE_NONE` 적용
- 홈 / 최근 앱 / 알림·알림창 등 Lock Task SystemUI 기능 비활성
- 상태바 비활성
- 오버레이 창 생성 제한
- 앱 내부 외부 이동 차단
- 화면 유지

화면잠금 OFF 시 `stopLockTask()`를 실행하고 상태바 제한과 오버레이 제한을 해제한다.

Device Owner가 아닌 상태에서는 보안상 애매한 일반 화면 고정으로 대체하지 않고, 앱의 화면잠금 ON 자체를 거부한다.

## Y700 최초 1회 설정

이번 빌드는 개발 중에도 되돌릴 수 있도록 `android:testOnly="true"`인 테스트 APK다. 따라서 APK 설치와 Device Owner 등록에 ADB가 필요하다.

1. Y700 개발자 옵션에서 USB 디버깅을 켠다.
2. 가능하면 Device Owner 등록 전에 Google/Lenovo 계정, 보조 사용자, 업무 프로필을 제거한다.
3. Windows에 Android Platform Tools를 준비한다.
4. `Y700_SETUP_COMPLETE_LOCK.bat`와 APK를 같은 폴더에 놓고 실행한다.
5. Device Owner 등록이 성공하면 앱을 열고 부모 비밀번호를 설정한 뒤 화면잠금을 ON 한다.

수동 명령은 다음과 같다.

```bat
adb uninstall io.github.pswgames.seowoo
adb install -t -r seowoo-playground-y700-kiosk-v1.1.1-test.apk
adb shell dpm set-device-owner io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver
adb shell am start -n io.github.pswgames.seowoo/.MainActivity
```

`set-device-owner`가 계정/사용자/기기 프로비저닝 상태 때문에 거부되면 앱이 임의로 우회할 수 없다. 계정과 추가 사용자를 제거한 뒤 다시 시도하고, 그래도 Android가 거부하는 기기 상태라면 공장 초기화 후 Device Owner를 프로비저닝해야 할 수 있다.

## 테스트 Device Owner 해제

이번 APK는 testOnly이므로 다음 명령으로 Device Owner를 해제할 수 있다.

```bat
adb shell dpm remove-active-admin --user 0 io.github.pswgames.seowoo/.SeowooDeviceAdminReceiver
```

또는 `Y700_REMOVE_DEVICE_OWNER.bat`를 사용한다. Device Owner를 해제한 뒤 앱을 제거하거나 다음 테스트 APK를 설치하면 된다.

## 주의

GitHub Actions debug APK는 장기 배포용 고정 서명판이 아니다. Y700 실기기 동작이 확인되면 최종 단계에서 고정된 개인 서명키로 release APK를 만들어 장기 업데이트 가능한 형태로 전환하는 것이 맞다.
