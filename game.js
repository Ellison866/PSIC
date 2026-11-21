const CONFIG = {
  ROUND_SECONDS: 60,
  WORLD_X: 12,
  WORLD_Z: 12,
  MAX_Y: 4,
  TILE_WIDTH: 54,
  TILE_HEIGHT: 27,
  BLOCK_HEIGHT: 27,
  POINTS_PER_BLOCK: 10,
  WRONG_BLOCK_PENALTY: 2,
  QUEST_EVERY: 3,
  TARGET_BLOCKS: ["grass", "dirt", "stone", "water", "wood"],
  STARTING_INVENTORY: { grass: 4, dirt: 8, stone: 0, water: 0, wood: 2 },
};

const TILE_LABELS = { grass: "grass", dirt: "dirt", stone: "stone", water: "water", wood: "wood" };
const COLORS = {
  grass: ["#a8e063", "#5eae4f", "#47833d"],
  dirt: ["#bd8051", "#905533", "#633a2c"],
  stone: ["#b6c5ca", "#84979d", "#5c7078"],
  water: ["#7bd7e6", "#3e9fc5", "#277595"],
  wood: ["#d29456", "#a96435", "#704028"],
};

const state = {
  score: 0,
  seconds: CONFIG.ROUND_SECONDS,
  target: "",
  subject: "",
  voxels: new Map(),
  player: { x: 6, y: 1, z: 6 },
  inventory: { ...CONFIG.STARTING_INVENTORY },
  selectedType: "grass",
  quest: null,
  matches: 0,
  running: false,
  timerId: null,
};

const $ = (id) => document.getElementById(id);
const canvas = $("voxel-canvas");
const context = canvas.getContext("2d");
const startScreen = $("start-screen");
const gameScreen = $("game-screen");
const gameOver = $("game-over");
const thinking = $("thinking");
const errorBox = $("error-box");

function key(x, y, z) { return `${x},${y},${z}`; }
function getVoxel(x, y, z) { return state.voxels.get(key(x, y, z)); }
function setVoxel(x, y, z, type) { if (type) state.voxels.set(key(x, y, z), type); else state.voxels.delete(key(x, y, z)); }
function inWorld(x, z) { return x >= 0 && z >= 0 && x < CONFIG.WORLD_X && z < CONFIG.WORLD_Z; }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 6000);
}

function setThinking(isThinking) { thinking.classList.toggle("hidden", !isThinking); }
function renderStats() { $("score").textContent = state.score; $("timer").textContent = state.seconds; }

function makeWorld() {
  state.voxels.clear();
  for (let x = 0; x < CONFIG.WORLD_X; x += 1) {
    for (let z = 0; z < CONFIG.WORLD_Z; z += 1) {
      const edge = x === 0 || z === 0 || x === CONFIG.WORLD_X - 1 || z === CONFIG.WORLD_Z - 1;
      const ground = edge ? "water" : randomItem(["grass", "grass", "grass", "dirt", "stone"]);
      setVoxel(x, 0, z, ground);
      if (!edge && Math.random() < 0.16) setVoxel(x, 1, z, randomItem(["stone", "wood", "dirt"]));
    }
  }
  setVoxel(state.player.x, 0, state.player.z, "grass");
  setVoxel(state.player.x, 1, state.player.z, null);
  state.target = randomItem(CONFIG.TARGET_BLOCKS);
  const targetX = 1 + Math.floor(Math.random() * (CONFIG.WORLD_X - 2));
  const targetZ = 1 + Math.floor(Math.random() * (CONFIG.WORLD_Z - 2));
  setVoxel(targetX, Math.random() < 0.5 ? 0 : 1, targetZ, state.target);
  $("target-label").textContent = `Mine the glowing ${TILE_LABELS[state.target]} blocks`;
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(bounds.width * scale));
  canvas.height = Math.max(1, Math.floor(bounds.height * scale));
  context.setTransform(scale, 0, 0, scale, 0, 0);
  drawWorld();
}

function isoPoint(x, y, z) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: bounds.width / 2 + (x - z) * CONFIG.TILE_WIDTH / 2,
    y: 70 + (x + z) * CONFIG.TILE_HEIGHT / 2 - y * CONFIG.BLOCK_HEIGHT,
  };
}

function polygon(points, fill, stroke = "rgba(20, 37, 42, .35)") {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.stroke();
}

function drawVoxel(x, y, z, type, night) {
  const top = isoPoint(x, y + 1, z);
  const right = isoPoint(x + 1, y + 1, z);
  const back = isoPoint(x + 1, y + 1, z + 1);
  const left = isoPoint(x, y + 1, z + 1);
  const bottomRight = isoPoint(x + 1, y, z);
  const bottomLeft = isoPoint(x, y, z + 1);
  const colors = COLORS[type];
  const shade = night ? .72 : 1;
  polygon([top, right, back, left], colors[0], "rgba(20, 37, 42, .5)");
  polygon([left, back, bottomLeft, isoPoint(x, y, z)], colors[1], "rgba(20, 37, 42, .5)");
  polygon([right, back, bottomRight, isoPoint(x + 1, y, z)], colors[2], "rgba(20, 37, 42, .5)");
  if (night) {
    context.fillStyle = "rgba(18, 30, 48, .24)";
    polygon([top, right, back, left], `rgba(18, 30, 48, ${1 - shade})`, "transparent");
  }
  if (type === state.target) {
    context.beginPath();
    context.arc(top.x, top.y, 8, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 224, 104, .85)";
    context.shadowColor = "#ffe06a";
    context.shadowBlur = 16;
    context.fill();
    context.shadowBlur = 0;
  }
}

