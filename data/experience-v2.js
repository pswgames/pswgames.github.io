window.SEOWOO_EXPERIENCE_V2 = {
  version: 2,
  moods: [
    { id: "happy", label: "기뻐요", color: "#ffd36b" },
    { id: "sad", label: "속상해요", color: "#86c4ea" },
    { id: "angry", label: "화나요", color: "#f28a72" },
    { id: "scared", label: "무서워요", color: "#aa98dc" },
    { id: "surprised", label: "놀랐어요", color: "#8fd2b2" }
  ],
  feelings: [
    { id:"tower", mood:"sad", title:"블록 탑이 와르르", text:"열심히 쌓은 블록 탑이 갑자기 무너졌어.", scene:"blocks", response:"속상할 수 있어. 다시 천천히 쌓아보자." },
    { id:"thunder", mood:"scared", title:"우르릉 쾅!", text:"창밖에서 아주 큰 천둥소리가 났어.", scene:"storm", response:"무서울 수 있어. 어른 손을 잡고 천천히 숨 쉬어보자." },
    { id:"bubble", mood:"happy", title:"비눗방울 둥실둥실", text:"커다란 비눗방울이 반짝이며 날아가.", scene:"bubbles", response:"신나고 기쁜 마음이네. 같이 웃어보자." },
    { id:"toy", mood:"angry", title:"내 자동차인데…", text:"친구가 묻지 않고 내가 놀던 자동차를 가져갔어.", scene:"toy", response:"화가 날 수 있어. '나도 놀고 있었어'라고 말해보자." },
    { id:"mom", mood:"happy", title:"엄마가 꼭 안아줬어", text:"집에 오니 엄마가 반갑게 꼭 안아줬어.", scene:"hug", response:"마음이 따뜻하고 기쁘구나." },
    { id:"dark", mood:"scared", title:"방이 갑자기 깜깜", text:"불이 꺼져서 방이 아주 어두워졌어.", scene:"dark", response:"깜깜하면 무서울 수 있어. 불을 켜고 천천히 둘러보자." },
    { id:"cookie", mood:"sad", title:"쿠키가 바닥에 툭", text:"먹으려고 들고 있던 쿠키가 바닥에 떨어졌어.", scene:"cookie", response:"아쉽고 속상한 마음이 들 수 있어." },
    { id:"birthday", mood:"surprised", title:"깜짝 생일 노래", text:"문을 열었더니 친구들이 갑자기 생일 노래를 불러줬어.", scene:"birthday", response:"깜짝 놀랐구나. 그리고 곧 기쁜 마음도 들 수 있어." },
    { id:"splash", mood:"angry", title:"옷에 물이 철벅", text:"친구가 뛰다가 내 옷에 물을 많이 튀겼어.", scene:"splash", response:"화가 날 수 있어. 먼저 몸을 닦고 천천히 말해보자." },
    { id:"puppy", mood:"happy", title:"강아지가 꼬리를 살랑", text:"강아지가 달려와서 꼬리를 흔들며 반겨줬어.", scene:"puppy", response:"반갑고 기쁜 마음이 들었겠네." },
    { id:"balloon", mood:"surprised", title:"풍선이 펑!", text:"옆에 있던 풍선이 갑자기 큰 소리를 내며 터졌어.", scene:"balloon", response:"깜짝 놀랄 수 있어. 놀란 몸을 천천히 진정시켜보자." },
    { id:"turn", mood:"angry", title:"내 차례였는데", text:"미끄럼틀에서 친구가 새치기를 했어.", scene:"slide", response:"화가 날 수 있어. '내 차례야'라고 또박또박 말해보자." }
  ],
  puzzles: [
    {
      id:"shape-garden", title:"모양 정원", prompt:"같은 모양의 화분을 찾아줘", theme:"garden",
      slots:[["circle","동그라미"],["triangle","세모"],["square","네모"],["star","별"]],
      pieces:[["sun","sun","circle"],["tree","tree","triangle"],["window","window","square"],["flower","flower","star"]]
    },
    {
      id:"animal-home", title:"동물 친구 집 찾기", prompt:"동물 친구를 알맞은 집으로 데려가줘", theme:"farm",
      slots:[["pond","연못"],["kennel","강아지집"],["treehome","나무"],["barn","외양간"]],
      pieces:[["duck","duck","pond"],["dog","dog","kennel"],["bird","bird","treehome"],["cow","cow","barn"]]
    },
    {
      id:"vehicle-place", title:"탈것은 어디로?", prompt:"탈것을 알맞은 곳으로 보내줘", theme:"town",
      slots:[["road","도로"],["sea","바다"],["sky","하늘"],["rail","기찻길"]],
      pieces:[["car","car","road"],["boat","boat","sea"],["plane","plane","sky"],["train","train","rail"]]
    },
    {
      id:"fruit-color", title:"과일 색깔 바구니", prompt:"과일을 같은 색 바구니에 담아줘", theme:"market",
      slots:[["red","빨강"],["yellow","노랑"],["green","초록"],["purple","보라"]],
      pieces:[["apple","apple","red"],["banana","banana","yellow"],["pear","pear","green"],["grape","grape","purple"]]
    },
    {
      id:"big-small", title:"크기 친구", prompt:"큰 것은 큰 집, 작은 것은 작은 집", theme:"nursery",
      slots:[["big","큰 집"],["small","작은 집"]],
      pieces:[["bigbear","bear-big","big"],["smallbear","bear-small","small"],["bigball","ball-big","big"],["smallball","ball-small","small"],["bigcar","car-big","big"],["smallcar","car-small","small"]]
    },
    {
      id:"food-place", title:"냉장고와 찬장", prompt:"음식을 알맞은 곳에 정리해줘", theme:"kitchen",
      slots:[["fridge","냉장고"],["pantry","찬장"]],
      pieces:[["milk","milk","fridge"],["egg","egg","fridge"],["bread","bread","pantry"],["cereal","cereal","pantry"],["cheese","cheese","fridge"],["cracker","cracker","pantry"]]
    },
    {
      id:"weather-wear", title:"오늘은 뭘 입을까?", prompt:"날씨에 맞는 물건을 골라줘", theme:"weather",
      slots:[["rain","비 오는 날"],["sunny","햇빛 쨍쨍"],["snow","눈 오는 날"]],
      pieces:[["umbrella","umbrella","rain"],["boots","rainboots","rain"],["hat","sunhat","sunny"],["sunglasses","sunglasses","sunny"],["gloves","gloves","snow"],["scarf","scarf","snow"]]
    },
    {
      id:"bathroom-order", title:"손 씻기 순서", prompt:"손 씻는 순서대로 놓아보자", theme:"bath",
      slots:[["s1","1"],["s2","2"],["s3","3"],["s4","4"]],
      pieces:[["water","tap","s1"],["soap","soap","s2"],["rub","hands","s3"],["towel","towel","s4"]]
    },
    {
      id:"half-match", title:"반쪽 친구 찾기", prompt:"반쪽을 맞춰 하나로 만들어줘", theme:"playroom",
      slots:[["applefull","사과"],["ballfull","공"],["butterflyfull","나비"],["fishfull","물고기"]],
      pieces:[["applehalf","apple-half","applefull"],["ballhalf","ball-half","ballfull"],["butterflyhalf","butterfly-half","butterflyfull"],["fishhalf","fish-half","fishfull"]]
    },
    {
      id:"bedtime", title:"잘 자요 준비", prompt:"잠자기 전에 필요한 것을 찾아줘", theme:"bedroom",
      slots:[["bed","침대"],["bathroom","세면대"],["basket","빨래바구니"]],
      pieces:[["pajama","pajama","bed"],["book","book","bed"],["toothbrush","toothbrush","bathroom"],["cup","cup","bathroom"],["sock","sock","basket"],["shirt","shirt","basket"]]
    },
    {
      id:"picnic", title:"소풍 가방 챙기기", prompt:"소풍에 필요한 것만 가방에 넣어줘", theme:"park",
      slots:[["bag","소풍 가방"],["home","집에 두기"]],
      pieces:[["waterbottle","bottle","bag"],["sandwich","sandwich","bag"],["mat","picnicmat","bag"],["pillow","pillow","home"],["pot","pot","home"],["slipper","slipper","home"]]
    },
    {
      id:"music-family", title:"소리 친구 모으기", prompt:"같은 악기 가족끼리 모아줘", theme:"music",
      slots:[["hit","두드려요"],["blow","불어요"],["string","줄을 켜요"]],
      pieces:[["drum","drum","hit"],["tambourine","tambourine","hit"],["trumpet","trumpet","blow"],["flute","flute","blow"],["violin","violin","string"],["guitar","guitar","string"]]
    }
  ],
  village: {
    market: {
      products: [
        ["apple","사과","apple"],["banana","바나나","banana"],["milk","우유","milk"],["bread","식빵","bread"],
        ["carrot","당근","carrot"],["egg","달걀","egg"],["cheese","치즈","cheese"],["grape","포도","grape"],
        ["pear","배","pear"],["cereal","시리얼","cereal"],["yogurt","요거트","yogurt"],["juice","주스","juice"]
      ],
      missions: [
        ["apple","milk","bread"],["banana","egg","cheese"],["grape","yogurt","cereal"],["pear","juice","carrot"],
        ["milk","egg","bread"],["apple","banana","yogurt"],["cheese","bread","juice"],["carrot","pear","egg"]
      ]
    },
    kitchen: {
      ingredients: [
        ["tomato","토마토","tomato"],["carrot","당근","carrot"],["mushroom","버섯","mushroom"],["egg","달걀","egg"],
        ["cheese","치즈","cheese"],["broccoli","브로콜리","broccoli"],["corn","옥수수","corn"],["potato","감자","potato"]
      ],
      recipes: [
        { id:"soup", name:"야채수프", need:["tomato","carrot","mushroom"] },
        { id:"omelet", name:"치즈달걀", need:["egg","cheese","broccoli"] },
        { id:"stew", name:"포근한 스튜", need:["potato","carrot","corn"] }
      ]
    },
    clinic: {
      patients: [
        {id:"dog",name:"멍멍이",tone:"#d9a46c"},
        {id:"cat",name:"야옹이",tone:"#c9a7d9"},
        {id:"rabbit",name:"토끼",tone:"#f2d6d6"}
      ],
      tools: [
        ["stethoscope","청진기"],["thermometer","체온계"],["bandage","반창고"],["brush","빗"],["water","물"],["treat","간식"]
      ]
    }
  }
};