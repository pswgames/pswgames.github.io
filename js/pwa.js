(() => {
  "use strict";
  if (!("serviceWorker" in navigator)) return;

  const appVersion =
    window.__SEOWOO_VERSION__ ||
    document.querySelector('meta[name="app-version"]')?.content ||
    "current";
  const workerUrl = `sw.js?app=${encodeURIComponent(appVersion)}`;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  let updateReloadArmed = hadController;

  const reloadOnce = () => {
    if (!updateReloadArmed || reloading) return;
    reloading = true;
    location.reload();
  };

  const activateWaiting = (registration) => {
    const worker = registration.waiting;
    if (!worker) return false;
    updateReloadArmed = true;
    worker.postMessage({ type: "SKIP_WAITING" });
    return true;
  };

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

  navigator.serviceWorker
    .register(workerUrl, { updateViaCache: "none" })
    .then((registration) => {
      const activeUrl = registration.active?.scriptURL || "";
      if (hadController && !activeUrl.includes(`app=${encodeURIComponent(appVersion)}`)) {
        updateReloadArmed = true;
      }

      registration.addEventListener("updatefound", () => {
        updateReloadArmed = !!navigator.serviceWorker.controller;
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") activateWaiting(registration);
        });
      });

      activateWaiting(registration);

      const update = () =>
        registration
          .update()
          .then(() => activateWaiting(registration))
          .catch(() => false);

      update();
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) update();
      });
      window.addEventListener("online", update);
    })
    .catch(() => {});
})();
