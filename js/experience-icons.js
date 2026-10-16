/* Shared semantic image system: no emoji or generic-circle fallback for objects. */
(() => {
 'use strict';
 const assets=window.SEOWOO_ART||{},C=window.SEOWOO_CONTENT;
 const aliases={airplane:'plane',ship:'boat','teddy bear':'bear',hat:'sunhat',socks:'sock','ice cream':'icecream',queen:'crown',hand:'hands',sea:'sea',feeling:'heart',village:'village-icon',music:'xylophone',memory:'blocks',alphabet:'book',koreanWords:'book',englishWords:'dog',hangul:'xylophone',together:'family',treasure:'star',color:'rainbow',feelings:'heart',numbers:'counting',numberBoard:'counting',quantity:'counting',numberOrder:'train',finger:'hands',window:'window'};
 const colors={'🔴':'#ef7471','🔵':'#6da8ea','🟡':'#f3cd61','🟢':'#85bd80','🟣':'#a791d2','🟠':'#f2a45f','🩷':'#ecabc8','⚫':'#40515e','⚪':'#fdfcf5'};
 const byEmoji={'💛':'heart','💙':'heart','🎵':'xylophone','🎶':'xylophone','🧠':'blocks','🏘️':'village-icon','🦘':'child-happy','👏':'clap','3️⃣':'hands','🚽':'potty-icon','🫧':'soap','🧻':'towel'};
 const labels={};
 const keyFor=name=>aliases[name]||aliases[String(name).toLowerCase()]||String(name).toLowerCase();
 for(const w of C.words){const key=keyFor(w.en);if(!colors[w.pic])byEmoji[w.pic]=key;labels[key]=w.ko;}
 for(const [,name,pic] of C.alphabet)if(!byEmoji[pic]&&!colors[pic])byEmoji[pic]=keyFor(name);
 for(const [id,name,pic] of C.stickers){byEmoji[pic]??=id;labels[id]??=name;}
 Object.assign(labels,{tap:'수도꼭지',soap:'비누',hands:'손',towel:'수건',umbrella:'우산',rainboots:'장화',sunhat:'모자',sunglasses:'선글라스',gloves:'장갑',scarf:'목도리',pajama:'잠옷',toothbrush:'칫솔',cup:'컵',sock:'양말',bottle:'물병',sandwich:'샌드위치',picnicmat:'돗자리',pillow:'베개',pot:'냄비',slipper:'슬리퍼',tambourine:'탬버린',trumpet:'나팔',flute:'피리',violin:'바이올린',guitar:'기타',cracker:'과자',broccoli:'브로콜리',corn:'옥수수',tomato:'토마토',mushroom:'버섯',cereal:'시리얼',yogurt:'요거트',juice:'주스',pear:'배',bird:'새',butterfly:'나비'});
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function icon(name,label=''){
  let key=keyFor(name),cls='';
  if(/-big$/.test(key)){cls=' icon-big';key=key.replace(/-big$/,'');}
  if(/-small$/.test(key)){cls=' icon-small';key=key.replace(/-small$/,'');}
  if(/-half$/.test(key)){cls+=' icon-half';key=key.replace(/-half$/,'');}
  if(key.startsWith('shape-'))return `<span class="v2-icon"><span class="exact-shape ${key}" aria-hidden="true"></span></span>`;
  if(!assets[key])return `<span class="art-label">${safe(label||labels[key]||name)}</span>`;
  return `<span class="v2-icon${cls}"><img src="${assets[key]}" alt="${safe(label||labels[key]||'')}" width="256" height="256" decoding="async" loading="lazy" draggable="false"></span>`;
 }
 function picture(pic){if(colors[pic])return `<span class="color-sample" style="--sample:${colors[pic]}"></span>`;return icon(byEmoji[pic]||keyFor(pic));}
 window.SeowooV2Icon=icon;window.SeowooArt={icon,picture,label:name=>labels[name.replace(/-big|-small|-half/,'')]||name};
})();
