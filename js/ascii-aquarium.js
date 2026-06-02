import { fishStyles, colourMap } from "./data.js";

let canvas = null;
let ctx = null;
let animationFrame = null;
let pollTimer = null;
let width = 0;
let height = 0;
let dpr = 1;
let creatures = [];
let bubbles = [];
let particles = [];
let currentState = null;
let tankRoot = null;
let previousResponseIds = new Set();

const STORAGE_KEY = "jj_survey_visualiser_state_v1";
const randomColours = Object.values(colourMap);
const sizeMap = {
  small: 16,
  medium: 26,
  large: 40
};
const fallbackNames = [
  "Ana", "Livia", "Felipe", "Joao", "Maya", "Rafa", "Theo", "Nina",
  "Alex", "Beatriz", "Bruno", "Camila", "Caio", "Clara", "Davi"
];

export function startAsciiAquarium(container, state) {
  stopAsciiAquarium();
  currentState = state;

  container.innerHTML = `
    <section class="page fullscreen">
      <div id="asciiAquariumApp" class="ascii-aquarium-app">
        <canvas id="asciiAquariumCanvas"></canvas>
        <div class="ascii-crt-overlay"></div>
        <div class="ascii-vignette"></div>

        <div class="ascii-top-panel">
          <div class="ascii-card">
            <div class="ascii-title">RESPONSES</div>
            <div class="ascii-metric" id="asciiAquariumResponseCount">${state.responses.length}</div>
            <div class="ascii-subtext">ONE RESPONSE = ONE CREATURE</div>
          </div>
          <div class="ascii-card">
            <div class="ascii-title">CREATURES</div>
            <div class="ascii-metric" id="asciiAquariumCreatureCount">${state.responses.length}</div>
            <div class="ascii-subtext">PUBLIC VISUAL ONLY</div>
          </div>
        </div>

        <div class="toast" id="asciiAquariumToast">NEW CREATURE ADDED</div>

        <div class="ascii-mini-controls">
          <h1>RETRO ASCII AQUARIUM</h1>
          <p>Completed submissions add chosen ASCII creatures to the tank.</p>
          <div class="row">
            <button id="asciiAquariumFullscreenBtn" type="button">FULL SCREEN</button>
            <button id="asciiAquariumHideUiBtn" type="button">HIDE UI</button>
          </div>
        </div>
      </div>
    </section>
  `;

  tankRoot = container.querySelector("#asciiAquariumApp");
  canvas = container.querySelector("#asciiAquariumCanvas");
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  buildCreaturesFromResponses(state.responses || []);
  previousResponseIds = new Set((state.responses || []).map((r) => String(r.submission_id)));
  updateResponseCount((state.responses || []).length);
  pollTimer = setInterval(pollStoredResponses, 350);

  container.querySelector("#asciiAquariumFullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) tankRoot.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  container.querySelector("#asciiAquariumHideUiBtn").addEventListener("click", (event) => {
    tankRoot.classList.toggle("hide-ui");
    event.currentTarget.textContent = tankRoot.classList.contains("hide-ui") ? "SHOW UI" : "HIDE UI";
  });

  animationFrame = requestAnimationFrame(frame);
  return stopAsciiAquarium;
}

export function stopAsciiAquarium() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (pollTimer) clearInterval(pollTimer);
  window.removeEventListener("resize", resizeCanvas);
  animationFrame = null;
  pollTimer = null;
  canvas = null;
  ctx = null;
  tankRoot = null;
  currentState = null;
  creatures = [];
  bubbles = [];
  particles = [];
}

function buildCreaturesFromResponses(responses) {
  creatures = responses.map((response) => {
    const creature = makeCreatureFromResponse(response);
    creature.x = random(40, Math.max(80, width - 260));
    creature.y = creature.isCrab ? height - creature.blockHeight - 54 : random(height * 0.14, height * 0.78);
    creature.targetY = creature.y;
    return creature;
  });
}

