const CONFIG = {
  WORLD_X: 18,
  WORLD_Z: 18,
  TILE_WIDTH: 46,
  TILE_HEIGHT: 23,
  BLOCK_HEIGHT: 23,
  MAX_HEIGHT: 5,
  SEED: 20261120,
};

const COLORS = {
  grass: { top: "#72c45a", left: "#4f9e4d", right: "#39743e" },
  dirt: { top: "#b8784a", left: "#8d5437", right: "#653b2e" },
  stone: { top: "#aebcc0", left: "#7f9299", right: "#5b6d76" },
  water: { top: "#6bd1df", left: "#3c9ab6", right: "#28728e" },
  wood: { top: "#d08a4b", left: "#a66136", right: "#77402c" },
};

const state = { voxels: new Map(), canvas: document.getElementById("terrain-canvas"), context: null };

function key(x, y, z) { return `${x},${y},${z}`; }
function setVoxel(x, y, z, type) { state.voxels.set(key(x, y, z), type); }
function getVoxel(x, y, z) { return state.voxels.get(key(x, y, z)); }

function seededNoise(x, z) {
  const value = Math.sin((x + CONFIG.SEED) * 12.9898 + (z - CONFIG.SEED) * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function terrainHeight(x, z) {
  const waves = Math.sin((x + CONFIG.SEED * .001) * .62) + Math.cos((z - CONFIG.SEED * .001) * .57);
  return Math.max(1, Math.min(CONFIG.MAX_HEIGHT - 1, 2 + Math.round(waves * .48 + (seededNoise(x, z) - .5) * .8)));
}

function generateTerrain() {
  state.voxels.clear();
  for (let x = 0; x < CONFIG.WORLD_X; x += 1) {
    for (let z = 0; z < CONFIG.WORLD_Z; z += 1) {
      const height = terrainHeight(x, z);
      const water = height === 1 && Math.sin(x * .8) + Math.cos(z * .7) < -.35;
      if (water) {
        setVoxel(x, 0, z, "dirt");
        setVoxel(x, 1, z, "water");
        continue;
      }
      for (let y = 0; y < height; y += 1) {
        setVoxel(x, y, z, y === height - 1 ? "grass" : y === height - 2 ? "dirt" : "stone");
      }
      const tree = height >= 2 && seededNoise(x + 17, z - 11) > .86 && x > 1 && z > 1 && x < CONFIG.WORLD_X - 2 && z < CONFIG.WORLD_Z - 2;
      if (tree) {
        setVoxel(x, height, z, "wood");
        setVoxel(x, height + 1, z, "wood");
        setVoxel(x, height + 1, z + 1, "grass");
        setVoxel(x + 1, height + 1, z, "grass");
      }
    }
  }
}

function project(x, y, z, width) {
  return {
    x: width / 2 + (x - z) * CONFIG.TILE_WIDTH / 2,
    y: 52 + (x + z) * CONFIG.TILE_HEIGHT / 2 - y * CONFIG.BLOCK_HEIGHT,
  };
}

function face(points, fill, type, textureSide, context) {
  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.clip();
  context.globalAlpha = .27;
  context.fillStyle = textureSide === "top" ? "#fff8d0" : "#1d3940";
  const bounds = points.reduce((result, point) => ({
    minX: Math.min(result.minX, point.x), maxX: Math.max(result.maxX, point.x),
    minY: Math.min(result.minY, point.y), maxY: Math.max(result.maxY, point.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const step = type === "stone" ? 9 : 12;
  if (type === "water") {
    for (let y = bounds.minY; y < bounds.maxY + step; y += step) context.fillRect(bounds.minX, y, bounds.maxX - bounds.minX, 2);
  } else if (type === "wood") {
    for (let x = bounds.minX; x < bounds.maxX + step; x += step) context.fillRect(x, bounds.minY, 2, bounds.maxY - bounds.minY);
  } else {
    for (let x = bounds.minX; x < bounds.maxX + step; x += step) {
      for (let y = bounds.minY; y < bounds.maxY + step; y += step) context.fillRect(x, y, type === "stone" ? 3 : 2, type === "stone" ? 3 : 2);
    }
  }
  context.restore();
  context.strokeStyle = "rgba(18, 37, 42, .5)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.stroke();
}

function drawVoxel(x, y, z, type, width, context) {
  const top = project(x, y + 1, z, width);
  const right = project(x + 1, y + 1, z, width);
  const back = project(x + 1, y + 1, z + 1, width);
  const left = project(x, y + 1, z + 1, width);
  const bottomRight = project(x + 1, y, z, width);
  const bottomLeft = project(x, y, z + 1, width);
  const colors = COLORS[type];
  face([top, right, back, left], colors.top, type, "top", context);
  face([left, back, bottomLeft, project(x, y, z, width)], colors.left, type, "left", context);
  face([right, back, bottomRight, project(x + 1, y, z, width)], colors.right, type, "right", context);
}

function renderTerrain() {
  const canvas = state.canvas;
  const context = state.context;
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#70c8df");
  sky.addColorStop(.58, "#d9f1d9");
  sky.addColorStop(.59, "#a8d67e");
  sky.addColorStop(1, "#6d9e56");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#fff0a9";
  context.shadowColor = "#fff0a9";
  context.shadowBlur = 24;
  context.beginPath();
  context.arc(width - 86, 76, 27, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  const blocks = [...state.voxels.entries()].map(([location, type]) => {
    const [x, y, z] = location.split(",").map(Number);
    return { x, y, z, type };
  }).sort((a, b) => (a.x + a.z + a.y) - (b.x + b.z + b.y));
  blocks.forEach((block) => drawVoxel(block.x, block.y, block.z, block.type, width, context));
}

function resize() {
  const canvas = state.canvas;
  const scale = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.floor(bounds.width * scale);
  canvas.height = Math.floor(bounds.height * scale);
  state.context.setTransform(scale, 0, 0, scale, 0, 0);
  renderTerrain();
}

state.context = state.canvas.getContext("2d");
generateTerrain();
document.getElementById("world-seed").textContent = `SEED ${CONFIG.SEED}`;
window.addEventListener("resize", resize);
resize();
