(() => {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .then((registration) => {
      const update = () => registration.update().catch(() => {});
      update();
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) update();
      });
      window.addEventListener("online", update);
    }).catch(() => {});
})();
