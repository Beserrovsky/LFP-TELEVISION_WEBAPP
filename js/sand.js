import { colourMap } from "./data.js";

const STORAGE_KEY = "jj_survey_visualiser_state_v1";

let canvas = null;
let ctx = null;
let animationFrame = null;
let pollTimer = null;
let root = null;

let width = 0;
let height = 0;
let dpr = 1;

let cols = 190;
let rows = 105;
let cellW = 1;
let cellH = 1;

let grid = [];
let activeGrains = [];
let emitters = [];

let currentState = null;
let previousResponseIds = new Set();

const positionMap = {
  left: 0.16,
  "centre-left": 0.33,
  centre: 0.5,
  "centre-right": 0.67,
  right: 0.84
};

const fallbackColours = [
  "#6df7ff",
  "#ff79d1",
  "#ffe66d",
  "#ffb057",
  "#8cff7a",
  "#c58cff",
  "#74a8ff"
];

export function startSandArt(container, state) {
  stopSandArt(false);

  currentState = state;

  container.innerHTML = `
    <section class="page fullscreen">
      <div id="sandArtApp" class="retro-sand-app">
        <canvas id="sandCanvas"></canvas>

        <div class="sand-crt-overlay"></div>
        <div class="sand-vignette"></div>

        <div class="sand-top-panel">
          <div class="sand-card">
            <div class="sand-title">RESPONSES</div>
            <div class="sand-metric" id="sandResponseCount">${state.responses.length}</div>
            <div class="sand-subtext">ONE RESPONSE = ONE SAND STREAM</div>
          </div>

          <div class="sand-card">
            <div class="sand-title">MODE</div>
            <div class="sand-metric small">PIXEL</div>
            <div class="sand-subtext">TRICKLE DOWN AND SETTLE</div>
          </div>
        </div>

        <div class="sand-toast" id="sandToast">NEW SAND STREAM</div>

        <div class="sand-mini-controls">
          <h1>RETRO SAND ABSTRACT</h1>
          <p>Visualisation 2. Q4 controls sand colour. Q5 controls horizontal drop position. Sand trickles from the top and settles into the shared artwork.</p>

          <div class="row">
            <button id="sandFullscreenBtn">FULL SCREEN</button>
            <button class="secondary" id="sandHideUiBtn">HIDE UI</button>
          </div>
        </div>
      </div>
    </section>
  `;

  root = container.querySelector("#sandArtApp");
  canvas = container.querySelector("#sandCanvas");
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  buildArtworkFromResponses(state.responses || [], false);

  container.querySelector("#sandFullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      root.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  container.querySelector("#sandHideUiBtn").addEventListener("click", (event) => {
    root.classList.toggle("hide-ui");
    event.currentTarget.textContent = root.classList.contains("hide-ui") ? "SHOW UI" : "HIDE UI";
  });

  pollTimer = setInterval(pollStoredResponses, 350);
  animationFrame = requestAnimationFrame(frame);

  return () => stopSandArt(false);
}

export function stopSandArt(clearMemory = true) {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  window.removeEventListener("resize", resizeCanvas);

  canvas = null;
  ctx = null;
  root = null;
  currentState = null;

  grid = [];
  activeGrains = [];
  emitters = [];

  if (clearMemory) {
    previousResponseIds = new Set();
  }
}

function pollStoredResponses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const stored = JSON.parse(raw);
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

    currentState = {
      ...currentState,
      ...stored,
      responses: stored.responses
    };

    updateResponseCount(stored.responses.length);
    buildArtworkFromResponses(stored.responses, true);
  } catch (error) {
    console.warn("Sand visualisation could not read stored state:", error);
  }
}

function updateResponseCount(count) {
  const responseEl = document.getElementById("sandResponseCount");
  if (responseEl) responseEl.textContent = String(count);
}

function resizeCanvas() {
  if (!canvas || !ctx) return;

  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  const rect = canvas.parentElement?.getBoundingClientRect();

  width = Math.max(320, Math.floor(rect?.width || window.innerWidth));
  height = Math.max(420, Math.floor(rect?.height || window.innerHeight));

  cols = 190;
  rows = Math.max(90, Math.round(cols * (height / width)));
  cellW = width / cols;
  cellH = height / rows;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (currentState) {
    buildArtworkFromResponses(currentState.responses || [], false);
  }
}

