const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const tmi = require("tmi.js");

const PORT = process.env.PORT || 3000;
const CANAL = (process.env.TWITCH_CHANNEL || "xyzgx").toLowerCase();

// Se deixar vazio, qualquer comando começando com ! vindo de mod/streamer é enviado.
// Exemplo para limitar:
// COMANDOS_PERMITIDOS=!start,!skip,!pular
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
`GOS/WOS Mod Server - Forward Any Command
Canal: ${CANAL}
Modo: ${COMANDOS_PERMITIDOS.length ? "somente lista permitida" : "qualquer comando com !"}
Permitidos: ${COMANDOS_PERMITIDOS.join(", ") || "todos"}
Páginas conectadas: ${paginas.size}`
  );
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    canal: CANAL,
    modo: COMANDOS_PERMITIDOS.length ? "lista" : "todos",
    comandos_permitidos: COMANDOS_PERMITIDOS,
    paginas: paginas.size
  });
});

wss.on("connection", (ws) => {
  paginas.add(ws);
  console.log("[WS] Página conectada. Total:", paginas.size);

  ws.send(JSON.stringify({
    acao: "status",
    canal: CANAL,
    modo: COMANDOS_PERMITIDOS.length ? "lista" : "todos",
    comandosPermitidos: COMANDOS_PERMITIDOS
  }));

  ws.on("close", () => {
    paginas.delete(ws);
    console.log("[WS] Página saiu. Total:", paginas.size);
  });
});

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of paginas) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

const client = new tmi.Client({
  connection: { reconnect: true, secure: true },
  channels: [CANAL]
});

client.connect().catch(err => console.error("[TMI] Erro:", err));

client.on("connected", () => {
  console.log("[TMI] Conectado ao chat:", CANAL);
  console.log("[TMI] Modo:", COMANDOS_PERMITIDOS.length ? COMANDOS_PERMITIDOS.join(", ") : "qualquer comando com !");
});

client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const textoOriginal = String(message || "").trim();
  const texto = textoOriginal.toLowerCase();

  // Só pega comando com !
  if (!texto.startsWith("!")) return;

  // Se COMANDOS_PERMITIDOS foi configurado, respeita a lista.
  const comandoBase = texto.split(/\s+/)[0];
  if (COMANDOS_PERMITIDOS.length && !COMANDOS_PERMITIDOS.includes(comandoBase)) return;

  const usuario = tags["display-name"] || tags.username || "alguém";
  const badges = tags.badges || {};
  const isBroadcaster = !!badges.broadcaster || tags.username?.toLowerCase() === CANAL;
  const isModerator = tags.mod === true || tags.mod === "1" || !!badges.moderator;

  if (!isBroadcaster && !isModerator) {
    console.log(`[BLOQUEADO] ${usuario} tentou ${textoOriginal}, mas não é mod/streamer.`);
    return;
  }

  console.log(`[OK] ${usuario}: ${textoOriginal}. Enviando para ${paginas.size} página(s).`);

  broadcast({
    acao: "comando",
    usuario,
    comando: textoOriginal,
    comandoLower: texto,
    comandoBase,
    ts: Date.now()
  });
});

server.listen(PORT, () => console.log(`[HTTP] Porta ${PORT}`));
