/* Original, device-independent play rules. No images or pose data are stored. */
(() => {
  "use strict";
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function hands(landmarks, previous = []) {
    return [
      [15, 19],
      [16, 20],
    ].map(([wrist, finger], i) => {
      const a = landmarks?.[wrist],
        b = landmarks?.[finger];
      if (
        !a ||
        (a.visibility ?? 0) < 0.5 ||
        !Number.isFinite(a.x) ||
        !Number.isFinite(a.y)
      )
        return null;
      const useFinger =
        b &&
        (b.visibility ?? 0) >= 0.5 &&
        Number.isFinite(b.x) &&
        Number.isFinite(b.y);
      const point = {
        x: 1 - (useFinger ? (a.x + b.x) / 2 : a.x),
        y: useFinger ? (a.y + b.y) / 2 : a.y,
      };
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
      const old = previous[i];
      return old
        ? {
            x: old.x + (point.x - old.x) * 0.5,
            y: old.y + (point.y - old.y) * 0.5,
          }
        : point;
    });
  }
  // Match object-fit:contain exactly; the camera and hands use the same mirror.
  function project(point, width, height, videoWidth, videoHeight) {
    const scale = Math.min(width / videoWidth, height / videoHeight);
    return {
      x: (width - videoWidth * scale) / 2 + point.x * videoWidth * scale,
      y: (height - videoHeight * scale) / 2 + point.y * videoHeight * scale,
    };
  }
  function create(random = Math.random) {
    const state = {
      remaining: 30,
      score: 0,
      balloons: [],
      elapsed: 0,
      nextId: 0,
    };
    function spawn(near, occupied = []) {
      let x = near ? near.x + (random() - 0.5) * 0.18 : 0.25 + random() * 0.5;
      const y = near
        ? near.y + (random() - 0.5) * 0.14
        : 0.35 + random() * 0.35;
      for (const other of occupied) {
        if (Math.hypot((x - other.x) / 0.29, (y - other.y) / 0.38) < 1)
          x = other.x > 0.5 ? other.x - 0.34 : other.x + 0.34;
      }
      return {
        id: state.nextId++,
        x: clamp(x, 0.15, 0.85),
        y: clamp(y, 0.22, 0.78),
        color: Math.floor(random() * 4),
        wait: 0,
      };
    }
    state.balloons = [spawn()];
    state.balloons.push(spawn(null, state.balloons));
    return {
      state,
      step(seconds, active, points = []) {
        if (!active || state.remaining <= 0) return;
        const dt = clamp(seconds, 0, 0.1);
        state.remaining = Math.max(0, state.remaining - dt);
        state.elapsed += dt;
        state.balloons.forEach((b, index) => {
          if (!b.wait) return;
          b.wait -= dt;
          if (b.wait <= 0) {
            const visible = points.filter(Boolean);
            state.balloons[index] = spawn(
              visible.length ? visible[index % visible.length] : null,
              state.balloons.filter((other, i) => i !== index && !other.wait),
            );
          }
        });
      },
      pop(id) {
        const b = state.balloons.find((b) => b.id === id);
        if (!b || b.wait || state.remaining <= 0) return false;
        b.wait = 0.8;
        state.score++;
        return true;
      },
      hit(point, width, height) {
        const radius = Math.max(36, Math.min(width, height) * 0.115);
        return state.balloons
          .filter(
            (b) =>
              !b.wait &&
              Math.hypot(
                point.x - b.x * width,
                (point.y - b.y * height) * 0.86,
              ) <=
                radius + 22,
          )
          .map((b) => b.id);
      },
    };
  }
  window.SeowooBalloonEngine = { create, hands, project };
})();
