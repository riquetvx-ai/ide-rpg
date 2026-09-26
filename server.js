import express from "express";
import http from "http";
import path from "path";
import {fileURLToPath} from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {WebSocketServer} from "ws";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express(), server=http.createServer(app);
const wss=new WebSocketServer({server});
const db=new Database("game.db");
const SECRET=process.env.JWT_SECRET||"change-this-secret";
db.pragma("journal_mode=WAL");

db.exec(`CREATE TABLE IF NOT EXISTS users(
id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE,password TEXT,
gold INTEGER DEFAULT 500,level INTEGER DEFAULT 1,xp INTEGER DEFAULT 0,
damage INTEGER DEFAULT 20,defense INTEGER DEFAULT 5,hp INTEGER DEFAULT 120,
maxhp INTEGER DEFAULT 120,mana INTEGER DEFAULT 60,maxmana INTEGER DEFAULT 60,
stage INTEGER DEFAULT 1,map TEXT DEFAULT 'vila',x INTEGER DEFAULT 500,y INTEGER DEFAULT 330,
hero TEXT DEFAULT 'Arkan',skillpoints INTEGER DEFAULT 0,wins INTEGER DEFAULT 0,
losses INTEGER DEFAULT 0,rating INTEGER DEFAULT 1000,equipment TEXT DEFAULT '[]',
inventory TEXT DEFAULT '[]',created_at INTEGER)`);

const classes={
Arkan:{role:"Guerreiro",damage:28,defense:10,hp:170,mana:45,skill:"Golpe Poderoso"},
Luna:{role:"Arqueira",damage:32,defense:6,hp:125,mana:70,skill:"Chuva de Flechas"},
Elyra:{role:"Maga",damage:38,defense:4,hp:105,mana:110,skill:"Meteoro"},
Kael:{role:"Assassino",damage:42,defense:3,hp:115,mana:75,skill:"Lâmina Sombria"},
Doran:{role:"Paladino",damage:24,defense:15,hp:190,mana:55,skill:"Martelo Sagrado"}};

const items=[
{id:"iron_sword",name:"Espada de Ferro",slot:"arma",rarity:"Comum",power:8,price:80},
{id:"hunter_bow",name:"Arco do Caçador",slot:"arma",rarity:"Incomum",power:14,price:150},
{id:"arcane_staff",name:"Cajado Arcano",slot:"arma",rarity:"Raro",power:22,price:280},
{id:"dragon_blade",name:"Lâmina do Dragão",slot:"arma",rarity:"Lendário",power:45,price:1000},
{id:"guardian_armor",name:"Armadura Guardiã",slot:"armadura",rarity:"Épico",power:28,price:500},
{id:"shadow_cloak",name:"Manto Sombrio",slot:"armadura",rarity:"Raro",power:18,price:320},
{id:"boots_speed",name:"Botas da Velocidade",slot:"botas",rarity:"Incomum",power:7,price:180},
{id:"dark_ring",name:"Anel Sombrio",slot:"anel",rarity:"Épico",power:20,price:450},
{id:"gold_necklace",name:"Colar Dourado",slot:"colar",rarity:"Raro",power:12,price:300}];

const zones={
vila:{name:"Vila Inicial",minLevel:1},floresta:{name:"Floresta Sombria",minLevel:3},
caverna:{name:"Caverna de Ferro",minLevel:6},deserto:{name:"Deserto Vermelho",minLevel:10},
chefe:{name:"Trono do Dragão",minLevel:15}};

const monsters={
vila:{name:"Slime Verde",hp:90,damage:7,xp:25,gold:18},
floresta:{name:"Lobo Sombrio",hp:180,damage:14,xp:55,gold:38},
caverna:{name:"Golem de Ferro",hp:420,damage:28,xp:120,gold:85},
deserto:{name:"Escorpião Rubro",hp:700,damage:40,xp:220,gold:160},
chefe:{name:"Dragão Ancião",hp:2500,damage:85,xp:1000,gold:1000}};

const get=id=>db.prepare("SELECT * FROM users WHERE id=?").get(id);
const parse=(v,f)=>{try{return JSON.parse(v||"")}catch{return f}};
function pub(u){return {...u,password:undefined,equipment:parse(u.equipment,[]),inventory:parse(u.inventory,[]),role:classes[u.hero]?.role||"Aventureiro"}}
function auth(req,res,next){try{req.user=jwt.verify((req.headers.authorization||"").replace("Bearer ",""),SECRET);next()}catch{res.status(401).json({error:"Não autenticado"})}}

app.use(express.json()); app.use(express.static(__dirname));
app.get("/api/classes",(q,s)=>s.json(classes));app.get("/api/items",(q,s)=>s.json(items));
app.get("/api/zones",(q,s)=>s.json(zones));app.get("/api/monsters",(q,s)=>s.json(monsters));

app.post("/api/register",async(req,res)=>{
 const username=String(req.body.username||"").trim(),password=String(req.body.password||"");
 const hero=classes[req.body.hero]?req.body.hero:"Arkan";
 if(username.length<3||password.length<4)return res.status(400).json({error:"Usuário 3+ e senha 4+"});
 try{const c=classes[hero],hash=await bcrypt.hash(password,10);
 const r=db.prepare(`INSERT INTO users(username,password,damage,defense,hp,maxhp,mana,maxmana,hero,created_at)VALUES(?,?,?,?,?,?,?,?,?,?)`)
 .run(username,hash,c.damage,c.defense,c.hp,c.hp,c.mana,c.mana,hero,Date.now());
 const u=get(r.lastInsertRowid);res.json({token:jwt.sign({id:u.id},SECRET),user:pub(u)})}
 catch{res.status(400).json({error:"Usuário já existe"})}});

