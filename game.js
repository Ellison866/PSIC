const CONFIG = {
  ROUND_SECONDS: 60,
  WORLD_SIZE: 11,
  POINTS_PER_BLOCK: 10,
  WRONG_BLOCK_PENALTY: 2,
  QUEST_EVERY: 3,
  TARGET_BLOCKS: ["grass", "dirt", "stone", "water", "wood"],
  STARTING_INVENTORY: { grass: 4, dirt: 8, stone: 0, water: 0, wood: 2 },
};

const TILE_LABELS = { grass: "grass", dirt: "dirt", stone: "stone", water: "water", wood: "wood" };
const state = {
  score: 0,
  seconds: CONFIG.ROUND_SECONDS,
  target: "",
  subject: "",
  world: [],
  player: { x: 5, y: 5 },
  inventory: { ...CONFIG.STARTING_INVENTORY },
  selectedType: "grass",
  quest: null,
  matches: 0,
  running: false,
  timerId: null,
};

const $ = (id) => document.getElementById(id);
const startScreen = $("start-screen");
const gameScreen = $("game-screen");
const gameOver = $("game-over");
const thinking = $("thinking");
const errorBox = $("error-box");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  setTimeout(() => errorBox.classList.add("hidden"), 6000);
}

function setThinking(isThinking) { thinking.classList.toggle("hidden", !isThinking); }
function renderStats() { $("score").textContent = state.score; $("timer").textContent = state.seconds; }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
function inWorld(x, y) { return x >= 0 && y >= 0 && x < CONFIG.WORLD_SIZE && y < CONFIG.WORLD_SIZE; }

function makeWorld() {
  const size = CONFIG.WORLD_SIZE;
  state.world = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
    if (x === 0 || y === 0 || x === size - 1 || y === size - 1) return "water";
    const roll = Math.random();
    if (roll < 0.12) return "wood";
    if (roll < 0.27) return "stone";
    if (roll < 0.43) return "dirt";
    return "grass";
  }));
  state.world[state.player.y][state.player.x] = "grass";
  state.target = randomItem(CONFIG.TARGET_BLOCKS);
  const targetSpot = { x: 1 + Math.floor(Math.random() * (size - 2)), y: 1 + Math.floor(Math.random() * (size - 2)) };
  state.world[targetSpot.y][targetSpot.x] = state.target;
  $("target-label").textContent = `Mine the glowing ${TILE_LABELS[state.target]} blocks`;
}

function tileButton(type, x, y) {
  const tile = document.createElement("button");
  const isPlayer = x === state.player.x && y === state.player.y;
  tile.className = `tile ${type}${isPlayer ? " player" : ""}${type === state.target ? " target" : ""}`;
  tile.type = "button";
  tile.title = isPlayer ? "You are here" : `${TILE_LABELS[type]} block`;
  tile.setAttribute("role", "gridcell");
  tile.setAttribute("aria-label", tile.title);
  tile.addEventListener("click", () => chooseTile(x, y));
  if (isPlayer) tile.innerHTML = '<span class="player-avatar" aria-hidden="true">◆</span>';
  return tile;
}

function renderWorld() {
  const world = $("world");
  world.innerHTML = "";
  state.world.forEach((row, y) => row.forEach((type, x) => world.appendChild(tileButton(type, x, y))));
  renderHotbar();
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

function isAdjacent(x, y) { return Math.abs(x - state.player.x) + Math.abs(y - state.player.y) <= 1; }

function movePlayer(dx, dy) {
  const x = state.player.x + dx;
  const y = state.player.y + dy;
  if (!inWorld(x, y)) return;
  state.player = { x, y };
  renderWorld();
}

function chooseTile(x, y) {
  if (!state.running || !isAdjacent(x, y)) return;
  state.player = { x, y };
  renderWorld();
}

function mineBlock() {
  if (!state.running) return;
  const candidates = [[state.player.x, state.player.y], [state.player.x + 1, state.player.y], [state.player.x - 1, state.player.y], [state.player.x, state.player.y + 1], [state.player.x, state.player.y - 1]];
  const spot = candidates.find(([x, y]) => inWorld(x, y) && state.world[y][x] === state.target);
  if (!spot) { showError(`Find a glowing ${TILE_LABELS[state.target]} block nearby first.`); return; }
  const [x, y] = spot;
  state.inventory[state.target] += 1;
  state.score += CONFIG.POINTS_PER_BLOCK;
  state.matches += 1;
  state.world[y][x] = randomItem(["grass", "dirt", "stone", "wood"]);
  renderStats();
  renderWorld();
  if (state.matches > 0 && state.matches % CONFIG.QUEST_EVERY === 0) $("quest-title").textContent = "Quest unlocked!";
}

function buildBlock() {
  if (!state.running || state.inventory[state.selectedType] < 1) {
    showError(`You need a ${TILE_LABELS[state.selectedType]} block in your hotbar.`);
    return;
  }
  const candidates = [[state.player.x + 1, state.player.y], [state.player.x - 1, state.player.y], [state.player.x, state.player.y + 1], [state.player.x, state.player.y - 1]];
  const spot = candidates.find(([x, y]) => inWorld(x, y) && state.world[y][x] !== state.target);
  if (!spot) return;
  const [x, y] = spot;
  state.world[y][x] = state.selectedType;
  state.inventory[state.selectedType] -= 1;
  state.score += 1;
  renderStats();
  renderWorld();
}

function craftStone() {
  if (state.inventory.dirt < 2 || state.inventory.wood < 1) {
    showError("Crafting needs 2 dirt and 1 wood.");
    return;
  }
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
  state.player = { x: Math.floor(CONFIG.WORLD_SIZE / 2), y: Math.floor(CONFIG.WORLD_SIZE / 2) };
  state.running = true;
  startScreen.classList.add("hidden");
  gameOver.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  $("game-title").textContent = state.subject;
  $("craft-status").textContent = "2 dirt + 1 wood → 1 stone";
  renderStats();
  makeWorld();
  renderWorld();
  renderQuest(quest);
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
document.addEventListener("keydown", (event) => {
  if (!state.running) return;
  const moves = { ArrowRight: [1, 0], d: [1, 0], D: [1, 0], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowUp: [0, -1], w: [0, -1], W: [0, -1] };
  if (moves[event.key]) { event.preventDefault(); movePlayer(...moves[event.key]); }
  if (event.key === "e" || event.key === "E" || event.key === " ") { event.preventDefault(); mineBlock(); }
  if (event.key === "b" || event.key === "B") { event.preventDefault(); buildBlock(); }
  if (/^[1-5]$/.test(event.key)) { state.selectedType = CONFIG.TARGET_BLOCKS[Number(event.key) - 1]; renderHotbar(); }
});
