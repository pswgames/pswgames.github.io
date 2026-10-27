# 풍선톡톡 구현과 외부 자산

30초 동안 큰 풍선 2개를 천천히 터뜨리는 1인용 몸놀이입니다. 점프·펀치·실패·감점은 없습니다. 손목과 검지의 평균을 좌우 반전하고 평활화하여 표시하며, 보이지 않는 손은 충돌 판정에서 제외합니다. 손을 놓치거나 영상 프레임이 멈추면 남은 시간이 멈춥니다. 터뜨린 뒤에는 보이는 손 근처에 다음 풍선을 배치합니다.

카메라 시작 전 보호자 안내가 표시됩니다. 기기를 고정하고 팔 주변 공간을 확보하세요. 권한 거부, 카메라 없음/사용 중, 미지원, 연결/모델 실패에는 상태를 표시하며 손가락 대체 놀이로 전환할 수 있습니다. 카메라 모드로 다시 시작하거나 일시정지에서 돌아올 때는 명시적으로 버튼을 누릅니다.

## 개인정보와 수명 주기

- 실제 카메라 요청은 `카메라로 시작`을 누른 뒤에만 실행합니다. 마이크 제약은 `audio:false`입니다.
- 영상과 자세 좌표는 현재 브라우저 메모리에서만 처리하며 서버 전송·촬영·저장·방문 통계를 구현하지 않습니다.
- 기존 `seowoo-play-v3`에는 놀이 완료 시각, 모드, 터뜨린 개수만 기존 완료 기록 형식으로 저장합니다.
- 홈/뒤로가기/다른 활동/재시작/오류/완료/페이지 숨김에서 트랙·모델·RAF를 정리합니다. 늦게 허용된 카메라나 늦게 완성된 모델도 닫습니다. 화면 숨김과 보호자/휴식 모달은 일시정지로 돌아옵니다.
- 사용자 설정의 음성·효과음·볼륨을 재사용합니다. 기존 로컬 칭찬 MP3와 짧은 합성 효과음을 사용하며 음원 생성 API는 사용하지 않습니다.

## 공식 배포 및 라이선스

이 게임의 코드·풍선 그림(CSS)·화면 구성은 자체 구현했습니다. 참고 사이트의 코드/그림/소리는 복제하지 않았습니다.

| 구성 | 고정 배포 | 근거 |
| --- | --- | --- |
| MediaPipe Tasks Vision | `@mediapipe/tasks-vision@0.10.21`, jsDelivr의 npm 배포 | [공식 Web 가이드](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js), [Apache-2.0 라이선스](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE) |
| Pose Landmarker lite | `pose_landmarker_lite/float16/1/pose_landmarker_lite.task`, Google 모델 저장소 | [공식 모델 목록](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker), [모델 카드의 Apache-2.0 표기, 2쪽](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf) |

GPU 생성을 먼저 시도하고 실패하면 CPU로 한 번 대체합니다. 영상은 최대 640×480 권장, 최대 20fps 요청이며 추론은 새 프레임에 대해 약 12.5fps로 제한합니다. 실제 기기 성능에 따라 속도는 달라집니다.

카메라를 시작할 때만 공식 런타임·WASM·모델을 다운로드합니다. 외부 자산은 서비스워커 설치/필수 캐시에 넣지 않아 다운로드 실패가 기존 놀이 설치를 막지 않습니다. 카메라 놀이의 오프라인 실행은 보장하지 않으며, 손가락 모드는 기존 앱 캐시에 포함됩니다. CDN/Google 서버에는 자산 요청에 필요한 일반 네트워크 정보가 전달되지만 영상·좌표는 전송하지 않습니다.

## 검증 방법

- `node tests/balloon.cjs`: 합성 좌표, 충돌, 시간 멈춤, 좌표 투영, GPU/CPU 대체 및 늦은 리소스 해제.
- `node tests/balloon-browser.cjs`: 격리 Chromium, 실제 카메라 API 차단, 터치·회전·30초 완료·이탈·복귀·권한 거부·합성 손·손 소실.
- `node tests/model-smoke.cjs`: 선택적 온라인 검사. 실제 공식 모델을 생성한 빈 캔버스에 실행하고 닫습니다. 실제 카메라나 인물 사진을 사용하지 않습니다.

실제 아이의 손/자세 인식 품질, 조명·거리·가림·저사양 발열·iPhone Safari 카메라는 실기기 확인이 필요합니다. 인식이 어려우면 손가락 놀이를 사용할 수 있습니다.