function drawPlayer(night) {
  const point = isoPoint(state.player.x + .5, state.player.y + .95, state.player.z + .5);
  context.fillStyle = night ? "#ffe36b" : "#fff8e8";
  context.strokeStyle = "#26323a";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(point.x, point.y - 13, 9, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#65a8d8";
  context.fillRect(point.x - 8, point.y - 4, 16, 13);
}

function drawWorld() {
  if (!canvas || !context) return;
  const bounds = canvas.getBoundingClientRect();
  context.clearRect(0, 0, bounds.width, bounds.height);
  const night = document.body.classList.contains("night");
  context.fillStyle = night ? "#1a3042" : "#75c9db";
  context.fillRect(0, 0, bounds.width, bounds.height);
  context.fillStyle = night ? "rgba(255, 226, 122, .45)" : "rgba(255, 248, 210, .55)";
  context.beginPath();
  context.arc(bounds.width - 55, 48, 22, 0, Math.PI * 2);
  context.fill();
  const blocks = [...state.voxels.entries()].map(([location, type]) => {
    const [x, y, z] = location.split(",").map(Number);
    return { x, y, z, type };
  }).sort((a, b) => (a.x + a.z + a.y) - (b.x + b.z + b.y));
  blocks.forEach((block) => drawVoxel(block.x, block.y, block.z, block.type, night));
  drawPlayer(night);
}

function renderHotbar() {
  const hotbar = $("hotbar");
  hotbar.innerHTML = "";
  CONFIG.TARGET_BLOCKS.forEach((type, index) => {
    const slot = document.createElement("button");
    slot.className = `hotbar-slot${type === state.selectedType ? " selected" : ""}`;
    slot.type = "button";
    slot.title = `Select ${TILE_LABELS[type]}: ${state.inventory[type]} available`;
    slot.innerHTML = `<span class="mini-block ${type}" aria-hidden="true"></span><b>${index + 1}</b><span>${state.inventory[type]}</span>`;
    slot.addEventListener("click", () => { state.selectedType = type; renderHotbar(); });
    hotbar.appendChild(slot);
  });
  $("selected-block").textContent = `Selected: ${TILE_LABELS[state.selectedType]}`;
}

function movePlayer(dx, dz) {
  const x = state.player.x + dx;
  const z = state.player.z + dz;
  if (!inWorld(x, z) || getVoxel(x, 1, z)) return;
  state.player.x = x;
  state.player.z = z;
  drawWorld();
}

function pickAdjacentVoxel() {
  const candidates = [
    [state.player.x, 1, state.player.z], [state.player.x, 0, state.player.z],
    [state.player.x + 1, 1, state.player.z], [state.player.x - 1, 1, state.player.z],
    [state.player.x, 1, state.player.z + 1], [state.player.x, 1, state.player.z - 1],
    [state.player.x + 1, 0, state.player.z], [state.player.x - 1, 0, state.player.z],
  ];
  return candidates.find(([x, y, z]) => inWorld(x, z) && getVoxel(x, y, z) === state.target);
}

function mineBlock() {
  if (!state.running) return;
  const spot = pickAdjacentVoxel();
  if (!spot) { showError(`Find a glowing ${TILE_LABELS[state.target]} block nearby first.`); return; }
  const [x, y, z] = spot;
  setVoxel(x, y, z, null);
  state.inventory[state.target] += 1;
  state.score += CONFIG.POINTS_PER_BLOCK;
  state.matches += 1;
  renderStats();
  renderHotbar();
  drawWorld();
  if (state.matches > 0 && state.matches % CONFIG.QUEST_EVERY === 0) $("quest-title").textContent = "Quest unlocked!";
}

function buildBlock() {
  if (!state.running || state.inventory[state.selectedType] < 1) {
    showError(`You need a ${TILE_LABELS[state.selectedType]} block in your hotbar.`);
    return;
  }
  const candidates = [[state.player.x + 1, state.player.z], [state.player.x - 1, state.player.z], [state.player.x, state.player.z + 1], [state.player.x, state.player.z - 1]];
  const spot = candidates.find(([x, z]) => inWorld(x, z) && !getVoxel(x, 1, z));
  if (!spot) { showError("There is no open space beside you."); return; }
  setVoxel(spot[0], 1, spot[1], state.selectedType);
  state.inventory[state.selectedType] -= 1;
  state.score += 1;
  renderStats();
  renderHotbar();
  drawWorld();
}

function craftStone() {
  if (state.inventory.dirt < 2 || state.inventory.wood < 1) { showError("Crafting needs 2 dirt and 1 wood."); return; }
  state.inventory.dirt -= 2;
  state.inventory.wood -= 1;
  state.inventory.stone += 1;
  state.selectedType = "stone";
  renderHotbar();
  $("craft-status").textContent = "Crafted 1 stone block!";
}

function renderQuest(quest) {
  state.quest = quest;
  $("quest-title").textContent = quest.quest || `A ${state.subject} quest`;
  $("question").textContent = quest.question;
  $("feedback").textContent = "";
  const choices = $("choices");
  choices.innerHTML = "";
  (quest.choices || []).forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => answerQuest(index));
    choices.appendChild(button);
  });
}

