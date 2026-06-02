import { colourMap, fishSpriteOptions } from "./data.js";

let canvas = null;
let ctx = null;
let animationFrame = null;
let pollTimer = null;
let lastFrame = 0;

let width = 0;
let height = 0;
let dpr = 1;

let fish = [];
let bubbles = [];
let particles = [];
let plankton = [];
let arrivalBursts = [];

let currentState = null;
let tankRoot = null;
let backgroundImage = null;

const STORAGE_KEY = "jj_survey_visualiser_state_v1";
let previousResponseIds = new Set();

const randomColours = Object.values(colourMap);

const BACKDROP_IMAGE_PATH = "assets/aquarium-background.jpg";
const variantScaleMap = {
  betta: 0.76,
  tetra: 0.24,
  gourami: 0.32,
  shark: 0.5,
  crab: 0.28
};
const swimSpeedScale = 0.7;
const spriteFpsScale = 0.7;
const depthTransitionTimeScale = 1.3;
const farDepthScaleMultiplier = 0.7;
const speciesVisualScaleMultipliers = {
  shark: 1.3
};
const highResBettaVisualScaleMultiplier = 0.5;
const schoolRadius = 330;
const maxSchoolmates = 4;
const separationPadding = 0.46;
const sharkAvoidRadius = 360;
const openWaterRange = {
  yMin: 0.16,
  yMax: 0.8
};
const schoolingSpecies = new Set(["betta", "tetra", "gourami"]);
const naturalBehaviourIntervalRange = [7000, 18000];
const naturalBehaviourDurationRange = [420, 1350];
const crabCrawlSpeedRange = [9, 24];
const crabCrawlDurationRange = [900, 3600];
const crabPauseDurationRange = [260, 1300];
const crabHopIntervalRange = [26000, 95000];
const crabHopStrengthRange = [45, 82];
const crabGravity = 92.5;
const depthRange = [0.25, 1];
const maxBubbles = 96;
const maxParticles = 180;
const maxPlankton = 150;

const waterCurrent = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  timer: 0
};

const habitatProfiles = {
  betta: {
    yMin: 0.16,
    yMax: 0.8,
    preferredY: 0.42,
    baseSpeed: 34,
    maxSpeed: 52,
    drift: 1,
    school: 0.34,
    depthMin: 0.35,
    depthMax: 1,
    spawnDepth: [0.86, 1]
  },
  tetra: {
    yMin: 0.16,
    yMax: 0.8,
    preferredY: 0.46,
    baseSpeed: 42,
    maxSpeed: 72,
    drift: 0.65,
    school: 0.72,
    depthMin: 0.36,
    depthMax: 1,
    spawnDepth: [0.86, 1]
  },
  gourami: {
    yMin: 0.16,
    yMax: 0.8,
    preferredY: 0.52,
    baseSpeed: 31,
    maxSpeed: 50,
    drift: 0.55,
    school: 0.36,
    depthMin: 0.34,
    depthMax: 0.92,
    spawnDepth: [0.84, 0.98]
  },
  shark: {
    yMin: 0.16,
    yMax: 0.78,
    preferredY: 0.48,
    baseSpeed: 44,
    maxSpeed: 66,
    drift: 0.22,
    school: 0,
    depthMin: 0.28,
    depthMax: 0.78,
    spawnDepth: [0.62, 0.86]
  },
  crab: {
    yMin: 0.86,
    yMax: 0.97,
    preferredY: 0.93,
    baseSpeed: 16,
    maxSpeed: 26,
    drift: 0,
    school: 0,
    depthMin: 0.62,
    depthMax: 1,
    spawnDepth: [0.84, 1]
  }
};

const fishSpritePaths = Object.fromEntries(
  fishSpriteOptions.map((option) => {
    const match = option.match(/^(betta|tetra|gourami|shark|crab)(\d+)$/);
    return [option, `assets/sprites/${match[1]}-${match[2]}.png`];
  })
);

const highResBettaFramePaths = Array.from({ length: 10 }, (_, index) => {
  return `assets/high-res/betta/right/frame-${String(index + 1).padStart(2, "0")}.png`;
});

const legacySpriteVariants = {
  "1": "betta1",
  "2": "betta2",
  "3": "betta3",
  "4": "betta4",
  "5": "betta5",
  "6": "tetra1",
  "7": "tetra2",
  "8": "tetra3",
  "9": "tetra4",
  "10": "tetra5",
  "11": "tetra6",
  "12": "gourami1",
  "13": "gourami2",
  "14": "gourami3",
  "15": "gourami4",
  "16": "gourami5",
  "17": "gourami6",
  "18": "shark1",
  "19": "shark1",
  "20": "shark1",
  "21": "crab1",
  "22": "crab2",
  "23": "crab3",
  "24": "crab4",
  shark2: "shark1",
  shark3: "shark1",
  crab: "crab1",
  cyan: "betta1",
  blue: "betta2",
  orange: "betta3",
  pink: "betta4",
  purple: "betta5",
  red: "tetra4",
  yellow: "tetra5",
  lime: "tetra6",
  green: "tetra6",
  white: "betta1"
};

const speciesFrameOverrides = {
  shark: {
    right: [
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 }
    ],
    left: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 }
    ]
  },
  crab: {
    right: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 }
    ],
    left: [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 }
    ]
  }
};

const speciesAnchorModes = {
  shark: "head",
  crab: "bottom"
};

const speciesFrameSizeOverrides = {
  crab: {
    frameWidth: 512,
    frameHeight: 1024,
    fps: 5
  }
};

// Sprite definitions for extensible species/variants.
// Future high-resolution 10-frame PNG sequences should be configured here:
// animationSource: {
//   type: "frameSequence",
//   framePaths: { right: ["assets/sprites/betta1/right/frame-01.png"], left: ["assets/sprites/betta1/left/frame-01.png"] },
//   frameWidth: 1024,
//   frameHeight: 1024,
//   fps: 10,
//   alignmentMetadata: { right: [], left: [] }
// }
// Current sprite-sheet entries intentionally remain unchanged.
const spriteDefinitions = {
  betta: {
    animationSource: {
      type: "frameSequence",
      framePaths: {
        right: [],
        left: highResBettaFramePaths
      },
      frameWidth: 666,
      frameHeight: 375,
      fps: 10 * spriteFpsScale,
      mirrorRightFromLeft: true,
      centerVisibleContent: true
    },
    imagePath: "assets/sprites/betta-1.png",
    fallbackImagePath: "assets/sprites/betta-sheet.svg",
    frameWidth: 512,
    frameHeight: 512,
    frames: {
      right: [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 0, row: 1 },
        { col: 1, row: 1 }
      ],
      left: [
        { col: 2, row: 0 },
        { col: 2, row: 1 }
      ]
    },
    fps: 8 * spriteFpsScale,
    defaultScale: 0.34,
    transparentColor: { r: 0, g: 0, b: 0, tolerance: 18, fade: 42 }
  }
};

const spriteCache = {};

export function startAquarium(container, state) {
  stopAquarium();
  currentState = state;

  container.innerHTML = `<section class="page fullscreen"><div id="retroAquariumApp" class="retro-aquarium-app"><canvas id="aquariumCanvas"></canvas><div class="crt-overlay"></div><div class="vignette"></div><button class="aquarium-fullscreen-btn" id="aquariumFullscreenBtn" type="button">Full screen</button><div class="toast" id="aquariumToast">NEW FISH ADDED</div></div></section>`;

  tankRoot = container.querySelector("#retroAquariumApp");
  canvas = container.querySelector("#aquariumCanvas");
  ctx = canvas.getContext("2d");

  loadBackgroundImage();
  loadAllSpriteDefinitions();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  buildFishFromResponses(state.responses || []);
  previousResponseIds = new Set((state.responses || []).map((r) => String(r.submission_id)));
  updateResponseCount((state.responses || []).length);
  pollTimer = setInterval(pollStoredResponses, 350);

  container.querySelector("#aquariumFullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) tankRoot.requestFullscreen?.();
  });
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  syncFullscreenButton();

  lastFrame = performance.now();
  animationFrame = requestAnimationFrame(frame);
  return stopAquarium;
}

export function stopAquarium() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (pollTimer) clearInterval(pollTimer);
  window.removeEventListener("resize", resizeCanvas);
  document.removeEventListener("fullscreenchange", syncFullscreenButton);
  animationFrame = null; pollTimer = null; canvas = null; ctx = null; tankRoot = null; currentState = null;
  fish = []; bubbles = []; particles = []; plankton = []; arrivalBursts = [];
  waterCurrent.x = 0; waterCurrent.y = 0; waterCurrent.targetX = 0; waterCurrent.targetY = 0; waterCurrent.timer = 0;
}

