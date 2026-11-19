const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { getKey, invalidateKey, toKeyErrorResponse } = require("./minddo-key");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 3000);

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const divider = line.indexOf("=");
    if (divider <= 0) continue;
    const name = line.slice(0, divider).trim();
    const value = line.slice(divider + 1).trim();
    if (name && !process.env[name]) process.env[name] = value;
  }
}

function modelFromNotes() {
  const notes = fs.readFileSync(path.join(ROOT, "NOTES.md"), "utf8");
  const match = notes.match(/model with[^`\n]*`([^`]*luna[^`]*)`/i);
  if (!match) throw new Error("No AI model is listed in NOTES.md.");
  return match[1];
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; if (body.length > 10000) reject(new Error("Request is too large.")); });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function createQuest(subject) {
  const model = modelFromNotes();
  const brief = fs.readFileSync(path.join(ROOT, "BRIEF.md"), "utf8");
  const key = await getKey();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${brief}\n\nReturn only JSON with: quest (short title), question (one age-appropriate question), choices (exactly 3 short strings), answerIndex (0, 1, or 2). Double-check the answer. Be kind and concise.` },
        { role: "user", content: `Make one learning quest about: ${subject}` }
      ]
    })
  });
  if (response.status === 401) { invalidateKey(); }
  if (!response.ok) throw new Error(`OpenAI could not make the quest (${response.status}).`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty quest.");
  const quest = JSON.parse(content);
  if (!quest.quest || !quest.question || !Array.isArray(quest.choices) || quest.choices.length !== 3 || !Number.isInteger(quest.answerIndex)) throw new Error("OpenAI returned an incomplete quest.");
  return quest;
}

function serveFile(request, response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  if (requested === "/.env" || requested.startsWith("/.git")) return sendJson(response, 404, { error: { message: "Page not found." } });
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: { message: "Page not found." } });
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".md": "text/plain" };
  response.writeHead(200, { "Content-Type": `${types[path.extname(filePath)] || "application/octet-stream"}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(response);
}

loadEnv();
http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "POST" && url.pathname === "/api/learn") {
    try {
      const input = JSON.parse(await readBody(request));
      if (!input.subject || typeof input.subject !== "string") return sendJson(response, 400, { error: { message: "Please enter a subject." } });
      return sendJson(response, 200, await createQuest(input.subject.trim()));
    } catch (error) {
      if (error.fix) return sendJson(response, 502, toKeyErrorResponse(error));
      return sendJson(response, 502, { error: { message: error.message || "The AI could not answer. Check the internet and try again." } });
    }
  }
  return serveFile(request, response, url.pathname);
}).listen(PORT, "127.0.0.1", () => console.log(`Mind Blocks is ready at http://localhost:${PORT}`));