function answerQuest(index) {
  if (!state.quest) return;
  const correct = index === state.quest.answerIndex;
  state.score += correct ? CONFIG.POINTS_PER_BLOCK * 2 : -CONFIG.WRONG_BLOCK_PENALTY;
  $("feedback").textContent = correct ? "Correct! Your quest continues." : "Good try — ask a teacher to double-check this one.";
  renderStats();
}

async function askAI(subject) {
  const response = await fetch("/api/learn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "The AI could not answer. Check the internet and try again.");
  return data;
}

function updateClock() {
  const isNight = Math.floor((CONFIG.ROUND_SECONDS - state.seconds) / 10) % 2 === 1;
  document.body.classList.toggle("night", isNight);
  $("world-time").textContent = isNight ? "NIGHT" : "DAY";
  drawWorld();
}

function startTimer() {
  clearInterval(state.timerId);
  updateClock();
  state.timerId = setInterval(() => {
    if (!state.running) return;
    state.seconds -= 1;
    renderStats();
    updateClock();
    if (state.seconds <= 0) endGame();
  }, 1000);
}

function beginGame(quest) {
  state.score = 0;
  state.seconds = CONFIG.ROUND_SECONDS;
  state.matches = 0;
  state.inventory = { ...CONFIG.STARTING_INVENTORY };
  state.selectedType = "grass";
  state.player = { x: Math.floor(CONFIG.WORLD_X / 2), y: 1, z: Math.floor(CONFIG.WORLD_Z / 2) };
  state.running = true;
  startScreen.classList.add("hidden");
  gameOver.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  $("game-title").textContent = state.subject;
  $("craft-status").textContent = "2 dirt + 1 wood → 1 stone";
  renderStats();
  makeWorld();
  renderHotbar();
  renderQuest(quest);
  resizeCanvas();
  startTimer();
}

function endGame() {
  state.running = false;
  clearInterval(state.timerId);
  gameScreen.classList.add("hidden");
  gameOver.classList.remove("hidden");
  $("final-score").textContent = `You scored ${state.score} points in ${state.subject}.`;
  $("final-message").textContent = state.score > 0 ? "You turned a subject into a playable quest." : "Every try is a step forward.";
}

$("start-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = $("subject").value.trim();
  if (!subject) return;
  state.subject = subject;
  setThinking(true);
  try { beginGame(await askAI(subject)); }
  catch (error) { showError(error.message || "The AI could not answer. Check the internet and try again."); }
  finally { setThinking(false); }
});

$("craft-button").addEventListener("click", craftStone);
$("mine-button").addEventListener("click", mineBlock);
$("build-button").addEventListener("click", buildBlock);
$("play-again").addEventListener("click", () => { startScreen.classList.remove("hidden"); gameOver.classList.add("hidden"); document.body.classList.remove("night"); $("subject").focus(); });
$("quit-button").addEventListener("click", endGame);
canvas.addEventListener("click", (event) => {
  if (!state.running) return;
  const bounds = canvas.getBoundingClientRect();
  const dx = (event.clientX - bounds.left - bounds.width / 2) / (CONFIG.TILE_WIDTH / 2);
  const dz = (event.clientY - bounds.top - 70) / (CONFIG.TILE_HEIGHT / 2);
  const x = Math.round((dx + dz) / 2);
  const z = Math.round((dz - dx) / 2);
  if (Math.abs(x - state.player.x) + Math.abs(z - state.player.z) === 1) {
    movePlayer(x - state.player.x, z - state.player.z);
  }
});
window.addEventListener("resize", resizeCanvas);
document.addEventListener("keydown", (event) => {
  if (!state.running) return;
  const moves = { ArrowRight: [1, 0], d: [1, 0], D: [1, 0], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowUp: [0, -1], w: [0, -1], W: [0, -1] };
  if (moves[event.key]) { event.preventDefault(); movePlayer(...moves[event.key]); }
  if (event.key === "e" || event.key === "E" || event.key === " ") { event.preventDefault(); mineBlock(); }
  if (event.key === "b" || event.key === "B") { event.preventDefault(); buildBlock(); }
  if (/^[1-5]$/.test(event.key)) { state.selectedType = CONFIG.TARGET_BLOCKS[Number(event.key) - 1]; renderHotbar(); }
});
