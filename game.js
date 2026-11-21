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
  yaw: 0,
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

function blockAt(x, z) {
  if (!inWorld(x, z)) return null;
  return getVoxel(x, 1, z) || getVoxel(x, 0, z);
}

function colorForDistance(type, distance, night) {
  const shade = Math.max(night ? .35 : .5, 1 - distance / 18);
  const colors = COLORS[type];
  const base = colors[1];
  const value = Number.parseInt(base.slice(1), 16);
  const r = Math.floor(((value >> 16) & 255) * shade);
  const g = Math.floor(((value >> 8) & 255) * shade);
  const b = Math.floor((value & 255) * shade);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawWorld() {
  if (!canvas || !context) return;
  const bounds = canvas.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  const night = document.body.classList.contains("night");
  context.clearRect(0, 0, width, height);
  const sky = context.createLinearGradient(0, 0, 0, height / 2);
  sky.addColorStop(0, night ? "#14253c" : "#74c9dc");
  sky.addColorStop(1, night ? "#46657a" : "#d8f1df");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height / 2);
  const ground = context.createLinearGradient(0, height / 2, 0, height);
  ground.addColorStop(0, night ? "#273c42" : "#7ea85b");
  ground.addColorStop(1, night ? "#17272d" : "#3f7046");
  context.fillStyle = ground;
  context.fillRect(0, height / 2, width, height / 2);

  const fov = Math.PI / 3;
  const horizon = height * .48;
  const rayStep = Math.max(1, Math.floor(width / 320));
  for (let screenX = 0; screenX < width; screenX += rayStep) {
    const rayAngle = state.yaw + (screenX / width - .5) * fov;
    const dx = Math.cos(rayAngle);
    const dz = Math.sin(rayAngle);
    let hit = null;
    for (let distance = .15; distance < 18; distance += .035) {
      const x = Math.floor(state.player.x + dx * distance);
      const z = Math.floor(state.player.z + dz * distance);
      const type = blockAt(x, z);
      if (type) { hit = { type, distance }; break; }
      if (!inWorld(x, z)) break;
    }
    const columnWidth = rayStep + 1;
    if (!hit) continue;
    const wallHeight = Math.min(height * 1.2, height / (hit.distance * .72));
    context.fillStyle = colorForDistance(hit.type, hit.distance, night);
    context.fillRect(screenX, horizon - wallHeight, columnWidth, wallHeight);
    context.fillStyle = "rgba(255,255,255,.1)";
    context.fillRect(screenX, horizon - wallHeight, columnWidth, 3);
  }
  context.fillStyle = night ? "rgba(255, 226, 122, .7)" : "rgba(255, 248, 210, .7)";
  context.beginPath();
  context.arc(width - 58, 52, 20, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255,255,255,.2)";
  context.fillRect(0, horizon, width, 2);
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

function turnCamera(amount) {
  state.yaw += amount;
  drawWorld();
}

function moveForward(amount) {
  movePlayer(Math.round(Math.cos(state.yaw)) * amount, Math.round(Math.sin(state.yaw)) * amount);
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
let pointerStartX = 0;
let pointerMoved = false;
canvas.addEventListener("pointerdown", (event) => {
  pointerStartX = event.clientX;
  pointerMoved = false;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!event.buttons) return;
  const change = event.clientX - pointerStartX;
  if (Math.abs(change) > 2) pointerMoved = true;
  state.yaw += change * .008;
  pointerStartX = event.clientX;
  drawWorld();
});
canvas.addEventListener("pointerup", () => { if (!pointerMoved && state.running) mineBlock(); });
window.addEventListener("resize", resizeCanvas);
document.addEventListener("keydown", (event) => {
  if (!state.running) return;
  if (["ArrowLeft", "a", "A"].includes(event.key)) { event.preventDefault(); turnCamera(-Math.PI / 2); }
  if (["ArrowRight", "d", "D"].includes(event.key)) { event.preventDefault(); turnCamera(Math.PI / 2); }
  if (["ArrowUp", "w", "W"].includes(event.key)) { event.preventDefault(); moveForward(1); }
  if (["ArrowDown", "s", "S"].includes(event.key)) { event.preventDefault(); moveForward(-1); }
  if (event.key === "e" || event.key === "E" || event.key === " ") { event.preventDefault(); mineBlock(); }
  if (event.key === "b" || event.key === "B") { event.preventDefault(); buildBlock(); }
  if (/^[1-5]$/.test(event.key)) { state.selectedType = CONFIG.TARGET_BLOCKS[Number(event.key) - 1]; renderHotbar(); }
});
