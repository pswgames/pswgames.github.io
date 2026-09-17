# 에셋 출처와 제작

앱 일러스트는 사용자 첨부 레퍼런스를 기준으로 imagegen으로 새로 제작했습니다. Dribbble/Behance의 브랜드·캐릭터·스크린샷은 포함하지 않았습니다. 원본 생성 이미지에서 WebP로 변환했고, 투명 스프라이트의 알파 채널을 유지했습니다.

| 파일 | 용도 |
|---|---|
| hero.webp | 서우·강아지와 놀이터, 홈 장면 |
| activities.webp | 여섯 활동 장난감 스프라이트 |
| bathroom.webp | 화장실 학습 장면 |
| potty-icons.webp | 문·변기·휴지·물·비누·별 스프라이트 |
| ocean.webp / ocean-phone.webp | 가로/세로 해저 놀이 배경 |
| numbers.webp | 하늘·풍선 숫자 세계 |
| shapes.webp | 민트색 입체 장난감 방 |
| english.webp | 라벤더 정원·토끼·블록 |
| cities/seoul-night.webp | 서울에서 착안한 가상의 일러스트 야경. 실제 지리·경관을 재현한 사진이 아님 |

## 사진과 서체

서울 외 9개 도시는 원본 v6.8.1이 사용한 Unsplash 사진을 파일로 저장한 것입니다. 앱 실행 중 외부 사진 서버 요청이 필요하지 않습니다. 사용 조건은 [Unsplash License](https://unsplash.com/license)를 따릅니다.

- [New York — Zoshua Colah](https://unsplash.com/photos/new-york-city-skyline-at-night-with-illuminated-buildings-pvIgHy2B2Go)
- [Tokyo — Tsuyoshi Kozu](https://unsplash.com/photos/tokyo-tower-illuminated-at-night-with-city-skyline-B5JCib8nTck)
- [Hong Kong — Chunjiang](https://unsplash.com/photos/hong-kongs-skyline-glows-brightly-at-night-stdoa8BrLbI)
- [Paris — Miraxh Tereziu](https://unsplash.com/photos/sunset-over-the-seine-river-in-paris-with-eiffel-tower-70lErRRyNKE)
- [Dubai — Kevin Gyovai](https://unsplash.com/photos/dubais-skyline-illuminated-at-night-with-burj-khalifa-lRCWtOEPwiY)
- [Singapore — Sigrid](https://unsplash.com/photos/singapore-skyline-with-marina-bay-sands-and-ferris-wheel-3GRENNknIsw)
- [Rainy Osaka — Cuvii](https://unsplash.com/photos/rainy-city-street-at-night-with-glowing-neon-signs-G0KVzxBb2xo)
- [Snow city — J dG](https://unsplash.com/photos/snow-covered-city-skyline-at-sunrise-with-clouds-jRG40B2ou6Q)
- [Dawn city — David Kristianto](https://unsplash.com/photos/city-skyline-at-dawn-with-clouds-above-g85y_ZaRXpA)

Jua는 [Google Fonts 배포본](https://github.com/google/fonts/tree/main/ofl/jua)이며 SIL Open Font License 1.1입니다. WOFF2로 압축했고 원문 라이선스는 assets/fonts/OFL.txt에 동봉했습니다. 비상 도시 배경은 원본 프로젝트에서 유지했습니다. 앱 아이콘은 서우·강아지 생성 그림으로 교체했고, 불투명 사각형 192/512/1024px PNG로 저장했습니다.

## 생성 프롬프트

첫 네 에셋은 사용자 레퍼런스 이미지를 함께 전달했습니다. 나머지 환경·장난감은 동일한 재질, 색, 캐릭터 방향으로 생성했습니다. 아래는 실제 주요 프롬프트와 후속 에셋의 제작 규격입니다.

### hero

Use case: stylized-concept. Create a polished 3D illustrated background asset for the actual Korean children's app in the reference. The attached image is a STYLE AND CHARACTER REFERENCE, especially the large tablet at top left. Reproduce its exact warm brown-haired little Korean boy with big brown eyes, cream hoodie with bear patch, blue shorts, seated and waving, with cream and tan puppy beside him, in a luminous spring playground. NOT a mockup. No device, NO words, NO typography, NO logo, NO cards, NO UI. Landscape 1536x1024. Boy and puppy occupy right-center 45% of composition from x 48% to 87%, top of boy hair at 18%, feet at 77%. Keep left 45% as calm pale sky-blue negative space for app title, soft clouds. Bottom 25% has soft meadow and daisies to sit behind UI. Match reference premium adorable 3D rendering, detailed soft hair, clear friendly expression, soft sunlight, bright white blue sky, lush softly blurred park, charming but refined. Not flat vector or plastic clipart. A beautiful finished game world.

### activities

Use case: stylized-concept. Create a transparent PNG SPRITE SHEET of six separate premium 3D toy illustrations matching the attached reference's activity cards. 1536x1024 image, exact 3-column 2-row grid of equal 512x512 cells. Each object centered inside its cell with large transparent margins, object fits within central 70%, objects never cross cell boundaries. Transparent background with actual alpha. No panels, NO captions, NO text other than specified toy letters/numbers. Top-left: sky blue/lavender glass elevator toy with two doors and up-down arrow symbols. Top-middle: clean white and pale blue cute toilet with tiny yellow rubber duck. Top-right: glossy blue numeral 2 with pink and yellow balloons. Bottom-left: pastel toy alphabet blocks with Korean letters 가, ㄱ, ㅏ. Bottom-middle: peach sphere, lavender cube, yellow torus and mint triangle chunky 3D shape toys. Bottom-right: blue A and yellow B with little pink bunny toy. Cohesive soft rounded 3D style, glossy highlights, ambient shading, clean silhouette, gentle pastel blue mint yellow peach lavender. Each cell is a standalone functional activity icon; do not copy the reference UI.

### ocean

Use case: stylized-concept. Create a full-bleed premium 3D children's underwater game BACKGROUND matching the attached reference rightmost 말글 놀이터 panel. Landscape 1536x1024. NO UI, NO text, NO letters, NO buttons, NO frames. Bright clear turquoise underwater, softly filtered rays from surface, saturated azure at bottom, coral and anemones in peach pink lavender mint on bottom and far sides, a sweet small pink octopus in bottom-left corner and two tiny yellow fish near bottom-right. Center 65% mostly open clear blue water reserved for interactive question and bubble buttons. Cohesive adorable polished toy-like 3D illustration with natural depth and soft highlights. Clean, bright, calm and premium, like the provided app concept.

### bathroom

Use case: stylized-concept. Create a premium 3D children's educational game scene using the EXACT boy design from the reference: warm brown wavy hair, large brown eyes, round cheeks, white shirt with blue bear, blue shorts. He is sitting comfortably on a clean white child toilet, shorts modestly covering his lap, smiling and giving thumbs up. A yellow rubber duck beside the toilet. Bright airy clean bathroom with pale aqua tile, white grout, wooden shelf, plant, toilet paper, soft daylight. Landscape 1536x1024, boy centered slightly right, full body and toilet visible. NO text, NO UI, NO device, NO frames, NO watermarks. Plenty of breathing room left and right. Match reference bathroom top second panel closely in character, composition quality and 3D material. Friendly and dignified children's potty-training illustration.

### 세로 해저 / 숫자 / 도형 / 영어

세로 해저는 1024×1536, 상단과 중앙은 게임용 빈 수면, 하단 양쪽은 작은 분홍 문어와 노란 물고기·파스텔 산호로 구성했습니다. 숫자는 밝은 하늘, 구름, 가장자리 풍선, 가운데 넓은 빈 공간. 도형은 민트색 방, 가장자리 큰 구·정육면체·삼각형·고리 장난감. 영어는 라벤더 정원과 하단 왼쪽 분홍 토끼, 오른쪽 파스텔 블록. 모든 이미지는 UI·문자·버튼 없는 실제 배경 에셋으로 지정했습니다.

### 화장실 장난감

1536×1024 투명 배경, 3열×2행 스프라이트. 각 칸에 노란 문, 흰 변기, 분홍 휴지, 파란 물 소용돌이, 민트 비누와 거품, 웃는 노란 별. 일정한 여백과 동일한 부드러운 입체 재질, 캡션과 패널 없음.

### 서울 야경

Create a polished premium mobile children's app environment background, NOT a UI mockup, no text, no lettering, no elevator frame or glass, no buttons. Nighttime Seoul-inspired skyline viewed from high over the Han River, center a tall elegant tapered illuminated Lotte-style skyscraper with a white-gold spire. Many jewel-like warm lit windows, deep sapphire blue but luminous dusk sky, clean blue atmospheric depth, very subtle stars, distant smaller buildings, graceful shoreline and magical turquoise/gold reflections in lower 30 percent river. Keep tower entirely visible and centrally composed, top 15 percent clear sky, no foreground branches, no railings, no foreground buildings occluding city. The art should be cinematic luxury 3D children's game environment, refined believable architecture with slight softness rather than a gritty photo. Clear luminous cool blue scene, detailed city, no extreme neon, no purple glow. It will be seen through elevator window moving vertically; plenty of scene above and below main skyline. Wide landscape 1536x1024.

후속 구도 수정: Edit this original app environment asset for an elevator panorama. Preserve the premium sapphire-blue Seoul-inspired night skyline, softly luminous windows and river reflections, and the centered tapered illuminated tower. Recompose the scene to add substantial clear starry night sky: the tip of the entire main tower must be at 30 percent of the image height from the top, and its base at 75 percent. Make the tower proportionately smaller so the entire tower is contained between y=30% and y=75%. Skyline along y=70%, river in bottom 25%. Wide 1536x1024 landscape. It is essential to leave the top 28 percent all sky, with no tower occupying it, so vertical elevator camera motion can crop the top quarter without clipping the tower. No text or UI or railings or frame. Keep the image sharp and refined.



### 앱 아이콘

같은 서우와 강아지의 상반신, 두 얼굴이 가운데 안전 영역 안에 있는 구도, 밝은 하늘색의 완전히 불투명한 사각 배경, 글자와 테두리 없는 프리미엄 3D 그림. 모서리는 운영체제가 처리하도록 별도로 깎지 않았습니다.