function buildArtworkFromResponses(responses, animateNew) {
  createEmptyGrid();

  const responseIds = new Set(responses.map((r) => String(r.submission_id)));

  const newResponses = animateNew
    ? responses.filter((response) => !previousResponseIds.has(String(response.submission_id)))
    : [];

  const newIds = new Set(newResponses.map((r) => String(r.submission_id)));

  activeGrains = [];
  emitters = [];

  for (const response of responses) {
    if (newIds.has(String(response.submission_id))) continue;
    settleStaticBurst(response);
  }

  for (const response of newResponses) {
    createTrickleEmitter(response);
  }

  if (newResponses.length) {
    showToast("NEW SAND STREAM");
  }

  previousResponseIds = responseIds;
}

function createEmptyGrid() {
  grid = Array.from({ length: rows }, () => Array(cols).fill(null));

  for (let r = rows - 2; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((c + r) % 5 === 0) {
        grid[r][c] = "rgba(255,255,255,0.08)";
      }
    }
  }
}

function createTrickleEmitter(response) {
  const rng = makeRng(hashString(response.submission_id || `${Date.now()}`));
  const colour = responseColour(response, rng);
  const centre = responseColumn(response, rng);

  emitters.push({
    id: String(response.submission_id),
    centre,
    colour,
    rng,
    remaining: 135,
    cooldown: 0,
    rate: 2,
    spread: Math.max(2, Math.round(cols * 0.025))
  });
}

function updateEmitters() {
  const stillEmitting = [];

  for (const emitter of emitters) {
    emitter.cooldown -= 1;

    if (emitter.cooldown <= 0 && emitter.remaining > 0) {
      const grainsThisFrame = Math.min(emitter.rate, emitter.remaining);

      for (let i = 0; i < grainsThisFrame; i++) {
        const offset = Math.round((emitter.rng() - 0.5) * emitter.spread);
        const col = clamp(emitter.centre + offset, 2, cols - 3);

        activeGrains.push({
          col,
          row: -Math.floor(emitter.rng() * 10),
          colour: emitter.colour,
          drift: emitter.rng() < 0.5 ? -1 : 1,
          fallDelay: Math.floor(emitter.rng() * 3)
        });
      }

      emitter.remaining -= grainsThisFrame;
      emitter.cooldown = 1 + Math.floor(emitter.rng() * 3);
    }

    if (emitter.remaining > 0) {
      stillEmitting.push(emitter);
    }
  }

  emitters = stillEmitting;
}

function settleStaticBurst(response) {
  const rng = makeRng(hashString(response.submission_id || "static"));
  const colour = responseColour(response, rng);
  const centre = responseColumn(response, rng);
  const grainCount = 110;

  for (let i = 0; i < grainCount; i++) {
    let col = clamp(Math.round(centre + (rng() - 0.5) * cols * 0.08), 2, cols - 3);
    let row = 0;

    for (let step = 0; step < rows * 2; step++) {
      if (isEmpty(row + 1, col)) {
        row += 1;

        if (rng() < 0.1) {
          col = clamp(col + (rng() < 0.5 ? -1 : 1), 1, cols - 2);
        }

        continue;
      }

      const dir = rng() < 0.5 ? -1 : 1;

      if (isEmpty(row + 1, col + dir)) {
        row += 1;
        col += dir;
        continue;
      }

      if (isEmpty(row + 1, col - dir)) {
        row += 1;
        col -= dir;
        continue;
      }

      break;
    }

    placeGrain(row, col, colour);
  }
}

function updateActiveGrains() {
  if (!activeGrains.length) return;

  const stillActive = [];

  for (const grain of activeGrains) {
    if (grain.fallDelay > 0) {
      grain.fallDelay -= 1;
      stillActive.push(grain);
      continue;
    }

    let row = grain.row;
    let col = grain.col;
    let settled = false;

    if (row < 0) {
      row += 1;
      grain.row = row;
      stillActive.push(grain);
      continue;
    }

    const steps = Math.random() < 0.22 ? 2 : 1;

    for (let i = 0; i < steps; i++) {
      if (isEmpty(row + 1, col)) {
        row += 1;

        if (Math.random() < 0.08) {
          const driftCol = clamp(col + grain.drift, 1, cols - 2);
          if (isEmpty(row, driftCol)) {
            col = driftCol;
          }
        }

        continue;
      }

      const firstDir = Math.random() < 0.5 ? -1 : 1;

      if (isEmpty(row + 1, col + firstDir)) {
        row += 1;
        col += firstDir;
        continue;
      }

      if (isEmpty(row + 1, col - firstDir)) {
        row += 1;
        col -= firstDir;
        continue;
      }

      settled = true;
      break;
    }

    grain.row = row;
    grain.col = clamp(col, 0, cols - 1);

    if (settled || row >= rows - 2) {
      placeGrain(row, grain.col, grain.colour);
    } else {
      stillActive.push(grain);
    }
  }

  activeGrains = stillActive;
}

