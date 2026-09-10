# 서우 놀이터

32개월 유아가 짧고 즐겁게 숫자·말글·기억·생활습관·공동놀이를 경험하는 GitHub Pages PWA입니다.

## 콘텐츠 추가

- 영단어/한글단어: `data/content.js`의 `words` 배열에 항목 추가
- 음악: 음원 파일을 `audio/`에 넣고 `data/content.js`의 `music[].file`에 `/audio/파일명.mp3` 경로 입력
- 부모와 함께 미션: `data/content.js`의 `missions` 배열에 추가

영어/한국어 단어에는 `englishAudio`, `koreanAudio` 경로를 넣으면 녹음 파일을 우선 재생하고, 파일이 없으면 기기 TTS를 사용합니다.

## 구조

- `index.html` 앱 셸/PWA 진입점
- `css/app.css` UI
- `data/content.js` 확장 가능한 학습/음악 데이터
- `js/core.js` 상태·저장·난이도
- `js/audio.js` 음성·효과음·음악 채널
- `audio/catalog.js` 녹음 대본과 선택적 음원 경로
- `js/games.js` 선택형/기억/수개념 게임
- `js/app-v4.js` 화면·라우팅·생활습관·음악·보호자 설정
- `sw.js` 오프라인 캐시

놀이기록은 서버로 전송하지 않고 해당 기기 `localStorage`에 저장합니다.
## 6.0 검증과 알려진 한계

[개선 내용과 QA](PREMIUM_RELEASE.md)를 참고하세요. 실제 고품질 음원은 아직 제공되지 않아 기기 TTS fallback을 사용합니다. 정적 앱은 빌드 없이 배포됩니다. 개발 검증은 `npm install` 후 `npm test`로 실행하며 Chrome이 필요합니다.