function pollStoredResponses() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || !Array.isArray(stored.responses)) return;

    const responses = stored.responses;
    const storedIds = new Set(responses.map((r) => String(r.submission_id)));
    if (storedIds.size < previousResponseIds.size) {
      currentState = { ...currentState, ...stored, responses };
      buildCreaturesFromResponses(responses);
      previousResponseIds = storedIds;
      updateResponseCount(responses.length);
      return;
    }

    const newResponses = responses.filter((r) => !previousResponseIds.has(String(r.submission_id)));
    if (!newResponses.length) return;

    currentState = { ...currentState, ...stored, responses };
    newResponses.forEach((response) => addCreatureFromResponse(response, true));
    previousResponseIds = storedIds;
    updateResponseCount(responses.length);
    showToast("NEW CREATURE ADDED");
  } catch (error) {
    console.warn("ASCII aquarium could not read stored state:", error);
  }
}

function addCreatureFromResponse(response, animate = false) {
  const creature = makeCreatureFromResponse(response);
  if (creature.isCrab) {
    creature.y = height - creature.blockHeight - 54;
    creature.targetY = creature.y;
  }
  creatures.push(creature);
  if (animate) spawnParticles(clamp(creature.x, 40, width - 40), clamp(creature.y, 80, height - 80), creature.color);
}

function makeCreatureFromResponse(response) {
  const answers = response.answers || {};
  return makeCreature({
    id: response.submission_id,
    type: answers.fishStyle || normaliseLegacyStyle(answers.fishVariant) || "medium",
    size: answers.fishSize || "medium",
    color: answers.fishColour || answers.fishColor || "random",
    score: Number(answers.q3 ?? 7),
    name: currentState?.settings?.showNames ? answers.name : ""
  });
}

