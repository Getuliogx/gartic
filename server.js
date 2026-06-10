const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const tmi = require("tmi.js");

const PORT = process.env.PORT || 3000;
const CANAL = (process.env.TWITCH_CHANNEL || "xyzgx").toLowerCase();

// Deixe vazio para aceitar qualquer comando começando com ! de mod/streamer.
// Se quiser limitar, coloque no Render: COMANDOS_PERMITIDOS=!start,!iniciar,!restart,!sair
const COMANDOS_PERMITIDOS = String(process.env.COMANDOS_PERMITIDOS || "")
  .split(",")
  .map(x => x.trim().toLowerCase())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let paginas = new Set();

app.get("/", (req, res) => {
  res.type("text").send(
`GOS/WOS FINAL ON
Canal: ${CANAL}
Modo: ${COMANDOS_PERMITIDOS.length ? "lista permitida" : "qualquer comando com ! vindo de mod/streamer"}
Permitidos: ${COMANDOS_PERMITIDOS.join(", ") || "todos"}
Paginas conectadas: ${paginas.size}`
  );
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    canal: CANAL,
    permitidos: COMANDOS_PERMITIDOS,
    paginas: paginas.size
  });
});

wss.on("connection", (ws) => {
  paginas.add(ws);
  console.log("[WS] Página conectada. Total:", paginas.size);

  ws.send(JSON.stringify({
    acao: "status",
    canal: CANAL,
    permitidos: COMANDOS_PERMITIDOS
  }));

  ws.on("close", () => {
    paginas.delete(ws);
    console.log("[WS] Página saiu. Total:", paginas.size);
  });
});

function broadcast(obj) {
  const txt = JSON.stringify(obj);
  for (const ws of paginas) {
    if (ws.readyState === WebSocket.OPEN) ws.send(txt);
  }
}

const client = new tmi.Client({
  connection: { reconnect: true, secure: true },
  channels: [CANAL]
});

client.connect().catch(err => console.error("[TMI] Erro ao conectar:", err));

client.on("connected", () => {
  console.log("[TMI] Conectado ao chat:", CANAL);
});

client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const original = String(message || "").trim();
  const lower = original.toLowerCase();
  if (!lower.startsWith("!")) return;

  const base = lower.split(/\s+/)[0];

  if (COMANDOS_PERMITIDOS.length && !COMANDOS_PERMITIDOS.includes(base)) return;

  const usuario = tags["display-name"] || tags.username || "alguém";
  const badges = tags.badges || {};
  const isBroadcaster = !!badges.broadcaster || tags.username?.toLowerCase() === CANAL;
  const isMod = tags.mod === true || tags.mod === "1" || !!badges.moderator;

  if (!isBroadcaster && !isMod) {
    console.log("[BLOQUEADO]", usuario, original);
    return;
  }

  console.log("[OK]", usuario, original, "->", paginas.size, "página(s)");

  broadcast({
    acao: "comando",
    usuario,
    comando: original,
    comandoLower: lower,
    comandoBase: base,
    ts: Date.now()
  });
});

server.listen(PORT, () => console.log("[HTTP] Porta", PORT));
