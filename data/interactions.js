/* Actual action targets and narration, independent of rendering. */
window.SEOWOO_INTERACTIONS = {
  potty: [
    {zone:"door", label:"문 앞으로", icon:"door", x:12, y:43},
    {zone:"clothes", label:"바지 내리기", icon:"pants", x:24, y:67},
    {zone:"toilet", label:"변기에 앉기", icon:"potty-icon", x:52, y:61},
    {zone:null, label:"편안하게 기다려요", x:52, y:61},
    {zone:"paper", label:"휴지로 쓱쓱", icon:"paper", x:72, y:45},
    {zone:"flush", label:"물 내리기", icon:"flush", x:61, y:38},
    {zone:"clothes", label:"바지 올리기", icon:"pants", x:24, y:67},
    {zone:"sink", label:"손 씻기", icon:"soap", x:87, y:47},
    {zone:null, label:"혼자서도 잘했어!", x:51, y:75},
  ],
  blockSounds: {
    pick: [[440,.07,"sine",0],[660,.08,"sine",.035]],
    place: [[294,.1,"triangle",0],[588,.14,"sine",.055]],
    clear: [[523,.16,"sine",0],[659,.18,"sine",.06],[784,.26,"sine",.12]],
    combo: [[523,.12,"triangle",0],[784,.16,"sine",.06],[1047,.22,"sine",.12],[1319,.3,"sine",.2]],
    return: [[330,.11,"sine",0],[262,.14,"sine",.06]],
  },
};
