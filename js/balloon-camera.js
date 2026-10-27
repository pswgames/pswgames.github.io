/* External runtime loads only after camera-start. Official pinned assets. */
(() => {
  "use strict";
  const VERSION = "0.10.21";
  const ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
  const MODEL =
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
  async function open(video, signal) {
    let stream, model, timer;
    let disposed = false;
    const abortError = () =>
      new DOMException("Camera session ended", "AbortError");
    const close = () => {
      disposed = true;
      clearTimeout(timer);
      if (stream && video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      model?.close();
      model = null;
      signal.removeEventListener("abort", close);
    };
    signal.addEventListener("abort", close, { once: true });
    const check = () => {
      if (disposed || signal.aborted) throw abortError();
    };
    // A timeout/abort wins immediately, while late permissions/model creation
    // still release their own resources before returning.
    const setup = async () => {
      check();
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error("UNSUPPORTED");
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15, max: 20 },
        },
      });
      if (disposed || signal.aborted) {
        acquired.getTracks().forEach((t) => t.stop());
        throw abortError();
      }
      stream = acquired;
      video.srcObject = stream;
      await video.play();
      check();
      const { FilesetResolver, PoseLandmarker } = await import(
        `${ROOT}/vision_bundle.mjs`
      );
      check();
      const files = await FilesetResolver.forVisionTasks(`${ROOT}/wasm`);
      check();
      for (const delegate of ["GPU", "CPU"]) {
        try {
          const created = await PoseLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath: MODEL, delegate },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputSegmentationMasks: false,
          });
          if (disposed || signal.aborted) {
            created.close();
            throw abortError();
          }
          model = created;
          break;
        } catch (error) {
          check();
          if (delegate === "CPU") throw error;
        }
      }
      check();
      return {
        close,
        detect: (time) => model.detectForVideo(video, time).landmarks[0] || [],
        alive: () =>
          !!stream?.getVideoTracks().some((t) => t.readyState === "live"),
      };
    };
    let cancelWait;
    const stopped = new Promise((_, reject) => {
      cancelWait = () => reject(abortError());
      signal.addEventListener("abort", cancelWait, { once: true });
      timer = setTimeout(() => {
        close();
        reject(new Error("TIMEOUT"));
      }, 25000);
    });
    try {
      return await Promise.race([setup(), stopped]);
    } catch (error) {
      close();
      throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancelWait);
    }
  }
  window.SeowooBalloonCamera = { open };
})();
