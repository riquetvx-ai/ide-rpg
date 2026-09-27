# Idle RPG Online V6
MMORPG de navegador em HTML5 Canvas + Node.js/Express/WebSocket.

## Render
Build Command: `npm install`
Start Command: `npm start`
Root Directory: deixe vazio.

O `index.html` fica na raiz. O servidor usa `PORT` e `0.0.0.0`.

## V6
Mapa grande, 5 classes, monstros, combate visual, auto ataque, habilidades, níveis, XP, loot, inventário, equipamento, loja, NPC/quests, PvP local, ranking, chat e jogadores online via WebSocket.

Os dados de contas são gravados em `players.json`. Em Render Free o disco é efêmero; para produção, troque por PostgreSQL/DB persistente.
