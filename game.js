import * as THREE from "three";

const CONFIG = {
  WORLD_X: 18,
  WORLD_Z: 18,
  MAX_HEIGHT: 5,
  SEED: 20261120,
  CAMERA: { x: 9, y: 4.6, z: 1.5, lookX: 9, lookY: 1.2, lookZ: 8 },
};

const BLOCK_COLORS = {
  grass: "#72c45a",
  dirt: "#b8784a",
  stone: "#aebcc0",
  water: "#55bdd7",
  wood: "#d08a4b",
};

const state = { voxels: new Map(), scene: null, camera: null, renderer: null, keys: new Set() };
const canvas = document.getElementById("terrain-canvas");

function key(x, y, z) { return `${x},${y},${z}`; }
function setVoxel(x, y, z, type) { state.voxels.set(key(x, y, z), type); }

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
      const basin = height === 1 && Math.sin(x * .8) + Math.cos(z * .7) < -.35;
      if (basin) {
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

function createBlockTexture(type) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 32;
  textureCanvas.height = 32;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = BLOCK_COLORS[type];
  context.fillRect(0, 0, 32, 32);
  context.fillStyle = type === "water" ? "rgba(225,255,255,.28)" : "rgba(30,50,35,.2)";
  if (type === "water") {
    for (let y = 4; y < 32; y += 8) context.fillRect(0, y, 32, 2);
  } else if (type === "wood") {
    for (let x = 3; x < 32; x += 8) context.fillRect(x, 0, 2, 32);
  } else {
    for (let x = 3; x < 32; x += 8) {
      for (let y = 3; y < 32; y += 8) context.fillRect(x, y, 3, 3);
    }
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

function addSun(scene) {
  const sunCanvas = document.createElement("canvas");
  sunCanvas.width = 64;
  sunCanvas.height = 64;
  const context = sunCanvas.getContext("2d");
  context.fillStyle = "#fff0a9";
  context.shadowColor = "#fff0a9";
  context.shadowBlur = 12;
  context.beginPath();
  context.arc(32, 32, 20, 0, Math.PI * 2);
  context.fill();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunCanvas), transparent: true }));
  sun.position.set(5, 9, 11);
  sun.scale.set(3, 3, 1);
  scene.add(sun);
}

function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#7bcbe0");
  scene.fog = new THREE.Fog("#bce6d9", 16, 38);
  scene.add(new THREE.HemisphereLight("#e8fbff", "#487143", 2.2));
  const sunlight = new THREE.DirectionalLight("#fff4ca", 3.2);
  sunlight.position.set(-8, 14, -10);
  scene.add(sunlight);
  addSun(scene);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const blocksByType = new Map(Object.keys(BLOCK_COLORS).map((type) => [type, []]));
  state.voxels.forEach((type, location) => {
    const [x, y, z] = location.split(",").map(Number);
    blocksByType.get(type).push({ x, y, z });
  });
  blocksByType.forEach((blocks, type) => {
    if (!blocks.length) return;
    const material = new THREE.MeshLambertMaterial({ map: createBlockTexture(type) });
    const mesh = new THREE.InstancedMesh(geometry, material, blocks.length);
    blocks.forEach((block, index) => {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(block.x, block.y + .5, block.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  });
  return scene;
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  state.camera.aspect = bounds.width / bounds.height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(bounds.width, bounds.height, false);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  state.renderer.render(state.scene, state.camera);
}

function moveCamera(direction, amount) {
  const nextX = state.camera.position.x + direction.x * amount;
  const nextZ = state.camera.position.z + direction.z * amount;
  if (nextX < 1 || nextX > CONFIG.WORLD_X - 2 || nextZ < 1 || nextZ > CONFIG.WORLD_Z - 2) return;
  state.camera.position.x = nextX;
  state.camera.position.z = nextZ;
  state.camera.lookAt(nextX, CONFIG.CAMERA.lookY, nextZ + 7);
}

function updateMovement(delta) {
  const speed = 4 * delta;
  const forward = { x: 0, z: 1 };
  const right = { x: 1, z: 0 };
  if (state.keys.has("w") || state.keys.has("arrowup")) moveCamera(forward, speed);
  if (state.keys.has("s") || state.keys.has("arrowdown")) moveCamera({ x: -forward.x, z: -forward.z }, speed);
  if (state.keys.has("a") || state.keys.has("arrowleft")) moveCamera({ x: -right.x, z: -right.z }, speed);
  if (state.keys.has("d") || state.keys.has("arrowright")) moveCamera(right, speed);
}

let previousTime = performance.now();
function animate(time) {
  const delta = Math.min(.05, (time - previousTime) / 1000);
  previousTime = time;
  updateMovement(delta);
  state.renderer.render(state.scene, state.camera);
  requestAnimationFrame(animate);
}

generateTerrain();
state.scene = buildScene();
state.camera = new THREE.PerspectiveCamera(64, 1, .1, 100);
state.camera.position.set(CONFIG.CAMERA.x, CONFIG.CAMERA.y, CONFIG.CAMERA.z);
state.camera.lookAt(CONFIG.CAMERA.lookX, CONFIG.CAMERA.lookY, CONFIG.CAMERA.lookZ);
state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
state.renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("world-seed").textContent = `SEED ${CONFIG.SEED} · THREE.JS VOXELS`;
window.addEventListener("resize", resize);
resize();
document.addEventListener("keydown", (event) => {
  const keyName = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(keyName)) {
    event.preventDefault();
    state.keys.add(keyName);
  }
});
document.addEventListener("keyup", (event) => state.keys.delete(event.key.toLowerCase()));
document.querySelectorAll("[data-move]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); moveCamera(JSON.parse(button.dataset.move), .65); });
});
requestAnimationFrame(animate);
