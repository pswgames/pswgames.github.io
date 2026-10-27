/* One session owns its camera, model, animation, observers and listeners. */
(() => {
  "use strict";
  const E = window.SeowooBalloonEngine;
  let current = null;
  function mount({ main, header }) {
    unmount();
    const K = window.SeowooCore;
    const lifetime = new AbortController();
    let session = null,
      camera = null,
      frame = 0,
      generation = 0,
      mode = "touch",
      phase = "ready";
    let game = E.create(),
      points = [],
      last = 0,
      detectedAt = 0,
      videoTime = -1,
      lastPose = 0,
      lastPraise = -5;
    main.innerHTML = `<section class="play-screen balloon-world">${header("풍선톡톡")}
      <div class="balloon-layout"><aside class="balloon-panel">
        <span class="eyebrow">몸놀이 · 혼자서도 톡!</span><h2>손을 살짝, 풍선 톡톡</h2>
        <p class="balloon-parent">보호자와 함께 기기를 단단히 놓고 팔 주변을 비워 주세요. 앉아서 해도 좋아요. 뛰거나 세게 치지 않아요.</p>
        <p class="balloon-privacy">카메라는 놀이 중 기기 안에서만 사용해요. 영상·동작을 저장하거나 전송하지 않고 마이크는 켜지 않아요. 처음에는 인터넷으로 동작 인식 도구를 받아요.</p>
        <div class="balloon-start"><button class="btn primary" data-balloon-camera>카메라로 시작</button><button class="btn soft" data-balloon-touch>손가락으로 시작</button></div>
        <div class="balloon-hud"><span>놀이 <b data-balloon-time>30</b>초</span><span>톡톡 <b data-balloon-score>0</b></span></div>
        <p class="balloon-status" role="status" data-balloon-status>30초 동안 천천히 놀아요. 놓쳐도 괜찮아!</p>
        <div class="balloon-controls"><button class="btn soft" data-balloon-pause hidden>잠깐 쉬기</button><button class="btn primary" data-balloon-resume hidden>이어서 하기</button><button class="btn soft" data-balloon-restart hidden>다시 놀기</button><button class="btn soft" data-balloon-switch hidden>손가락 놀이로</button></div>
      </aside><div class="balloon-stage" aria-label="풍선 놀이판">
        <video class="balloon-video" autoplay muted playsinline aria-hidden="true"></video>
        <div class="balloon-cloud cloud-one" aria-hidden="true"></div><div class="balloon-cloud cloud-two" aria-hidden="true"></div>
        <div class="balloon-toys"></div><canvas class="balloon-hands" aria-hidden="true"></canvas>
        <div class="balloon-stage-note" data-balloon-note>반가워, 서우야!<br>준비되면 시작해 볼까?</div>
      </div></div></section>`;
    const root = main.querySelector(".balloon-world"),
      stage = root.querySelector(".balloon-stage"),
      video = root.querySelector("video"),
      canvas = root.querySelector("canvas");
    const $ = (s) => root.querySelector(s);
    const status = (text) => {
      if ($("[data-balloon-status]").textContent !== text)
        $("[data-balloon-status]").textContent = text;
    };
    const note = (text) => {
      $("[data-balloon-note]").textContent = text;
      $("[data-balloon-note]").hidden = !text;
    };
    function controls() {
      root.dataset.phase = phase;
      root.dataset.mode = mode;
      $(".balloon-start").hidden = phase !== "ready" && phase !== "error";
      $("[data-balloon-pause]").hidden = !["playing", "loading"].includes(
        phase,
      );
      $("[data-balloon-resume]").hidden = phase !== "paused";
      $("[data-balloon-restart]").hidden = ![
        "playing",
        "paused",
        "done",
      ].includes(phase);
      $("[data-balloon-switch]").hidden =
        mode !== "camera" || phase === "ready";
      video.hidden = mode !== "camera" || phase !== "playing";
    }
    function release() {
      generation++;
      cancelAnimationFrame(frame);
      frame = 0;
      session?.abort();
      session = null;
      camera?.close();
      camera = null;
      points = [];
      detectedAt = 0;
      lastPose = 0;
      videoTime = -1;
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
    function pause() {
      if (!["loading", "playing"].includes(phase)) return;
      release();
      phase = "paused";
      controls();
      paint();
      K.audio.stopAll();
      window.SeowooNarrator?.reset();
      status("잠깐 쉬고 있어요. 준비되면 이어서 해요.");
      note("잠깐 쉬는 중");
    }
    function paint() {
      $("[data-balloon-time]").textContent = Math.ceil(game.state.remaining);
      $("[data-balloon-score]").textContent = game.state.score;
      const toys = $(".balloon-toys");
      for (const old of [...toys.children])
        if (
          !game.state.balloons.some((b) => String(b.id) === old.dataset.balloon)
        )
          old.remove();
      for (const b of game.state.balloons) {
        let el = toys.querySelector(`[data-balloon="${b.id}"]`);
        if (!el) {
          el = document.createElement("button");
          el.className = `balloon-toy balloon-color-${b.color}`;
          el.dataset.balloon = b.id;
          el.setAttribute("aria-label", "풍선 톡!");
          el.innerHTML =
            '<span class="balloon-shine"></span><span class="balloon-smile">⌣</span><span class="balloon-string"></span>';
          toys.append(el);
        }
        el.style.left = `${b.x * 100}%`;
        el.style.top = `${b.y * 100}%`;
        el.hidden = b.wait > 0;
        el.disabled = phase !== "playing" || mode !== "touch";
        el.tabIndex = mode === "touch" && phase === "playing" ? 0 : -1;
      }
    }
    function pop(id) {
      if (phase !== "playing" || !game.pop(id)) return;
      K.audio.tone(660 + (game.state.score % 3) * 110, 0.12, "sine", 0.035);
      if (game.state.elapsed - lastPraise > 5) {
        K.audio.playVoice("common-0");
        lastPraise = game.state.elapsed;
      }
      status("톡! 잘했어, 서우야!");
      paint();
    }
    function done() {
      release();
      phase = "done";
      controls();
      paint();
      K.complete("balloon", { mode, pops: game.state.score });
      K.audio.success();
      window.SeowooNarrator?.event("all-done");
      status("손을 살짝 움직였네! 참 잘했어. 이제 편하게 쉬어도 좋아.");
      note("참 잘했어! 또 놀아 볼까?");
    }
    function fail(error) {
      release();
      phase = "error";
      controls();
      paint();
      const message =
        error.name === "NotAllowedError"
          ? "카메라 허용이 꺼져 있어요. 손가락으로도 놀 수 있어요."
          : error.message === "UNSUPPORTED"
            ? "이 브라우저에서는 카메라를 사용할 수 없어요. 손가락 놀이를 골라 주세요."
            : error.name === "NotFoundError"
              ? "카메라를 찾지 못했어요. 손가락으로 놀아 볼까요?"
              : error.name === "NotReadableError"
                ? "다른 앱이 카메라를 쓰고 있어요. 잠시 후 다시 해 주세요."
                : "동작 인식을 준비하지 못했어요. 연결을 확인하거나 손가락으로 놀아요.";
      status(message);
      note("손가락으로도 톡톡!");
    }
    function tick(now) {
      frame = 0;
      if (phase !== "playing") return;
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      let active = true;
      const rect = { width: stage.clientWidth, height: stage.clientHeight };
      if (mode === "camera") {
        try {
          if (!camera.alive()) throw new Error("CAMERA_ENDED");
          if (
            now - lastPose >= 80 &&
            video.readyState >= 2 &&
            video.currentTime !== videoTime
          ) {
            points = E.hands(camera.detect(now), points);
            videoTime = video.currentTime;
            lastPose = now;
            if (points.some(Boolean)) detectedAt = now;
          }
          active = points.some(Boolean) && now - detectedAt < 350;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, rect.width, rect.height);
          if (active) {
            if (!$("[data-balloon-note]").hidden)
              status("손이 보여요! 손을 살짝 움직여 봐.");
            note("");
            for (const p of points.filter(Boolean)) {
              const position = E.project(
                p,
                rect.width,
                rect.height,
                video.videoWidth || 640,
                video.videoHeight || 480,
              );
              ctx.beginPath();
              ctx.arc(position.x, position.y, 20, 0, Math.PI * 2);
              ctx.fillStyle = "#fff5b6cf";
              ctx.fill();
              ctx.lineWidth = 4;
              ctx.strokeStyle = "#fff";
              ctx.stroke();
              game.hit(position, rect.width, rect.height).forEach(pop);
            }
          } else {
            note("손이 보이면 다시 시작해요");
            status("시간은 잠깐 멈췄어요. 손을 화면 안에 편하게 보여 주세요.");
          }
        } catch (error) {
          fail(error);
          return;
        }
      }
      const near = points.filter(Boolean).map((p) => {
        const q = E.project(
          p,
          rect.width,
          rect.height,
          video.videoWidth || 640,
          video.videoHeight || 480,
        );
        return { x: q.x / rect.width, y: q.y / rect.height };
      });
      game.step(dt, active, near);
      paint();
      if (!game.state.remaining) {
        done();
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    async function start(nextMode, fresh) {
      release();
      mode = nextMode;
      if (fresh) {
        game = E.create();
        lastPraise = -5;
      }
      session = new AbortController();
      const token = generation;
      K.audio.unlock();
      K.audio.stopAll();
      window.SeowooNarrator?.reset();
      phase = mode === "camera" ? "loading" : "playing";
      controls();
      paint();
      status(
        mode === "camera"
          ? "카메라와 동작 인식을 준비해요. 처음에는 조금 걸릴 수 있어요."
          : "풍선을 손가락으로 살짝 톡! 놓쳐도 괜찮아.",
      );
      note(mode === "camera" ? "준비 중…" : "");
      if (mode === "camera") {
        try {
          const ready = await window.SeowooBalloonCamera.open(
            video,
            session.signal,
          );
          if (token !== generation) {
            ready.close();
            return;
          }
          camera = ready;
          phase = "playing";
          controls();
          status("편하게 앉아서 손을 살짝 움직여 봐!");
        } catch (error) {
          if (token === generation) fail(error);
          return;
        }
      }
      last = 0;
      resize();
      frame = requestAnimationFrame(tick);
    }
    function resize() {
      const r = { width: stage.clientWidth, height: stage.clientHeight },
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    }
    root.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.hasAttribute("data-balloon-camera")) start("camera", true);
        else if (
          b.hasAttribute("data-balloon-touch") ||
          b.hasAttribute("data-balloon-switch")
        )
          start("touch", true);
        else if (b.hasAttribute("data-balloon-restart")) start(mode, true);
        else if (b.hasAttribute("data-balloon-resume")) start(mode, false);
        else if (b.hasAttribute("data-balloon-pause")) pause();
        else if (b.hasAttribute("data-balloon") && mode === "touch")
          pop(+b.dataset.balloon);
      },
      { signal: lifetime.signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) pause();
      },
      { signal: lifetime.signal },
    );
    window.addEventListener("pagehide", pause, { signal: lifetime.signal });
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    // Parent / break dialogs pause the play before obscuring its controls.
    const dialogs = new MutationObserver((changes) => {
      for (const change of changes)
        for (const node of change.addedNodes)
          if (node.nodeType === 1 && node.matches("dialog"))
            dialogs.observe(node, {
              attributes: true,
              attributeFilter: ["open"],
            });
      if (document.querySelector("dialog[open]")) pause();
    });
    dialogs.observe(document.body, { childList: true });
    document
      .querySelectorAll("dialog")
      .forEach((d) =>
        dialogs.observe(d, { attributes: true, attributeFilter: ["open"] }),
      );
    current = {
      stop() {
        release();
        lifetime.abort();
        observer.disconnect();
        dialogs.disconnect();
      },
      pause,
      snapshot: () => ({
        phase,
        mode,
        remaining: game.state.remaining,
        score: game.state.score,
        running: !!frame,
      }),
    };
    controls();
    resize();
  }
  function unmount() {
    current?.stop();
    current = null;
  }
  window.SeowooBalloon = {
    mount,
    unmount,
    pause: () => current?.pause(),
    snapshot: () => current?.snapshot() || null,
  };
})();
