const STORAGE_KEY = "jj_survey_visualiser_state_v1";

let canvas = null;
let ctx = null;
let animationFrame = null;
let pollTimer = null;
let root = null;
let currentState = null;
let previousResponseIds = new Set();

let width = 0;
let height = 0;
let dpr = 1;
let lastFrame = 0;

let treeItems = [];

const TREE_BACKGROUND_SRC = "assets/tree-background.png";
const LEAF_IMAGE_SRC = "assets/leaf.png";
const FALLBACK_BACKGROUND_SIZE = { width: 1536, height: 864 };

let treeBackgroundImage = null;
let treeBackgroundReady = false;
let leafImage = null;
let leafImageReady = false;
let backgroundLayout = { x: 0, y: 0, width: 0, height: 0 };

const branchPaths = [
  [[0.48, 0.71], [0.43, 0.66], [0.37, 0.64], [0.30, 0.63], [0.22, 0.64], [0.15, 0.67]],
  [[0.43, 0.66], [0.38, 0.69], [0.32, 0.70], [0.25, 0.72], [0.18, 0.72]],
  [[0.36, 0.64], [0.33, 0.59], [0.28, 0.55], [0.22, 0.54], [0.14, 0.54], [0.09, 0.55]],
  [[0.30, 0.63], [0.25, 0.58], [0.20, 0.52], [0.15, 0.49], [0.10, 0.47]],
  [[0.22, 0.54], [0.18, 0.50], [0.14, 0.47], [0.11, 0.43]],
  [[0.49, 0.58], [0.45, 0.53], [0.42, 0.49], [0.38, 0.46], [0.33, 0.41], [0.27, 0.37], [0.22, 0.35]],
  [[0.40, 0.48], [0.36, 0.48], [0.31, 0.50], [0.26, 0.49], [0.21, 0.47]],
  [[0.41, 0.47], [0.38, 0.42], [0.35, 0.35], [0.31, 0.30]],
  [[0.45, 0.47], [0.43, 0.40], [0.40, 0.33], [0.37, 0.26]],
  [[0.47, 0.45], [0.46, 0.36], [0.46, 0.27], [0.45, 0.19]],
  [[0.39, 0.37], [0.36, 0.32], [0.34, 0.27], [0.33, 0.21]],
  [[0.43, 0.34], [0.42, 0.27], [0.41, 0.22], [0.39, 0.17]],
  [[0.35, 0.36], [0.31, 0.36], [0.27, 0.33], [0.24, 0.29]],
  [[0.51, 0.55], [0.54, 0.47], [0.57, 0.39], [0.60, 0.31], [0.62, 0.24]],
  [[0.52, 0.45], [0.52, 0.36], [0.51, 0.29], [0.50, 0.20]],
  [[0.57, 0.40], [0.56, 0.33], [0.55, 0.27]],
  [[0.60, 0.31], [0.64, 0.26], [0.67, 0.21]],
  [[0.54, 0.48], [0.58, 0.50], [0.62, 0.48], [0.66, 0.44]],
  [[0.52, 0.69], [0.58, 0.63], [0.65, 0.60], [0.74, 0.59], [0.82, 0.61], [0.89, 0.64]],
  [[0.56, 0.64], [0.63, 0.65], [0.69, 0.68], [0.76, 0.69], [0.82, 0.72]],
  [[0.59, 0.61], [0.64, 0.55], [0.72, 0.51], [0.81, 0.51], [0.89, 0.54]],
  [[0.66, 0.57], [0.73, 0.54], [0.79, 0.48], [0.86, 0.42]],
  [[0.71, 0.52], [0.77, 0.47], [0.84, 0.40], [0.90, 0.36]],
  [[0.75, 0.47], [0.81, 0.47], [0.87, 0.49], [0.93, 0.51]],
  [[0.52, 0.58], [0.57, 0.53], [0.61, 0.48], [0.64, 0.40], [0.66, 0.32], [0.68, 0.23]],
  [[0.60, 0.48], [0.66, 0.46], [0.72, 0.42], [0.76, 0.36], [0.79, 0.27]],
  [[0.64, 0.40], [0.69, 0.36], [0.74, 0.31], [0.78, 0.25]],
  [[0.68, 0.44], [0.73, 0.40], [0.78, 0.38], [0.84, 0.34]],
  [[0.71, 0.40], [0.76, 0.34], [0.81, 0.29], [0.85, 0.24]],
  [[0.78, 0.36], [0.83, 0.36], [0.88, 0.32], [0.92, 0.28]]
];

