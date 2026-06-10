# GOS/WOS Mod Render

Servidor para permitir que mods da Twitch usem comandos no chat para clicar no START do Gartic On Stream / Words On Stream no navegador do host.

## Arquivos

- `server.js`: servidor Node.js para o Render.
- `package.json`: dependências.
- `render.yaml`: opcional para deploy automático.
- `violentmonkey-gos-wos-render.js`: script que fica no navegador do host/streamer.

## Como usar no GitHub + Render

1. Crie um repositório no GitHub.
2. Envie estes arquivos para o repositório:
   - `server.js`
   - `package.json`
   - `render.yaml`

3. No Render:
   - New > Web Service
   - Conecte seu repositório do GitHub
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

4. Em Environment Variables no Render:
   - `TWITCH_CHANNEL` = nome do canal sem @
   - `COMANDOS_START` = `!start,!iniciar,!gos,!wos`

5. Depois do deploy, copie a URL do Render.
   Exemplo:
   `https://gos-wos-mod-render.onrender.com`

6. Abra `violentmonkey-gos-wos-render.js` e troque:
   `const RENDER_URL = "https://SEU-APP.onrender.com";`

   Pela URL real do seu Render.

7. Instale esse script no Violentmonkey.

8. Abra o GOS/WOS no navegador do host:
   - `https://gos.gg/system`
   - `https://wos.gg/pt`

9. Um mod manda no chat:
   - `!start`
   - `!iniciar`
   - `!gos`
   - `!wos`

O servidor verifica se a pessoa é mod ou streamer. Se for, manda o navegador clicar no START.