function syncFullscreenButton() {
  const button = document.getElementById("aquariumFullscreenBtn");
  if (!button) return;
  button.hidden = Boolean(document.fullscreenElement);
}

function loadBackgroundImage() {
  if (backgroundImage) return;

  const image = new Image();
  image.src = BACKDROP_IMAGE_PATH;
  image.onload = () => { backgroundImage = image; };
  image.onerror = () => {
    backgroundImage = null;
    console.warn(`Aquarium backdrop missing: ${BACKDROP_IMAGE_PATH}. Using generated background.`);
  };
}

function loadSpriteDefinition(def) {
  loadAnimationSource(def);
}

function loadAnimationSource(def) {
  const source = getAnimationSource(def);
  if (source.type === "frameSequence") {
    loadFrameSequenceSource(def, source);
    return;
  }

  loadSpriteSheetSource(def, source);
}

function loadSpriteSheetSource(def, source) {
  const cacheKey = getAnimationCacheKey(def);
  if (spriteCache[cacheKey]) return;
  spriteCache[cacheKey] = { image: null, loaded: false, type: "spriteSheet" };
  const image = new Image();
  image.onload = () => {
    const preparedImage = prepareSpriteImage(image, def);
    spriteCache[cacheKey] = {
      type: "spriteSheet",
      image: preparedImage,
      loaded: true,
      frameMetrics: measureSpriteFrames(preparedImage, def)
    };
  };
  image.onerror = () => {
    if (def.fallbackImagePath) {
      loadFallbackSpriteDefinition(def);
      return;
    }

    spriteCache[cacheKey] = { image: null, loaded: false, type: "spriteSheet" };
    console.warn(`Sprite asset missing: ${source.imagePath}. Falling back to placeholder fish.`);
  };
  image.src = source.imagePath;
}

function loadFrameSequenceSource(def, source) {
  const cacheKey = getAnimationCacheKey(def);
  if (spriteCache[cacheKey]) return;

  const directions = ["right", "left"];
  const framesByDirection = { right: [], left: [] };
  const framePaths = source.framePaths || {};
  let pending = 0;
  spriteCache[cacheKey] = {
    type: "frameSequence",
    loaded: false,
    frames: framesByDirection,
    frameMetrics: source.alignmentMetadata || null
  };

  for (const direction of directions) {
    const paths = framePaths[direction] || [];
    pending += paths.length;
    framesByDirection[direction] = paths.map((path, index) => {
      const image = new Image();
      const frame = { image, path, index, direction, loaded: false };
      const finaliseFrameLoad = () => {
        pending -= 1;
        if (pending <= 0) {
          spriteCache[cacheKey].loaded = directions.some((dir) => framesByDirection[dir].some((item) => item.loaded));
          spriteCache[cacheKey].frameMetrics = measureFrameSequenceFrames(framesByDirection, source, def);
        }
      };
      image.onload = () => {
        frame.image = prepareSpriteImage(image, def);
        frame.frameWidth = source.frameWidth || frame.image.width || image.naturalWidth || image.width;
        frame.frameHeight = source.frameHeight || frame.image.height || image.naturalHeight || image.height;
        frame.loaded = true;
        finaliseFrameLoad();
      };
      image.onerror = () => {
        finaliseFrameLoad();
        console.warn(`Animation frame missing: ${path}.`);
      };
      image.src = path;
      return frame;
    });
  }

  spriteCache[cacheKey].loaded = pending === 0;
}

function loadAllSpriteDefinitions() {
  Object.values(spriteDefinitions).forEach(loadSpriteDefinition);

  for (const [variant, imagePath] of Object.entries(fishSpritePaths)) {
    loadSpriteDefinition(createSpriteDefinitionForVariant(spriteDefinitions.betta, variant, imagePath));
  }
}

function loadFallbackSpriteDefinition(def) {
  const cacheKey = getAnimationCacheKey(def);
  const image = new Image();
  image.onload = () => {
    if (!def.fallbackImagePath.endsWith(".svg")) {
      const preparedImage = prepareSpriteImage(image, def);
      spriteCache[cacheKey] = {
        type: "spriteSheet",
        image: preparedImage,
        loaded: true,
        frameMetrics: measureSpriteFrames(preparedImage, def)
      };
      console.warn(`Sprite asset missing: ${def.imagePath}. Using fallback sprite: ${def.fallbackImagePath}.`);
      return;
    }

    spriteCache[cacheKey] = {
      type: "spriteSheet",
      image,
      loaded: true,
      fallbackFrameWidth: 64,
      fallbackFrameHeight: 64,
      fallbackRows: { right: 0, left: 1 }
    };
    console.warn(`Sprite asset missing: ${def.imagePath}. Using fallback sprite: ${def.fallbackImagePath}.`);
  };
  image.onerror = () => {
    spriteCache[cacheKey] = { image: null, loaded: false, type: "spriteSheet" };
    console.warn(`Sprite asset missing: ${def.imagePath}. Falling back to placeholder fish.`);
  };
  image.src = def.fallbackImagePath;
}

function prepareSpriteImage(image, def) {
  if (!def.transparentColor) return image;

  try {
    const workingCanvas = document.createElement("canvas");
    const workingCtx = workingCanvas.getContext("2d", { willReadFrequently: true });
    workingCanvas.width = image.naturalWidth || image.width;
    workingCanvas.height = image.naturalHeight || image.height;
    workingCtx.drawImage(image, 0, 0);

    const imageData = workingCtx.getImageData(0, 0, workingCanvas.width, workingCanvas.height);
    const data = imageData.data;
    const key = def.transparentColor;
    const tolerance = key.tolerance ?? 12;
    const fade = Math.max(tolerance + 1, key.fade ?? tolerance + 24);

    for (let i = 0; i < data.length; i += 4) {
      const dr = Math.abs(data[i] - key.r);
      const dg = Math.abs(data[i + 1] - key.g);
      const db = Math.abs(data[i + 2] - key.b);
      const distance = Math.max(dr, dg, db);

      if (distance <= tolerance) {
        data[i + 3] = 0;
      } else if (distance < fade) {
        data[i + 3] = Math.round(data[i + 3] * ((distance - tolerance) / (fade - tolerance)));
      }
    }

    workingCtx.putImageData(imageData, 0, 0);
    return workingCanvas;
  } catch (error) {
    console.warn("Aquarium could not process sprite transparency. Drawing original image.", error);
    return image;
  }
}

function measureSpriteFrames(image, def) {
  const metrics = { right: [], left: [] };

  try {
    const workingCanvas = image instanceof HTMLCanvasElement ? image : document.createElement("canvas");
    const workingCtx = workingCanvas.getContext("2d", { willReadFrequently: true });

    if (!(image instanceof HTMLCanvasElement)) {
      workingCanvas.width = image.naturalWidth || image.width;
      workingCanvas.height = image.naturalHeight || image.height;
      workingCtx.drawImage(image, 0, 0);
    }

    for (const direction of Object.keys(metrics)) {
      const frames = def.frames?.[direction] || [];
      const measuredFrames = frames.map((frame) => {
        const bounds = measureFrameBounds(workingCtx, frame, def.frameWidth, def.frameHeight);
        return {
          ...frame,
          bounds,
          alignmentPoint: bounds ? getFrameAlignmentPoint(bounds, direction, def.anchorMode) : null
        };
      });
      const visibleFrames = measuredFrames.filter((frame) => frame.alignmentPoint);
      const anchor = visibleFrames.length
        ? {
            x: visibleFrames.reduce((sum, frame) => sum + frame.alignmentPoint.x, 0) / visibleFrames.length,
            y: visibleFrames.reduce((sum, frame) => sum + frame.alignmentPoint.y, 0) / visibleFrames.length
          }
        : { x: def.frameWidth / 2, y: def.frameHeight / 2 };

      metrics[direction] = measuredFrames.map((frame) => ({ ...frame, anchor }));
    }
  } catch (error) {
    console.warn("Aquarium could not measure sprite frame alignment. Drawing uncorrected frames.", error);
  }

  return metrics;
}

