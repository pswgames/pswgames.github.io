/* Small lifecycle-owned Pointer Events controller shared by the story games. */
(() => {
  "use strict";
  function bind(root, options) {
    const abort = new AbortController(), signal = abort.signal;
    let drag = null, frame = 0, settling = false, timer = 0, ghost = null;
    const clamp = (v, a, b) => Math.max(a, Math.min(Math.max(a, b), v));
    const clearOver = () => root.querySelectorAll(".drag-over").forEach(z => z.classList.remove("drag-over"));
    function target(x, y) {
      const zones = [...root.querySelectorAll(options.zones)];
      const direct = document.elementFromPoint?.(x, y)?.closest(options.zones);
      if (direct && root.contains(direct)) return direct;
      return zones.find(z => {
        const r = z.getBoundingClientRect(), pad = options.padding ?? 12;
        return r.width && x >= r.left-pad && x <= r.right+pad && y >= r.top-pad && y <= r.bottom+pad;
      });
    }
    function draw() {
      frame = 0;
      if (!drag) return;
      const d = drag, b = options.bounds?.(d.item) || {left:0, top:0, right:innerWidth, bottom:innerHeight};
      const left = clamp(d.x-d.ox, b.left, b.right-d.rect.width);
      const top = clamp(d.y-d.oy, b.top, b.bottom-d.rect.height);
      d.ghost.style.transform = `translate3d(${left-d.rect.left}px,${top-d.rect.top}px,0)`;
      clearOver();
      const zone = target(d.x, d.y);
      if (zone && options.accept(d.item, zone)) zone.classList.add("drag-over");
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      drag.x = e.clientX; drag.y = e.clientY;
      drag.moved ||= Math.hypot(drag.x-drag.sx, drag.y-drag.sy) > 6;
      if (!frame) frame = requestAnimationFrame(draw);
    }
    function end(e) {
      if (!drag || (e.pointerId != null && e.pointerId !== drag.id)) return;
      const d = drag;
      if (e.type === "pointerup") { d.x=e.clientX; d.y=e.clientY; }
      drag = null; cancelAnimationFrame(frame); frame=0; clearOver();
      try { d.item.releasePointerCapture?.(d.id); } catch {}
      const cancelled = e.type !== "pointerup", zone = cancelled ? null : target(d.x,d.y);
      const ok = d.moved && zone && options.accept(d.item, zone);
      settling = true;
      const dest = ok ? zone.getBoundingClientRect() : d.rect;
      const dx = ok ? dest.left+(dest.width-d.rect.width)/2-d.rect.left : 0;
      const dy = ok ? dest.top+(dest.height-d.rect.height)/2-d.rect.top : 0;
      d.ghost.style.transition = "transform 160ms ease-out, opacity 160ms ease-out";
      d.ghost.style.transform = `translate3d(${dx}px,${dy}px,0) scale(${ok ? .9 : 1})`;
      timer = setTimeout(() => {
        d.ghost.remove(); ghost=null; d.item.classList.remove("pointer-dragging"); settling=false;
        if (cancelled) return;
        if (ok) options.drop(d.item, zone);
        else if (!d.moved) options.tap?.(d.item);
        else options.reject?.(d.item, zone);
      }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 170);
    }
    root.addEventListener("pointerdown", e => {
      const item=e.target.closest(options.items);
      if (!item || item.disabled || drag || settling || (e.button != null && e.button !== 0) || e.isPrimary === false) return;
      e.preventDefault();
      options.start?.(item);
      const rect=item.getBoundingClientRect(); ghost=item.cloneNode(true);
      ghost.removeAttribute("id"); ghost.setAttribute("aria-hidden","true"); ghost.tabIndex=-1;
      ghost.classList.add("pointer-ghost");
      Object.assign(ghost.style,{position:"fixed",left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height+"px",margin:"0",zIndex:"10000",pointerEvents:"none",transform:"translate3d(0,0,0)"});
      document.body.appendChild(ghost); item.classList.add("pointer-dragging");
      try {item.setPointerCapture?.(e.pointerId);} catch {}
      drag={item,ghost,rect,id:e.pointerId,ox:e.clientX-rect.left,oy:e.clientY-rect.top,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};
    },{signal});
    document.addEventListener("pointermove",move,{signal,passive:false});
    document.addEventListener("pointerup",end,{signal});
    document.addEventListener("pointercancel",end,{signal});
    root.addEventListener("lostpointercapture",e=>{if(drag) end(e);},{signal});
    window.addEventListener("blur",()=>end({type:"cancel"}),{signal});
    window.addEventListener("resize",()=>end({type:"cancel"}),{signal});
    document.addEventListener("visibilitychange",()=>{if(document.hidden)end({type:"cancel"});},{signal});
    root.addEventListener("dragstart",e=>e.preventDefault(),{signal});
    return () => {abort.abort(); clearTimeout(timer); cancelAnimationFrame(frame); drag?.item.classList.remove("pointer-dragging"); ghost?.remove(); clearOver(); drag=null;};
  }
  window.SeowooPointerDrag = {bind};
})();
