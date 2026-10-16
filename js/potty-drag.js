(() => {
  "use strict";
  let dispose = null;
  function mount(main, state, action) {
    dispose?.();
    const scene=main.querySelector(".potty-drag-scene");
    if (!scene) return;
    dispose=window.SeowooPointerDrag.bind(scene,{
      items:".potty-child",zones:"[data-potty-zone]",padding:22,
      bounds:()=>scene.getBoundingClientRect(),
      start(){window.SeowooCore.audio.unlock();window.SeowooCore.audio.button();window.SeowooNarrator?.invalidate();},
      accept:(_,zone)=>!state.busy && zone.dataset.pottyZone===window.SEOWOO_INTERACTIONS.potty[state.step].zone,
      drop(_,zone){
        state.position={x:Number(zone.dataset.x),y:Number(zone.dataset.y)};
        state.motion=state.step===7?"washing":state.step===2?"sitting":state.step===5?"flushing":"celebrate";
        action(state.step===7?"wash":"next");
      },
      reject(){window.SeowooNarrator?.event("potty-drag-"+state.step);},
    });
  }
  window.SeowooPottyDrag={mount,unmount(){dispose?.();dispose=null;}};
})();
