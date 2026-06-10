const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const tmi = require("tmi.js");

const PORT = process.env.PORT || 3000;

// Coloque no Render em Environment:
// TWITCH_CHANNEL = nome do canal sem @
const CANAL = (process.env.TWITCH_CHANNEL || "xyzgx").toLowerCase();

// Comandos aceitos no chat
const COMANDOS_START = (process.env.COMANDOS_START || "!start,!iniciar,!gos,!wos")
  .split(",")
  .map(x => x.trim().toLowerCase())
  .filter(Boolean);

const app = express();

app.get("/", (req, res) => {
  res.type("text").send(
`GOS/WOS Mod Server ON
Canal: ${CANAL}
Comandos: ${COMANDOS_START.join(", ")}
WebSocket: wss://${req.headers.host}`
  );
});

app.get("/health", (req, res) => {
  res.json({ ok: true, canal: CANAL, comandos: COMANDOS_START });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let paginas = new Set();

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of paginas) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

wss.on("connection", (ws) => {
  paginas.add(ws);
  console.log("[WS] Página conectada. Total:", paginas.size);

  ws.send(JSON.stringify({
    acao: "status",
    texto: "Conectado ao servidor Render",
    canal: CANAL,
    comandos: COMANDOS_START
  }));

  ws.on("close", () => {
    paginas.delete(ws);
    console.log("[WS] Página saiu. Total:", paginas.size);
  });

  ws.on("error", (e) => {
    console.log("[WS] Erro:", e.message);
  });
});

const client = new tmi.Client({
  connection: { reconnect: true, secure: true },
  channels: [CANAL]
});

client.connect().catch(err => {
  console.error("[TMI] Erro ao conectar:", err);
});

client.on("connected", () => {
  console.log("[TMI] Conectado ao chat:", CANAL);
  console.log("[TMI] Comandos:", COMANDOS_START.join(", "));
});

client.on("disconnected", (reason) => {
  console.log("[TMI] Desconectado:", reason);
});

client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const msg = String(message || "").trim().toLowerCase();
  if (!COMANDOS_START.includes(msg)) return;

  const usuario = tags["display-name"] || tags.username || "alguém";
  const badges = tags.badges || {};

  const isBroadcaster = !!badges.broadcaster || tags.username?.toLowerCase() === CANAL;
  const isModerator = tags.mod === true || tags.mod === "1" || !!badges.moderator;

  if (!isBroadcaster && !isModerator) {
    console.log(`[BLOQUEADO] ${usuario} tentou ${msg}, mas não é mod/streamer.`);
    return;
  }

  console.log(`[OK] ${usuario} usou ${msg}. Enviando START para ${paginas.size} página(s).`);

  broadcast({
    acao: "start",
    usuario,
    comando: msg,
    ts: Date.now()
  });
});

server.listen(PORT, () => {
  console.log(`[HTTP] Servidor rodando na porta ${PORT}`);
});