app.post("/api/login",async(req,res)=>{
 const u=db.prepare("SELECT * FROM users WHERE username=?").get(String(req.body.username||""));
 if(!u||!(await bcrypt.compare(String(req.body.password||""),u.password)))return res.status(401).json({error:"Login inválido"});
 res.json({token:jwt.sign({id:u.id},SECRET),user:pub(u)})});

app.get("/api/me",auth,(req,res)=>res.json(pub(get(req.user.id))));
app.post("/api/save",auth,(req,res)=>{
 const u=get(req.user.id),b=req.body;
 db.prepare(`UPDATE users SET gold=?,level=?,xp=?,damage=?,defense=?,hp=?,maxhp=?,mana=?,maxmana=?,
 stage=?,map=?,x=?,y=?,hero=?,skillpoints=?,wins=?,losses=?,rating=?,equipment=?,inventory=? WHERE id=?`)
 .run(...["gold","level","xp","damage","defense","hp","maxhp","mana","maxmana","stage","x","y","skillpoints","wins","losses","rating"]
 .map(k=>Number.isFinite(Number(b[k]))?Math.floor(Number(b[k])):u[k]),
 String(b.map||u.map),String(b.hero&&classes[b.hero]?b.hero:u.hero),
 JSON.stringify(Array.isArray(b.equipment)?b.equipment:parse(u.equipment,[])),
 JSON.stringify(Array.isArray(b.inventory)?b.inventory:parse(u.inventory,[])),u.id);
 res.json(pub(get(u.id)))});

app.get("/api/ranking",(q,s)=>s.json(db.prepare("SELECT username,hero,level,stage,wins,losses,rating FROM users ORDER BY rating DESC,level DESC LIMIT 50").all()));

app.post("/api/buy",auth,(req,res)=>{
 const u=get(req.user.id),item=items.find(i=>i.id===req.body.itemId);
 if(!item)return res.status(404).json({error:"Item não encontrado"});
 if(u.gold<item.price)return res.status(400).json({error:"Ouro insuficiente"});
 const inv=parse(u.inventory,[]);inv.push({...item,uid:Date.now()});
 db.prepare("UPDATE users SET gold=gold-?,inventory=? WHERE id=?").run(item.price,JSON.stringify(inv),u.id);
 res.json(pub(get(u.id)))});

app.post("/api/skill",auth,(req,res)=>{
 const u=get(req.user.id);if(u.skillpoints<1)return res.status(400).json({error:"Sem ponto de habilidade"});
 db.prepare("UPDATE users SET skillpoints=skillpoints-1,damage=damage+? WHERE id=?").run(Math.max(3,Math.floor(u.damage*.15)),u.id);
 res.json(pub(get(u.id)))});

app.post("/api/pvp",auth,(req,res)=>{
 const u=get(req.user.id),op=db.prepare("SELECT * FROM users WHERE id<>? ORDER BY ABS(rating-?) LIMIT 1").get(u.id,u.rating);
 if(!op)return res.json({error:"Cadastre outro jogador para testar o PvP"});
 const win=u.damage+u.defense+u.level*18+Math.random()*80>=op.damage+op.defense+op.level*18+Math.random()*80;
 const rr=win?30:-20;
 db.prepare("UPDATE users SET gold=gold+?,wins=wins+?,losses=losses+?,rating=MAX(0,rating+?) WHERE id=?").run(win?80:20,win?1:0,win?0:1,rr,u.id);
 res.json({win,opponent:op.username,rating:rr,reward:win?80:20,user:pub(get(u.id))})});

const clients=new Map();
function online(){const m=JSON.stringify({type:"online",count:clients.size});for(const ws of clients.keys())if(ws.readyState===1)ws.send(m)}
function world(){const p=[...clients.values()];const m=JSON.stringify({type:"world",players:p});for(const ws of clients.keys())if(ws.readyState===1)ws.send(m)}
wss.on("connection",ws=>{
 clients.set(ws,{id:0,username:"Visitante",x:500,y:330,map:"vila",hero:"Arkan"});online();
 ws.on("message",raw=>{try{const x=JSON.parse(raw),p=clients.get(ws);
  if(x.type==="hello")Object.assign(p,{id:Number(x.id)||0,username:String(x.username||"Jogador"),x:Number(x.x)||500,y:Number(x.y)||330,map:String(x.map||"vila"),hero:x.hero||"Arkan"}),world();
  if(x.type==="move")Object.assign(p,{x:Math.max(20,Math.min(980,Number(x.x)||p.x)),y:Math.max(50,Math.min(520,Number(x.y)||p.y)),map:String(x.map||p.map)}),world();
  if(x.type==="chat"){const msg=JSON.stringify({type:"chat",user:p.username,text:String(x.text||"").slice(0,180)});for(const c of clients.keys())if(c.readyState===1)c.send(msg)}
 }catch{}});
 ws.on("close",()=>{clients.delete(ws);online();world()})});

app.get(/.*/,(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
const PORT=Number(process.env.PORT||3000);
server.listen(PORT,"0.0.0.0",()=>console.log("Idle RPG Online V3 ativo na porta "+PORT));