function makeCreature({ id, type, size, color, score, name }) {
  const safeType = fishStyles[type] ? type : "medium";
  const isShark = safeType === "shark";
  const isCrab = safeType === "crab";
  const direction = Math.random() > 0.5 ? 1 : -1;
  const fontSize = sizeMap[size] || sizeMap.medium;
  const ascii = choose(direction === 1 ? fishStyles[safeType].right : fishStyles[safeType].left);
  const block = estimateTextBlock(ascii, fontSize);
  const startY = isCrab ? height - block.height - 54 : random(height * 0.14, height * 0.82);

  return {
    id,
    type: safeType,
    size,
    score,
    direction,
    ascii,
    lines: block.lines,
    blockWidth: block.width,
    blockHeight: block.height,
    fontSize,
    color: resolveColor(color),
    name: name || choose(fallbackNames),
    x: direction === 1 ? -block.width - 20 : width + 20,
    y: startY,
    targetY: startY,
    vx: direction * random(isShark ? 0.8 : isCrab ? 0.2 : 0.45, isShark ? 1.5 : isCrab ? 0.45 : 1.05),
    vy: 0,
    maxSpeed: isShark ? random(1.35, 2) : isCrab ? random(0.35, 0.6) : random(0.8, 1.35),
    verticalSpeed: isCrab ? random(0.001, 0.003) : random(0.004, 0.014),
    nextVerticalChange: Math.floor(random(80, 240)),
    phase: random(0, Math.PI * 2),
    age: 0,
    isShark,
    isCrab
  };
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function frame(t) {
  if (!ctx) return;
  drawBackground(t);
  drawHeaderLine();
  updateBubbles();
  drawBubbles();
  updateCreatures();
  creatures.forEach(drawCreature);
  updateParticles();
  drawParticles();
  animationFrame = requestAnimationFrame(frame);
}

function drawBackground(t) {
  ctx.clearRect(0, 0, width, height);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#103328");
  grad.addColorStop(0.45, "#0c261d");
  grad.addColorStop(1, "#07140f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(156,255,196,0.035)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  drawSeaweed(t);
  drawSand();
}

function drawSand() {
  ctx.fillStyle = "rgba(156,255,196,0.08)";
  ctx.font = '14px "Courier New", monospace';
  for (let x = 0; x < width; x += 18) {
    const y = height - 28 + Math.sin(x * 0.03) * 3;
    ctx.fillText(".", x, y);
    if (x % 36 === 0) ctx.fillText(".", x + 4, y + 10);
  }
  ctx.fillStyle = "rgba(156,255,196,0.04)";
  ctx.fillRect(0, height - 42, width, 1);
}

function drawSeaweed(t) {
  ctx.fillStyle = "rgba(125,255,178,0.25)";
  ctx.font = '18px "Courier New", monospace';
  for (let i = 0; i < 20; i += 1) {
    const x = i * 78 + 10;
    const baseY = height - 40;
    const h = 4 + (i % 5);
    for (let j = 0; j < h; j += 1) {
      const wobble = Math.sin(t * 0.002 + i + j * 0.5) * 6;
      ctx.fillText("|", x + wobble, baseY - j * 16);
    }
  }
}

function updateCreatures() {
  for (const creature of creatures) {
    creature.age += 1;
    applySeparation(creature);
    applySharkAvoidance(creature);

    if (creature.isCrab) {
      creature.targetY = height - creature.blockHeight - 54 + Math.sin(creature.age * 0.01 + creature.phase) * 4;
      creature.vy += (creature.targetY - creature.y) * 0.02;
      if (Math.random() < 0.01) creature.vx += random(-0.08, 0.08);
    } else {
      if (creature.age > creature.nextVerticalChange) {
        creature.targetY = random(height * 0.14, height * 0.82);
        creature.nextVerticalChange = creature.age + Math.floor(random(80, 260));
      }
      creature.vy += (creature.targetY - creature.y) * creature.verticalSpeed * 0.02;
      creature.vy += Math.sin(creature.age * 0.025 + creature.phase) * 0.003;
    }

    const desired = creature.direction * (creature.isShark ? 1.1 : creature.isCrab ? 0.22 : 0.55);
    creature.vx += (desired - creature.vx) * 0.01;
    if (Math.abs(creature.vx) < 0.15) creature.vx += creature.direction * 0.025;

    const speed = Math.hypot(creature.vx, creature.vy);
    if (speed > creature.maxSpeed) {
      creature.vx = (creature.vx / speed) * creature.maxSpeed;
      creature.vy = (creature.vy / speed) * creature.maxSpeed;
    }

    creature.x += creature.vx;
    creature.y += creature.vy;
    creature.y = creature.isCrab
      ? clamp(creature.y, height - creature.blockHeight - 68, height - creature.blockHeight - 42)
      : clamp(creature.y, height * 0.1, height * 0.86);

    if (!creature.isCrab) updateCreatureTextForDirection(creature);
    if (creature.x > width + 40) creature.x = -creature.blockWidth - 40;
    if (creature.x < -creature.blockWidth - 40) creature.x = width + 40;
  }
}

function drawCreature(creature) {
  ctx.save();
  const lineHeight = creature.fontSize * 0.9;
  const labelSize = Math.max(11, Math.floor(creature.fontSize * 0.42));

  if (currentState?.settings?.showNames && creature.name) {
    ctx.font = `${labelSize}px "Courier New", monospace`;
    ctx.textBaseline = "top";
    ctx.fillStyle = creature.color;
    ctx.shadowColor = creature.color;
    ctx.shadowBlur = 10;
    ctx.fillText(creature.name, creature.x, creature.y - lineHeight - 10);
  }

  ctx.font = `${creature.fontSize}px "Courier New", monospace`;
  ctx.textBaseline = "top";
  for (let i = 0; i < creature.lines.length; i += 1) {
    const y = creature.y + i * lineHeight;
    ctx.shadowColor = creature.color;
    ctx.shadowBlur = creature.isShark ? 22 : 16;
    ctx.fillStyle = creature.color;
    ctx.fillText(creature.lines[i], creature.x, y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = creature.isShark ? 0.38 : 0.28;
    ctx.fillStyle = "#f2fff8";
    ctx.fillText(creature.lines[i], creature.x + 1, y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function updateCreatureTextForDirection(creature) {
  const nextDirection = creature.vx >= 0 ? 1 : -1;
  if (nextDirection === creature.direction) return;
  creature.direction = nextDirection;
  creature.ascii = choose(nextDirection === 1 ? fishStyles[creature.type].right : fishStyles[creature.type].left);
  const block = estimateTextBlock(creature.ascii, creature.fontSize);
  creature.lines = block.lines;
  creature.blockWidth = block.width;
  creature.blockHeight = block.height;
}

function applySeparation(creature) {
  for (const other of creatures) {
    if (other.id === creature.id) continue;
    const dx = creature.x + creature.blockWidth * 0.5 - (other.x + other.blockWidth * 0.5);
    const dy = creature.y + creature.blockHeight * 0.5 - (other.y + other.blockHeight * 0.5);
    const safeX = (creature.blockWidth + other.blockWidth) * 0.32 + 10;
    const safeY = (creature.blockHeight + other.blockHeight) * 0.35 + 8;
    if (Math.abs(dx) < safeX && Math.abs(dy) < safeY) {
      creature.vx += signWithFallback(dx) * ((safeX - Math.abs(dx)) / safeX) * 0.04;
      if (!creature.isCrab) creature.vy += signWithFallback(dy) * ((safeY - Math.abs(dy)) / safeY) * 0.05;
    }
  }
}

function applySharkAvoidance(creature) {
  if (creature.isShark) return;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const other of creatures) {
    if (!other.isShark || other.id === creature.id) continue;
    const dx = other.x - creature.x;
    const dy = other.y - creature.y;
    const distance = Math.hypot(dx, dy);
    if (distance < nearestDistance) {
      nearest = other;
      nearestDistance = distance;
    }
  }
  const avoidDistance = creature.isCrab ? 220 : 340;
  if (!nearest || nearestDistance > avoidDistance) return;
  const dx = creature.x - nearest.x;
  const dy = creature.y - nearest.y;
  const force = (avoidDistance - nearestDistance) / avoidDistance;
  const safeDistance = Math.max(nearestDistance, 1);
  creature.vx += (dx / safeDistance) * force * 0.11;
  if (!creature.isCrab) creature.vy += (dy / safeDistance) * force * 0.13;
}

function updateBubbles() {
  if (Math.random() < 0.25) {
    bubbles.push({
      x: random(20, width - 20),
      y: height + 10,
      speed: random(0.5, 1.5),
      wobble: random(0.2, 1.2),
      phase: random(0, Math.PI * 2),
      char: choose(["o", "O", ".", "°"])
    });
  }
  bubbles.forEach((bubble) => {
    bubble.y -= bubble.speed;
    bubble.x += Math.sin(bubble.y * 0.03 + bubble.phase) * bubble.wobble;
  });
  bubbles = bubbles.filter((bubble) => bubble.y > -30);
}

function drawBubbles() {
  ctx.fillStyle = "rgba(184,255,214,0.6)";
  ctx.font = '16px "Courier New", monospace';
  bubbles.forEach((bubble) => ctx.fillText(bubble.char, bubble.x, bubble.y));
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 18; i += 1) {
    particles.push({
      x,
      y,
      vx: random(-1.4, 1.4),
      vy: random(-1.8, -0.3),
      life: random(25, 50),
      maxLife: 50,
      char: choose(["*", "+", ".", "o"]),
      color
    });
  }
}

function updateParticles() {
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.02;
    particle.life -= 1;
  });
  particles = particles.filter((particle) => particle.life > 0);
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(particle.char, particle.x, particle.y);
    ctx.restore();
  });
}

