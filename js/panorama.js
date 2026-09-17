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
    const panel = shell?.querySelector(".floor-panel");
    if (!shell || !layout || !panel) return;

    layout.querySelector(".city-selector")?.remove();
    const main = panel.querySelector(".floor-main");
    const floorButtons = [...panel.querySelectorAll("[data-floor]")].sort(
      (a, b) => Number(a.dataset.floor) - Number(b.dataset.floor),
    );
    if (main && floorButtons.length) main.replaceChildren(...floorButtons);
    panel.querySelector(".more-floors")?.remove();

    const message = shell.querySelector("#elevatorMsg");
    if (message && /어디로/.test(message.textContent || "")) {
      const floor = shell.querySelector("#elevatorFloor")?.textContent || "1";
      message.textContent = `${floor}층`;
    }

    if (!document.getElementById("seowoo-elevator-v701")) {
      const style = document.createElement("style");
      style.id = "seowoo-elevator-v701";
      style.textContent = `
        .theme-elevator .elevator-layout{grid-template-columns:minmax(0,1fr);max-width:1380px}
        .theme-elevator .elevator-shell{grid-template-columns:minmax(0,1fr) 230px}
        .theme-elevator .glass-cabin{background:transparent;border-width:5px}
        .theme-elevator .outside-view{inset:0}
        .theme-elevator .cabin-frame{border-left-width:6px;border-right-width:6px}
        .theme-elevator .cabin-label{display:none}
        .theme-elevator .elevator-console{overflow:hidden;background:rgba(21,42,67,.76)}
        .theme-elevator .floor-panel{flex:1;justify-content:center}
        .theme-elevator .floor-main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-content:center}
        .theme-elevator .floor-key{min-height:46px;max-height:54px;font-size:21px}
        .theme-elevator .more-floors,.theme-elevator .city-selector{display:none!important}
        @media(max-width:900px){
          .theme-elevator .elevator-shell{grid-template-columns:minmax(0,1fr) 190px}
          .theme-elevator .floor-main{gap:6px}
          .theme-elevator .floor-key{min-height:42px;font-size:19px}
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
