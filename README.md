# GOS/WOS - comandos configuráveis

Essa versão corrige o erro de comandos errados.

O servidor não tenta adivinhar comandos.
Ele envia QUALQUER comando começando com ! que venha de mod/streamer.

Depois o Violentmonkey usa o MAPA no topo do script para decidir o que fazer.

## Arquivos Render

Substitua no GitHub/Render:

- server.js
- package.json
- render.yaml

Depois faça redeploy.

## Script Violentmonkey

Use:

- gos_wos_violentmonkey_configuravel.user.js

## Onde mudar comandos

No topo do script Violentmonkey existe:

const MAPA = {
  start: ["!start", "!iniciar"],
  next: ["!next", "!skip", "!pular", "!passar", "!proximo", "!próximo"],
  reset: ["!reset", "!restart", "!reiniciar"],
  stop: ["!stop", "!parar"]
};

Coloque ali os comandos corretos do jogo.

## Testes sem chat

F8 = start
F9 = next
F10 = reset
F11 = stop