export function startTree(container, state) {
  stopTree(false);
  currentState = state;
  ensureTreeBackgroundImage();
  ensureLeafImage();

  container.innerHTML = `
    <section class="page fullscreen">
      <div id="treeApp" class="tree-app">
        <canvas id="treeCanvas"></canvas>
        <button class="tree-fullscreen-btn" id="treeFullscreenBtn" type="button">Full screen</button>
        <div class="tree-toast" id="treeToast">NEW GROWTH</div>
      </div>
    </section>
  `;

  root = container.querySelector("#treeApp");
  canvas = container.querySelector("#treeCanvas");
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  buildTreeFromResponses(state.responses || [], false);
  previousResponseIds = new Set((state.responses || []).map((r) => String(r.submission_id)));

  container.querySelector("#treeFullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) root.requestFullscreen?.();
  });
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  syncFullscreenButton();

  pollTimer = setInterval(pollStoredResponses, 350);
  lastFrame = performance.now();
  animationFrame = requestAnimationFrame(frame);

  return () => stopTree(false);
}

export function stopTree(clearMemory = true) {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (pollTimer) clearInterval(pollTimer);

  window.removeEventListener("resize", resizeCanvas);
  document.removeEventListener("fullscreenchange", syncFullscreenButton);

  canvas = null;
  ctx = null;
  root = null;
  currentState = null;
  animationFrame = null;
  pollTimer = null;
  treeItems = [];

  if (clearMemory) previousResponseIds = new Set();
}

function syncFullscreenButton() {
  const button = document.getElementById("treeFullscreenBtn");
  if (!button) return;
  button.hidden = Boolean(document.fullscreenElement);
}

function pollStoredResponses() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || !Array.isArray(stored.responses)) return;

    const storedIds = new Set(stored.responses.map((r) => String(r.submission_id)));
    let changed = storedIds.size !== previousResponseIds.size;

    if (!changed) {
      for (const id of storedIds) {
        if (!previousResponseIds.has(id)) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) return;

    currentState = { ...currentState, ...stored, responses: stored.responses };
    buildTreeFromResponses(stored.responses, true);
  } catch (error) {
    console.warn("Tree visualisation could not read stored state:", error);
  }
}

function resizeCanvas() {
  if (!canvas || !ctx) return;

  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const rect = canvas.parentElement?.getBoundingClientRect();
  width = Math.max(320, Math.floor(rect?.width || window.innerWidth));
  height = Math.max(420, Math.floor(rect?.height || window.innerHeight));

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateBackgroundLayout();

  if (currentState) buildTreeFromResponses(currentState.responses || [], false);
}

function buildTreeFromResponses(responses, animateNew) {
  const newIds = new Set(
    animateNew
      ? responses
          .filter((response) => !previousResponseIds.has(String(response.submission_id)))
          .map((response) => String(response.submission_id))
      : []
  );

  treeItems = responses.map((response, index) => createTreeItem(response, index, newIds.has(String(response.submission_id))));
  previousResponseIds = new Set(responses.map((r) => String(r.submission_id)));

  if (newIds.size) showToast("NEW GROWTH");
}

function createTreeItem(response, index, isNew) {
  const rng = createRng(String(response.submission_id || index));
  const branch = branchPaths[index % branchPaths.length];
  const sampled = sampleBranch(branch, randomRange(rng, 0.16, 0.96));
  const point = imagePointToCanvas(sampled.x, sampled.y);
  const scale = randomRange(rng, 0.48, 0.68) + sampled.y * 0.35;
  const part = response.answers?.treePart === "flower" ? "flower" : "leaf";

  return {
    id: response.submission_id,
    part,
    name: response.answers?.name || "",
    x: point.x,
    y: point.y,
    rotation: sampled.angle + randomRange(rng, -0.7, 0.7),
    scale,
    hue: randomRange(rng, -12, 12),
    leafHue: randomRange(rng, -24, 24),
    leafSaturation: randomRange(rng, 0.9, 1.32),
    leafBrightness: randomRange(rng, 0.88, 1.16),
    age: isNew ? 0 : 1,
    isNew
  };
}

function frame(now) {
  if (!ctx) return;

  const dt = Math.min(64, now - lastFrame);
  lastFrame = now;

  for (const item of treeItems) {
    if (item.age < 1) item.age = Math.min(1, item.age + dt / 900);
  }

  drawScene(now);
  animationFrame = requestAnimationFrame(frame);
}

function drawScene(now) {
  drawBackground();

  for (const item of treeItems) {
    drawTreeItem(item, now);
  }

  if (currentState?.settings?.showNames) {
    for (const item of treeItems) drawName(item);
  }
}

function drawBackground() {
  ctx.fillStyle = "#b4b1aa";
  ctx.fillRect(0, 0, width, height);

  if (!treeBackgroundReady || !treeBackgroundImage) return;

  updateBackgroundLayout();
  ctx.drawImage(
    treeBackgroundImage,
    backgroundLayout.x,
    backgroundLayout.y,
    backgroundLayout.width,
    backgroundLayout.height
  );
}

