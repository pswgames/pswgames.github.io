(() => {
  "use strict";
  const wrap=(body,bg="#ffffff")=>`<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="4" y="4" width="92" height="92" rx="26" fill="${bg}" opacity=".96"/>${body}</svg>`;
  const food=(kind)=>{
    const m={
      apple:['<path d="M50 28c-5-9 3-16 9-18" fill="none" stroke="#557a4b" stroke-width="5" stroke-linecap="round"/><path d="M57 24c14-5 24 6 24 22 0 24-15 38-31 38S19 70 19 46c0-17 12-28 26-22 4 2 8 2 12 0Z" fill="#ed6f67"/><path d="M57 17c7-8 15-8 20-3-5 8-13 10-20 3Z" fill="#70ad65"/>',"#fff4ee"],
      banana:['<path d="M24 27c7 30 26 46 55 36-8 19-30 27-49 15C15 69 9 47 17 29Z" fill="#ffd35d"/><path d="M18 29c2-6 8-7 12-3" stroke="#8b7137" stroke-width="4" fill="none" stroke-linecap="round"/>',"#fff9df"],
      pear:['<path d="M49 29c-5-8 0-15 7-20" stroke="#557a4b" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M50 25c9 0 15 9 14 18 13 6 21 17 19 28-3 15-16 21-33 21S20 86 17 71c-2-11 6-22 19-28-1-9 5-18 14-18Z" fill="#a8cc69"/>',"#f6fbe8"],
      grape:['<path d="M50 19c2-7 7-11 15-11" stroke="#557a4b" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#8d70c8"><circle cx="42" cy="35" r="11"/><circle cx="58" cy="35" r="11"/><circle cx="34" cy="50" r="11"/><circle cx="50" cy="51" r="11"/><circle cx="66" cy="50" r="11"/><circle cx="42" cy="66" r="11"/><circle cx="58" cy="66" r="11"/><circle cx="50" cy="79" r="10"/></g>',"#f6f0ff"],
      carrot:['<path d="M49 28c-17 8-21 22-13 45l9 20 11-20c9-23 5-37-7-45Z" fill="#f3984f"/><path d="M46 30c-8-8-8-15-4-22 8 3 12 9 11 19M53 29c6-9 13-12 20-9-2 8-8 13-18 15" stroke="#68aa67" stroke-width="6" fill="none" stroke-linecap="round"/>',"#fff2df"],
      tomato:['<circle cx="50" cy="57" r="31" fill="#ee7468"/><path d="M50 31c-9-10-16-8-20-1 8 1 12 4 13 10M50 31c9-10 16-8 20-1-8 1-12 4-13 10" fill="#68aa67"/>',"#fff0ed"],
      mushroom:['<path d="M30 46c0-18 9-29 20-29s20 11 20 29Z" fill="#e98672"/><rect x="41" y="44" width="18" height="37" rx="8" fill="#f4e1c7"/><circle cx="42" cy="31" r="4" fill="#fff3e8"/><circle cx="58" cy="29" r="5" fill="#fff3e8"/>',"#fff1e9"],
      egg:['<ellipse cx="50" cy="54" rx="27" ry="36" fill="#fff9eb" stroke="#e3d8c0" stroke-width="3"/><circle cx="50" cy="59" r="12" fill="#ffc84f"/>',"#fffaf1"],
      cheese:['<path d="M21 68 74 27l9 48H21Z" fill="#ffd15f"/><circle cx="58" cy="53" r="6" fill="#e7aa35"/><circle cx="39" cy="69" r="5" fill="#e7aa35"/>',"#fff8d8"],
      broccoli:['<path d="M45 49h13v35H45z" fill="#6fae67"/><g fill="#69a95e"><circle cx="37" cy="39" r="15"/><circle cx="52" cy="32" r="16"/><circle cx="66" cy="41" r="15"/><circle cx="49" cy="48" r="15"/></g>',"#edf8e9"],
      corn:['<rect x="42" y="30" width="22" height="54" rx="11" fill="#ffd65c"/><path d="M42 45c-15 8-19 24-12 39 12-5 17-16 17-33M64 45c15 8 19 24 12 39-12-5-17-16-17-33" fill="#76b76b"/>',"#f4fae9"],
      potato:['<path d="M28 42c6-16 24-23 40-16 16 7 21 28 11 44-9 16-34 20-48 8-11-9-9-24-3-36Z" fill="#c89b68"/><circle cx="42" cy="47" r="2" fill="#916d4b"/><circle cx="64" cy="57" r="2" fill="#916d4b"/>',"#fbf1e4"],
      milk:['<path d="M33 18h34l7 14v53H27V32Z" fill="#eaf7ff" stroke="#8cc6e6" stroke-width="3"/><path d="M33 18 27 32h47L67 18" fill="#fff"/><path d="M36 51h29v20H36z" fill="#7cc3e8"/><circle cx="51" cy="61" r="6" fill="#fff"/>',"#f2fbff"],
      bread:['<path d="M24 42c0-18 10-26 26-26s26 8 26 26v39H24Z" fill="#e5b46d"/><path d="M33 44c0-10 7-15 17-15s17 5 17 15v28H33Z" fill="#f8d58f"/>',"#fff5e4"],
      cereal:['<path d="M28 21h44l-5 64H33Z" fill="#f1b96a"/><path d="M35 38h30v26H35z" fill="#fff2d4"/><circle cx="50" cy="51" r="9" fill="#d99a46"/>',"#fff3df"],
      yogurt:['<path d="M28 35h44l-7 45H35Z" fill="#f9fcff" stroke="#a9d0e5" stroke-width="3"/><path d="M25 29h50v9H25z" rx="4" fill="#7fc1e4"/><circle cx="50" cy="56" r="10" fill="#ef8ba6"/>',"#f5fbff"],
      juice:['<path d="M31 21h38v64H31z" rx="6" fill="#ffd277"/><path d="M61 13v15" stroke="#6fa8c2" stroke-width="5"/><path d="M50 45c9-8 18 2 13 11-3 7-13 11-13 11s-10-4-13-11c-5-9 4-19 13-11Z" fill="#f17b69"/>',"#fff6df"],
      cracker:['<rect x="24" y="24" width="52" height="52" rx="10" fill="#e5bd78"/><g fill="#ae8249"><circle cx="38" cy="38" r="3"/><circle cx="61" cy="38" r="3"/><circle cx="38" cy="61" r="3"/><circle cx="61" cy="61" r="3"/></g>',"#fff4df"],
      bottle:['<path d="M41 15h18v14l7 10v44H34V39l7-10Z" fill="#9ed8ee"/><path d="M42 16h16v9H42z" fill="#5aa1c5"/><path d="M38 50h24v20H38z" fill="#effbff"/>',"#eefaff"],
      sandwich:['<path d="M20 62 50 27l30 35Z" fill="#e2b369"/><path d="M25 61h50l-9 10H34Z" fill="#77b76c"/><path d="M31 53h38" stroke="#ef7c6b" stroke-width="8"/>',"#fff2de"]
    }; return m[kind];
  };
  function simple(kind){
    const m={
      sun:['<circle cx="50" cy="50" r="22" fill="#ffd15c"/><g stroke="#f2b941" stroke-width="6" stroke-linecap="round"><path d="M50 12v10M50 78v10M12 50h10M78 50h10M23 23l7 7M70 70l7 7M77 23l-7 7M30 70l-7 7"/></g>',"#fff8d8"],
      tree:['<rect x="45" y="53" width="12" height="31" rx="5" fill="#a27655"/><circle cx="50" cy="39" r="25" fill="#79b96d"/><circle cx="34" cy="48" r="16" fill="#84c179"/><circle cx="66" cy="49" r="16" fill="#68aa63"/>',"#edf8e9"],
      window:['<rect x="24" y="22" width="52" height="58" rx="8" fill="#bfeaff" stroke="#7bb6d4" stroke-width="5"/><path d="M50 22v58M24 51h52" stroke="#fff" stroke-width="5"/>',"#eefaff"],
      flower:['<circle cx="50" cy="50" r="10" fill="#ffd15c"/><g fill="#ef8eaa"><circle cx="50" cy="28" r="13"/><circle cx="50" cy="72" r="13"/><circle cx="28" cy="50" r="13"/><circle cx="72" cy="50" r="13"/></g>',"#fff0f5"],
      duck:['<ellipse cx="50" cy="59" rx="28" ry="20" fill="#ffd65c"/><circle cx="66" cy="42" r="15" fill="#ffe274"/><path d="M79 43h13l-11 7Z" fill="#f3984f"/><circle cx="70" cy="38" r="2.7" fill="#42525a"/>',"#fff9df"],
      dog:['<circle cx="50" cy="48" r="24" fill="#e3b077"/><path d="M28 39c-12-15-18 7-7 23M72 39c12-15 18 7 7 23" fill="#a97755"/><circle cx="42" cy="46" r="3" fill="#42525a"/><circle cx="58" cy="46" r="3" fill="#42525a"/><circle cx="50" cy="57" r="5" fill="#5d4b40"/><path d="M45 64q5 6 10 0" fill="none" stroke="#6a4c40" stroke-width="3"/>',"#fff2df"],
      bird:['<ellipse cx="48" cy="55" rx="25" ry="19" fill="#80c5e4"/><circle cx="66" cy="43" r="14" fill="#9ed5ec"/><path d="M79 43h12l-10 7Z" fill="#f0b756"/><path d="M34 53q12-18 23 1-13 14-23-1Z" fill="#5aa4c9"/>',"#eefaff"],
      cow:['<ellipse cx="50" cy="55" rx="28" ry="23" fill="#fff" stroke="#adb8bd" stroke-width="3"/><path d="M30 40c-9-12-16 3-8 14M70 40c9-12 16 3 8 14" fill="#d9c39e"/><path d="M34 52h15v13H34zM60 34h12v15H60z" fill="#505c62"/><ellipse cx="50" cy="65" rx="14" ry="9" fill="#efbdc6"/>',"#f8fbfc"],
      car:['<path d="M21 57h58l-7-18H38L28 48Z" fill="#ef7c6b"/><rect x="19" y="52" width="62" height="18" rx="8" fill="#e9695a"/><circle cx="34" cy="72" r="9" fill="#4d5960"/><circle cx="67" cy="72" r="9" fill="#4d5960"/><path d="M42 42h25" stroke="#d7eff8" stroke-width="9"/>',"#fff0ed"],
      boat:['<path d="M22 59h58c-5 18-15 25-29 25S27 77 22 59Z" fill="#73b9da"/><path d="M50 20v39" stroke="#7e6d5c" stroke-width="5"/><path d="M53 24 76 48H53Z" fill="#f1b86a"/>',"#eefaff"],
      plane:['<path d="M15 52 48 42 60 17l9 2-5 24 23 8-2 9-24-3-12 21-8-3 5-20-29 6Z" fill="#7dbedc"/>',"#eefaff"],
      train:['<rect x="20" y="31" width="58" height="40" rx="10" fill="#83c29a"/><rect x="29" y="39" width="15" height="13" rx="3" fill="#dff5ff"/><rect x="51" y="39" width="15" height="13" rx="3" fill="#dff5ff"/><circle cx="34" cy="73" r="9" fill="#4e5b60"/><circle cx="66" cy="73" r="9" fill="#4e5b60"/><path d="M18 30h62" stroke="#efb65c" stroke-width="6"/>',"#eef7ed"],
      umbrella:['<path d="M17 50c3-22 17-33 33-33s30 11 33 33c-9-5-17-5-25 0-7-5-15-5-22 0-6-5-13-5-19 0Z" fill="#78b9de"/><path d="M50 49v27q0 11 9 11 8 0 8-9" fill="none" stroke="#61747f" stroke-width="5" stroke-linecap="round"/>',"#eff9ff"],
      rainboots:['<path d="M27 22h20v41l12 8v13H24V65l3-4ZM58 22h18v40l10 7v15H54V64l4-3Z" fill="#f3c94f"/>',"#fff9dd"],
      sunhat:['<ellipse cx="50" cy="70" rx="35" ry="13" fill="#efbd65"/><path d="M34 68c2-27 7-38 16-38s14 11 16 38Z" fill="#ffd27a"/><path d="M35 55h30" stroke="#ef8b7e" stroke-width="6"/>',"#fff5df"],
      sunglasses:['<path d="M17 44h25l2 8c1 10-5 17-13 17S18 63 19 53ZM83 44H58l-2 8c-1 10 5 17 13 17s13-6 12-16Z" fill="#52666f"/><path d="M42 49h16" stroke="#52666f" stroke-width="6"/>',"#f0f5f7"],
      gloves:['<path d="M31 25c6 0 8 5 8 12V21c0-5 8-5 8 0v16-20c0-5 8-5 8 0v20-16c0-5 8-5 8 0v22c8-5 13 1 9 8L60 80H37L23 56c-5-9 3-14 8-8Z" fill="#9f91d7"/>',"#f4f0ff"],
      scarf:['<path d="M32 20h36v30H32z" rx="8" fill="#ef8aa1"/><path d="M40 47v37M60 47v37" stroke="#ef8aa1" stroke-width="11"/><path d="M35 26h30" stroke="#ffd3dc" stroke-width="5"/>',"#fff0f4"],
      tap:['<path d="M23 41h31v-9c0-10 7-16 17-16h8v13h-8c-3 0-5 2-5 5v7h12v15H23Z" fill="#8eb3c5"/><path d="M67 57c0 10-7 16-7 16s-7-6-7-16c0-7 7-12 7-12s7 5 7 12Z" fill="#76c9ed"/>',"#eefaff"],
      soap:['<rect x="25" y="37" width="50" height="38" rx="15" fill="#8fd2c0"/><circle cx="31" cy="29" r="8" fill="#dff9f4"/><circle cx="48" cy="23" r="6" fill="#dff9f4"/><circle cx="65" cy="28" r="5" fill="#dff9f4"/>',"#effbf8"],
      hands:['<path d="M28 28c7 0 10 7 10 14V27c0-6 8-6 8 0v18-22c0-6 8-6 8 0v22-17c0-6 8-6 8 0v22l7-8c7-7 14 0 8 8L61 77H38L23 55c-6-9-1-17 5-12Z" fill="#f2c99f"/>',"#fff5ea"],
      towel:['<path d="M24 24h52v58H24z" rx="8" fill="#9ed3e7"/><path d="M32 35h36M32 48h36M32 61h36" stroke="#dff5ff" stroke-width="5"/>',"#eefaff"],
      pajama:['<path d="M31 22 46 16l4 11 4-11 15 6 11 22-12 6-4-9v42H36V41l-4 9-12-6Z" fill="#9fb3e5"/><circle cx="50" cy="43" r="3" fill="#fff"/><circle cx="50" cy="55" r="3" fill="#fff"/>',"#f1f3ff"],
      book:['<path d="M18 25c12-6 24-5 32 2v52c-8-7-20-8-32-2ZM82 25c-12-6-24-5-32 2v52c8-7 20-8 32-2Z" fill="#ef9a7f"/><path d="M50 27v52" stroke="#fff" stroke-width="4"/>',"#fff0ea"],
      toothbrush:['<path d="M24 70 66 28" stroke="#6fb8d6" stroke-width="9" stroke-linecap="round"/><rect x="62" y="18" width="23" height="14" rx="5" fill="#8fd2c0"/><path d="m66 17 3-7M72 18l3-7M78 19l3-7" stroke="#fff" stroke-width="3"/>',"#eefaff"],
      cup:['<path d="M27 30h39v43c0 9-7 14-20 14S27 82 27 73Z" fill="#8ecbe4"/><path d="M66 39h8c13 0 13 21 0 21h-8" fill="none" stroke="#8ecbe4" stroke-width="7"/>',"#eefaff"],
      sock:['<path d="M35 20h25v40l15 9c8 5 4 16-5 16H38c-8 0-13-6-10-13l7-16Z" fill="#ef8ea8"/><path d="M35 35h25" stroke="#ffd5df" stroke-width="6"/>',"#fff0f5"],
      shirt:['<path d="M32 22 44 16c4 8 8 8 12 0l12 6 15 18-13 11-8-9v41H38V42l-8 9-13-11Z" fill="#78c2df"/>',"#eefaff"],
      picnicmat:['<rect x="18" y="27" width="64" height="52" rx="9" fill="#ef9b8f"/><path d="M18 44h64M18 62h64M39 27v52M61 27v52" stroke="#fff2df" stroke-width="5"/>',"#fff0ea"],
      pillow:['<path d="M22 28c10 6 46 6 56 0 7 10 7 34 0 44-10-6-46-6-56 0-7-10-7-34 0-44Z" fill="#d8c9ef"/><path d="M35 38h30" stroke="#f7f1ff" stroke-width="5"/>',"#f5f0ff"],
      pot:['<path d="M25 38h50v36c0 9-8 14-25 14S25 83 25 74Z" fill="#8fa7b0"/><path d="M17 45h10M73 45h10M35 31h30" stroke="#667b83" stroke-width="7" stroke-linecap="round"/>',"#f0f5f7"],
      slipper:['<path d="M18 62c12-2 18-9 23-22 7-16 27-10 31 5 4 16-3 34-20 38-16 4-31-5-34-21Z" fill="#f2b48b"/><path d="M34 56c8-8 20-9 29-1" stroke="#fff1e7" stroke-width="6"/>',"#fff2e9"],
      drum:['<ellipse cx="50" cy="30" rx="27" ry="11" fill="#f0a36f"/><path d="M23 30v41c0 8 54 8 54 0V30" fill="#ef8d74"/><ellipse cx="50" cy="71" rx="27" ry="11" fill="#d66f64"/><path d="M28 37 72 65M72 37 28 65" stroke="#ffd9b0" stroke-width="4"/>',"#fff0e8"],
      tambourine:['<circle cx="50" cy="51" r="29" fill="none" stroke="#efb85d" stroke-width="10"/><g fill="#90b9cc"><circle cx="22" cy="43" r="6"/><circle cx="78" cy="43" r="6"/><circle cx="28" cy="70" r="6"/><circle cx="72" cy="70" r="6"/></g>',"#fff7df"],
      trumpet:['<path d="M24 58h32V42H24zM56 42l18-12v40L56 58Z" fill="#f2c24f"/><path d="M21 48h-8M35 37v-9M45 37v-9" stroke="#d49b32" stroke-width="5" stroke-linecap="round"/>',"#fff8d9"],
      flute:['<path d="M20 61 77 28" stroke="#8fa8b2" stroke-width="10" stroke-linecap="round"/><g fill="#eaf4f7"><circle cx="38" cy="51" r="3"/><circle cx="49" cy="45" r="3"/><circle cx="60" cy="39" r="3"/></g>',"#f0f6f8"],
      violin:['<path d="M43 30c-11-12-20 0-12 12l7 8-7 8c-8 12 1 24 12 12l7-8 7 8c11 12 20 0 12-12l-7-8 7-8c8-12-1-24-12-12l-7 8Z" fill="#c9895c"/><path d="M50 19v62M48 17h6" stroke="#6d5446" stroke-width="4"/><path d="M66 17 85 82" stroke="#7f6b5e" stroke-width="3"/>',"#fbf0e7"],
      guitar:['<path d="M40 31c-13-10-25 2-19 16 3 7 9 10 14 12-5 5-7 12-3 18 8 12 26 5 30-7l5-17c2-9-2-17-11-21-6-3-12-3-16-1Z" fill="#d99b61"/><path d="M58 38 81 17M78 20l8 8" stroke="#7b5c49" stroke-width="6" stroke-linecap="round"/><circle cx="48" cy="54" r="7" fill="#805d46"/>',"#fbf0e4"],
      stethoscope:['<path d="M31 20v22c0 17 38 17 38 0V20" fill="none" stroke="#587685" stroke-width="7" stroke-linecap="round"/><path d="M50 55v11c0 10 7 15 15 15h5" fill="none" stroke="#587685" stroke-width="7"/><circle cx="76" cy="81" r="9" fill="#ef8ea7"/>',"#eef5f7"],
      thermometer:['<rect x="44" y="18" width="12" height="49" rx="6" fill="#e8f5f7" stroke="#6fa5b3" stroke-width="4"/><circle cx="50" cy="75" r="14" fill="#ef776c"/><rect x="48" y="34" width="4" height="36" rx="2" fill="#ef776c"/>',"#eef8f8"],
      bandage:['<rect x="20" y="41" width="60" height="22" rx="11" fill="#f2c49c" transform="rotate(-12 50 52)"/><rect x="41" y="42" width="18" height="18" rx="5" fill="#e2aa79" transform="rotate(-12 50 51)"/>',"#fff3e8"],
      brush:['<rect x="27" y="30" width="46" height="34" rx="15" fill="#bca3dc"/><path d="M50 64v22" stroke="#806aa6" stroke-width="9" stroke-linecap="round"/><path d="M35 28v-9M43 27v-10M51 27V16M59 27v-10M67 28v-9" stroke="#806aa6" stroke-width="4"/>',"#f5f0ff"],
      water:['<path d="M50 16c15 21 25 33 25 47 0 15-11 25-25 25S25 78 25 63c0-14 10-26 25-47Z" fill="#79c9ec"/><path d="M40 66c3 8 9 11 17 9" fill="none" stroke="#dff6ff" stroke-width="5" stroke-linecap="round"/>',"#eefaff"],
      treat:['<path d="M30 38c-12-9-21 8-10 17-11 9-2 26 10 17l40 0c12 9 21-8 10-17 11-9 2-26-10-17Z" fill="#d4a66b"/><circle cx="42" cy="55" r="3" fill="#a8794e"/><circle cx="58" cy="55" r="3" fill="#a8794e"/>',"#fff3e3"],
      ball:['<circle cx="50" cy="50" r="29" fill="#7fc6e4"/><path d="M25 35q25 17 50 0M25 65q25-17 50 0" fill="none" stroke="#effaff" stroke-width="5"/>',"#eefaff"],
      bear:['<circle cx="50" cy="53" r="29" fill="#c79869"/><circle cx="28" cy="29" r="12" fill="#b6865c"/><circle cx="72" cy="29" r="12" fill="#b6865c"/><circle cx="40" cy="49" r="4" fill="#463f3a"/><circle cx="60" cy="49" r="4" fill="#463f3a"/><ellipse cx="50" cy="62" rx="12" ry="9" fill="#e5bd91"/><circle cx="50" cy="58" r="4" fill="#5c4940"/>',"#fbf0e4"],
      butterfly:['<path d="M48 50c-10-20-31-20-30-3 0 13 13 17 27 13-13 9-13 27 1 27 12 0 15-16 7-31Z" fill="#ef8fb2"/><path d="M52 50c10-20 31-20 30-3 0 13-13 17-27 13 13 9 13 27-1 27-12 0-15-16-7-31Z" fill="#8fc6e7"/><rect x="47" y="34" width="6" height="38" rx="3" fill="#5d5f68"/><path d="M49 36c-4-8-9-10-13-9M51 36c4-8 9-10 13-9" fill="none" stroke="#5d5f68" stroke-width="3"/>',"#fff0f6"],
      fish:['<path d="M24 52c12-22 43-25 58-3-15 23-45 25-58 3Z" fill="#76c0dd"/><path d="M24 52 10 36v32Z" fill="#5ba8c8"/><circle cx="68" cy="46" r="4" fill="#354f5a"/><path d="M47 45q7 7 0 14" fill="none" stroke="#dff6ff" stroke-width="4"/>',"#eefaff"]
    }; return m[kind];
  }
  function sized(base,scale=1){ const inner=(food(base)||simple(base)||simple(base.replace(/-big|-small/,""))||food(base.replace(/-big|-small/,""))); return inner?inner:null; }
  window.SeowooV2Icon=(name)=>{
    let sizeClass="";
    if(name.endsWith("-big")) sizeClass=" icon-big";
    if(name.endsWith("-small")) sizeClass=" icon-small";
    const base=name.replace(/-big|-small/,"");
    const found=food(base)||simple(base);
    if(found) return `<span class="v2-icon${sizeClass}">${wrap(found[0],found[1])}</span>`;
    if(name.endsWith("-half")){
      const b=name.replace("-half","");
      const f=food(b)||simple(b);
      if(f) return `<span class="v2-icon icon-half">${wrap(f[0],f[1])}</span>`;
    }
    if(name==="ball"||base==="ball") return '<span class="v2-icon'+sizeClass+'">'+wrap('<circle cx="50" cy="50" r="29" fill="#7fc6e4"/><path d="M25 35q25 17 50 0M25 65q25-17 50 0" fill="none" stroke="#effaff" stroke-width="5"/>',"#eefaff")+'</span>';
    return '<span class="v2-icon">'+wrap('<circle cx="50" cy="50" r="26" fill="#9fc9d6"/><circle cx="50" cy="50" r="10" fill="#fff"/>',"#f2f8fa")+'</span>';
  };
})();