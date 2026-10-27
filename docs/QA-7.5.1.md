# 7.5.1 사운드 보정 검수

2026-10-27. PR #16의 1d7d19d에서 이어 작업. 최초 확인 시 main e3ac6ed, 원격 head 변경 없음, 기존 두 CI 성공. 기존 풍선/가로 화면 기능과 Android 권한을 유지한다. 배포 결과는 GitHub의 해당 커밋 CI 및 Pages 실행 결과를 기준으로 확인한다.

## 보정 방식

원본 음원 825개, 음성 매핑, 음색/속도/문구, 사용자 저장 설정, 저장 키 `seowoo-play-v3`를 유지했다. 대표 안내 9개와 로컬 효과음 8개를 ffmpeg로 디코딩해 전체/활성 20ms RMS, sample peak, EBU R128 integrated LUFS, oversampled true peak와 길이를 분석했다. 활성 RMS는 최대 구간보다 20dB 이내인 구간으로 계산한다. 짧은 효과음의 LUFS는 참고값이다.

기준 안내 음성 활성 RMS 중앙값은 -15.459dBFS. 짧은 효과음은 기준보다 5dB, 문/물내림은 8dB, 연속 모터는 15dB 낮게 설정하고 source true peak -10dBFS와 증폭 +6dB 제한을 함께 적용했다. 짧은 합성음은 파형과 기존 주파수/길이를 유지하면서 attack/hold/release 및 진폭 차이를 조정했다. 음악 멜로디는 별도 채널에서 낮게 재생한다.

HTMLAudio, Web Audio 음성, oscillator, filtered noise, 모든 로컬 효과음과 음악이 공통 voice/sfx/music 경로를 사용한다. 기본 설정값은 바꾸지 않았다. 음성 중 효과음은 0.3배, 음악은 0.18배로 부드럽게 낮추고 종료/취소/오류 때 복원한다. 효과음은 75ms 같은 이벤트 중복 제한 및 최대 6개 동시 소스 제한. 합성음과 local media 모두 stop/이탈/숨김 때 정리하고 늦은 오류가 fallback을 다시 시작하지 못하도록 세대값으로 차단한다.

전체 믹스에 DynamicsCompressor를 적용하고 자동 makeup gain을 보상해 기존 안내 음성의 단독 체감 크기를 보존한다. Chromium 실제 렌더에서 대표 안내 활성 RMS -16.317 → -16.310dBFS, 전체 RMS -23.157 → -23.287dBFS. 목소리 전체를 낮추는 방식으로 해결하지 않았다. 이 수치는 스피커나 기기 음량을 측정한 값이 아니다.

Web Audio 미지원 시 HTMLAudio volume을 이용한 낮은 음량/ducking 경로를 제공하지만 1을 넘는 증폭과 공유 limiter는 보장하지 않는다. speechSynthesis는 고정 음원과 로컬 미디어 재시도 후 마지막 대체 수단이며 OS에 따라 음량/음색이 다르고 동일한 loudness를 보장할 수 없다.

## 대표 수치

기본 사용자 효과음 설정 0.9 적용, 단위 dBFS. 자세한 원시 분석과 파일별 gain은 `audio-calibration.json`, 생성 설정은 `js/audio-profile.js`.

| 소리 | 이전 활성 RMS | 보정 후 활성 RMS |
| --- | ---: | ---: |
| 도착음 | -18.67 | -23.37 |
| 버튼 | -24.65 | -21.37 |
| 물내림 | -28.11 | -24.37 |
| 모터 반복 | -30.27 | -31.37 |
| 풍선 합성음 | -40.67 | -21.39 |
| 블록 합성음 | -37.15 | -22.41 |
| 합성 음악 | -32.16 | -27.30 |