function measureFrameSequenceFrames(framesByDirection, source, def) {
  const metrics = { right: [], left: [] };

  for (const direction of Object.keys(metrics)) {
    const frames = framesByDirection[direction] || [];
    metrics[direction] = frames.map((frame) => {
      if (!frame.loaded || !frame.image) return null;

      try {
        const workingCanvas = frame.image instanceof HTMLCanvasElement ? frame.image : document.createElement("canvas");
        const workingCtx = workingCanvas.getContext("2d", { willReadFrequently: true });
        const frameWidth = source.frameWidth || frame.frameWidth || workingCanvas.width;
        const frameHeight = source.frameHeight || frame.frameHeight || workingCanvas.height;

        if (!(frame.image instanceof HTMLCanvasElement)) {
          workingCanvas.width = frameWidth;
          workingCanvas.height = frameHeight;
          workingCtx.drawImage(frame.image, 0, 0, frameWidth, frameHeight);
        }

        const bounds = measureFrameBounds(workingCtx, { col: 0, row: 0 }, frameWidth, frameHeight);
        const alignmentPoint = bounds ? getFrameAlignmentPoint(bounds, direction, def.anchorMode) : null;
        const anchor = source.centerVisibleContent
          ? { x: frameWidth / 2, y: frameHeight / 2 }
          : alignmentPoint || { x: frameWidth / 2, y: frameHeight / 2 };

        return {
          index: frame.index,
          path: frame.path,
          bounds,
          alignmentPoint,
          anchor
        };
      } catch (error) {
        console.warn("Aquarium could not measure frame-sequence alignment. Drawing uncorrected frame.", error);
        return null;
      }
    }).filter(Boolean);
  }

  if (!metrics.left.length && source.mirrorLeftFromRight) {
    metrics.left = metrics.right;
  }

  if (!metrics.right.length && source.mirrorRightFromLeft) {
    metrics.right = metrics.left;
  }

  return metrics;
}

function getFrameAlignmentPoint(bounds, direction, anchorMode = "center") {
  if (anchorMode === "head") {
    return {
      x: direction === "right" ? bounds.maxX : bounds.minX,
      y: bounds.centerY
    };
  }

  if (anchorMode === "bottom") {
    return {
      x: bounds.centerX,
      y: bounds.maxY
    };
  }

  return {
    x: bounds.centerX,
    y: bounds.centerY
  };
}

function measureFrameBounds(ctx, frame, frameWidth, frameHeight) {
  const sx = frame.col * frameWidth;
  const sy = frame.row * frameHeight;
  const imageData = ctx.getImageData(sx, sy, frameWidth, frameHeight);
  const data = imageData.data;
  let minX = frameWidth;
  let minY = frameHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      const index = (y * frameWidth + x) * 4;
      const alpha = data[index + 3];
      const brightness = Math.max(data[index], data[index + 1], data[index + 2]);

      if (alpha > 18 && brightness > 35) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

function buildFishFromResponses(responses) {
  fish = responses.map((response) => {
    const f = makeFishFromResponse(response);
    f.x = random(60, Math.max(100, width - 160));
    f.y = f.species === "crab" ? getBottomDwellerRenderY(f) : getHabitatSpawnY(f.species);
    f.renderY = f.y;
    return f;
  });
  ensurePlanktonField();
}

function makeFishFromResponse(response) {
  const answers = response.answers || {};
  const direction = Math.random() > 0.5 ? 1 : -1;
  const variant = normaliseSpriteVariant(answers.fishVariant || answers.fishNumber || answers.fishColour || answers.fishColor);
  const species = getVariantSpecies(variant);
  const habitat = getHabitatProfile(species);
  const spriteDef = spriteDefinitions.betta;
  const resolvedSpriteDef = resolveSpriteDefinition(spriteDef, variant);
  const animationSource = getAnimationSource(resolvedSpriteDef);
  const scale = getSpriteScale(variant, resolvedSpriteDef);
  const isCrab = species === "crab";
  const crabDirection = Math.random() > 0.5 ? 1 : -1;
  const name = firstNameOnly(answers.name || "");
  const spawnDepthMin = name ? Math.max(0.35, habitat.spawnDepth[0]) : habitat.spawnDepth[0];
  const depth = random(spawnDepthMin, habitat.spawnDepth[1]);
  const phase = random(0, Math.PI * 2);
  const animationSeed = Math.random();
  const frameWidth = animationSource.frameWidth || resolvedSpriteDef.frameWidth;
  const frameHeight = animationSource.frameHeight || resolvedSpriteDef.frameHeight;
  const edgeX = direction === 1 ? -frameWidth * scale - 40 : width + 40;
  const startingDirection = (isCrab ? crabDirection : direction) === 1 ? "right" : "left";
  const initialFrameCount = getEstimatedAnimationFrameCount(resolvedSpriteDef, startingDirection);
  const frameDuration = 1000 / (animationSource.fps || resolvedSpriteDef.fps || 8);

  return {
    id: response.submission_id,
    submissionId: response.submission_id,
    species,
    variant,
    size: species,
    name,
    direction: isCrab ? crabDirection : direction,
    x: isCrab ? random(40, Math.max(80, width - 120)) : edgeX,
    y: isCrab ? height - 120 : getHabitatSpawnY(species),
    vx: isCrab ? crabDirection * random(10, 22) : direction * random(habitat.baseSpeed * 0.75, habitat.baseSpeed * 1.25) * swimSpeedScale,
    vy: isCrab ? 0 : random(-4, 4) * swimSpeedScale,
    targetVx: isCrab ? 0 : direction * habitat.baseSpeed,
    targetVy: 0,
    phase,
    animationSeed,
    animationOffsetMs: animationSeed * frameDuration,
    bobAmp: isCrab ? random(0.6, 1.8) : random(4, 14),
    motionTimer: random(1200, 4600),
    motionState: "coast",
    naturalTimer: random(...naturalBehaviourIntervalRange),
    naturalState: "none",
    naturalStateTimer: 0,
    naturalSpeedScale: 1,
    naturalVx: 0,
    naturalVy: 0,
    schoolOffsetX: random(-58, 58),
    schoolOffsetY: random(-30, 30),
    wanderPhase: phase + random(-1, 1),
    scatterTimer: 0,
    scatterX: 0,
    scatterY: 0,
    breakTimer: random(1200, 5200),
    breakAngle: random(0, Math.PI * 2),
    breakStrength: 0,
    crawlTimer: isCrab ? random(...crabCrawlDurationRange) : 0,
    crawlPauseTimer: isCrab && Math.random() < 0.28 ? random(...crabPauseDurationRange) : 0,
    crawlSpeed: isCrab ? random(...crabCrawlSpeedRange) : 0,
    hopTimer: isCrab ? random(...crabHopIntervalRange) : 0,
    hopOffset: 0,
    hopVelocity: 0,
    depth,
    targetDepth: depth,
    depthTimer: random(12000, 30000),
    foregroundLockTimer: 8000,
    frameIndex: Math.floor(animationSeed * initialFrameCount),
    frameTimer: animationSeed * frameDuration,
    scale,
    baseScale: scale,
    spriteDef: resolvedSpriteDef,
    width: frameWidth * scale,
    height: frameHeight * scale
  };
}

function random(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, amount) { return a + (b - a) * amount; }
function firstNameOnly(value) { return String(value || "").trim().split(/\s+/)[0].slice(0, 14); }
function resolveColor(color) { return colourMap[color] || randomColours[Math.floor(Math.random() * randomColours.length)]; }
function getHabitatProfile(species) { return habitatProfiles[species] || habitatProfiles.betta; }
function getHabitatBounds(species) {
  const habitat = getHabitatProfile(species);
  const yMin = species === "crab" ? habitat.yMin : openWaterRange.yMin;
  const yMax = species === "crab" ? habitat.yMax : openWaterRange.yMax;
  return {
    minY: height * yMin,
    maxY: height * yMax,
    preferredY: height * habitat.preferredY
  };
}
function getHabitatSpawnY(species) {
  const bounds = getHabitatBounds(species);
  const focal = Math.sin((fish.length + 1) * 1.618) * 0.18;
  const base = lerp(bounds.minY, bounds.maxY, 0.5 + focal);
  return clamp(base + random(-height * 0.05, height * 0.05), bounds.minY, bounds.maxY);
}
function getDepthStyle(depth, species = "betta") {
  const d = clamp(depth, depthRange[0], depthRange[1]);
  const normalized = (d - depthRange[0]) / (depthRange[1] - depthRange[0]);
  const crabScaleLimit = species === "crab" ? 0.18 : 1;
  const depthScale = lerp(farDepthScaleMultiplier, 1, normalized);
  const baseScale = lerp(0.75, 1.12, normalized * crabScaleLimit + (species === "crab" ? 0.5 : 0));
  return {
    opacity: lerp(0.45, 1, normalized),
    blur: lerp(2, 0, normalized),
    scale: baseScale * depthScale,
    speed: lerp(0.72, 1.12, normalized),
    vertical: lerp(0.45, 1.1, normalized),
    brightness: lerp(0.9, 1.08, normalized)
  };
}

function getDepthNormalized(depth) {
  const d = clamp(depth, depthRange[0], depthRange[1]);
  return (d - depthRange[0]) / (depthRange[1] - depthRange[0]);
}

function getDepthLabelStyle(depth) {
  const normalized = getDepthNormalized(depth);
  const textValue = Math.round(lerp(160, 245, normalized));
  const textGreen = Math.round(lerp(196, 255, normalized));
  const textBlue = Math.round(lerp(188, 250, normalized));

  return {
    panel: `rgba(0, 24, 22, ${lerp(0.18, 0.42, normalized).toFixed(3)})`,
    shadow: `rgba(0, 16, 14, ${lerp(0.32, 0.72, normalized).toFixed(3)})`,
    shadowBlur: lerp(3, 9, normalized),
    text: `rgba(${textValue}, ${textGreen}, ${textBlue}, ${lerp(0.38, 0.96, normalized).toFixed(3)})`
  };
}
function resolveSpriteDefinition(baseDef, variant) {
  const normalisedVariant = normaliseSpriteVariant(variant);
  const imagePath = fishSpritePaths[normalisedVariant];

  if (!imagePath) return baseDef;

  return createSpriteDefinitionForVariant(baseDef, normalisedVariant, imagePath);
}

function createSpriteDefinitionForVariant(baseDef, variant, imagePath) {
  const species = getVariantSpecies(variant);
  const sizeOverride = speciesFrameSizeOverrides[species] || {};
  const frames = speciesFrameOverrides[species] || baseDef.frames;
  const frameWidth = sizeOverride.frameWidth || baseDef.frameWidth;
  const frameHeight = sizeOverride.frameHeight || baseDef.frameHeight;
  const fps = sizeOverride.fps || baseDef.fps;
  const animationSource = species === "betta"
    ? baseDef.animationSource
    : {
        type: "spriteSheet",
        imagePath,
        frameWidth,
        frameHeight,
        frames,
        fps,
        alignmentMetadata: baseDef.animationSource?.alignmentMetadata
      };

  return {
    ...baseDef,
    ...sizeOverride,
    imagePath,
    frameWidth,
    frameHeight,
    frames,
    fps,
    animationSource,
    anchorMode: speciesAnchorModes[species] || "center",
    fallbackImagePath: baseDef.imagePath
  };
}

function getAnimationSource(def) {
  return def.animationSource || {
    type: "spriteSheet",
    imagePath: def.imagePath,
    frameWidth: def.frameWidth,
    frameHeight: def.frameHeight,
    frames: def.frames,
    fps: def.fps,
    alignmentMetadata: def.alignmentMetadata
  };
}

function getAnimationCacheKey(def) {
  const source = getAnimationSource(def);
  if (source.type === "frameSequence") {
    const right = source.framePaths?.right?.[0] || "";
    const left = source.framePaths?.left?.[0] || "";
    return `frameSequence:${right}:${left}`;
  }

  return source.imagePath || def.imagePath;
}

function getAnimationFps(f) {
  return getAnimationSource(f.spriteDef).fps || f.spriteDef.fps || 8;
}

function getEstimatedAnimationFrameCount(def, direction) {
  const source = getAnimationSource(def);

  if (source.type === "frameSequence") {
    const directCount = source.framePaths?.[direction]?.length || 0;
    if (directCount) return directCount;

    if (direction === "right" && source.mirrorRightFromLeft) {
      return source.framePaths?.left?.length || 1;
    }

    if (direction === "left" && source.mirrorLeftFromRight) {
      return source.framePaths?.right?.length || 1;
    }

    return 1;
  }

  return source.frames?.[direction]?.length || def.frames?.[direction]?.length || 1;
}

function normaliseSpriteVariant(value) {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const legacy = legacySpriteVariants[raw];
  const candidate = legacy || raw;
  return fishSpritePaths[candidate] ? candidate : "betta1";
}

function getVariantSpecies(variant) {
  const match = variant.match(/^(betta|tetra|gourami|shark|crab)/);
  return match ? match[1] : "betta";
}

function canSchool(f) {
  return schoolingSpecies.has(f.species);
}

function getVariantScale(variant) {
  return variantScaleMap[getVariantSpecies(variant)] || variantScaleMap.betta;
}

function getSpriteScale(variant, spriteDef) {
  const species = getVariantSpecies(variant);
  return getVariantScale(variant)
    * (speciesVisualScaleMultipliers[species] || 1)
    * getAssetVisualScaleMultiplier(spriteDef);
}

function getAssetVisualScaleMultiplier(spriteDef) {
  const source = getAnimationSource(spriteDef);
  const framePaths = [
    ...(source.framePaths?.right || []),
    ...(source.framePaths?.left || [])
  ];

  if (source.type === "frameSequence" && framePaths.some((path) => path.includes("assets/high-res/betta/"))) {
    return highResBettaVisualScaleMultiplier;
  }

  return 1;
}

function pollStoredResponses() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored || !Array.isArray(stored.responses)) return;
    const responses = stored.responses;
    const storedIds = new Set(responses.map((r) => String(r.submission_id)));
    if (storedIds.size < previousResponseIds.size) {
      currentState = { ...currentState, ...stored, responses };
      buildFishFromResponses(responses);
      previousResponseIds = storedIds;
      updateResponseCount(responses.length);
      return;
    }
    const newResponses = responses.filter((r) => !previousResponseIds.has(String(r.submission_id)));
    if (!newResponses.length) return;
    currentState = { ...currentState, ...stored, responses };
    newResponses.forEach((r) => addFishFromResponse(r, true));
    previousResponseIds = storedIds;
    updateResponseCount(responses.length);
    showToast("NEW FISH ADDED");
  } catch (error) { console.warn("Aquarium could not read stored state:", error); }
}

