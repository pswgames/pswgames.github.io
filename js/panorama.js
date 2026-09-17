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

  function mount(view) {
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
      const extra = h * (scene.travel || 0.48) * 1.2,
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