합성음 비교는 실제 앱 oscillator의 0.12초 대표음과 수정 전 envelope 재현 렌더. 음악은 0.45초 멜로디 음. 녹음 효과음 표는 source 분석과 gain 적용 예측이며 runtime limiter/ducking 전이다. 실제 렌더 연속 재생 sample peak -2.43dBFS, 안내+6개 효과음+합성음 중첩 sample peak -2.68dBFS로 해당 fixture에서 clipping 없음. 모든 가능한 조합에 대한 무왜곡 보장은 아니다.

**사람의 실제 청취와 Y700 스피커 측정은 하지 않았다.** 자동 디코딩/재생 진행, 수치 렌더와 제어 동작을 확인했다. 실기기에서 기기 볼륨과 화자의 지각 차이 확인이 남아 있다.

## 재현과 검증 범위

- `pnpm test`: 기존 전체 소스/행동 검수와 새 `audio-mixer.cjs`. audio.js 보존 해시는 요청된 사운드 변경에 맞춰 갱신했으며 elevator/panorama/audio 파일 매핑 해시는 유지한다. 기존 행동 검사는 삭제하지 않았다.
- `pnpm lint`, `pnpm build:offline`: 캐시 `seowoo-v7.5.1`, 음량 프로파일 포함 1,612개.
- `pnpm test:audio:browser`: 실제 사용자 클릭으로 시작한 효과음의 디코딩/시간 진행, 합성 출력/연속/중첩 렌더, 단독 안내 크기 보존, 음성 duck/복원, 0/OFF, 이탈 후 모든 소스 정리.
- 기존 `test:balloon:browser`, `test:layout`, `test:flows`, `test:rotation`, `test:model`, `test:offline` 유지. 최종 변경본의 GitHub CI에 오디오 Chromium/WebKit, 생성 캔버스 모델 스모크, Y700 비율 2종과 회전/풍선 검사를 추가했다.
- 로컬 Chromium: Y700 비율 1280×800/1024×640 각 110건, 드래그 회전, 풍선 수명 주기, 실제 서비스워커 오프라인 통과. 일반 Chromium 6종 화면도 실행했다. 로컬 WebKit은 시스템 라이브러리 부재, 모델 외부 접속은 실행 환경 네트워크 문제로 실패했다. 이 둘은 원격 CI에서 통과했다. 최초 원격 오디오 검사에서 WebKit의 evaluate 호출을 사용자 제스처로 취급한 오류가 발견되어 실제 클릭과 재생 진행 상태 확인으로 수정했다. 250ms 고정 대기를 없앴으며 재생 진행 조건과 timeout 실패는 유지한다. 짧은 파일이 종료되면 manager.music이 정리되므로 재생 객체 참조를 보관하고 두 음원의 currentTime 진행을 확인한다. 완료된 파일을 현재 재생 객체로 찾지 않는다. 동시 출력 headroom은 별도 실제 Web Audio 렌더로 검증한다.
- 기존 저장값/기록/PIN/스티커 보존은 migration/PWA 테스트로 확인하며 저장 스키마 변경 없음.

`python scripts/analyze-audio.py`로 원본을 수정하지 않고 보정값을 재생성할 수 있다(ffmpeg, numpy 필요). 이후 `pnpm exec prettier --write js/audio-profile.js` 및 전체 검사/오프라인 빌드를 실행한다.

## Y700 실행

Android Chrome에서 https://pswgames.github.io 를 열고 보호자 메뉴의 앱 버전 7.5.1 확인. 구버전이면 보호자 메뉴의 업데이트 확인 후 다시 연다. 저장공간 삭제/앱 데이터 초기화는 필요 없다. 풍선톡톡에서 손가락 모드 또는 카메라 시작을 선택한다. 카메라는 사용자가 직접 허용한다. 카메라 실패 시 손가락 모드로 전환한다.

키오스크 Manifest는 INTERNET만, 기본 WebChromeClient이며 CAMERA/runtime permission/onPermissionRequest는 없다. APK 권한을 확대하지 않았다. 기존 래퍼에서는 손가락 모드를 사용하고 카메라는 Chrome에서 확인한다. 실제 카메라/조명/발열/세대별 성능과 모델 완전 오프라인 실행은 미검증 상태다.
