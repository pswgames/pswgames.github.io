/* Local scene files, one compositor transform, no per-frame layout reads. */
(() => {
  "use strict";
  const scenes = [
    { id: "seoul", name: "서울", file: "seoul-night.webp", travel: 0.48 },
    { id: "tokyo", name: "도쿄", file: "tokyo.webp" },
    { id: "newyork", name: "뉴욕", file: "newyork.webp" },
    { id: "paris", name: "파리", file: "paris.webp" },
    { id: "hongkong", name: "홍콩", file: "hongkong.webp" },
    { id: "dubai", name: "두바이", file: "dubai.webp" },
    { id: "singapore", name: "싱가포르", file: "singapore.webp" },
    { id: "osaka", name: "비 오는 도시", file: "osaka.webp" },
    { id: "snow", name: "눈 내린 도시", file: "snow.webp" },
    { id: "dawn", name: "새벽 도시", file: "dawn.webp" },
  ];
  let selected = "seoul",
    active = null;

  function upgradeElevatorUi(view) {
    const shell = view.closest(".elevator-shell");
    const layout = shell?.closest(".elevator-layout");
    const cabin = shell?.querySelector(".glass-cabin");
    const panel = shell?.querySelector(".floor-panel");
    const display = shell?.querySelector(".elevator-display");
    const consoleBox = shell?.querySelector(".elevator-console");
    if (!shell || !layout || !cabin || !panel || !display || !consoleBox) return;

    layout.querySelector(".city-selector")?.remove();

    const floorButtons = [...panel.querySelectorAll("[data-floor]")].sort(
      (a, b) => Number(a.dataset.floor) - Number(b.dataset.floor),
    );
    let main = panel.querySelector(".floor-main");
    if (!main) {
      main = document.createElement("div");
      main.className = "floor-main";
      panel.prepend(main);
    }
    if (floorButtons.length) main.replaceChildren(...floorButtons);
    panel.querySelector(".more-floors")?.remove();

    if (display.parentElement !== cabin) cabin.append(display);
    if (consoleBox.parentElement !== cabin) cabin.append(consoleBox);

    shell.classList.add("fullglass-shell");
    display.classList.add("floating-display");
    consoleBox.classList.add("floating-console");
    panel.classList.add("floating-panel");

    const message = shell.querySelector("#elevatorMsg");
    if (message) {
      message.textContent = shell.querySelector("#elevatorFloor")?.textContent
        ? `${shell.querySelector("#elevatorFloor").textContent}층`
        : "1층";
    }

    if (!document.getElementById("seowoo-elevator-v702")) {
      const style = document.createElement("style");
      style.id = "seowoo-elevator-v702";
      style.textContent = `
        .theme-elevator .elevator-layout{
          max-width:none;
          width:100%;
          margin:auto;
          display:block;
        }
        .theme-elevator .elevator-shell.fullglass-shell{
          position:relative;
          height:calc(100svh - 112px);
          min-height:640px;
          max-height:none;
          grid-template-columns:1fr;
          grid-template-rows:1fr;
          gap:0;
          padding:14px;
          border-radius:32px;
          background:linear-gradient(180deg,#22374e 0%,#17283b 100%);
          border:3px solid rgba(208,227,245,.44);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.08),
            0 18px 40px rgba(6,18,31,.28);
          overflow:hidden;
        }
        .theme-elevator .glass-cabin{
          position:relative;
          min-height:0;
          height:100%;
          border-radius:24px;
          border:2px solid rgba(214,236,255,.45);
          background:rgba(7,22,38,.22);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.1),
            inset 0 0 30px rgba(0,0,0,.18);
          overflow:hidden;
        }
        .theme-elevator .outside-view{
          position:absolute;
          inset:0;
          background:#183959;
        }
        .theme-elevator .elevator-panorama-image{
          position:absolute;
          left:50%;
          top:0;
          max-width:none;
          will-change:transform;
          user-select:none;
        }
        .theme-elevator .cabin-frame{
          inset:0;
          border-left:4px solid rgba(233,246,255,.42);
          border-right:4px solid rgba(233,246,255,.25);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.05),
            inset 0 0 28px rgba(255,255,255,.06);
        }
        .theme-elevator .door{
          width:50.2%;
          background:linear-gradient(95deg,rgba(217,240,250,.16),rgba(200,236,255,.08) 68%,rgba(235,247,255,.22));
          border:1px solid rgba(202,235,255,.44);
          box-shadow:inset -4px 0 12px rgba(255,255,255,.1);
          backdrop-filter:blur(1px);
        }
        .theme-elevator .cabin-rail{
          bottom:8.5%;
          left:0;
          right:0;
          height:10px;
          background:linear-gradient(180deg,rgba(255,255,255,.92) 0%,rgba(181,201,219,.95) 45%,rgba(74,95,116,.92) 100%);
          box-shadow:0 3px 7px rgba(0,0,0,.25);
        }
        .theme-elevator .cabin-label{
          display:none;
        }
        .theme-elevator .floating-display{
          position:absolute;
          top:18px;
          left:50%;
          transform:translateX(-50%);
          z-index:4;
          grid-column:auto;
          justify-self:auto;
          align-self:auto;
          min-width:220px;
          padding:10px 26px;
          background:rgba(8,20,35,.34);
          border:1px solid rgba(156,214,255,.46);
          border-radius:20px;
          color:#f0f9ff;
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.08),
            0 10px 24px rgba(3,13,25,.2);
          backdrop-filter:blur(14px);
        }
        .theme-elevator .floating-console{
          position:absolute;
          left:18px;
          right:18px;
          bottom:18px;
          z-index:4;
          display:flex;
          flex-direction:column;
          gap:12px;
          padding:0;
          background:transparent;
          border-radius:0;
          overflow:visible;
          color:#f4fbff;
          pointer-events:none;
        }
        .theme-elevator .floating-console > p{
          width:max-content;
          max-width:min(60vw,240px);
          margin:0 auto;
          min-height:auto;
          padding:8px 18px;
          font-size:18px;
          line-height:1.2;
          border-radius:999px;
          background:rgba(8,20,35,.34);
          border:1px solid rgba(255,255,255,.2);
          backdrop-filter:blur(12px);
          text-align:center;
          box-shadow:0 8px 20px rgba(0,0,0,.16);
        }
        .theme-elevator .floating-panel{
          display:flex;
          flex-direction:column;
          gap:12px;
          pointer-events:auto;
          padding:14px;
          border-radius:24px;
          background:linear-gradient(180deg,rgba(11,25,42,.2) 0%,rgba(7,17,30,.36) 100%);
          border:1px solid rgba(255,255,255,.16);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.04),
            0 10px 28px rgba(4,14,24,.18);
          backdrop-filter:blur(16px);
        }
        .theme-elevator .floating-panel .floor-main{
          display:grid;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:10px;
        }
        .theme-elevator .floor-key{
          width:100%;
          aspect-ratio:auto;
          min-height:56px;
          max-height:none;
          border-radius:18px;
          background:rgba(22,52,79,.34);
          border:1px solid rgba(255,255,255,.22);
          color:#f5fbff;
          font-size:24px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.09),
            0 4px 12px rgba(0,0,0,.12);
          backdrop-filter:blur(10px);
        }
        .theme-elevator .floor-key.here{
          border-color:rgba(158,229,255,.78);
          color:#dff8ff;
          box-shadow:0 0 0 2px rgba(109,210,255,.24);
        }
        .theme-elevator .floor-key.selected,
        .theme-elevator .floor-key.queued{
          background:rgba(42,143,212,.72);
          border-color:rgba(226,248,255,.94);
          color:#fff;
          box-shadow:0 0 0 3px rgba(36,142,224,.24);
        }
        .theme-elevator .door-controls{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin-top:0;
          order:2;
        }
        .theme-elevator .door-control{
          min-height:56px;
          border-radius:18px;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(22,52,79,.34);
          color:#fff;
          backdrop-filter:blur(10px);
          box-shadow:0 4px 12px rgba(0,0,0,.12);
        }
        .theme-elevator .door-control.held{
          background:rgba(32,154,219,.74);
        }
        .theme-elevator .door-control:disabled{
          opacity:.4;
        }
        .theme-elevator .city-selector,
        .theme-elevator .more-floors{
          display:none !important;
        }
        @media (max-width: 1180px){
          .theme-elevator .elevator-shell.fullglass-shell{
            height:calc(100svh - 104px);
            min-height:620px;
            padding:12px;
          }
          .theme-elevator .floating-console{
            left:14px;
            right:14px;
            bottom:14px;
          }
          .theme-elevator .floating-panel .floor-main{
            grid-template-columns:repeat(5,minmax(0,1fr));
            gap:8px;
          }
          .theme-elevator .floor-key,
          .theme-elevator .door-control{
            min-height:52px;
            border-radius:16px;
            font-size:22px;
          }
        }
        @media (max-width: 860px){
          .theme-elevator .floating-display{
            top:14px;
            min-width:190px;
            padding:8px 20px;
          }
          .theme-elevator .floating-panel{
            padding:12px;
            gap:10px;
          }
          .theme-elevator .floating-panel .floor-main{
            grid-template-columns:repeat(4,minmax(0,1fr));
          }
          .theme-elevator .floor-key,
          .theme-elevator .door-control{
            min-height:48px;
            font-size:20px;
          }
          .theme-elevator .floating-console > p{
            font-size:16px;
          }
        }
      `;
      document.head.append(style);
    }
  }

  function mount(view) {
    upgradeElevatorUi(view);
    const pool = scenes.filter((scene) => scene.id !== selected);
    selected = (pool[Math.floor(Math.random() * pool.length)] || scenes[0]).id;

    let floor = 1,
      travel = 0,
      offset = 0,
      alive = true;
    const img = new Image();
    img.alt = "";
    img.draggable = false;
    img.className = "elevator-panorama-image";
    view.replaceChildren(img);
    function paint() {
      if (!alive) return;
      const progress = Math.max(0, Math.min(1, (floor - 1) / 19));
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      img.style.transform = `translate3d(-50%,${-offset - travel * (1 - (reduced ? Math.round(progress * 19) / 19 : progress))}px,0)`;
    }
    function resize() {
      const w = view.clientWidth,
        h = view.clientHeight;
      if (!w || !h) return;
      const scene = scenes.find((s) => s.id === selected) || scenes[0];
      const iw = img.naturalWidth || 1536,
        ih = img.naturalHeight || 1024;
      const extra = h * (scene.travel || 0.48),
        scale = Math.max(w / iw, (h + extra) / ih);
      const overflow = ih * scale - h;
      travel = Math.min(overflow, extra);
      offset = (overflow - travel) / 2;
      img.style.width = `${iw * scale}px`;
      img.style.height = `${ih * scale}px`;
      paint();
    }
    function change(id) {
      selected = scenes.some((s) => s.id === id) ? id : "seoul";
      const s = scenes.find((x) => x.id === selected);
      view.dataset.sceneName = s.name;
      img.src = `assets/cities/${s.file}`;
    }
    img.onload = resize;
    img.onerror = () => {
      img.onerror = null;
      img.src = "assets/elevator-city-v6.webp";
    };
    const ro = new ResizeObserver(resize);
    ro.observe(view);
    change(selected);
    active = { change };
    return {
      setFloor(v) {
        floor = v;
        paint();
      },
      resize,
      destroy() {
        alive = false;
        ro.disconnect();
        active = null;
        img.remove();
      },
    };
  }
  window.SeowooPanorama = {
    mount,
    scenes,
    choose(id) {
      selected = id;
      active?.change(id);
    },
    random() {
      const pool = scenes.filter((s) => s.id !== selected);
      const s = pool[Math.floor(Math.random() * pool.length)];
      this.choose(s.id);
      return s.id;
    },
    get selected() {
      return selected;
    },
  };
})();