function ensureTreeBackgroundImage() {
  if (treeBackgroundImage || typeof Image === "undefined") return;

  treeBackgroundImage = new Image();
  treeBackgroundImage.onload = () => {
    treeBackgroundReady = true;
    updateBackgroundLayout();
    if (currentState) buildTreeFromResponses(currentState.responses || [], false);
    if (ctx) drawScene(performance.now());
  };
  treeBackgroundImage.src = TREE_BACKGROUND_SRC;

  if (treeBackgroundImage.complete && treeBackgroundImage.naturalWidth) {
    treeBackgroundReady = true;
  }
}

function ensureLeafImage() {
  if (leafImage || typeof Image === "undefined") return;

  leafImage = new Image();
  leafImage.onload = () => {
    leafImageReady = true;
    if (ctx) drawScene(performance.now());
  };
  leafImage.src = LEAF_IMAGE_SRC;

  if (leafImage.complete && leafImage.naturalWidth) {
    leafImageReady = true;
  }
}

function updateBackgroundLayout() {
  const sourceWidth = treeBackgroundReady && treeBackgroundImage?.naturalWidth
    ? treeBackgroundImage.naturalWidth
    : FALLBACK_BACKGROUND_SIZE.width;
  const sourceHeight = treeBackgroundReady && treeBackgroundImage?.naturalHeight
    ? treeBackgroundImage.naturalHeight
    : FALLBACK_BACKGROUND_SIZE.height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  backgroundLayout = {
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  };
}

function imagePointToCanvas(x, y) {
  if (!backgroundLayout.width || !backgroundLayout.height) updateBackgroundLayout();

  return {
    x: backgroundLayout.x + x * backgroundLayout.width,
    y: backgroundLayout.y + y * backgroundLayout.height
  };
}

function sampleBranch(points, progress) {
  const lengths = [];
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const current = points[i];
    const dx = (current[0] - previous[0]) * FALLBACK_BACKGROUND_SIZE.width;
    const dy = (current[1] - previous[1]) * FALLBACK_BACKGROUND_SIZE.height;
    const length = Math.hypot(dx, dy);

    lengths.push(length);
    total += length;
  }

  if (!total) {
    return { x: points[0][0], y: points[0][1], angle: 0 };
  }

  let target = total * progress;

  for (let i = 0; i < lengths.length; i++) {
    const previous = points[i];
    const current = points[i + 1];

    if (target <= lengths[i] || i === lengths.length - 1) {
      const segmentProgress = lengths[i] ? target / lengths[i] : 0;
      const x = previous[0] + (current[0] - previous[0]) * segmentProgress;
      const y = previous[1] + (current[1] - previous[1]) * segmentProgress;
      const angle = Math.atan2(
        (current[1] - previous[1]) * FALLBACK_BACKGROUND_SIZE.height,
        (current[0] - previous[0]) * FALLBACK_BACKGROUND_SIZE.width
      );

      return { x, y, angle };
    }

    target -= lengths[i];
  }

  const last = points[points.length - 1];
  return { x: last[0], y: last[1], angle: 0 };
}

function drawTreeItem(item, now) {
  const bloom = easeOutBack(item.age);
  const breathe = 1 + Math.sin(now * 0.0012 + item.x * 0.03) * 0.018;

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);
  ctx.scale(item.scale * bloom * breathe, item.scale * bloom * breathe);
  ctx.globalAlpha = Math.min(1, item.age * 1.3);

  if (item.part === "flower") drawFlower(item);
  else drawLeafCluster(item);

  ctx.restore();
}

function drawLeafCluster(item) {
  if (!leafImageReady || !leafImage) {
    drawFallbackLeaf(item);
    return;
  }

  const size = 144;
  const stemX = size * 0.08;
  const stemY = size * 0.89;

  ctx.save();
  ctx.filter = `hue-rotate(${item.leafHue}deg) saturate(${item.leafSaturation}) brightness(${item.leafBrightness})`;
  ctx.drawImage(leafImage, -stemX, -stemY, size, size);
  ctx.restore();
}

function drawFallbackLeaf(item) {
  ctx.fillStyle = `hsl(${112 + item.leafHue}, 45%, ${42 * item.leafBrightness}%)`;
  ctx.beginPath();
  ctx.ellipse(8, -8, 18, 7, -0.78, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlower(item) {
  const petals = ["#f0a7bc", "#f5becd", "#e88aae"];

  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 6);
    ctx.translate(9, 0);
    ctx.fillStyle = petals[i % petals.length];
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = "#f5d66f";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawName(item) {
  if (!item.name) return;

  ctx.save();
  ctx.globalAlpha = 0.74;
  ctx.fillStyle = "#2e4935";
  ctx.font = '12px Arial, "Helvetica Neue", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.name, item.x, item.y - 20 * item.scale);
  ctx.restore();
}

function showToast(text) {
  const toast = document.getElementById("treeToast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1200);
}

function createRng(seed) {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }

  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomRange(rng, min, max) {
  return rng() * (max - min) + min;
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}