function isEmpty(row, col) {
  if (col < 0 || col >= cols) return false;
  if (row < 0) return true;
  if (row >= rows) return false;
  return !grid[row]?.[col];
}

function placeGrain(row, col, colour) {
  const r = clamp(Math.round(row), 0, rows - 1);
  const c = clamp(Math.round(col), 0, cols - 1);

  if (grid[r]) {
    grid[r][c] = colour;
  }
}

function drawBackground(time) {
  ctx.clearRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#120922");
  grad.addColorStop(0.42, "#17102d");
  grad.addColorStop(1, "#08050f");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += cellW * 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += cellH * 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.font = '12px "Courier New", monospace';

  for (let i = 0; i < 30; i++) {
    const x = (i * 137 + time * 0.006) % width;
    const y = (i * 91) % Math.max(1, height * 0.7);
    ctx.fillText(i % 3 === 0 ? "+" : ".", x, y);
  }
}

function drawDropGuides() {
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = "center";

  const labels = [
    ["left", "LEFT"],
    ["centre-left", "C-LEFT"],
    ["centre", "CENTRE"],
    ["centre-right", "C-RIGHT"],
    ["right", "RIGHT"]
  ];

  for (const [key, label] of labels) {
    const x = positionMap[key] * width;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillText(label, x, 22);
    ctx.fillRect(x - 1, 30, 2, 10);
  }

  ctx.textAlign = "left";
}

function drawGrid() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const colour = grid[r][c];
      if (!colour) continue;

      ctx.fillStyle = colour;
      ctx.fillRect(
        Math.floor(c * cellW),
        Math.floor(r * cellH),
        Math.ceil(cellW),
        Math.ceil(cellH)
      );
    }
  }
}

function drawActiveGrains() {
  for (const grain of activeGrains) {
    if (grain.row < 0) continue;

    ctx.fillStyle = grain.colour;
    ctx.fillRect(
      Math.floor(grain.col * cellW),
      Math.floor(grain.row * cellH),
      Math.ceil(cellW),
      Math.ceil(cellH)
    );
  }
}

function drawEmitters() {
  for (const emitter of emitters) {
    const x = emitter.centre * cellW;

    ctx.fillStyle = emitter.colour;
    ctx.fillRect(x - 3, 0, 6, 14);

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x - 1, 14, 2, 18);
  }
}

function frame(time) {
  if (!ctx) return;

  updateEmitters();
  updateActiveGrains();

  drawBackground(time);
  drawDropGuides();
  drawGrid();
  drawActiveGrains();
  drawEmitters();

  animationFrame = requestAnimationFrame(frame);
}

function responseColour(response, rng = Math.random) {
  const raw =
    response?.answers?.artColour ||
    response?.answers?.sandColour ||
    response?.answers?.fishColour;

  if (raw && colourMap[raw]) return colourMap[raw];
  if (raw && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;

  return fallbackColours[Math.floor(rng() * fallbackColours.length)];
}

function responseColumn(response, rng = Math.random) {
  const raw =
    response?.answers?.artXPosition ||
    response?.answers?.xPosition ||
    response?.answers?.position;

  const normalised = String(raw || "centre").toLowerCase();
  const fraction = positionMap[normalised] ?? 0.5;
  const jitter = (rng() - 0.5) * cols * 0.05;

  return clamp(Math.round(fraction * cols + jitter), 4, cols - 5);
}

function showToast(text) {
  const toast = document.getElementById("sandToast");
  if (!toast) return;

  toast.textContent = text;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1200);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(value) {
  let hash = 2166136261;
  const str = String(value ?? "");

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function makeRng(seed) {
  let t = seed >>> 0;

  return function rng() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}