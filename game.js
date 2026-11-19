const CONFIG = {
  ROUND_SECONDS: 60, // Length of one short level.
  BLOCK_COUNT: 16, // Number of colored blocks on the board.
  POINTS_PER_BLOCK: 10, // Points for a matching block.
  WRONG_BLOCK_PENALTY: 2, // Points lost for a non-matching block.
  BLOCK_COLORS: ["pink", "blue", "green", "yellow"], // Simple block colors.
  QUEST_EVERY: 3, // Matching blocks before the quest is highlighted.
};

const state = { score: 0, seconds: CONFIG.ROUND_SECONDS, target: "", subject: "", blocks: [], quest: null, matches: 0, running: false, timerId: null, focusedIndex: 0 };
const $ = (id) => document.getElementById(id);
const startScreen = $("start-screen");
const gameScreen = $("game-screen");
const gameOver = $("game-over");
const thinking = $("thinking");
const errorBox = $("error-box");

function showError(message) { errorBox.textContent = message; errorBox.classList.remove("hidden"); setTimeout(() => errorBox.classList.add("hidden"), 6000); }
function setThinking(isThinking) { thinking.classList.toggle("hidden", !isThinking); }
function renderStats() { $("score").textContent = state.score; $("timer").textContent = state.seconds; }
function randomColor() { return CONFIG.BLOCK_COLORS[Math.floor(Math.random() * CONFIG.BLOCK_COLORS.length)]; }

function createBlocks() {
  state.target = randomColor();
  state.blocks = Array.from({ length: CONFIG.BLOCK_COUNT }, () => randomColor());
  if (!state.blocks.includes(state.target)) state.blocks[0] = state.target;
  $("target-label").textContent = `Collect the ${state.target} blocks`;
  const board = $("board");
  board.innerHTML = "";
  state.blocks.forEach((color, index) => {
    const block = document.createElement("button");
    block.className = `block ${color}${color === state.target ? " target" : ""}`;
    block.type = "button";
    block.title = `${color} block`;
    block.setAttribute("role", "gridcell");
    block.addEventListener("click", () => chooseBlock(index));
    board.appendChild(block);
  });
  focusBlock(0);
}

function focusBlock(index) {
  state.focusedIndex = (index + state.blocks.length) % state.blocks.length;
  document.querySelectorAll(".block").forEach((block, i) => block.classList.toggle("focused", i === state.focusedIndex));
}

function chooseBlock(index) {
  if (!state.running) return;
  if (state.blocks[index] === state.target) { state.score += CONFIG.POINTS_PER_BLOCK; state.matches += 1; }
  else state.score = Math.max(0, state.score - CONFIG.WRONG_BLOCK_PENALTY);
  renderStats();
  if (state.matches > 0 && state.matches % CONFIG.QUEST_EVERY === 0) $("quest-title").textContent = "Quest unlocked!";
  state.blocks[index] = randomColor();
  if (!state.blocks.includes(state.target)) state.blocks[index] = state.target;
  const block = $("board").children[index];
  block.className = `block ${state.blocks[index]}${state.blocks[index] === state.target ? " target" : ""}`;
  focusBlock(index);
}

function renderQuest(quest) {
  state.quest = quest;
  $("quest-title").textContent = quest.quest || `A ${state.subject} quest`;
  $("question").textContent = quest.question;
  $("feedback").textContent = "";
  const choices = $("choices"); choices.innerHTML = "";
  (quest.choices || []).forEach((choice, index) => {
    const button = document.createElement("button"); button.className = "choice"; button.type = "button"; button.textContent = choice;
    button.addEventListener("click", () => answerQuest(index)); choices.appendChild(button);
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
  state.timerId = setInterval(() => { if (!state.running) return; state.seconds -= 1; renderStats(); if (state.seconds <= 0) endGame(); }, 1000);
}

function beginGame(quest) {
  state.score = 0; state.seconds = CONFIG.ROUND_SECONDS; state.matches = 0; state.running = true;
  startScreen.classList.add("hidden"); gameOver.classList.add("hidden"); gameScreen.classList.remove("hidden");
  $("game-title").textContent = state.subject; renderStats(); createBlocks(); renderQuest(quest); startTimer();
}

function endGame() {
  state.running = false; clearInterval(state.timerId); gameScreen.classList.add("hidden"); gameOver.classList.remove("hidden");
  $("final-score").textContent = `You scored ${state.score} points in ${state.subject}.`;
  $("final-message").textContent = state.score > 0 ? "You turned a subject into a playable quest." : "Every try is a step forward.";
}

$("start-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const subject = $("subject").value.trim(); if (!subject) return;
  state.subject = subject; setThinking(true);
  try { const quest = await askAI(subject); beginGame(quest); }
  catch (error) { showError(error.message || "The AI could not answer. Check the internet and try again."); }
  finally { setThinking(false); }
});
$("play-again").addEventListener("click", () => { startScreen.classList.remove("hidden"); gameOver.classList.add("hidden"); $("subject").focus(); });
$("quit-button").addEventListener("click", endGame);
document.addEventListener("keydown", (event) => {
  if (!state.running) return;
  if (["ArrowRight", "d", "D"].includes(event.key)) { event.preventDefault(); focusBlock(state.focusedIndex + 1); }
  if (["ArrowLeft", "a", "A"].includes(event.key)) { event.preventDefault(); focusBlock(state.focusedIndex - 1); }
  if (["ArrowDown", "s", "S"].includes(event.key)) { event.preventDefault(); focusBlock(state.focusedIndex + 4); }
  if (["ArrowUp", "w", "W"].includes(event.key)) { event.preventDefault(); focusBlock(state.focusedIndex - 4); }
  if (["Enter", " "].includes(event.key)) { event.preventDefault(); chooseBlock(state.focusedIndex); }
});
