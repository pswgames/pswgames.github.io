/* Optional online test: official runtime + model on a generated blank canvas.
 * Does not access getUserMedia or any photograph. Not part of offline tests. */
const { chromium } = require("playwright"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Local origin without a listening server, for dynamic import CORS semantics.
    await page.route("http://localhost:4174/", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Synthetic model smoke</title>",
      }),
    );
    await page.goto("http://localhost:4174/");
    const result = await page.evaluate(async () => {
      navigator.mediaDevices.getUserMedia = () => {
        throw Error("No camera permitted in this test");
      };
      const root =
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21";
      const { FilesetResolver, PoseLandmarker } = await import(
        `${root}/vision_bundle.mjs`
      );
      const files = await FilesetResolver.forVisionTasks(`${root}/wasm`);
      const model = await PoseLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        outputSegmentationMasks: false,
      });
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#cdf0ff";
      ctx.fillRect(0, 0, 640, 480);
      try {
        return {
          poses: model.detectForVideo(canvas, performance.now()).landmarks
            .length,
          runtime: "0.10.21",
          delegate: "CPU",
          fixture: "generated blank canvas",
          realCameraUsed: false,
        };
      } finally {
        model.close();
      }
    });
    assert.equal(result.poses, 0);
    fs.mkdirSync(".test-results/balloon", { recursive: true });
    fs.writeFileSync(
      ".test-results/balloon/model-smoke.json",
      JSON.stringify(result, null, 2),
    );
    console.log(
      "PASS official MediaPipe runtime/model smoke on synthetic canvas",
      result,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