function drawHeaderLine() {
  ctx.strokeStyle = "rgba(156,255,196,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, 88);
  ctx.lineTo(width, 88);
  ctx.stroke();
}

function updateResponseCount(count) {
  const responseEl = document.getElementById("asciiAquariumResponseCount");
  const creatureEl = document.getElementById("asciiAquariumCreatureCount");
  if (responseEl) responseEl.textContent = String(count);
  if (creatureEl) creatureEl.textContent = String(count);
}

function showToast(text) {
  const toastEl = document.getElementById("asciiAquariumToast");
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toastEl.classList.remove("show"), 1200);
}

function normaliseLegacyStyle(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.includes("shark")) return "shark";
  if (raw.includes("gourami")) return "classic";
  if (raw.includes("tetra")) return "tiny";
  if (raw.includes("betta")) return "round";
  return "";
}

function resolveColor(color) {
  if (!color || color === "random") return choose(randomColours);
  return colourMap[color] || color;
}

function estimateTextBlock(text, fontSize) {
  const lines = String(text).split("\n");
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    lines,
    width: longest * fontSize * 0.62,
    height: lines.length * fontSize * 0.92
  };
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function signWithFallback(value) {
  if (value === 0) return Math.random() > 0.5 ? 1 : -1;
  return value > 0 ? 1 : -1;
}
