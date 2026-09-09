/* v5.12.0 — same selected city image, no style MutationObserver or per-frame layout reads. */
(() => {
  'use strict';
  const HEIGHTS = [249, 249, 248, 249, 249];
  const RATIO = HEIGHTS.reduce((sum, height) => sum + height, 0) / 700;
  window.SeowooPanorama = {
    mount(view) {
      const strip = document.createElement('div');
      strip.className = 'elevator-photo-strip'; strip.setAttribute('aria-hidden', 'true');
      let floor = 1, shift = 0, alive = true, failed = false, loaded = 0;
      let resizeFrame = 0, observer = null;
      function paint() {
        if (!alive) return;
        const progress = Math.max(0, Math.min(1, (floor - 1) / 19));
        // Ascending: the exterior moves DOWN; descending is the exact reverse.
        strip.style.transform = `translate3d(0,${(-shift * (1 - progress)).toFixed(3)}px,0)`;
        if (loaded !== HEIGHTS.length || failed) view.style.backgroundPosition = `center ${(1 - progress) * 100}%`;
      }
      function resize() {
        if (!alive || !view.isConnected) return;
        const width = view.clientWidth, height = view.clientHeight;
        // A taller virtual floor creates a quicker exterior without speeding up the floor counter.
        // Keep a meaningful travel range even on narrow, tall tablet/phone windows.
        const zoom = window.innerWidth > window.innerHeight ? 1.5 : 1.18;
        const scaledWidth = Math.max(width * zoom, height * 2.05 / RATIO);
        strip.style.width = `${scaledWidth}px`;
        strip.style.left = `${(width - scaledWidth) / 2}px`;
        shift = Math.max(0, scaledWidth * RATIO - height);
        view.style.backgroundSize = `auto ${scaledWidth * RATIO}px`;
        paint();
      }
      function requestResize() {
        if (!alive || resizeFrame) return;
        resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); });
      }
      HEIGHTS.forEach((height, i) => {
        const img = document.createElement('img');
        img.alt = ''; img.width = 700; img.height = height;
        img.decoding = 'async'; img.draggable = false;
        img.addEventListener('load', () => {
          if (!alive) return;
          loaded++; if (loaded === HEIGHTS.length && !failed) strip.classList.add('ready');
        }, { once: true });
        img.addEventListener('error', () => {
          failed = true; strip.classList.remove('ready');
          if (alive) { view.dataset.fallback = 'true'; paint(); }
        }, { once: true });
        img.src = `/assets/elevator-city-tile-${i}.avif?v=5.12.0`;
        strip.appendChild(img);
      });
      view.replaceChildren(strip);
      if ('ResizeObserver' in window) { observer = new ResizeObserver(requestResize); observer.observe(view); }
      window.addEventListener('resize', requestResize, { passive: true });
      window.visualViewport?.addEventListener('resize', requestResize, { passive: true });
      resize();
      return {
        setFloor(value) { floor = value; paint(); }, resize,
        destroy() {
          alive = false; observer?.disconnect();
          if (resizeFrame) cancelAnimationFrame(resizeFrame);
          window.removeEventListener('resize', requestResize);
          window.visualViewport?.removeEventListener('resize', requestResize);
          strip.remove();
        }
      };
    }
  };
})();
