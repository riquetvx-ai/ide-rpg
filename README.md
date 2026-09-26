# Idle RPG Online V3
Versão completa de navegador: mapa, movimentação, 5 classes, monstros, chefe, combate, habilidades, níveis, inventário, loja, raridades, PvP, ranking, chat e WebSocket.

## Render
Build Command: `npm install`
Start Command: `npm start`
Root Directory: vazio

O projeto não usa pasta `public`: `index.html` fica na raiz.
O servidor usa `PORT` e `0.0.0.0` e corrige o wildcard do Express 5.

## Local
`npm install`
`npm start`
Depois abra `http://localhost:3000`

Observação: SQLite em hospedagem com armazenamento efêmero é adequado para teste. Para produção, migre para PostgreSQL.
