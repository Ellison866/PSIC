const CONFIG = {
  ROUND_SECONDS: 60,
  WORLD_SIZE: 7,
  POINTS_PER_BLOCK: 10,
  WRONG_BLOCK_PENALTY: 2,
  QUEST_EVERY: 3,
  TARGET_BLOCKS: ["grass", "dirt", "stone", "water", "wood"],
};

const TILE_LABELS = { grass: "grass", dirt: "dirt", stone: "stone", water: "water", wood: "wood" };
const state = {
  score: 0,
  seconds: CONFIG.ROUND_SECONDS,
  target: "",
  subject: "",
  world: [],
  player: { x: 3, y: 3 },
  inventory: Object.fromEntries(CONFIG.TARGET_BLOCKS.map((type) => [type, 0])),
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

function makeWorld() {
  const size = CONFIG.WORLD_SIZE;
  state.world = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
    if (x === 0 || y === 0 || x === size - 1 || y === size - 1) return "water";
    const roll = Math.random();
    if (roll < 0.14) return "wood";
    if (roll < 0.3) return "stone";
    if (roll < 0.44) return "dirt";
    return "grass";
  }));
  state.world[state.player.y][state.player.x] = "grass";
  state.target = randomItem(CONFIG.TARGET_BLOCKS);
  const targetSpot = { x: 1 + Math.floor(Math.random() * (size - 2)), y: 1 + Math.floor(Math.random() * (size - 2)) };
  state.world[targetSpot.y][targetSpot.x] = state.target;
  $("target-label").textContent = `Collect the glowing ${TILE_LABELS[state.target]} blocks`;
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
    const slot = document.createElement("div");
    slot.className = `hotbar-slot${type === state.target ? " selected" : ""}`;
    slot.innerHTML = `<span class="mini-block ${type}" aria-hidden="true"></span><b>${index + 1}</b><span>${state.inventory[type]}</span>`;
    slot.title = `${TILE_LABELS[type]} blocks collected: ${state.inventory[type]}`;
    hotbar.appendChild(slot);
  });
}

function isAdjacent(x, y) { return Math.abs(x - state.player.x) + Math.abs(y - state.player.y) <= 1; }

function movePlayer(dx, dy) {
  const x = state.player.x + dx;
  const y = state.player.y + dy;
  if (x < 0 || y < 0 || x >= CONFIG.WORLD_SIZE || y >= CONFIG.WORLD_SIZE) return;
  state.player = { x, y };
  collectCurrentTile();
  renderWorld();
}

function chooseTile(x, y) {
  if (!state.running || !isAdjacent(x, y)) return;
  state.player = { x, y };
  collectCurrentTile();
  renderWorld();
}

function collectCurrentTile() {
  const type = state.world[state.player.y][state.player.x];
  if (type !== state.target) return;
  state.score += CONFIG.POINTS_PER_BLOCK;
  state.matches += 1;
  state.inventory[type] += 1;
  state.world[state.player.y][state.player.x] = randomItem(["grass", "dirt", "stone", "wood"]);
  renderStats();
  if (state.matches > 0 && state.matches % CONFIG.QUEST_EVERY === 0) $("quest-title").textContent = "Quest unlocked!";
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

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if (!state.running) return;
    state.seconds -= 1;
    renderStats();
    if (state.seconds <= 0) endGame();
  }, 1000);
}

function beginGame(quest) {
  state.score = 0;
  state.seconds = CONFIG.ROUND_SECONDS;
  state.matches = 0;
  state.inventory = Object.fromEntries(CONFIG.TARGET_BLOCKS.map((type) => [type, 0]));
  state.player = { x: Math.floor(CONFIG.WORLD_SIZE / 2), y: Math.floor(CONFIG.WORLD_SIZE / 2) };
  state.running = true;
  startScreen.classList.add("hidden");
  gameOver.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  $("game-title").textContent = state.subject;
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

$("play-again").addEventListener("click", () => { startScreen.classList.remove("hidden"); gameOver.classList.add("hidden"); $("subject").focus(); });
$("quit-button").addEventListener("click", endGame);
document.addEventListener("keydown", (event) => {
  if (!state.running) return;
  const moves = { ArrowRight: [1, 0], d: [1, 0], D: [1, 0], ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowDown: [0, 1], s: [0, 1], S: [0, 1], ArrowUp: [0, -1], w: [0, -1], W: [0, -1] };
  if (moves[event.key]) { event.preventDefault(); movePlayer(...moves[event.key]); }
});