function addFishFromResponse(response, animate = false) {
  const f = makeFishFromResponse(response);
  f.foregroundLockTimer = animate ? 8500 : 0;
  f.depth = animate ? random(0.88, 1) : f.depth;
  f.targetDepth = f.depth;
  fish.push(f);
  const particleY = f.species === "crab" ? height - 72 : f.y;
  if (animate) {
    const burstX = f.direction === 1 ? 34 : width - 34;
    const burstY = clamp(particleY, 80, height - 48);
    spawnParticles(burstX, burstY, resolveColor(f.variant));
    spawnArrivalBurst(burstX, burstY, f.direction);
    scatterNearbyFish(f, 170);
  }
}

function resizeCanvas() {
  if (!canvas || !ctx) return;
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  width = window.innerWidth; height = window.innerHeight;
  canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ensurePlanktonField();
}

function drawBackground(t) {
  ctx.clearRect(0, 0, width, height);

  if (backgroundImage) {
    drawCoverImage(backgroundImage);
    ctx.fillStyle = "rgba(5, 25, 22, 0.08)";
    ctx.fillRect(0, 0, width, height);

    const waterGrade = ctx.createLinearGradient(0, 0, 0, height);
    waterGrade.addColorStop(0, "rgba(175, 255, 231, 0.055)");
    waterGrade.addColorStop(0.45, "rgba(23, 88, 78, 0.025)");
    waterGrade.addColorStop(1, "rgba(0, 20, 18, 0.1)");
    ctx.fillStyle = waterGrade;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const grad = ctx.createLinearGradient(0, 0, 0, height); grad.addColorStop(0, "#103328"); grad.addColorStop(1, "#07140f");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "rgba(156,255,196,0.08)";
  for (let x = 0; x < width; x += 18) { const y = height - 28 + Math.sin(x * 0.03) * 3; ctx.fillRect(x, y, 2, 2); }
  ctx.strokeStyle = "rgba(156,255,196,0.2)";
  for (let i = 0; i < 20; i++) { const x = i * 78 + 10; for (let j = 0; j < 6; j++) { const wobble = Math.sin(t * 0.002 + i + j * 0.5) * 6; ctx.beginPath(); ctx.moveTo(x, height - 42 - j * 14); ctx.lineTo(x + wobble, height - 52 - j * 14); ctx.stroke(); } }
}

function drawCoverImage(image) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function drawSeagrass(t) {
  if (!width || !height) return;

  const bedTop = height * 0.79;
  const bedHeight = height - bedTop;
  const clusters = Math.max(9, Math.ceil(width / 118));

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const baseGradient = ctx.createLinearGradient(0, bedTop, 0, height);
  baseGradient.addColorStop(0, "rgba(4, 28, 24, 0)");
  baseGradient.addColorStop(0.48, "rgba(4, 28, 24, 0.3)");
  baseGradient.addColorStop(1, "rgba(2, 14, 12, 0.74)");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, bedTop - 16, width, bedHeight + 16);

  for (let cluster = 0; cluster < clusters; cluster += 1) {
    const clusterX = (cluster / Math.max(1, clusters - 1)) * width;
    const bladeCount = 5 + (cluster % 4);

    for (let blade = 0; blade < bladeCount; blade += 1) {
      const seed = cluster * 17 + blade * 5;
      const baseX = clusterX + Math.sin(seed * 1.7) * 42;
      const baseY = height + 8;
      const bladeHeight = bedHeight * randomFromSeed(seed, 0.42, 0.95);
      const sway = Math.sin(t * 0.00065 + seed) * (8 + bladeHeight * 0.08) + waterCurrent.x * 0.8;
      const tipX = baseX + sway;
      const tipY = baseY - bladeHeight;
      const midX = baseX + sway * 0.55 + Math.sin(t * 0.00045 + seed * 0.8) * 5;
      const midY = baseY - bladeHeight * 0.56;
      const hue = blade % 3;

      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.strokeStyle = hue === 0
        ? "rgba(86, 164, 110, 0.48)"
        : hue === 1
          ? "rgba(54, 132, 105, 0.42)"
          : "rgba(117, 177, 104, 0.34)";
      ctx.lineWidth = randomFromSeed(seed + 11, 2.2, 4.8);
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  ctx.restore();
}

function updateFish(dt) {
  updateWaterCurrent(dt);
  for (const f of fish) {
    updateCreatureDepth(f, dt);
    updateCreatureDimensions(f);
    const frames = getAnimationFramesForDirection(f);
    const frameDuration = 1000 / getAnimationFps(f);
    f.frameTimer += dt;
    while (frames.length && f.frameTimer >= frameDuration) {
      f.frameIndex = (f.frameIndex + 1) % frames.length;
      f.frameTimer -= frameDuration;
    }
    if (f.species === "crab") continue;
    updateMotionIntent(f, dt);
    updateBreakaway(f, dt);
  }

  applyFishForces(dt);

  for (const f of fish) {
    if (f.species === "crab") {
      updateCrab(f, dt);
      continue;
    }

    const turnThreshold = f.species === "shark" ? 18 : 4;
    if (f.vx > turnThreshold) f.direction = 1;
    if (f.vx < -turnThreshold) f.direction = -1;
    const style = getDepthStyle(f.depth, f.species);
    const bounds = getHabitatBounds(f.species);
    const currentPushX = waterCurrent.x * (f.species === "shark" ? 0.08 : 0.18);
    const currentPushY = waterCurrent.y * 0.08;
    f.x += (f.vx * style.speed + currentPushX) * (dt / 1000);
    f.y += (f.vy * style.speed + currentPushY) * (dt / 1000);

    const bobSpeed = f.species === "shark" ? 0.00042 : f.species === "tetra" ? 0.0012 : 0.00086;
    const bob = Math.sin(performance.now() * bobSpeed + f.phase) * f.bobAmp * style.vertical;
    f.y = clamp(f.y, bounds.minY, bounds.maxY);
    f.renderY = clamp(f.y + bob, bounds.minY, bounds.maxY);
    if (f.renderY <= bounds.minY + 2 || f.renderY >= bounds.maxY - 2) f.vy *= -0.58;

    if (f.x <= 0) { f.direction = 1; f.vx = Math.abs(f.vx); }
    if (f.x + f.width >= width) { f.direction = -1; f.vx = -Math.abs(f.vx); }
  }
}

function updateWaterCurrent(dt) {
  waterCurrent.timer -= dt;

  if (waterCurrent.timer <= 0) {
    waterCurrent.timer = random(9000, 22000);
    waterCurrent.targetX = random(-9, 9);
    waterCurrent.targetY = random(-1.5, 1.5);
  }

  const ease = 1 - Math.pow(0.001, dt / 1000);
  waterCurrent.x = lerp(waterCurrent.x, waterCurrent.targetX, ease * 0.18);
  waterCurrent.y = lerp(waterCurrent.y, waterCurrent.targetY, ease * 0.18);
}

function updateCreatureDepth(f, dt) {
  const habitat = getHabitatProfile(f.species);
  f.foregroundLockTimer = Math.max(0, f.foregroundLockTimer - dt);
  f.depthTimer -= dt;

  if (f.foregroundLockTimer > 0) {
    f.targetDepth = Math.max(f.targetDepth, f.species === "shark" ? 0.72 : 0.88);
  } else if (f.depthTimer <= 0) {
    f.depthTimer = random(12000, 30000);
    const minDepth = f.name ? Math.max(0.35, habitat.depthMin) : habitat.depthMin;
    f.targetDepth = random(minDepth, habitat.depthMax);
  }

  const depthEase = 1 - Math.pow(0.02, dt / (1000 * depthTransitionTimeScale));
  f.depth = clamp(lerp(f.depth, f.targetDepth, depthEase), depthRange[0], depthRange[1]);
}

function updateCreatureDimensions(f) {
  const style = getDepthStyle(f.depth, f.species);
  const source = getAnimationSource(f.spriteDef);
  f.scale = f.baseScale * style.scale;
  f.width = (source.frameWidth || f.spriteDef.frameWidth) * f.scale;
  f.height = (source.frameHeight || f.spriteDef.frameHeight) * f.scale;
}

function updateMotionIntent(f, dt) {
  const habitat = getHabitatProfile(f.species);
  const bounds = getHabitatBounds(f.species);
  f.motionTimer -= dt;
  f.scatterTimer = Math.max(0, f.scatterTimer - dt);
  updateNaturalBehaviour(f, dt);

  if (f.motionTimer <= 0) {
    const roll = Math.random();
    f.motionState = roll < 0.2 ? "idle" : roll < 0.72 ? "coast" : "burst";
    f.motionTimer = f.motionState === "idle" ? random(1400, 4200) : f.motionState === "burst" ? random(550, 1500) : random(2200, 6200);
    f.wanderPhase += random(-0.9, 0.9);
  }

  const directionSign = f.direction || 1;
  const stateSpeed = f.motionState === "idle" ? 0.42 : f.motionState === "burst" ? 1.38 : 0.82;
  const speciesMultiplier = f.species === "shark" ? 0.72 : f.species === "betta" ? 0.68 : f.species === "tetra" ? 1.08 : 0.78;
  const desiredVx = directionSign * habitat.baseSpeed * stateSpeed * speciesMultiplier * f.naturalSpeedScale;
  const verticalWander = Math.sin(performance.now() * 0.00028 + f.wanderPhase) * habitat.drift * 18;
  const verticalBias = (bounds.preferredY - f.y) * 0.006;

  f.targetVx = desiredVx + f.naturalVx;
  f.targetVy = verticalWander + verticalBias + f.naturalVy;

  const ease = f.species === "shark" ? 0.018 : f.species === "tetra" ? 0.055 : 0.032;
  f.vx = lerp(f.vx, f.targetVx, ease);
  f.vy = lerp(f.vy, f.targetVy, ease);

  if (f.scatterTimer > 0) {
    const scatterEase = f.scatterTimer / 1600;
    f.vx += f.scatterX * scatterEase * (dt / 1000);
    f.vy += f.scatterY * scatterEase * (dt / 1000);
  }
}

function updateNaturalBehaviour(f, dt) {
  f.naturalTimer -= dt;
  f.naturalStateTimer = Math.max(0, f.naturalStateTimer - dt);

  if (f.naturalStateTimer <= 0 && f.naturalState !== "none") {
    f.naturalState = "none";
    f.naturalSpeedScale = 1;
    f.naturalVx = 0;
    f.naturalVy = 0;
  }

  if (f.naturalState !== "none" || f.naturalTimer > 0) return;

  const roll = Math.random();
  f.naturalStateTimer = random(...naturalBehaviourDurationRange);
  f.naturalTimer = random(...naturalBehaviourIntervalRange);

  if (roll < 0.28) {
    f.naturalState = "pause";
    f.naturalSpeedScale = random(0.08, 0.28);
    f.naturalVy = random(-5, 5);
    return;
  }

  if (roll < 0.58) {
    f.naturalState = "dart";
    f.naturalSpeedScale = random(1.35, 1.85);
    f.naturalVx = f.direction * random(14, 34);
    f.naturalVy = random(-18, 18);
    if (Math.random() < 0.45) {
      f.targetDepth = clamp(f.targetDepth + random(-0.12, 0.12), depthRange[0], depthRange[1]);
    }
    return;
  }

  if (roll < 0.78) {
    f.naturalState = "veer";
    f.naturalSpeedScale = random(0.75, 1.15);
    f.naturalVx = random(-18, 18);
    f.naturalVy = random(-22, 22);
    if (Math.random() < 0.16) f.direction *= -1;
    return;
  }

  f.naturalState = "depth";
  f.naturalStateTimer = random(700, 1800);
  f.naturalSpeedScale = random(0.82, 1.12);
  f.naturalVy = random(-10, 10);
  f.targetDepth = clamp(f.targetDepth + random(-0.18, 0.18), depthRange[0], depthRange[1]);
}

function updateCrab(f, dt) {
  const step = dt / 1000;
  const floorY = getBottomDwellerRenderY(f);

  f.crawlTimer -= dt;
  f.crawlPauseTimer = Math.max(0, f.crawlPauseTimer - dt);
  f.hopTimer -= dt;

  if (f.crawlTimer <= 0) {
    const shouldPause = Math.random() < 0.36;
    f.direction = Math.random() < 0.5 ? -1 : 1;
    f.crawlSpeed = random(...crabCrawlSpeedRange);
    f.crawlTimer = random(...crabCrawlDurationRange);
    f.crawlPauseTimer = shouldPause ? random(...crabPauseDurationRange) : 0;
  }

  if (f.hopOffset === 0 && f.hopVelocity === 0 && f.hopTimer <= 0) {
    f.hopVelocity = -random(...crabHopStrengthRange);
    f.hopTimer = random(...crabHopIntervalRange);
  }

  if (f.hopVelocity !== 0 || f.hopOffset !== 0) {
    f.hopVelocity += crabGravity * step;
    f.hopOffset += f.hopVelocity * step;

    if (f.hopOffset > 0) {
      f.hopOffset = 0;
      f.hopVelocity = 0;
    }
  }

  f.vx = f.crawlPauseTimer > 0 ? 0 : f.direction * f.crawlSpeed;
  f.x += f.vx * step;
  f.y = floorY;

  const tinyStep = Math.sin(performance.now() * 0.001 + f.phase) * f.bobAmp;
  f.renderY = f.y + f.hopOffset + tinyStep;

  if (f.x <= 12) {
    f.x = 12;
    f.direction = 1;
    f.crawlTimer = random(...crabCrawlDurationRange);
    f.crawlPauseTimer = random(120, 520);
  }

  if (f.x + f.width >= width - 12) {
    f.x = width - 12 - f.width;
    f.direction = -1;
    f.crawlTimer = random(...crabCrawlDurationRange);
    f.crawlPauseTimer = random(120, 520);
  }
}

function updateBreakaway(f, dt) {
  f.breakTimer -= dt;

  if (f.breakTimer > 0) return;

  f.breakTimer = random(1800, 7200);
  f.breakAngle = random(0, Math.PI * 2);
  f.breakStrength = Math.random() < 0.28 ? random(0.55, 1) : random(0, 0.25);
}

function applyFishForces(dt) {
  const step = dt / 1000;

  for (const f of fish) {
    if (f.species === "crab") continue;

    const fCenter = getFishCenter(f);
    const habitat = getHabitatProfile(f.species);
    const bounds = getHabitatBounds(f.species);
    let sameSpeciesCount = 0;
    let groupX = 0;
    let groupY = 0;
    let groupVx = 0;
    let groupVy = 0;
    let groupDepth = 0;
    let repelX = 0;
    let repelY = 0;
    const schoolmates = [];

    for (const other of fish) {
      if (other === f) continue;

      const otherCenter = getFishCenter(other);
      const dx = otherCenter.x - fCenter.x;
      const dy = otherCenter.y - fCenter.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const minDistance = (f.width + other.width) * separationPadding;

      if (distance < minDistance) {
        const force = (minDistance - distance) / minDistance;
        repelX -= (dx / distance) * force;
        repelY -= (dy / distance) * force;
      }

      if (f.species !== "shark" && other.species === "shark" && distance < sharkAvoidRadius) {
        const fear = 1 - distance / sharkAvoidRadius;
        repelX -= (dx / distance) * fear * 2.6;
        repelY -= (dy / distance) * fear * 2.1;

        if (f.breakStrength < 0.65) {
          f.breakAngle = Math.atan2(-dy, -dx);
          f.breakStrength = 0.65;
          f.breakTimer = random(2200, 5200);
        }
      }

      if (canSchool(f) && canSchool(other) && other.species === f.species && distance < schoolRadius) {
        schoolmates.push({ fish: other, center: otherCenter, dx, dy, distance });
      }
    }

    f.vx += repelX * 75 * step;
    f.vy += repelY * 60 * step;

    schoolmates.sort((a, b) => a.distance - b.distance);

    for (const mate of schoolmates.slice(0, maxSchoolmates)) {
      sameSpeciesCount += 1;
      groupX += mate.center.x;
      groupY += mate.center.y;
      groupVx += mate.fish.vx;
      groupVy += mate.fish.vy;
      groupDepth += mate.fish.depth;
    }

    if (schoolmates.length > maxSchoolmates) {
      for (const mate of schoolmates.slice(maxSchoolmates)) {
        const pressure = 1 - Math.min(1, mate.distance / schoolRadius);
        f.vx -= (mate.dx / mate.distance) * pressure * 24 * step;
        f.vy -= (mate.dy / mate.distance) * pressure * 18 * step;
      }

      if (f.breakStrength < 0.45) {
        f.breakAngle = Math.atan2(repelY || Math.sin(f.phase), repelX || Math.cos(f.phase));
        f.breakStrength = 0.45;
        f.breakTimer = random(1800, 3800);
      }
    }

    if (sameSpeciesCount > 0) {
      groupX /= sameSpeciesCount;
      groupY /= sameSpeciesCount;
      groupVx /= sameSpeciesCount;
      groupVy /= sameSpeciesCount;
      groupDepth /= sameSpeciesCount;

      const schoolWeight = Math.max(0, 1 - f.breakStrength);
      const looseGroupX = groupX + f.schoolOffsetX + Math.sin(performance.now() * 0.00018 + f.phase) * 18;
      const looseGroupY = groupY + f.schoolOffsetY + Math.cos(performance.now() * 0.00016 + f.phase) * 12;
      f.vx += (looseGroupX - fCenter.x) * 0.032 * step * schoolWeight * habitat.school;
      f.vy += (looseGroupY - fCenter.y) * 0.024 * step * schoolWeight * habitat.school;
      f.vx += (groupVx - f.vx) * 0.2 * step * schoolWeight * habitat.school;
      f.vy += (groupVy - f.vy) * 0.14 * step * schoolWeight * habitat.school;
      f.targetDepth = clamp(
        f.targetDepth + (groupDepth - f.targetDepth) * 0.12 * step * schoolWeight * habitat.school,
        depthRange[0],
        depthRange[1]
      );
    }

    if (f.breakStrength > 0.01) {
      f.vx += Math.cos(f.breakAngle) * f.breakStrength * 26 * step;
      f.vy += Math.sin(f.breakAngle) * f.breakStrength * 18 * step;
      f.breakStrength = Math.max(0, f.breakStrength - 0.22 * step);
    }

    const maxSpeed = getSpeciesMaxSpeed(f.species) * (f.naturalState === "dart" ? 1.35 : 1);
    const speed = Math.hypot(f.vx, f.vy);

    if (speed > maxSpeed) {
      f.vx = (f.vx / speed) * maxSpeed;
      f.vy = (f.vy / speed) * maxSpeed;
    }

    if (f.naturalState !== "pause" && Math.abs(f.vx) < 12) {
      f.vx += f.direction * 12 * step;
    }

    if (f.y < bounds.minY + 12) f.vy += (bounds.minY + 12 - f.y) * 0.75 * step;
    if (f.y > bounds.maxY - 12) f.vy -= (f.y - bounds.maxY + 12) * 0.75 * step;
  }
}

function getFishCenter(f) {
  return {
    x: f.x + f.width * 0.5,
    y: (f.renderY ?? f.y) + f.height * 0.5
  };
}

function getBottomDwellerRenderY(f) {
  return height - 14 - getVisibleSpriteBottomOffset(f);
}

function getVisibleSpriteBottomOffset(f) {
  const sprite = spriteCache[getAnimationCacheKey(f.spriteDef)];
  const source = getAnimationSource(f.spriteDef);
  const direction = f.direction === 1 ? "right" : "left";
  const frames = getAnimationFramesForDirection(f, direction);
  const frame = frames[f.frameIndex % frames.length];
  const measuredFrame = getAnimationFrameMetrics(f, frame, direction, sprite);

  return (measuredFrame?.bounds?.maxY ?? source.frameHeight ?? f.spriteDef.frameHeight) * f.baseScale * getDepthStyle(f.depth, f.species).scale;
}

function getAnimationFramesForDirection(f, direction = f.direction === 1 ? "right" : "left") {
  const source = getAnimationSource(f.spriteDef);
  const sprite = spriteCache[getAnimationCacheKey(f.spriteDef)];

  if (sprite?.type === "frameSequence") {
    const frames = sprite.frames?.[direction]?.filter((frame) => frame.loaded) || [];
    if (frames.length) return frames;

    if (direction === "left" && source.mirrorLeftFromRight) {
      const rightFrames = sprite.frames?.right?.filter((frame) => frame.loaded) || [];
      if (rightFrames.length) return rightFrames;
    }

    if (direction === "right" && source.mirrorRightFromLeft) {
      const leftFrames = sprite.frames?.left?.filter((frame) => frame.loaded) || [];
      if (leftFrames.length) return leftFrames;
    }
  }

  if (sprite?.fallbackRows) {
    return [0, 1, 2].map((col) => ({
      col,
      row: direction === "right" ? sprite.fallbackRows.right : sprite.fallbackRows.left
    }));
  }

  return source.frames?.[direction] || f.spriteDef.frames?.[direction] || [{ col: 0, row: 0 }];
}

function getCurrentAnimationFrame(f) {
  const direction = f.direction === 1 ? "right" : "left";
  const frames = getAnimationFramesForDirection(f, direction);
  return frames[f.frameIndex % frames.length];
}

function getAnimationFrameMetrics(f, frame, direction = f.direction === 1 ? "right" : "left", sprite = spriteCache[getAnimationCacheKey(f.spriteDef)]) {
  const source = getAnimationSource(f.spriteDef);
  const metrics = sprite?.frameMetrics?.[direction] || (direction === "left" && source.mirrorLeftFromRight ? sprite?.frameMetrics?.right : null);
  if (!Array.isArray(metrics)) return null;

  if (frame.path) return metrics[frame.index] || null;

  return metrics.find((item) => {
    return item.col === frame.col && item.row === frame.row;
  });
}

function getSpeciesMaxSpeed(species) {
  return getHabitatProfile(species).maxSpeed || 48;
}

function drawFish() {
  const sortedFish = fish.slice().sort((a, b) => a.depth - b.depth);
  for (const f of sortedFish) drawFishBody(f);
  drawFishLabels(sortedFish);
}

function drawFishBody(f) {
  const frame = getCurrentAnimationFrame(f);
  const style = getDepthStyle(f.depth, f.species);

  ctx.save();
  ctx.globalAlpha = style.opacity;
  ctx.filter = style.blur > 0.08 ? `blur(${style.blur.toFixed(2)}px) brightness(${style.brightness.toFixed(2)})` : `brightness(${style.brightness.toFixed(2)})`;

  if (!drawAnimationFrame(f, frame)) {
    drawPlaceholderFish(f);
  }

  ctx.restore();
}

function drawAnimationFrame(f, frame) {
  const sprite = spriteCache[getAnimationCacheKey(f.spriteDef)];
  if (!sprite?.loaded || !frame) return false;

  const alignment = getFrameAlignment(f, frame);
  const dx = f.x + alignment.offsetX * f.scale;
  const dy = f.renderY + alignment.offsetY * f.scale;

  if (sprite.type === "frameSequence" && frame.image && (frame.image instanceof HTMLCanvasElement || frame.image.complete)) {
    const source = getAnimationSource(f.spriteDef);
    const frameWidth = source.frameWidth || frame.frameWidth || frame.image.naturalWidth || frame.image.width;
    const frameHeight = source.frameHeight || frame.frameHeight || frame.image.naturalHeight || frame.image.height;
    const drawWidth = frameWidth * f.scale;
    const drawHeight = frameHeight * f.scale;

    if (
      (f.direction === -1 && source.mirrorLeftFromRight && frame.direction === "right") ||
      (f.direction === 1 && source.mirrorRightFromLeft && frame.direction === "left")
    ) {
      ctx.save();
      ctx.translate(dx + drawWidth, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(frame.image, 0, 0, drawWidth, drawHeight);
      ctx.restore();
    } else {
      ctx.drawImage(frame.image, dx, dy, drawWidth, drawHeight);
    }
    return true;
  }

  if (!sprite.image) return false;

  const frameWidth = sprite.fallbackFrameWidth || f.spriteDef.frameWidth;
  const frameHeight = sprite.fallbackFrameHeight || f.spriteDef.frameHeight;
  const sx = frame.col * frameWidth;
  const sy = frame.row * frameHeight;
  ctx.drawImage(sprite.image, sx, sy, frameWidth, frameHeight, dx, dy, f.width, f.height);
  return true;
}

function drawPlaceholderFish(f) {
  ctx.fillStyle = resolveColor(f.variant);
  ctx.beginPath();
  ctx.ellipse(f.x + f.width * 0.5, f.renderY + f.height * 0.5, f.width * 0.3, f.height * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  const tx = f.direction === 1 ? f.x + 4 : f.x + f.width - 4;
  ctx.moveTo(tx, f.renderY + f.height * 0.5);
  ctx.lineTo(tx + (f.direction === 1 ? -14 : 14), f.renderY + f.height * 0.32);
  ctx.lineTo(tx + (f.direction === 1 ? -14 : 14), f.renderY + f.height * 0.68);
  ctx.fill();
}

function drawFishLabels(sortedFish) {
  if (!currentState?.settings?.showNames) return;

  for (const f of sortedFish) {
    if (!f.name) continue;
    const labelPosition = getNameLabelPosition(f);
    const label = f.name;
    ctx.save();
    ctx.font = '13px Arial, "Helvetica Neue", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const metrics = ctx.measureText(label);
    const depthLabel = getDepthLabelStyle(f.depth);
    const padX = 7;
    const labelWidth = metrics.width + padX * 2;
    const labelHeight = 18;
    const x = clamp(labelPosition.x, labelWidth * 0.5 + 6, width - labelWidth * 0.5 - 6);
    const y = clamp(labelPosition.y - labelHeight * 0.5, 12, height - 18);
    ctx.shadowColor = depthLabel.shadow;
    ctx.shadowBlur = depthLabel.shadowBlur;
    ctx.fillStyle = depthLabel.panel;
    roundRect(ctx, x - labelWidth * 0.5, y - labelHeight * 0.5, labelWidth, labelHeight, 7);
    ctx.fill();
    ctx.shadowBlur = depthLabel.shadowBlur * 0.55;
    ctx.fillStyle = depthLabel.text;
    ctx.fillText(label, x, y + 0.5);
    ctx.restore();
  }
}

function getNameLabelPosition(f) {
  const bounds = getCurrentVisibleBounds(f);

  if (!bounds) {
    return {
      x: f.x + f.width * 0.5,
      y: f.renderY + f.height * 0.18
    };
  }

  const offset = f.species === "crab" ? 8 : 12;

  return {
    x: bounds.x + bounds.width * 0.5,
    y: Math.max(18, bounds.y - offset)
  };
}

function getCurrentVisibleBounds(f) {
  const sprite = spriteCache[getAnimationCacheKey(f.spriteDef)];
  const source = getAnimationSource(f.spriteDef);
  const direction = f.direction === 1 ? "right" : "left";
  const frames = getAnimationFramesForDirection(f, direction);
  const frame = frames[f.frameIndex % frames.length];
  const measuredFrame = getAnimationFrameMetrics(f, frame, direction, sprite);

  if (!measuredFrame?.bounds) return null;

  const alignment = getFrameAlignment(f, frame);
  const drawnX = f.x + alignment.offsetX * f.scale;
  const drawnY = f.renderY + alignment.offsetY * f.scale;
  const bounds = measuredFrame.bounds;
  const isMirroredFrame = sprite?.type === "frameSequence" && (
    (direction === "left" && source.mirrorLeftFromRight && frame.direction === "right") ||
    (direction === "right" && source.mirrorRightFromLeft && frame.direction === "left")
  );
  const boundsX = isMirroredFrame
    ? drawnX + ((source.frameWidth || f.width / f.scale) - bounds.maxX) * f.scale
    : drawnX + bounds.minX * f.scale;

  return {
    x: boundsX,
    y: drawnY + bounds.minY * f.scale,
    width: (bounds.maxX - bounds.minX) * f.scale,
    height: (bounds.maxY - bounds.minY) * f.scale
  };
}

function getFrameAlignment(f, frame) {
  const sprite = spriteCache[getAnimationCacheKey(f.spriteDef)];
  if (!sprite?.frameMetrics) return { offsetX: 0, offsetY: 0 };

  const direction = f.direction === 1 ? "right" : "left";
  const source = getAnimationSource(f.spriteDef);
  const measuredFrame = getAnimationFrameMetrics(f, frame, direction, sprite);

  if (!measuredFrame?.alignmentPoint || !measuredFrame.anchor) return { offsetX: 0, offsetY: 0 };
  const alignmentX = sprite.type === "frameSequence" && (
    (direction === "left" && source.mirrorLeftFromRight && frame.direction === "right") ||
    (direction === "right" && source.mirrorRightFromLeft && frame.direction === "left")
  )
    ? (source.frameWidth || f.width / f.scale) - measuredFrame.alignmentPoint.x
    : measuredFrame.alignmentPoint.x;

  return {
    offsetX: measuredFrame.anchor.x - alignmentX,
    offsetY: measuredFrame.anchor.y - measuredFrame.alignmentPoint.y
  };
}

function updateBubbles() {
  if (bubbles.length < maxBubbles && Math.random() < 0.12) {
    bubbles.push({
      x: random(20, width - 20),
      y: height + 8,
      speed: random(12, 34),
      drift: random(-6, 6),
      phase: random(0, Math.PI * 2),
      size: random(0.7, 1.6),
      alpha: random(0.12, 0.28),
      depth: random(0.28, 1)
    });
  }

  bubbles.forEach((b) => {
    b.y -= b.speed / 60;
    b.x += Math.sin(b.y * 0.018 + b.phase) * b.drift / 60 + waterCurrent.x * 0.012 * b.depth;
  });
  bubbles = bubbles.filter((b) => b.y > -20);
}

function drawBubbles() {
  bubbles.forEach((b) => {
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = "#e9fff8";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
function spawnParticles(x, y, color) {
  const count = Math.min(34, maxParticles - particles.length);
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: x + random(-16, 16),
      y: y + random(-12, 12),
      vx: random(-2.4, 2.4),
      vy: random(-2.8, -0.15),
      life: random(46, 86),
      maxLife: 86,
      size: random(2.4, 5.8),
      color
    });
  }
}
function spawnArrivalBurst(x, y, direction) {
  for (let i = 0; i < 18 && bubbles.length < maxBubbles; i += 1) {
    bubbles.push({
      x: x + random(-18, 18),
      y: y + random(-8, 18),
      speed: random(24, 54),
      drift: random(-10, 10) + direction * 8,
      phase: random(0, Math.PI * 2),
      size: random(1.2, 3.4),
      alpha: random(0.18, 0.42),
      depth: random(0.75, 1)
    });
  }

  arrivalBursts.push({
    x,
    y,
    life: 52,
    maxLife: 52,
    direction
  });
}
function scatterNearbyFish(source, radius) {
  const sourceCenter = { x: source.x, y: source.y };
  for (const other of fish) {
    if (other === source || other.species === "crab") continue;
    const center = getFishCenter(other);
    const dx = center.x - sourceCenter.x;
    const dy = center.y - sourceCenter.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    if (distance > radius) continue;
    const force = 1 - distance / radius;
    other.scatterTimer = random(900, 1700);
    other.scatterX = (dx / distance) * force * random(34, 72);
    other.scatterY = (dy / distance) * force * random(16, 38);
  }
}
function updateParticles() {
  particles.forEach((p) => {
    p.x += p.vx + waterCurrent.x * 0.012;
    p.y += p.vy + waterCurrent.y * 0.008;
    p.vy += 0.018;
    p.vx *= 0.992;
    p.life -= 1;
  });
  particles = particles.filter((p) => p.life > 0);
  arrivalBursts.forEach((burst) => { burst.life -= 1; burst.x += waterCurrent.x * 0.012; });
  arrivalBursts = arrivalBursts.filter((burst) => burst.life > 0);
}
function drawParticles() {
  particles.forEach((p) => {
    ctx.save();
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.55 + alpha * 0.45), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.34;
    ctx.fillStyle = "#f5fffa";
    ctx.beginPath();
    ctx.arc(p.x - p.size * 0.18, p.y - p.size * 0.18, p.size * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
function drawArrivalBursts() {
  for (const burst of arrivalBursts) {
    const alpha = Math.max(0, burst.life / burst.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = "#e9fff8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, (1 - alpha) * 48 + 8, -0.8, 0.8);
    ctx.stroke();
    ctx.restore();
  }
}

function ensurePlanktonField() {
  if (!width || !height) return;
  const target = Math.min(maxPlankton, Math.max(70, Math.floor((width * height) / 12000)));
  while (plankton.length < target) {
    plankton.push(createPlanktonParticle(random(0, width), random(0, height)));
  }
  if (plankton.length > target) plankton.length = target;
}

function createPlanktonParticle(x, y) {
  const depth = random(0.25, 1);
  return {
    x,
    y,
    depth,
    size: random(0.45, 1.9) * lerp(0.7, 1.3, depth),
    alpha: random(0.035, 0.16),
    drift: random(-0.25, 0.25),
    phase: random(0, Math.PI * 2)
  };
}

function updatePlankton(dt) {
  ensurePlanktonField();
  const step = dt / 1000;
  for (const p of plankton) {
    p.x += (waterCurrent.x * lerp(0.18, 0.62, p.depth) + p.drift) * step;
    p.y += (waterCurrent.y * 0.22 + Math.sin(performance.now() * 0.00025 + p.phase) * 0.18) * step;
    if (p.x < -8) p.x = width + 8;
    if (p.x > width + 8) p.x = -8;
    if (p.y < -8) p.y = height + 8;
    if (p.y > height + 8) p.y = -8;
  }
}

function drawPlankton(layer = "back") {
  ctx.save();
  ctx.fillStyle = "#effff8";
  for (const p of plankton) {
    const foreground = p.depth > 0.62;
    if ((layer === "front") !== foreground) continue;
    ctx.globalAlpha = p.alpha * (layer === "front" ? 1.2 : 0.82);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVolumetricLight(t) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 4; i += 1) {
    const x = width * (0.12 + i * 0.24) + Math.sin(t * 0.00008 + i) * 44;
    const rayWidth = width * 0.16;
    const gradient = ctx.createLinearGradient(x, 0, x + rayWidth, height * 0.82);
    gradient.addColorStop(0, "rgba(184, 255, 226, 0.055)");
    gradient.addColorStop(0.36, "rgba(184, 255, 226, 0.024)");
    gradient.addColorStop(1, "rgba(184, 255, 226, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x - rayWidth * 0.24, 0);
    ctx.lineTo(x + rayWidth * 0.44, 0);
    ctx.lineTo(x + rayWidth * 1.2, height);
    ctx.lineTo(x - rayWidth * 0.72, height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawForegroundSilhouettes(t) {
  const baseY = height - 6;
  ctx.save();
  ctx.fillStyle = "rgba(0, 15, 13, 0.34)";
  ctx.beginPath();
  ctx.ellipse(width * 0.08, baseY + 8, width * 0.15, 42, -0.12, 0, Math.PI * 2);
  ctx.ellipse(width * 0.91, baseY + 5, width * 0.19, 50, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(9, 45, 34, 0.46)";
  ctx.lineCap = "round";
  for (let cluster = 0; cluster < 7; cluster += 1) {
    const side = cluster % 2 === 0 ? 0.05 : 0.95;
    const baseX = width * side + randomFromSeed(cluster + 91, -38, 38);
    const stalks = 3 + (cluster % 3);
    for (let i = 0; i < stalks; i += 1) {
      const seed = cluster * 31 + i;
      const h = randomFromSeed(seed, height * 0.09, height * 0.21);
      const sway = Math.sin(t * 0.00048 + seed) * 9;
      ctx.lineWidth = randomFromSeed(seed + 7, 3, 6);
      ctx.beginPath();
      ctx.moveTo(baseX + i * 9, baseY + 4);
      ctx.quadraticCurveTo(baseX + sway, baseY - h * 0.55, baseX + sway * 1.5, baseY - h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function getCameraDrift(t) {
  return {
    x: Math.sin(t * 0.000045) * 3.2 + Math.sin(t * 0.000019 + 1.8) * 1.8,
    y: Math.sin(t * 0.000037 + 0.6) * 2.4
  };
}

function roundRect(context, x, y, rectWidth, rectHeight, radius) {
  const r = Math.min(radius, rectWidth * 0.5, rectHeight * 0.5);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + rectWidth - r, y);
  context.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + r);
  context.lineTo(x + rectWidth, y + rectHeight - r);
  context.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - r, y + rectHeight);
  context.lineTo(x + r, y + rectHeight);
  context.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}
function updateResponseCount() {}
function showToast(text) { const e = document.getElementById("aquariumToast"); if (!e) return; e.textContent = text; e.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => e.classList.remove("show"), 1200); }
function randomFromSeed(seed, min, max) {
  const value = Math.sin(seed * 999.13) * 43758.5453;
  return min + (value - Math.floor(value)) * (max - min);
}

function frame(t) {
  if (!ctx) return;
  const dt = Math.min(48, t - lastFrame);
  lastFrame = t;
  drawBackground(t);
  updatePlankton(dt);
  drawVolumetricLight(t);
  const camera = getCameraDrift(t);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  drawPlankton("back");
  drawSeagrass(t);
  updateBubbles();
  drawBubbles();
  updateFish(dt);
  drawFish();
  updateParticles();
  drawArrivalBursts();
  drawParticles();
  drawPlankton("front");
  drawForegroundSilhouettes(t);
  ctx.restore();
  animationFrame = requestAnimationFrame(frame);
}
